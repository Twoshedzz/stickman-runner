# Difficulty report: the pace test

Written by `npm run difficulty` on the step 12 test branch: the pretend player
(`src/game/difficulty/pretendPlayer.ts`) plays each stage 20 times at each skill level and
each pace option. The player's timing stays in real seconds and real frames, so a faster
game leaves it less room. Every time and "a minute" here is real time. Do not edit by hand.

## The four options compared

- **World px/sec**: how fast the world really moves, at the start → end of the stage.
- **Obstacles, a minute, time acting, rests, voids, diamonds**: from the steady player's runs,
  who see most stages to the end. **Time acting** is the share of the time spent jumping or
  ducking for something. **Typical rest** is the middle one of the gaps in between, and **rests
  over 1 s** gives their share and how many a minute.
- **Survives**: steady / average / beginner.
- **No way through** and **after a slip**: all skills added up, as explained below.

| Option | Stage | Pace | World px/sec | Obstacles | …a minute | Time acting | Typical rest | Rests over 1 s (a minute) | Voids | Diamonds a minute | Survives | No way through | After a slip |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| A | NEON CITY | 1.0 | 260 → 300 | 194 | 65 | 63% | 0.39s | 8% (3.9) | 3.0 | 160 | 100% / 85% / 0% | 0 | 0 |
| A | SUNSET BEACH | 1.0 | 280 → 320 | 181 | 62 | 63% | 0.33s | 7% (3.8) | 4.0 | 161 | 100% / 75% / 0% | 0 | 0 |
| A | MIDNIGHT MOUNTAINS | 1.0 | 300 → 340 | 199 | 68 | 67% | 0.38s | 7% (3.1) | 4.0 | 164 | 100% / 70% / 10% | 0 | 0 |
| A | VICTORY DAWN | 1.0 | 320 → 360 | 200 | 67 | 66% | 0.44s | 7% (3.0) | 5.0 | 170 | 100% / 65% / 0% | 0 | 0 |
| B | NEON CITY | 1.3 | 338 → 390 | 266 | 89 | 64% | 0.30s | 2% (1.1) | 3.0 | 218 | 100% / 55% / 0% | 0 | 0 |
| B | SUNSET BEACH | 1.3 | 364 → 416 | 245 | 85 | 64% | 0.26s | 2% (1.6) | 4.0 | 224 | 100% / 10% / 0% | 0 | 0 |
| B | MIDNIGHT MOUNTAINS | 1.3 | 390 → 442 | 271 | 93 | 69% | 0.25s | 1% (0.5) | 4.0 | 216 | 100% / 25% / 0% | 0 | 0 |
| B | VICTORY DAWN | 1.3 | 416 → 468 | 259 | 90 | 66% | 0.28s | 1% (0.8) | 4.8 | 224 | 95% / 10% / 0% | 0 | 0 |
| C | NEON CITY | 1.0 → 1.2 | 260 → 360 | 224 | 75 | 64% | 0.35s | 8% (4.2) | 3.0 | 183 | 100% / 70% / 0% | 0 | 0 |
| C | SUNSET BEACH | 1.1 → 1.3 | 308 → 416 | 227 | 78 | 64% | 0.29s | 7% (3.8) | 4.0 | 201 | 100% / 30% / 0% | 0 | 0 |
| C | MIDNIGHT MOUNTAINS | 1.2 → 1.4 | 360 → 476 | 272 | 93 | 69% | 0.24s | 2% (1.1) | 4.0 | 215 | 100% / 25% / 0% | 0 | 0 |
| C | VICTORY DAWN | 1.3 → 1.5 | 416 → 540 | 278 | 97 | 66% | 0.25s | 0% (0.2) | 4.8 | 248 | 95% / 10% / 0% | 0 | 0 |
| D | NEON CITY | 1.1 → 1.4 | 286 → 420 | 257 | 86 | 65% | 0.29s | 5% (3.0) | 3.0 | 212 | 100% / 50% / 0% | 0 | 0 |
| D | SUNSET BEACH | 1.2 → 1.5 | 336 → 480 | 257 | 89 | 64% | 0.25s | 2% (1.4) | 4.0 | 236 | 100% / 10% / 0% | 0 | 0 |
| D | MIDNIGHT MOUNTAINS | 1.3 → 1.6 | 390 → 544 | 304 | 103 | 69% | 0.22s | 0% (0.1) | 4.0 | 245 | 100% / 5% / 0% | 0 | 0 |
| D | VICTORY DAWN | 1.4 → 1.7 | 448 → 612 | 304 | 107 | 66% | 0.22s | 0% (0.0) | 4.7 | 271 | 90% / 0% / 0% | 0 | 0 |

## The highest possible score

Every obstacle and diamond any of a few runs places, all at ×4 (more than anyone could really get), against the world board's limit, `MAX_SCORE` = 20000. The last column is the best a steady pretend player scored in each stage, added up.

| Option | Highest possible | Against MAX_SCORE | Steady player's best |
|---|---|---|---|
| A: today | 11876 | under by 8124 | 8989 |
| B: flat | 16016 | under by 3984 | 12762 |
| C: gentle curve | 15132 | under by 4868 | 12251 |
| D: bold curve | 17376 | under by 2624 | 13415 |

## The pattern bot

The search bot (`src/game/difficulty/patternBot.ts`) looks for a timing that clears each thing,
allowing ±3 real frames. Every pattern at each speed and pace an option's stages start or end
at (as designed and closed up), and whole stages of live-spawned obstacles with 3 seeds.

| Option | Patterns cleared | Whole stages cleared | Could not clear |
|---|---|---|---|
| A | 840 of 840 | 12 of 12 | - |
| B | 840 of 840 | 12 of 12 | - |
| C | 840 of 840 | 12 of 12 | - |
| D | 1120 of 1120 | 12 of 12 | - |

