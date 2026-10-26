import { JUMP_ENERGY_COST, PLAYER_SIZE, PLAYER_X, SCREEN_WIDTH } from '../constants';
import { frameScale } from '../frame';
import { moveFor, shapeFor } from '../obstacleCatalogue';
import { closedUp, minGapSec, Pattern, PatternStep, PATTERNS, TIGHTEST_SPACING } from '../patterns';
import { placePickups, resetPickups } from '../pickups';
import { beatGridSec, buildAt, StageConfig, StagePacing } from '../stages';
import { createSpawnerState, GameState } from '../state';

let nextId = 0;

/**
 * Where new obstacles appear: just past the right edge of the widest phone screen, so
 * nothing pops into view part-way across.
 */
export const SPAWN_X = SCREEN_WIDTH + 100;

/** Extra breathing space per point of pattern cost, so a hard pattern is followed by a little more. */
const REST_PER_COST = 0.05;
/** A little randomness in the rests, so the rhythm doesn't feel mechanical. */
const REST_JITTER = 0.1;
/** At least this long between two wide blocks (or voids), so they stay a surprise. */
const DOUBLE_COOLDOWN_SEC = 6;
/** How many recent patterns the spawner remembers, to keep the same few from repeating. */
const RECENT_KEPT = 3;
/** A heart only goes in a rest at least this long, so it never crowds an obstacle. */
const HEART_MIN_REST = 0.9;
/**
 * The rest in a breather (`pacing.breatherEverySec`), from one obstacle's back edge to the next
 * one's front: about a second with both feet on the ground, once the jumps either side are done.
 */
const BREATHER_SEC = 1.7;
/**
 * Energy a double jump has to leave spare. A player who taps a little early, while still in
 * the air from the last jump, makes a double jump without meaning to; this much over the cost
 * means that slip still leaves enough for the wide block or void it was placed for.
 */
const DOUBLE_SPARE_ENERGY = JUMP_ENERGY_COST;

const blend = ([start, end]: [number, number], progress: number) =>
    start + (end - start) * progress;

/**
 * A new obstacle first comes on its own: patterns that mix it with others wait this much
 * longer (as a share of the stage, about 15 seconds), so the player learns it before having
 * to combine it. Only for obstacles new part-way through a stage.
 */
const TEACH_ALONE = 0.08;

/** The patterns this stage allows right now, given its budget and what's been unlocked. */
export const availablePatterns = (
    pacing: StagePacing,
    progress: number,
    built: number,
    lastCost: number,
    doublesAllowed: number
): Pattern[] => {
    const budget = blend(pacing.budget, built);
    const unlocked = (pattern: Pattern) =>
        pattern.steps.every((s) => {
            const from = pacing.unlocks[s.role];
            if (from === undefined) return false;
            const mixed = pattern.steps.some((other) => other.role !== s.role);
            return progress >= from + (mixed && from > 0 ? TEACH_ALONE : 0);
        });
    return PATTERNS.filter(
        (p) =>
            p.cost <= budget &&
            unlocked(p) &&
            // Planned ones come at their planned moments, never at random.
            pacing.planned?.[p.id] === undefined &&
            // Never two of the hardest patterns back to back
            !(p.cost >= 4 && lastCost >= 4) &&
            doublesIn(p) <= doublesAllowed
    );
};

/** How many double jumps a pattern asks for: one for each wide block or void. */
const doublesIn = (pattern: Pattern) => pattern.steps.filter((s) => moveFor(s.role) === 'double').length;

/** Double jumps already asked for and not reached yet: wide blocks and voids on their way. */
const doubleObstaclesAhead = (state: GameState) =>
    state.obstacles.filter((o) => !o.passed && moveFor(o.role) === 'double').length;
/** And the double arcs of pickups on their way (pickups.ts marks the top of each). */
const doubleArcsAhead = (state: GameState) =>
    state.pickups.filter((p) => p.needsDouble && p.x > PLAYER_X).length;

/**
 * Can `count` more double jumps be asked for? Energy only goes down when the player double
 * jumps, so the bar now, less a double jump for everything already on its way, is the least a
 * player who isn't wasting it will have when these arrive: that has to cover them. Leaving the
 * optional double arcs aside, one double jump also has to leave some spare for a slip. Two (a
 * pair of voids) take the whole bar, so they need it full with nothing else on its way.
 */
export const canAskForDouble = (state: GameState, count = 1) => {
    const obstacles = doubleObstaclesAhead(state);
    const all = obstacles + doubleArcsAhead(state);
    const needed = JUMP_ENERGY_COST * count;
    const spare = count > 1 ? 0 : DOUBLE_SPARE_ENERGY;
    return (
        state.energy - JUMP_ENERGY_COST * all >= needed &&
        state.energy - JUMP_ENERGY_COST * obstacles >= needed + spare
    );
};

