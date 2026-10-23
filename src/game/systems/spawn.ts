import { JUMP_ENERGY_COST, PLAYER_SIZE, PLAYER_X, SCREEN_WIDTH } from '../constants';
import { frameScale } from '../frame';
import { shapeFor } from '../obstacleCatalogue';
import { minGapSec, Pattern, PATTERNS } from '../patterns';
import { placePickups, resetPickups } from '../pickups';
import { beatGridSec, StageConfig, StagePacing } from '../stages';
import { createSpawnerState, GameState } from '../state';

let nextId = 0;

/**
 * Where new obstacles appear: just past the right edge of the widest phone screen, so
 * nothing pops into view part-way across.
 */
export const SPAWN_X = SCREEN_WIDTH + 100;

/** Extra breathing space per point of pattern cost, so a hard pattern is followed by a rest. */
const REST_PER_COST = 0.15;
/** A little randomness in the rests, so the rhythm doesn't feel mechanical. */
const REST_JITTER = 0.25;
/** A wide block needs the whole energy bar, which takes 3.3 sec on the ground to refill. */
const HUGE_COOLDOWN_SEC = 6;
/** A heart only goes in a rest at least this long, so it never crowds an obstacle. */
const HEART_MIN_REST = 0.9;

const blend = ([start, end]: [number, number], progress: number) =>
    start + (end - start) * progress;

/** The patterns this stage allows right now, given its budget and what's been unlocked. */
export const availablePatterns = (
    pacing: StagePacing,
    progress: number,
    lastCost: number,
    hugeAllowed: boolean
): Pattern[] => {
    const budget = blend(pacing.budget, progress);
    const unlocked = (pattern: Pattern) =>
        pattern.steps.every((s) => {
            const from = pacing.unlocks[s.role];
            return from !== undefined && progress >= from;
        });
    return PATTERNS.filter(
        (p) =>
            p.cost <= budget &&
            unlocked(p) &&
            // Never two of the hardest patterns back to back
            !(p.cost >= 4 && lastCost >= 4) &&
            (hugeAllowed || !p.steps.some((s) => s.role === 'huge'))
    );
};

/**
 * A pattern step's timing, moved onto the beat grid so every obstacle lands in time. Steps
 * meant to be very close together (like two blocks one jump clears) keep their tight spacing,
 * and nothing is moved more than a little earlier than designed.
 */
const onGrid = (at: number, grid: number) => {
    if (at < grid / 2) return at;
    const nearest = Math.round(at / grid) * grid;
    return nearest < at - 0.06 ? Math.ceil(at / grid) * grid : nearest;
};

/** Pick one, leaning towards the harder end of what's allowed. */
const pickPattern = (patterns: Pattern[], budget: number, random: () => number): Pattern => {
    if (patterns.length === 0) return PATTERNS[0];
    const weights = patterns.map((p) => 1 + (2 * p.cost) / Math.max(1, budget));
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

    // Not due yet: the rest after the last pattern hasn't reached the spawn point.
    if (spawner.lastRole && spawner.endX + spawner.restSec * speed > SPAWN_X) return;

    const progress = state.stageProgress;
    const nowSec = state.elapsedSecInStage;
    const { pacing } = currentStage;

    const hugeAllowed =
        state.energy >= JUMP_ENERGY_COST && nowSec - spawner.lastHugeSec >= HUGE_COOLDOWN_SEC;
    const pattern = pickPattern(
        availablePatterns(pacing, progress, spawner.lastCost, hugeAllowed),
        blend(pacing.budget, progress),
        random
    );

    // The first obstacle goes after the rest, or further if what came before needs more room.
    const first = pattern.steps[0].role;
    let startX = spawner.lastRole
        ? spawner.endX + Math.max(spawner.restSec, minGapSec(spawner.lastRole, first)) * speed
        : SPAWN_X;

    // On the beat: push the pattern back (never forward, which could break a gap rule) so its
    // first obstacle reaches the runner exactly on the music's beat grid.
    const grid = beatGridSec(currentStage);
    const { firstSec } = currentStage.beat;
    const runnerX = PLAYER_X + PLAYER_SIZE / 2;
    const arrival = nowSec + (startX + shapeFor(first).width / 2 - runnerX) / speed;
    const onBeat = firstSec + Math.ceil((arrival - firstSec) / grid) * grid;
    startX += (onBeat - arrival) * speed;

    let endX = startX;
    const placedFrom = state.obstacles.length;
    // Steps are timed by their centres (where the beat lands), not their front edges, so a
    // wide block and a narrow one both arrive exactly on the beat.
    const firstCentre = startX + shapeFor(first).width / 2;
    for (const step of pattern.steps) {
        const x = firstCentre + onGrid(step.at, grid) * speed - shapeFor(step.role).width / 2;
        state.obstacles.push({
            x,
            id: nextId++,
            role: step.role,
            phase: step.role === 'mover' ? random() * Math.PI : undefined,
        });
        endX = Math.max(endX, x + shapeFor(step.role).width);
    }
    if (pattern.steps.some((s) => s.role === 'huge')) spawner.lastHugeSec = nowSec;

    const rest = blend(pacing.rest, progress) + pattern.cost * REST_PER_COST + random() * REST_JITTER;

    // Hearts go in the middle of a long enough rest: always when you're badly hurt,
    // sometimes when you're only a little hurt. Each stage sets how generous that is.
    const { health, maxHealth } = state.player;
    const { hearts } = pacing;
    const sinceHeart = nowSec - spawner.lastHeartSec;
    const wantHeart =
        (health <= maxHealth * hearts.hurtBelow && sinceHeart >= hearts.hurtEverySec) ||
        (health < maxHealth && sinceHeart >= hearts.topUpEverySec && random() < hearts.topUpChance);
    const placed = state.obstacles.slice(placedFrom);
    const heartPlaced = wantHeart && rest >= HEART_MIN_REST;
    if (heartPlaced) {
        state.obstacles.push({
            x: endX + (rest / 2) * speed - shapeFor('heart').width / 2,
            id: nextId++,
            role: 'heart',
        });
        spawner.lastHeartSec = nowSec;
    }

    // Something to collect: arcs over the blocks, and a trail through the rest.
    placePickups(state, placed, endX, rest, heartPlaced, random);

    spawner.endX = endX;
    spawner.restSec = rest;
    spawner.lastRole = pattern.steps[pattern.steps.length - 1].role;
    spawner.lastCost = pattern.cost;
};

/** Start the spawner afresh, for a new run or a new stage. Clears any pickups left over. */
export const resetSpawner = (state: GameState) => {
    nextId = 0;
    state.spawner = createSpawnerState();
    resetPickups(state);
};