# Option A: today

Written by `npm run difficulty`: the pretend player (`src/game/difficulty/pretendPlayer.ts`)
plays each stage 20 times at each skill level, from full health (10), with the real
game code. Do not edit by hand; run it again after changing obstacles, patterns or pacing.

Skill levels: how far off each press lands (standard deviation), and how often an obstacle
gets no reaction at all.

- **steady**: ±0.04 sec, misses 1 in 100
- **average**: ±0.07 sec, misses 3 in 100
- **beginner**: ±0.11 sec, misses 6 in 100

| Skill | Stage | Survives | Hits | Health lost | Hearts healed | Lasts | Obstacles | Hit most by (per run) | No way through | After a slip |
|---|---|---|---|---|---|---|---|---|---|---|
| steady | NEON CITY | 100% | 1.6 | 4.8 | 4.1 | 180s | 194 | overhead 0.5, small 0.5, hole 0.3 | 0 | 0 |
| steady | SUNSET BEACH | 100% | 1.6 | 4.3 | 3.7 | 174s | 181 | small 0.7, hole 0.4, overhead 0.3 | 0 | 0 |
| steady | MIDNIGHT MOUNTAINS | 100% | 1.9 | 5.0 | 4.3 | 176s | 199 | small 0.8, overhead 0.5, mover 0.3 | 0 | 0 |
| steady | VICTORY DAWN | 100% | 1.9 | 5.3 | 4.3 | 178s | 200 | overhead 0.7, small 0.6, hole 0.4 | 0 | 0 |
| average | NEON CITY | 85% | 7.0 | 19.4 | 16.8 | 171s | 184 | small 2.9, overhead 2.0, large 0.8 | 0 | 0 |
| average | SUNSET BEACH | 75% | 5.5 | 15.3 | 10.9 | 153s | 158 | small 1.7, overhead 1.6, hole 1.0 | 0 | 0 |
| average | MIDNIGHT MOUNTAINS | 70% | 6.7 | 18.6 | 12.9 | 153s | 174 | small 2.4, overhead 2.3, mover 0.8 | 0 | 0 |
| average | VICTORY DAWN | 65% | 5.8 | 15.8 | 9.5 | 152s | 168 | overhead 2.4, small 1.6, hole 0.8 | 0 | 0 |
| beginner | NEON CITY | 0% | 8.7 | 23.4 | 13.6 | 80s | 85 | small 3.5, overhead 1.9, large 1.4 | 0 | 0 |
| beginner | SUNSET BEACH | 0% | 6.8 | 18.1 | 8.1 | 70s | 70 | small 2.5, hole 1.6, overhead 1.1 | 0 | 0 |
| beginner | MIDNIGHT MOUNTAINS | 10% | 6.5 | 16.6 | 7.0 | 64s | 73 | small 3.1, overhead 1.4, mover 0.7 | 0 | 0 |
| beginner | VICTORY DAWN | 0% | 5.3 | 13.8 | 3.8 | 49s | 52 | small 1.9, overhead 1.1, mover 0.9 | 0 | 0 |

## Pace, voids and diamonds

- **Busy**: the share of the time spent jumping or ducking for something. Each obstacle
  keeps the player busy for as long as its move takes (a jump 0.67 sec, a duck 0.55 sec,
  a double jump 1.2 sec), centred on it.
- **Rests**: the gaps in between. The share of them longer than a second, how many of those
  come a minute, and the longest rest (typical run, and the longest in any run).
- **Voids** per run (fewest-most), **diamonds** reaching the runner a minute, how many the
  pretend player collects without trying to (it only aims for the obstacles), and the
  longest stretch with no diamond coming (typical run, and the longest in any run).

| Skill | Stage | Busy | Rests over 1 s | …a minute | Longest rest | Voids | Diamonds a minute | Collected | Longest without |
|---|---|---|---|---|---|---|---|---|---|
| steady | NEON CITY | 63% | 8% | 3.9 | 1.4s (1.5s) | 3.0 (3-3) | 160 | 475 of 480 | 7.7s (10.2s) |
| steady | SUNSET BEACH | 63% | 7% | 3.8 | 1.4s (1.5s) | 4.0 (4-4) | 161 | 438 of 467 | 8.5s (13.1s) |
| steady | MIDNIGHT MOUNTAINS | 67% | 7% | 3.1 | 1.4s (1.5s) | 4.0 (4-4) | 164 | 422 of 480 | 8.3s (12.9s) |
| steady | VICTORY DAWN | 66% | 7% | 3.0 | 1.3s (1.4s) | 5.0 (5-5) | 170 | 411 of 504 | 7.6s (13.1s) |
| average | NEON CITY | 62% | 8% | 3.9 | 1.4s (1.5s) | 2.6 (0-3) | 161 | 440 of 457 | 7.9s (11.6s) |
| average | SUNSET BEACH | 62% | 8% | 3.8 | 1.4s (1.6s) | 3.4 (0-4) | 163 | 381 of 417 | 8.0s (13.0s) |
| average | MIDNIGHT MOUNTAINS | 66% | 7% | 3.1 | 1.3s (1.4s) | 3.4 (0-4) | 159 | 343 of 407 | 7.3s (11.5s) |
| average | VICTORY DAWN | 64% | 7% | 3.2 | 1.3s (1.4s) | 4.0 (1-5) | 169 | 338 of 429 | 7.4s (11.6s) |
| beginner | NEON CITY | 56% | 9% | 4.5 | 1.4s (1.5s) | 0.5 (0-3) | 159 | 194 of 212 | 5.3s (7.2s) |
| beginner | SUNSET BEACH | 56% | 9% | 4.4 | 1.3s (1.5s) | 0.7 (0-4) | 172 | 169 of 200 | 5.5s (10.0s) |
| beginner | MIDNIGHT MOUNTAINS | 61% | 8% | 3.5 | 1.3s (1.4s) | 0.8 (0-4) | 162 | 132 of 173 | 6.3s (12.1s) |
| beginner | VICTORY DAWN | 55% | 9% | 3.9 | 1.3s (1.3s) | 0.5 (0-3) | 181 | 107 of 149 | 3.8s (7.0s) |

