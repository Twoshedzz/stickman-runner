/**
 * How hard is each stage? The pretend player (src/game/difficulty/pretendPlayer.ts) plays
 * every stage many times at each skill level, and this sums it up.
 *
 *   npm run difficulty        - the full report, written to docs/DIFFICULTY.md (a few minutes)
 *   npm test                  - just a quick check that the pretend player still works
 *
 * DIFFICULTY_RUNS sets how many runs per stage and skill (default 12).
 */
import fs from 'fs';
import path from 'path';
import { RunResult, playStage, SKILLS } from '../difficulty/pretendPlayer';
import { STAGES } from '../stages';
import { MAX_HEALTH } from '../constants';

const FULL = process.env.DIFFICULTY_REPORT === '1';
const RUNS = Number(process.env.DIFFICULTY_RUNS ?? 12);

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
const fixed = (n: number, digits = 1) => n.toFixed(digits);

describe('the pretend player', () => {
    it('plays a stage through, and a steady player gets most of the way', () => {
        const result = playStage(STAGES[0], SKILLS[0], 1);
        expect(result.seconds).toBeGreaterThan(30);
        expect(result.obstacles).toBeGreaterThan(10);
        expect(result.hits).toBeLessThan(result.obstacles / 2);
    });
});

(FULL ? describe : describe.skip)('difficulty report', () => {
    it('plays every stage at every skill level', () => {
        const rows: string[] = [];
        const summary: string[] = [];
        /** Timing windows by stage and role, gathered from the average player's runs. */
        const windowRows: string[] = [];
        /** How busy it is, the voids and the diamonds. */
        const paceRows: string[] = [];
        /** Obstacles met by kind, from the steady player's runs (who sees every stage to the end). */
        const kindRows: string[] = [];
        const KINDS = ['small', 'large', 'mover', 'overhead', 'hole', 'huge', 'void'] as const;
        for (const skill of SKILLS) {
            for (const stage of STAGES) {
                const runs: RunResult[] = [];
                for (let seed = 1; seed <= RUNS; seed++) runs.push(playStage(stage, skill, seed));
                const survived = runs.filter((r) => r.survived).length / runs.length;
                const byRole: Record<string, number> = {};
                for (const r of runs) {
                    for (const [role, n] of Object.entries(r.hitsBy)) byRole[role] = (byRole[role] ?? 0) + (n ?? 0);
                }
                const worst = Object.entries(byRole)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 3)
                    .map(([role, n]) => `${role} ${fixed(n / runs.length)}`)
                    .join(', ');
                const noWay = runs.reduce((a, r) => a + r.noWayThrough, 0);
                rows.push(
                    `| ${skill.name} | ${stage.name} | ${Math.round(survived * 100)}% | ${fixed(mean(runs.map((r) => r.hits)))} ` +
                    `| ${fixed(mean(runs.map((r) => r.damage)))} | ${fixed(mean(runs.map((r) => r.healed)))} ` +
                    `| ${fixed(mean(runs.map((r) => r.seconds)), 0)}s | ${fixed(mean(runs.map((r) => r.obstacles)), 0)} ` +
                    `| ${worst || '-'} | ${noWay} |`
                );
                const rests = runs.flatMap((r) => r.rests);
                const minutes = runs.reduce((a, r) => a + r.seconds, 0) / 60;
                const longRests = rests.filter((sec) => sec > 1).length;
                const voids = runs.map((r) => r.voids);
                paceRows.push(
                    `| ${skill.name} | ${stage.name} | ${Math.round(mean(runs.map((r) => r.busyShare)) * 100)}% ` +
                    `| ${Math.round((longRests / Math.max(1, rests.length)) * 100)}% | ${fixed(longRests / minutes)} ` +
                    `| ${fixed(mean(runs.map((r) => Math.max(0, ...r.rests))))}s (${fixed(Math.max(0, ...rests))}s) ` +
                    `| ${fixed(mean(voids))} (${Math.min(...voids)}-${Math.max(...voids)}) ` +
                    `| ${fixed(runs.reduce((a, r) => a + r.pickupsPlaced, 0) / minutes, 0)} ` +
                    `| ${fixed(mean(runs.map((r) => r.pickupsCollected)), 0)} of ${fixed(mean(runs.map((r) => r.pickupsPlaced)), 0)} ` +
                    `| ${fixed(mean(runs.map((r) => r.longestWithoutPickupSec)))}s (${fixed(Math.max(...runs.map((r) => r.longestWithoutPickupSec)))}s) |`
                );
                if (skill.name === 'steady') {
                    const cells = KINDS.map((kind) => fixed(mean(runs.map((r) => r.obstaclesBy[kind] ?? 0)), 0));
                    kindRows.push(`| ${stage.name} | ${cells.join(' | ')} |`);
                }
                if (skill.name === 'average') {
                    const all: Record<string, number[]> = {};
                    for (const r of runs) {
                        for (const [role, ws] of Object.entries(r.windows)) (all[role] ??= []).push(...(ws ?? []));
                    }
                    const cells = Object.entries(all)
                        .sort((a, b) => a[0].localeCompare(b[0]))
                        .map(([role, ws]) => {
                            const sorted = [...ws].sort((a, b) => a - b);
                            return `${role} ${fixed(sorted[Math.floor(sorted.length / 2)], 2)} (tightest ${fixed(sorted[0], 2)})`;
                        });
                    windowRows.push(`| ${stage.name} | ${cells.join(', ')} |`);
                }
                summary.push(`${skill.name.padEnd(9)} ${stage.name.padEnd(19)} survive ${String(Math.round(survived * 100)).padStart(3)}%  hits ${fixed(mean(runs.map((r) => r.hits)))}`);
            }
        }

        const report = [
            '# Difficulty report',
            '',
            'Written by `npm run difficulty`: the pretend player (`src/game/difficulty/pretendPlayer.ts`)',
            `plays each stage ${RUNS} times at each skill level, from full health (${MAX_HEALTH}), with the real`,
            'game code. Do not edit by hand; run it again after changing obstacles, patterns or pacing.',
            '',
            'Skill levels: how far off each press lands (standard deviation), and how often an obstacle',
            'gets no reaction at all.',
            '',
            ...SKILLS.map((s) => `- **${s.name}**: ±${s.timingSdSec.toFixed(2)} sec, misses ${Math.round(s.slipChance * 100)} in 100`),
            '',
            '| Skill | Stage | Survives | Hits | Health lost | Hearts healed | Lasts | Obstacles | Hit most by (per run) | No way through |',
            '|---|---|---|---|---|---|---|---|---|---|',
            ...rows,
            '',
            '## Pace, voids and diamonds',
            '',
            '- **Busy**: the share of the time spent jumping or ducking for something. Each obstacle',
            '  keeps the player busy for as long as its move takes (a jump 0.67 sec, a duck 0.55 sec,',
            '  a double jump 1.2 sec), centred on it.',
            '- **Rests**: the gaps in between. The share of them longer than a second, how many of those',
            '  come a minute, and the longest rest (typical run, and the longest in any run).',
            '- **Voids** per run (fewest-most), **diamonds** reaching the runner a minute, how many the',
            '  pretend player collects without trying to (it only aims for the obstacles), and the',
            '  longest stretch with no diamond coming (typical run, and the longest in any run).',
            '',
            '| Skill | Stage | Busy | Rests over 1 s | …a minute | Longest rest | Voids | Diamonds a minute | Collected | Longest without |',
            '|---|---|---|---|---|---|---|---|---|---|',
            ...paceRows,
            '',
            '## Obstacles by kind',
            '',
            'How many of each kind a run meets, from the steady player\'s runs.',
            '',
            `| Stage | ${KINDS.join(' | ')} |`,
            `|---|${KINDS.map(() => '---').join('|')}|`,
            ...kindRows,
            '',
            '## Timing windows',
            '',
            'How long the player has to press, in seconds, for each kind of obstacle: the typical',
            'window, and the tightest one met. Wider is more forgiving. Groups (two blocks one jump',
            'clears) count under their first obstacle.',
            '',
            '| Stage | Window by obstacle |',
            '|---|---|',
            ...windowRows,
            '',
            '"No way through" counts obstacles the player met with no timing at all that got past (for',
            'example a wide block with too little energy for the double jump). It should be 0.',
            '',
        ].join('\n');
        fs.writeFileSync(path.join(__dirname, '../../../docs/DIFFICULTY.md'), report);
        console.log(summary.join('\n'));
    });
});