/** How many double jumps can be asked for now (0, 1 or 2), from the energy bar and the cooldown. */
const doublesAllowedNow = (state: GameState) => {
    if (state.elapsedSecInStage - state.spawner.lastHugeSec < DOUBLE_COOLDOWN_SEC) return 0;
    if (canAskForDouble(state, 2)) return 2;
    return canAskForDouble(state) ? 1 : 0;
};

/** The planned patterns whose moment has come (`pacing.planned`), earliest due first. */
const duePlanned = (state: GameState, pacing: StagePacing): Pattern[] =>
    Object.entries(pacing.planned ?? {})
        .map(([id, at]) => ({ pattern: PATTERNS.find((p) => p.id === id), due: at?.[state.spawner.plannedPlaced[id] ?? 0] }))
        .filter((p): p is { pattern: Pattern; due: number } => !!p.pattern && p.due !== undefined && state.stageProgress >= p.due)
        .sort((a, b) => a.due - b.due)
        .map((p) => p.pattern);

/**
 * Steps this close behind the one before (two blocks one jump clears) stay that close: they
 * belong to the same jump, so only the first of them goes on the beat.
 */
export const SAME_JUMP_SEC = 0.2;

/**
 * A pattern step's timing, moved onto the beat grid so every obstacle lands in time: the
 * nearest point, unless that's more than a little earlier than designed.
 */
const onGrid = (at: number, grid: number) => {
    const nearest = Math.round(at / grid) * grid;
    return nearest < at - GRID_EARLY_SEC ? Math.ceil(at / grid) * grid : nearest;
};
/** The most a step is moved earlier than designed, to put it on the grid. */
const GRID_EARLY_SEC = 0.06;

/**
 * Every step's timing in a pattern, on the grid (see onGrid). Tight pairs stay tight, and no
 * gap between two steps ends up more than a little shorter than designed.
 */
const gridTimings = (steps: PatternStep[], grid: number) => {
    const timings: number[] = [];
    steps.forEach((step, i) => {
        const gap = i > 0 ? step.at - steps[i - 1].at : Infinity;
        if (gap <= SAME_JUMP_SEC) {
            timings.push(timings[i - 1] + gap);
            return;
        }
        let at = onGrid(step.at, grid);
        while (i > 0 && at - timings[i - 1] < gap - GRID_EARLY_SEC) at += grid;
        timings.push(at);
    });
    return timings;
};

/** How much less likely a pattern is when it came up in the last few. */
const RECENT_WEIGHT = 0.35;

/**
 * Pick one, leaning towards the harder end of what's allowed and towards the patterns this
 * stage favours. Never the same pattern twice running (unless it's the only choice), and
 * less often one that came up in the last few.
 */
const pickPattern = (
    allowed: Pattern[],
    budget: number,
    random: () => number,
    recent: string[] = [],
    favour: StagePacing['favour'] = {}
): Pattern => {
    const fresh = allowed.filter((p) => p.id !== recent[0]);
    const patterns = fresh.length > 0 ? fresh : allowed;
    if (patterns.length === 0) return PATTERNS[0];
    const weights = patterns.map((p) =>
        (1 + (2 * p.cost) / Math.max(1, budget)) *
        (favour[p.id] ?? 1) *
        (recent.includes(p.id) ? RECENT_WEIGHT : 1)
    );
    let roll = random() * weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < patterns.length; i++) {
        roll -= weights[i];
        if (roll <= 0) return patterns[i];
    }
    return patterns[patterns.length - 1];
};

/**
 * Places whole patterns of obstacles, one after another, with a rest after each.
 * Called every frame; it only does anything when the last pattern has scrolled far enough
 * in that the next one is due.
 */