## The build

Each stage eases in and builds to its busiest at the end. The same measures for the first
third of each stage → the last third: the share of time busy, rests over a second a
minute, the longest rest, and obstacles a minute. Only the part of each run played counts.

| Skill | Stage | Busy | Rests over 1 s a minute | Longest rest | Obstacles a minute |
|---|---|---|---|---|---|
| steady | NEON CITY | 55% → 69% | 5.0 → 2.5 | 1.4s → 1.5s | 59 → 69 |
| steady | SUNSET BEACH | 55% → 67% | 5.1 → 3.1 | 1.4s → 1.4s | 55 → 67 |
| steady | MIDNIGHT MOUNTAINS | 62% → 70% | 4.1 → 2.0 | 1.4s → 1.5s | 64 → 70 |
| steady | VICTORY DAWN | 58% → 71% | 4.0 → 2.0 | 1.4s → 1.4s | 60 → 70 |
| average | NEON CITY | 55% → 69% | 5.0 → 2.4 | 1.4s → 1.5s | 59 → 68 |
| average | SUNSET BEACH | 55% → 67% | 5.0 → 2.9 | 1.4s → 1.4s | 55 → 67 |
| average | MIDNIGHT MOUNTAINS | 62% → 70% | 4.1 → 2.1 | 1.4s → 1.4s | 64 → 71 |
| average | VICTORY DAWN | 58% → 70% | 4.0 → 2.2 | 1.3s → 1.4s | 59 → 69 |

## Obstacles by kind

How many of each kind a run meets, from the steady player's runs.

| Stage | small | large | mover | overhead | hole | huge | void |
|---|---|---|---|---|---|---|---|
| NEON CITY | 76 | 17 | 10 | 66 | 21 | 0 | 3 |
| SUNSET BEACH | 64 | 12 | 11 | 53 | 37 | 0 | 4 |
| MIDNIGHT MOUNTAINS | 81 | 14 | 15 | 62 | 23 | 1 | 4 |
| VICTORY DAWN | 75 | 13 | 11 | 71 | 25 | 0 | 5 |

## Timing windows

How long the player has to press, in seconds, for each kind of obstacle: the typical
window, and the tightest one met. Wider is more forgiving. Groups (two blocks one jump
clears) count under their first obstacle.

| Stage | Window by obstacle |
|---|---|
| NEON CITY | hole 0.43 (tightest 0.35), huge 0.67 (tightest 0.52), large 0.37 (tightest 0.15), mover 0.45 (tightest 0.15), overhead 0.80 (tightest 0.18), small 0.38 (tightest 0.20), void 0.25 (tightest 0.22) |
| SUNSET BEACH | hole 0.45 (tightest 0.32), large 0.38 (tightest 0.27), mover 0.42 (tightest 0.20), overhead 0.82 (tightest 0.35), small 0.43 (tightest 0.13), void 0.30 (tightest 0.25) |
| MIDNIGHT MOUNTAINS | hole 0.45 (tightest 0.32), huge 0.63 (tightest 0.40), large 0.38 (tightest 0.23), mover 0.40 (tightest 0.23), overhead 0.83 (tightest 0.25), small 0.40 (tightest 0.12), void 0.35 (tightest 0.25) |
| VICTORY DAWN | hole 0.47 (tightest 0.28), huge 0.73 (tightest 0.57), large 0.40 (tightest 0.15), mover 0.40 (tightest 0.25), overhead 0.87 (tightest 0.27), small 0.42 (tightest 0.17), void 0.40 (tightest 0.37) |

"No way through" counts obstacles the player met with no timing at all that got past (for
example a wide block with too little energy for the double jump). It should be 0.
"After a slip" counts the same, but only within a few seconds of the player's own slip: a tap
made while still in the air from the last jump is a double jump, which can float into the
next obstacle. The game was fair; the player wasted the energy or the jump.

# Option B: flat

Written by `npm run difficulty`: the pretend player (`src/game/difficulty/pretendPlayer.ts`)
plays each stage 20 times at each skill level, from full health (10), with the real
game code. Do not edit by hand; run it again after changing obstacles, patterns or pacing.

Skill levels: how far off each press lands (standard deviation), and how often an obstacle
gets no reaction at all.

- **steady**: ±0.04 sec, misses 1 in 100
- **average**: ±0.07 sec, misses 3 in 100
- **beginner**: ±0.11 sec, misses 6 in 100

