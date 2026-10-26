# Difficulty report

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
| beginner | MIDNIGHT MOUNTAINS | 0% | 6.2 | 15.8 | 6.0 | 57s | 66 | small 2.8, overhead 1.5, mover 0.7 | 0 | 0 |
| beginner | VICTORY DAWN | 0% | 5.3 | 13.8 | 3.8 | 48s | 51 | small 1.9, overhead 1.1, mover 1.0 | 0 | 0 |

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
| beginner | MIDNIGHT MOUNTAINS | 60% | 8% | 3.6 | 1.3s (1.4s) | 0.5 (0-2) | 161 | 117 of 154 | 6.0s (12.1s) |
| beginner | VICTORY DAWN | 55% | 9% | 3.9 | 1.3s (1.3s) | 0.5 (0-3) | 180 | 103 of 145 | 3.9s (7.0s) |

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
| NEON CITY | hole 0.43 (tightest 0.35), huge 0.67 (tightest 0.52), large 0.37 (tightest 0.15), mover 0.45 (tightest 0.15), overhead 0.60 (tightest 0.18), small 0.38 (tightest 0.20), void 0.25 (tightest 0.22) |
| SUNSET BEACH | hole 0.45 (tightest 0.32), large 0.38 (tightest 0.27), mover 0.42 (tightest 0.20), overhead 0.63 (tightest 0.35), small 0.43 (tightest 0.13), void 0.30 (tightest 0.25) |
| MIDNIGHT MOUNTAINS | hole 0.45 (tightest 0.32), huge 0.63 (tightest 0.40), large 0.38 (tightest 0.23), mover 0.40 (tightest 0.23), overhead 0.60 (tightest 0.25), small 0.40 (tightest 0.12), void 0.35 (tightest 0.25) |
| VICTORY DAWN | hole 0.47 (tightest 0.28), huge 0.73 (tightest 0.57), large 0.40 (tightest 0.15), mover 0.40 (tightest 0.25), overhead 0.62 (tightest 0.27), small 0.42 (tightest 0.17), void 0.40 (tightest 0.37) |

"No way through" counts obstacles the player met with no timing at all that got past (for
example a wide block with too little energy for the double jump). It should be 0.
"After a slip" counts the same, but only within a few seconds of the player's own slip: a tap
made while still in the air from the last jump is a double jump, which can float into the
next obstacle. The game was fair; the player wasted the energy or the jump.