export const spawnObstacle = (
    state: GameState,
    currentStage: StageConfig,
    deltaTimeSec: number,
    random: () => number = Math.random
) => {
    const spawner = state.spawner;
    const speed = state.speed; // pixels per second
    const speedPerFrame = speed / 60;

    // The last pattern scrolls left with everything else.
    spawner.endX -= speedPerFrame * frameScale(deltaTimeSec);

    // Not due yet: the rest after the last pattern isn't near the spawn point. It's due one
    // beat early, so the next pattern can go on whichever beat is nearest the end of the rest.
    const grid = beatGridSec(currentStage);
    if (spawner.lastRole && spawner.endX + spawner.restSec * speed > SPAWN_X + grid * speed) return;

    const progress = state.stageProgress;
    // How built up the stage is, following its music: sets the budget, rests and breathers.
    const built = buildAt(currentStage, progress);
    const nowSec = state.elapsedSecInStage;
    const { pacing } = currentStage;

    const doublesAllowed = doublesAllowedNow(state);
    const due = duePlanned(state, pacing);
    const planned = due.find((p) => doublesIn(p) <= doublesAllowed) ?? null;
    // A planned one waiting for the energy bar to fill: nothing else asks for a double jump
    // meanwhile, so it fills.
    const waiting = !planned && due.some((p) => doublesIn(p) > 0);
    const pattern = planned ?? pickPattern(
        availablePatterns(pacing, progress, built, spawner.lastCost, waiting ? 0 : doublesAllowed),
        blend(pacing.budget, built),
        random,
        spawner.recent,
        pacing.favour
    );
    if (planned) spawner.plannedPlaced[planned.id] = (spawner.plannedPlaced[planned.id] ?? 0) + 1;

    // On the beat: the first obstacle reaches the runner on the music's beat grid, on the beat
    // nearest the end of the rest. Never sooner than the gap what came before needs (the
    // fairness rule, patterns.ts), and never before the spawn point, where it would pop into view.
    const first = pattern.steps[0].role;
    const { firstSec } = currentStage.beat;
    const runnerX = PLAYER_X + PLAYER_SIZE / 2;
    const arrivalAt = (x: number) => nowSec + (x + shapeFor(first).width / 2 - runnerX) / speed;
    const beatsIn = (sec: number) => (sec - firstSec) / grid;
    let startX = SPAWN_X;
    let onBeat = firstSec + Math.ceil(beatsIn(arrivalAt(SPAWN_X))) * grid;
    if (spawner.lastRole) {
        const earliestX = Math.max(SPAWN_X, spawner.endX + minGapSec(spawner.lastRole, first) * speed);
        const wantedX = Math.max(earliestX, spawner.endX + spawner.restSec * speed);
        const earliest = arrivalAt(earliestX);
        onBeat = firstSec + Math.round(beatsIn(arrivalAt(wantedX))) * grid;
        if (onBeat < earliest - 1e-9) onBeat = firstSec + Math.ceil(beatsIn(earliest) - 1e-9) * grid;
        startX = earliestX;
    }
    startX += (onBeat - arrivalAt(startX)) * speed;

    let endX = startX;
    const placedFrom = state.obstacles.length;
    // Steps are timed by their centres (where the beat lands), not their front edges, so a
    // wide block and a narrow one both arrive exactly on the beat.
    const firstCentre = startX + shapeFor(first).width / 2;
    // Closer together as the stage builds to its finish.
    const timings = gridTimings(closedUp(pattern, blend([1, TIGHTEST_SPACING], built)), grid);
    for (const [i, step] of pattern.steps.entries()) {
        const x = firstCentre + timings[i] * speed - shapeFor(step.role).width / 2;
        state.obstacles.push({
            x,
            id: nextId++,
            role: step.role,
            phase: shapeFor(step.role).moves ? random() * Math.PI : undefined,
        });
        endX = Math.max(endX, x + shapeFor(step.role).width);
    }
    if (doublesIn(pattern) > 0) spawner.lastHugeSec = nowSec;

    // Mostly short rests, and now and then a breather of about a second.
    const breather = nowSec - spawner.lastBreatherSec >= blend(pacing.breatherEverySec, built);
    if (breather) spawner.lastBreatherSec = nowSec;
    const usualRest = breather
        ? BREATHER_SEC + random() * REST_JITTER
        : blend(pacing.rest, built) + pattern.cost * REST_PER_COST + random() * REST_JITTER;

    // Hearts go in the middle of a rest: always when you're badly hurt, sometimes when you're
    // only a little hurt. Each stage sets how generous that is. The rests are short, so a rest
    // with a heart in it is stretched to make room.
    const { health, maxHealth } = state.player;
    const { hearts } = pacing;
    const sinceHeart = nowSec - spawner.lastHeartSec;
    const wantHeart =
        (health <= maxHealth * hearts.hurtBelow && sinceHeart >= hearts.hurtEverySec) ||
        (health < maxHealth && sinceHeart >= hearts.topUpEverySec && random() < hearts.topUpChance);
    const rest = wantHeart ? Math.max(usualRest, HEART_MIN_REST) : usualRest;
    const placed = state.obstacles.slice(placedFrom);
    const heartPlaced = wantHeart;
    if (heartPlaced) {
        state.obstacles.push({
            x: endX + (rest / 2) * speed - shapeFor('heart').width / 2,
            id: nextId++,
            role: 'heart',
        });
        spawner.lastHeartSec = nowSec;
    }

    // Something to collect: arcs over the blocks, a line under the bars, and a trail through
    // the rest. A double arc only where the energy bar allows one more double jump.
    placePickups(state, pacing, placed, endX, rest, heartPlaced, random, () => !waiting && canAskForDouble(state));

    spawner.endX = endX;
    spawner.restSec = rest;
    spawner.lastRole = pattern.steps[pattern.steps.length - 1].role;
    spawner.lastCost = pattern.cost;
    spawner.recent = [pattern.id, ...spawner.recent].slice(0, RECENT_KEPT);
};

/** Start the spawner afresh, for a new run or a new stage. Clears any pickups left over. */
export const resetSpawner = (state: GameState) => {
    nextId = 0;
    state.spawner = createSpawnerState();
    resetPickups(state);
};