| Skill | Stage | Survives | Hits | Health lost | Hearts healed | Lasts | Obstacles | Hit most by (per run) | No way through | After a slip |
|---|---|---|---|---|---|---|---|---|---|---|
| steady | NEON CITY | 100% | 2.5 | 7.0 | 7.0 | 180s | 266 | overhead 0.9, small 0.8, mover 0.3 | 0 | 0 |
| steady | SUNSET BEACH | 100% | 2.3 | 6.5 | 5.7 | 174s | 245 | small 0.8, overhead 0.7, hole 0.5 | 0 | 0 |
| steady | MIDNIGHT MOUNTAINS | 100% | 2.4 | 6.3 | 5.8 | 176s | 271 | small 0.9, overhead 0.9, hole 0.2 | 0 | 0 |
| steady | VICTORY DAWN | 95% | 2.6 | 7.7 | 6.5 | 172s | 259 | overhead 1.4, small 0.5, mover 0.3 | 0 | 0 |
| average | NEON CITY | 55% | 12.7 | 34.6 | 28.6 | 136s | 199 | small 4.6, overhead 3.4, large 1.8 | 0 | 0 |
| average | SUNSET BEACH | 10% | 8.2 | 22.3 | 13.0 | 102s | 140 | small 2.7, hole 1.6, overhead 1.6 | 0 | 0 |
| average | MIDNIGHT MOUNTAINS | 25% | 8.4 | 22.9 | 14.3 | 102s | 154 | small 3.0, overhead 2.2, mover 1.3 | 0 | 0 |
| average | VICTORY DAWN | 10% | 6.8 | 18.2 | 8.8 | 94s | 139 | small 2.3, overhead 1.9, hole 1.1 | 0 | 0 |
| beginner | NEON CITY | 0% | 6.8 | 17.6 | 7.7 | 33s | 46 | small 3.4, overhead 1.7, large 1.0 | 0 | 0 |
| beginner | SUNSET BEACH | 0% | 5.2 | 13.8 | 3.8 | 26s | 32 | small 1.9, hole 1.1, large 0.8 | 0 | 0 |
| beginner | MIDNIGHT MOUNTAINS | 0% | 5.4 | 13.3 | 3.3 | 27s | 40 | small 2.8, mover 0.8, large 0.7 | 0 | 0 |
| beginner | VICTORY DAWN | 0% | 4.8 | 12.3 | 2.3 | 25s | 34 | small 2.0, large 0.9, overhead 0.8 | 0 | 0 |

## Pace, voids and diamonds

- **Busy**: the share of the time spent jumping or ducking for something. Each obstacle
  keeps the player busy for as long as its move takes (a jump 0.67 sec, a duck 0.55 sec,
  a double jump 1.2 sec), centred on it.
- **Rests**: the gaps in between. The share of them longer than a second, how many of those
  come a minute, and the longest rest (typical run, and the longest in any run).
- **Voids** per run (fewest-most), **diamonds** reaching the runner a minute, how many the
  pretend player collects without trying to (it only aims for the obstacles), and the
  longest stretch with no diamond coming (typical run, and the longest in any run).

| Skill | Stage | Busy | Rests over 1 s | …a minute | Longest rest | Voids | Diamonds a minute | Collected | Longest without |
|---|---|---|---|---|---|---|---|---|---|
| steady | NEON CITY | 64% | 2% | 1.1 | 1.1s (1.2s) | 3.0 (3-3) | 218 | 647 of 654 | 5.6s (7.7s) |
| steady | SUNSET BEACH | 64% | 2% | 1.6 | 1.1s (1.1s) | 4.0 (4-4) | 224 | 618 of 650 | 6.0s (10.2s) |
| steady | MIDNIGHT MOUNTAINS | 69% | 1% | 0.5 | 1.0s (1.1s) | 4.0 (4-4) | 216 | 573 of 634 | 5.9s (7.8s) |
| steady | VICTORY DAWN | 66% | 1% | 0.8 | 1.0s (1.1s) | 4.8 (1-5) | 224 | 552 of 642 | 6.0s (9.2s) |
| average | NEON CITY | 61% | 2% | 1.2 | 1.1s (1.1s) | 2.0 (0-3) | 220 | 471 of 501 | 4.9s (9.2s) |
| average | SUNSET BEACH | 60% | 2% | 1.6 | 1.0s (1.1s) | 1.6 (0-4) | 220 | 332 of 374 | 5.0s (9.4s) |
| average | MIDNIGHT MOUNTAINS | 65% | 1% | 0.6 | 1.0s (1.1s) | 1.6 (0-4) | 213 | 302 of 361 | 5.7s (11.8s) |
| average | VICTORY DAWN | 61% | 1% | 0.8 | 1.0s (1.1s) | 1.8 (0-5) | 231 | 288 of 362 | 4.7s (9.8s) |
| beginner | NEON CITY | 52% | 1% | 0.7 | 1.0s (1.0s) | 0.0 (0-0) | 218 | 109 of 119 | 3.2s (5.6s) |
| beginner | SUNSET BEACH | 50% | 2% | 1.0 | 1.0s (1.1s) | 0.1 (0-1) | 229 | 82 of 99 | 3.3s (7.2s) |
| beginner | MIDNIGHT MOUNTAINS | 57% | 1% | 0.4 | 1.0s (1.0s) | 0.1 (0-1) | 190 | 64 of 87 | 4.3s (9.2s) |
| beginner | VICTORY DAWN | 52% | 2% | 1.3 | 1.0s (1.1s) | 0.0 (0-0) | 254 | 77 of 108 | 2.3s (4.3s) |

## The build

Each stage eases in and builds to its busiest at the end. The same measures for the first
third of each stage → the last third: the share of time busy, rests over a second a
minute, the longest rest, and obstacles a minute. Only the part of each run played counts.

| Skill | Stage | Busy | Rests over 1 s a minute | Longest rest | Obstacles a minute |
|---|---|---|---|---|---|
| steady | NEON CITY | 56% → 70% | 1.0 → 0.7 | 1.1s → 1.2s | 79 → 96 |
| steady | SUNSET BEACH | 56% → 70% | 1.8 → 1.1 | 1.1s → 1.1s | 74 → 93 |
| steady | MIDNIGHT MOUNTAINS | 63% → 72% | 0.7 → 0.1 | 1.1s → 1.0s | 85 → 97 |
| steady | VICTORY DAWN | 59% → 72% | 1.2 → 0.6 | 1.1s → 1.1s | 79 → 97 |
| average | NEON CITY | 56% → 70% | 1.2 → 0.8 | 1.1s → 1.0s | 79 → 94 |
| average | SUNSET BEACH | 56% → 66% | 1.5 → 0.9 | 1.1s → 1.0s | 73 → 96 |
| average | MIDNIGHT MOUNTAINS | 62% → 71% | 0.6 → 1.0 | 1.1s → 1.0s | 84 → 96 |
| average | VICTORY DAWN | 58% → 62% | 1.1 → 0.5 | 1.1s → 1.0s | 79 → 99 |

## Obstacles by kind

How many of each kind a run meets, from the steady player's runs.

| Stage | small | large | mover | overhead | hole | huge | void |
|---|---|---|---|---|---|---|---|
| NEON CITY | 106 | 24 | 13 | 91 | 28 | 1 | 3 |
| SUNSET BEACH | 90 | 18 | 14 | 71 | 49 | 0 | 4 |
| MIDNIGHT MOUNTAINS | 113 | 18 | 21 | 85 | 28 | 1 | 4 |
| VICTORY DAWN | 98 | 18 | 14 | 91 | 33 | 1 | 5 |

## Timing windows

How long the player has to press, in seconds, for each kind of obstacle: the typical
window, and the tightest one met. Wider is more forgiving. Groups (two blocks one jump
clears) count under their first obstacle.

| Stage | Window by obstacle |
|---|---|
| NEON CITY | hole 0.33 (tightest 0.22), huge 0.52 (tightest 0.28), large 0.27 (tightest 0.13), mover 0.30 (tightest 0.12), overhead 0.58 (tightest 0.18), small 0.25 (tightest 0.08), void 0.27 (tightest 0.23) |
| SUNSET BEACH | hole 0.35 (tightest 0.18), large 0.28 (tightest 0.18), mover 0.25 (tightest 0.15), overhead 0.58 (tightest 0.18), small 0.33 (tightest 0.10), void 0.28 (tightest 0.27) |
| MIDNIGHT MOUNTAINS | hole 0.35 (tightest 0.18), huge 0.45 (tightest 0.32), large 0.28 (tightest 0.08), mover 0.30 (tightest 0.12), overhead 0.60 (tightest 0.20), small 0.28 (tightest 0.08), void 0.33 (tightest 0.18) |
| VICTORY DAWN | hole 0.37 (tightest 0.13), huge 0.63 (tightest 0.30), large 0.30 (tightest 0.13), mover 0.35 (tightest 0.22), overhead 0.62 (tightest 0.20), small 0.28 (tightest 0.10), void 0.37 (tightest 0.23) |

"No way through" counts obstacles the player met with no timing at all that got past (for
example a wide block with too little energy for the double jump). It should be 0.
"After a slip" counts the same, but only within a few seconds of the player's own slip: a tap
made while still in the air from the last jump is a double jump, which can float into the
next obstacle. The game was fair; the player wasted the energy or the jump.

# Option C: gentle curve

Written by `npm run difficulty`: the pretend player (`src/game/difficulty/pretendPlayer.ts`)
plays each stage 20 times at each skill level, from full health (10), with the real
game code. Do not edit by hand; run it again after changing obstacles, patterns or pacing.

Skill levels: how far off each press lands (standard deviation), and how often an obstacle
gets no reaction at all.

- **steady**: ±0.04 sec, misses 1 in 100
- **average**: ±0.07 sec, misses 3 in 100
- **beginner**: ±0.11 sec, misses 6 in 100

| Skill | Stage | Survives | Hits | Health lost | Hearts healed | Lasts | Obstacles | Hit most by (per run) | No way through | After a slip |
|---|---|---|---|---|---|---|---|---|---|---|
| steady | NEON CITY | 100% | 2.1 | 5.8 | 5.7 | 180s | 224 | overhead 0.8, small 0.7, mover 0.3 | 0 | 0 |
| steady | SUNSET BEACH | 100% | 2.1 | 5.9 | 5.3 | 174s | 227 | small 0.8, overhead 0.6, hole 0.3 | 0 | 0 |
| steady | MIDNIGHT MOUNTAINS | 100% | 2.5 | 7.1 | 6.5 | 176s | 272 | overhead 0.9, small 0.8, hole 0.3 | 0 | 0 |
| steady | VICTORY DAWN | 95% | 2.8 | 7.7 | 5.8 | 172s | 278 | small 1.0, overhead 0.9, hole 0.5 | 0 | 0 |
| average | NEON CITY | 70% | 10.0 | 27.9 | 22.7 | 164s | 202 | small 3.8, overhead 2.6, large 1.3 | 0 | 0 |
| average | SUNSET BEACH | 30% | 9.0 | 24.3 | 15.8 | 134s | 170 | small 3.3, overhead 2.3, mover 1.3 | 0 | 0 |
| average | MIDNIGHT MOUNTAINS | 25% | 8.2 | 21.2 | 13.3 | 110s | 165 | small 3.5, overhead 2.3, mover 1.1 | 0 | 0 |
| average | VICTORY DAWN | 10% | 6.9 | 17.7 | 8.2 | 87s | 133 | small 3.3, overhead 1.6, large 0.8 | 0 | 0 |
| beginner | NEON CITY | 0% | 8.9 | 24.1 | 14.1 | 73s | 85 | small 3.0, overhead 2.8, large 1.1 | 0 | 0 |
| beginner | SUNSET BEACH | 0% | 5.5 | 14.5 | 4.5 | 39s | 43 | small 1.8, hole 1.1, mover 0.9 | 0 | 0 |
| beginner | MIDNIGHT MOUNTAINS | 0% | 5.5 | 13.8 | 3.9 | 34s | 46 | small 2.5, overhead 1.1, mover 0.8 | 0 | 0 |
| beginner | VICTORY DAWN | 0% | 5.0 | 12.6 | 2.5 | 26s | 34 | small 2.2, large 0.8, overhead 0.8 | 0 | 0 |

## Pace, voids and diamonds

- **Busy**: the share of the time spent jumping or ducking for something. Each obstacle
  keeps the player busy for as long as its move takes (a jump 0.67 sec, a duck 0.55 sec,
  a double jump 1.2 sec), centred on it.
- **Rests**: the gaps in between. The share of them longer than a second, how many of those
  come a minute, and the longest rest (typical run, and the longest in any run).
- **Voids** per run (fewest-most), **diamonds** reaching the runner a minute, how many the
  pretend player collects without trying to (it only aims for the obstacles), and the
  longest stretch with no diamond coming (typical run, and the longest in any run).

| Skill | Stage | Busy | Rests over 1 s | …a minute | Longest rest | Voids | Diamonds a minute | Collected | Longest without |
|---|---|---|---|---|---|---|---|---|---|
| steady | NEON CITY | 64% | 8% | 4.2 | 1.3s (1.4s) | 3.0 (3-3) | 183 | 544 of 549 | 6.9s (13.1s) |
| steady | SUNSET BEACH | 64% | 7% | 3.8 | 1.2s (1.3s) | 4.0 (4-4) | 201 | 548 of 583 | 6.8s (12.6s) |
| steady | MIDNIGHT MOUNTAINS | 69% | 2% | 1.1 | 1.1s (1.1s) | 4.0 (4-4) | 215 | 571 of 631 | 6.3s (9.4s) |
| steady | VICTORY DAWN | 66% | 0% | 0.2 | 1.0s (1.0s) | 4.8 (1-5) | 248 | 617 of 711 | 5.6s (7.9s) |
| average | NEON CITY | 63% | 8% | 4.2 | 1.3s (1.4s) | 2.4 (0-3) | 184 | 481 of 504 | 5.9s (7.6s) |
| average | SUNSET BEACH | 62% | 7% | 4.1 | 1.2s (1.3s) | 2.6 (0-4) | 201 | 401 of 449 | 6.2s (11.6s) |
| average | MIDNIGHT MOUNTAINS | 65% | 2% | 1.5 | 1.1s (1.1s) | 1.9 (0-4) | 213 | 327 of 391 | 6.0s (11.1s) |
| average | VICTORY DAWN | 60% | 0% | 0.3 | 1.0s (1.0s) | 1.6 (0-5) | 248 | 285 of 360 | 4.2s (6.6s) |
| beginner | NEON CITY | 56% | 10% | 4.8 | 1.3s (1.4s) | 0.3 (0-3) | 174 | 196 of 212 | 4.6s (7.4s) |
| beginner | SUNSET BEACH | 52% | 11% | 5.3 | 1.1s (1.2s) | 0.1 (0-1) | 193 | 109 of 127 | 4.0s (7.0s) |
| beginner | MIDNIGHT MOUNTAINS | 58% | 5% | 2.5 | 1.0s (1.1s) | 0.1 (0-1) | 187 | 83 of 105 | 4.5s (7.3s) |
| beginner | VICTORY DAWN | 52% | 2% | 1.2 | 1.0s (1.0s) | 0.0 (0-0) | 252 | 76 of 107 | 2.4s (4.7s) |

## The build

Each stage eases in and builds to its busiest at the end. The same measures for the first
third of each stage → the last third: the share of time busy, rests over a second a
minute, the longest rest, and obstacles a minute. Only the part of each run played counts.

| Skill | Stage | Busy | Rests over 1 s a minute | Longest rest | Obstacles a minute |
|---|---|---|---|---|---|
| steady | NEON CITY | 56% → 70% | 5.0 → 3.4 | 1.4s → 1.2s | 63 → 84 |
| steady | SUNSET BEACH | 56% → 70% | 5.4 → 1.9 | 1.3s → 1.1s | 64 → 91 |
| steady | MIDNIGHT MOUNTAINS | 63% → 72% | 2.6 → 0.2 | 1.1s → 1.0s | 81 → 102 |
| steady | VICTORY DAWN | 59% → 71% | 0.5 → 0.0 | 1.0s → 0.9s | 81 → 107 |
| average | NEON CITY | 56% → 69% | 5.0 → 3.1 | 1.4s → 1.3s | 63 → 83 |
| average | SUNSET BEACH | 56% → 71% | 5.2 → 1.5 | 1.3s → 1.1s | 64 → 91 |
| average | MIDNIGHT MOUNTAINS | 62% → 72% | 2.6 → 0.1 | 1.1s → 1.0s | 79 → 101 |
| average | VICTORY DAWN | 57% → 74% | 0.5 → 0.0 | 1.0s → 1.0s | 80 → 106 |

## Obstacles by kind

How many of each kind a run meets, from the steady player's runs.

| Stage | small | large | mover | overhead | hole | huge | void |
|---|---|---|---|---|---|---|---|
| NEON CITY | 86 | 20 | 11 | 79 | 24 | 1 | 3 |
| SUNSET BEACH | 82 | 17 | 14 | 67 | 44 | 0 | 4 |
| MIDNIGHT MOUNTAINS | 113 | 18 | 20 | 88 | 28 | 2 | 4 |
| VICTORY DAWN | 105 | 20 | 15 | 96 | 36 | 1 | 5 |

## Timing windows

How long the player has to press, in seconds, for each kind of obstacle: the typical
window, and the tightest one met. Wider is more forgiving. Groups (two blocks one jump
clears) count under their first obstacle.

| Stage | Window by obstacle |
|---|---|
| NEON CITY | hole 0.38 (tightest 0.20), huge 0.35 (tightest 0.32), large 0.33 (tightest 0.08), mover 0.35 (tightest 0.15), overhead 0.68 (tightest 0.20), small 0.30 (tightest 0.03), void 0.27 (tightest 0.23) |
| SUNSET BEACH | hole 0.38 (tightest 0.15), large 0.32 (tightest 0.13), mover 0.30 (tightest 0.17), overhead 0.63 (tightest 0.18), small 0.35 (tightest 0.08), void 0.30 (tightest 0.27) |
| MIDNIGHT MOUNTAINS | hole 0.35 (tightest 0.17), huge 0.45 (tightest 0.28), large 0.30 (tightest 0.10), mover 0.32 (tightest 0.18), overhead 0.60 (tightest 0.18), small 0.28 (tightest 0.08), void 0.33 (tightest 0.30) |
| VICTORY DAWN | hole 0.35 (tightest 0.18), huge 0.60 (tightest 0.60), large 0.28 (tightest 0.13), mover 0.33 (tightest 0.20), overhead 0.58 (tightest 0.18), small 0.27 (tightest 0.10), void 0.33 (tightest 0.18) |

"No way through" counts obstacles the player met with no timing at all that got past (for
example a wide block with too little energy for the double jump). It should be 0.
"After a slip" counts the same, but only within a few seconds of the player's own slip: a tap
made while still in the air from the last jump is a double jump, which can float into the
next obstacle. The game was fair; the player wasted the energy or the jump.

# Option D: bold curve

Written by `npm run difficulty`: the pretend player (`src/game/difficulty/pretendPlayer.ts`)
plays each stage 20 times at each skill level, from full health (10), with the real
game code. Do not edit by hand; run it again after changing obstacles, patterns or pacing.

Skill levels: how far off each press lands (standard deviation), and how often an obstacle
gets no reaction at all.

- **steady**: ±0.04 sec, misses 1 in 100
- **average**: ±0.07 sec, misses 3 in 100
- **beginner**: ±0.11 sec, misses 6 in 100

| Skill | Stage | Survives | Hits | Health lost | Hearts healed | Lasts | Obstacles | Hit most by (per run) | No way through | After a slip |
|---|---|---|---|---|---|---|---|---|---|---|
| steady | NEON CITY | 100% | 2.6 | 7.4 | 7.1 | 180s | 257 | overhead 1.1, small 0.7, hole 0.5 | 0 | 0 |
| steady | SUNSET BEACH | 100% | 2.5 | 7.5 | 6.8 | 174s | 257 | overhead 0.8, hole 0.6, small 0.6 | 0 | 0 |
| steady | MIDNIGHT MOUNTAINS | 100% | 3.7 | 9.9 | 8.3 | 176s | 304 | overhead 1.5, small 1.4, hole 0.3 | 0 | 0 |
| steady | VICTORY DAWN | 90% | 4.2 | 11.8 | 8.7 | 170s | 304 | overhead 1.8, small 1.4, large 0.6 | 0 | 0 |
| average | NEON CITY | 50% | 11.3 | 31.0 | 24.9 | 142s | 196 | small 4.5, overhead 2.9, mover 1.3 | 0 | 0 |
| average | SUNSET BEACH | 10% | 8.8 | 24.8 | 15.7 | 107s | 147 | small 3.0, overhead 1.7, hole 1.6 | 0 | 0 |
| average | MIDNIGHT MOUNTAINS | 5% | 8.9 | 23.9 | 14.1 | 90s | 145 | small 3.5, overhead 1.8, mover 1.6 | 0 | 0 |
| average | VICTORY DAWN | 0% | 6.3 | 16.4 | 6.5 | 64s | 103 | small 2.5, overhead 1.6, large 0.8 | 0 | 0 |
| beginner | NEON CITY | 0% | 9.3 | 25.1 | 15.1 | 62s | 81 | small 3.8, overhead 2.3, large 1.8 | 0 | 0 |
| beginner | SUNSET BEACH | 0% | 5.4 | 14.1 | 4.0 | 29s | 34 | small 2.0, hole 1.1, large 0.8 | 0 | 0 |
| beginner | MIDNIGHT MOUNTAINS | 0% | 5.1 | 12.6 | 2.5 | 24s | 35 | small 2.6, mover 0.8, overhead 0.7 | 0 | 0 |
| beginner | VICTORY DAWN | 0% | 4.6 | 11.8 | 1.8 | 20s | 28 | small 2.0, large 0.9, hole 0.6 | 0 | 0 |

## Pace, voids and diamonds

- **Busy**: the share of the time spent jumping or ducking for something. Each obstacle
  keeps the player busy for as long as its move takes (a jump 0.67 sec, a duck 0.55 sec,
  a double jump 1.2 sec), centred on it.
- **Rests**: the gaps in between. The share of them longer than a second, how many of those
  come a minute, and the longest rest (typical run, and the longest in any run).
- **Voids** per run (fewest-most), **diamonds** reaching the runner a minute, how many the
  pretend player collects without trying to (it only aims for the obstacles), and the
  longest stretch with no diamond coming (typical run, and the longest in any run).

| Skill | Stage | Busy | Rests over 1 s | …a minute | Longest rest | Voids | Diamonds a minute | Collected | Longest without |
|---|---|---|---|---|---|---|---|---|---|
| steady | NEON CITY | 65% | 5% | 3.0 | 1.2s (1.2s) | 3.0 (3-3) | 212 | 628 of 635 | 6.7s (10.9s) |
| steady | SUNSET BEACH | 64% | 2% | 1.4 | 1.1s (1.2s) | 4.0 (4-4) | 236 | 643 of 685 | 6.0s (10.7s) |
| steady | MIDNIGHT MOUNTAINS | 69% | 0% | 0.1 | 1.0s (1.0s) | 4.0 (4-4) | 245 | 646 of 719 | 6.2s (8.5s) |
| steady | VICTORY DAWN | 66% | 0% | 0.0 | 0.9s (1.0s) | 4.7 (0-5) | 271 | 654 of 764 | 4.9s (10.1s) |
| average | NEON CITY | 62% | 6% | 3.5 | 1.1s (1.2s) | 2.0 (0-3) | 208 | 464 of 492 | 5.4s (8.1s) |
| average | SUNSET BEACH | 60% | 3% | 2.0 | 1.1s (1.1s) | 1.8 (0-4) | 223 | 351 of 397 | 5.5s (8.5s) |
| average | MIDNIGHT MOUNTAINS | 64% | 0% | 0.2 | 1.0s (1.0s) | 1.3 (0-4) | 228 | 280 of 342 | 5.4s (11.0s) |
| average | VICTORY DAWN | 58% | 0% | 0.0 | 0.9s (1.0s) | 0.9 (0-3) | 268 | 221 of 287 | 3.7s (7.2s) |
| beginner | NEON CITY | 55% | 9% | 4.5 | 1.1s (1.2s) | 0.3 (0-3) | 195 | 182 of 202 | 4.4s (7.6s) |
| beginner | SUNSET BEACH | 51% | 5% | 2.9 | 1.0s (1.1s) | 0.0 (0-0) | 213 | 87 of 104 | 3.6s (7.7s) |
| beginner | MIDNIGHT MOUNTAINS | 57% | 0% | 0.3 | 0.9s (1.0s) | 0.0 (0-0) | 192 | 57 of 76 | 4.2s (9.1s) |
| beginner | VICTORY DAWN | 51% | 0% | 0.0 | 0.9s (1.0s) | 0.0 (0-0) | 289 | 69 of 97 | 1.8s (3.7s) |

## The build

Each stage eases in and builds to its busiest at the end. The same measures for the first
third of each stage → the last third: the share of time busy, rests over a second a
minute, the longest rest, and obstacles a minute. Only the part of each run played counts.

| Skill | Stage | Busy | Rests over 1 s a minute | Longest rest | Obstacles a minute |
|---|---|---|---|---|---|
| steady | NEON CITY | 56% → 71% | 6.0 → 0.3 | 1.2s → 1.0s | 70 → 99 |
| steady | SUNSET BEACH | 56% → 70% | 3.4 → 0.0 | 1.2s → 1.0s | 71 → 104 |
| steady | MIDNIGHT MOUNTAINS | 63% → 71% | 0.2 → 0.0 | 1.0s → 0.9s | 89 → 115 |
| steady | VICTORY DAWN | 59% → 71% | 0.0 → 0.0 | 1.0s → 0.8s | 88 → 122 |
| average | NEON CITY | 56% → 70% | 5.9 → 0.2 | 1.2s → 1.1s | 70 → 98 |
| average | SUNSET BEACH | 56% → 66% | 3.3 → 0.2 | 1.1s → 1.0s | 70 → 101 |
| average | MIDNIGHT MOUNTAINS | 62% → 71% | 0.2 → 0.0 | 1.0s → 0.8s | 88 → 114 |
| average | VICTORY DAWN | 56% → 77% | 0.0 → 0.0 | 1.0s → 0.9s | 85 → 132 |

## Obstacles by kind

How many of each kind a run meets, from the steady player's runs.

| Stage | small | large | mover | overhead | hole | huge | void |
|---|---|---|---|---|---|---|---|
| NEON CITY | 103 | 24 | 12 | 87 | 27 | 1 | 3 |
| SUNSET BEACH | 93 | 19 | 14 | 76 | 50 | 0 | 4 |
| MIDNIGHT MOUNTAINS | 126 | 20 | 24 | 97 | 31 | 2 | 4 |
| VICTORY DAWN | 115 | 23 | 17 | 102 | 41 | 1 | 5 |

## Timing windows

How long the player has to press, in seconds, for each kind of obstacle: the typical
window, and the tightest one met. Wider is more forgiving. Groups (two blocks one jump
clears) count under their first obstacle.

| Stage | Window by obstacle |
|---|---|
| NEON CITY | hole 0.33 (tightest 0.17), huge 0.37 (tightest 0.27), large 0.30 (tightest 0.07), mover 0.30 (tightest 0.13), overhead 0.60 (tightest 0.17), small 0.27 (tightest 0.08), void 0.27 (tightest 0.23) |
| SUNSET BEACH | hole 0.35 (tightest 0.18), large 0.28 (tightest 0.13), mover 0.27 (tightest 0.17), overhead 0.57 (tightest 0.17), small 0.32 (tightest 0.08), void 0.27 (tightest 0.25) |
| MIDNIGHT MOUNTAINS | hole 0.32 (tightest 0.18), huge 0.45 (tightest 0.22), large 0.27 (tightest 0.08), mover 0.27 (tightest 0.15), overhead 0.55 (tightest 0.17), small 0.27 (tightest 0.08), void 0.32 (tightest 0.18) |
| VICTORY DAWN | hole 0.32 (tightest 0.18), huge 0.23 (tightest 0.23), large 0.27 (tightest 0.10), mover 0.30 (tightest 0.18), overhead 0.53 (tightest 0.17), small 0.30 (tightest 0.05), void 0.30 (tightest 0.27) |

"No way through" counts obstacles the player met with no timing at all that got past (for
example a wide block with too little energy for the double jump). It should be 0.
"After a slip" counts the same, but only within a few seconds of the player's own slip: a tap
made while still in the air from the last jump is a double jump, which can float into the
next obstacle. The game was fair; the player wasted the energy or the jump.
