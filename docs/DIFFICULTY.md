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
| steady | NEON CITY | 100% | 1.7 | 4.8 | 4.3 | 180s | 195 | overhead 0.6, small 0.6, large 0.3 | 0 | 0 |
| steady | SUNSET BEACH | 100% | 1.5 | 4.3 | 4.0 | 174s | 180 | hole 0.5, small 0.4, overhead 0.3 | 0 | 0 |
| steady | MIDNIGHT MOUNTAINS | 100% | 1.8 | 4.8 | 4.3 | 176s | 199 | overhead 0.7, small 0.6, hole 0.3 | 0 | 0 |
| steady | VICTORY DAWN | 100% | 1.8 | 5.3 | 4.7 | 178s | 199 | overhead 0.6, small 0.3, hole 0.3 | 0 | 0 |
| average | NEON CITY | 100% | 7.1 | 19.4 | 17.9 | 180s | 193 | small 2.5, overhead 2.5, hole 1.3 | 0 | 0 |
| average | SUNSET BEACH | 80% | 5.7 | 15.9 | 12.3 | 163s | 168 | small 1.9, overhead 1.4, hole 1.4 | 0 | 0 |
| average | MIDNIGHT MOUNTAINS | 80% | 7.5 | 20.4 | 16.4 | 164s | 185 | small 2.8, overhead 2.3, hole 0.9 | 0 | 0 |
| average | VICTORY DAWN | 75% | 6.1 | 17.1 | 12.1 | 159s | 175 | overhead 2.1, small 1.7, hole 1.3 | 0 | 0 |
| beginner | NEON CITY | 30% | 12.0 | 33.0 | 24.9 | 115s | 121 | small 4.8, overhead 3.1, large 2.0 | 0 | 0 |
| beginner | SUNSET BEACH | 0% | 7.3 | 19.9 | 9.8 | 75s | 74 | small 2.6, hole 1.4, overhead 1.4 | 0 | 0 |
| beginner | MIDNIGHT MOUNTAINS | 15% | 7.8 | 20.4 | 11.3 | 78s | 88 | small 3.5, overhead 1.4, mover 1.1 | 0 | 0 |
| beginner | VICTORY DAWN | 0% | 6.0 | 16.3 | 6.4 | 58s | 62 | small 2.1, overhead 1.6, large 0.8 | 0 | 0 |

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
| steady | NEON CITY | 62% | 9% | 4.4 | 1.4s (1.5s) | 2.0 (2-2) | 168 | 500 of 504 | 6.4s (9.4s) |
| steady | SUNSET BEACH | 62% | 8% | 4.1 | 1.4s (1.5s) | 3.0 (3-3) | 166 | 452 of 482 | 7.2s (13.0s) |
| steady | MIDNIGHT MOUNTAINS | 67% | 7% | 3.4 | 1.4s (1.5s) | 3.0 (3-3) | 164 | 421 of 480 | 8.4s (15.0s) |
| steady | VICTORY DAWN | 65% | 7% | 3.4 | 1.3s (1.5s) | 3.0 (3-3) | 169 | 409 of 502 | 7.8s (11.7s) |
| average | NEON CITY | 62% | 9% | 4.4 | 1.4s (1.5s) | 2.0 (2-2) | 166 | 480 of 498 | 7.2s (10.2s) |
| average | SUNSET BEACH | 61% | 8% | 4.2 | 1.4s (1.5s) | 2.7 (1-3) | 166 | 409 of 452 | 7.4s (13.0s) |
| average | MIDNIGHT MOUNTAINS | 66% | 7% | 3.5 | 1.4s (1.5s) | 2.7 (1-3) | 160 | 369 of 437 | 8.2s (18.7s) |
| average | VICTORY DAWN | 64% | 7% | 3.4 | 1.3s (1.4s) | 2.6 (1-3) | 168 | 346 of 444 | 7.3s (12.1s) |
| beginner | NEON CITY | 58% | 10% | 4.7 | 1.4s (1.5s) | 0.8 (0-2) | 157 | 274 of 301 | 6.6s (12.2s) |
| beginner | SUNSET BEACH | 56% | 10% | 4.8 | 1.3s (1.5s) | 0.8 (0-3) | 170 | 181 of 212 | 5.9s (11.1s) |
| beginner | MIDNIGHT MOUNTAINS | 61% | 8% | 3.8 | 1.3s (1.5s) | 0.9 (0-3) | 158 | 161 of 206 | 6.5s (10.2s) |
| beginner | VICTORY DAWN | 56% | 9% | 4.1 | 1.3s (1.4s) | 0.4 (0-2) | 186 | 127 of 181 | 4.4s (8.3s) |

## The build

Each stage eases in and builds to its busiest at the end. The same measures for the first
third of each stage → the last third: the share of time busy, rests over a second a
minute, the longest rest, and obstacles a minute. Only the part of each run played counts.

| Skill | Stage | Busy | Rests over 1 s a minute | Longest rest | Obstacles a minute |
|---|---|---|---|---|---|
| steady | NEON CITY | 55% → 69% | 5.1 → 3.5 | 1.4s → 1.5s | 60 → 70 |
| steady | SUNSET BEACH | 55% → 67% | 5.2 → 3.1 | 1.4s → 1.5s | 55 → 66 |
| steady | MIDNIGHT MOUNTAINS | 62% → 69% | 4.1 → 2.4 | 1.4s → 1.5s | 64 → 70 |
| steady | VICTORY DAWN | 58% → 70% | 4.3 → 2.2 | 1.4s → 1.4s | 61 → 71 |
| average | NEON CITY | 55% → 68% | 5.1 → 3.4 | 1.5s → 1.5s | 59 → 70 |
| average | SUNSET BEACH | 55% → 67% | 5.2 → 3.1 | 1.4s → 1.5s | 55 → 66 |
| average | MIDNIGHT MOUNTAINS | 62% → 69% | 4.1 → 2.3 | 1.4s → 1.5s | 64 → 70 |
| average | VICTORY DAWN | 58% → 69% | 4.2 → 2.1 | 1.4s → 1.4s | 61 → 69 |

## Obstacles by kind

How many of each kind a run meets, from the steady player's runs.

| Stage | small | large | mover | overhead | hole | huge | void |
|---|---|---|---|---|---|---|---|
| NEON CITY | 77 | 16 | 10 | 68 | 22 | 1 | 2 |
| SUNSET BEACH | 65 | 13 | 10 | 52 | 37 | 0 | 3 |
| MIDNIGHT MOUNTAINS | 81 | 13 | 16 | 61 | 24 | 2 | 3 |
| VICTORY DAWN | 75 | 14 | 12 | 66 | 27 | 1 | 3 |

## Timing windows

How long the player has to press, in seconds, for each kind of obstacle: the typical
window, and the tightest one met. Wider is more forgiving. Groups (two blocks one jump
clears) count under their first obstacle.

| Stage | Window by obstacle |
|---|---|
| NEON CITY | hole 0.43 (tightest 0.35), huge 0.67 (tightest 0.43), large 0.37 (tightest 0.13), mover 0.45 (tightest 0.15), overhead 0.60 (tightest 0.18), small 0.38 (tightest 0.17), void 0.27 (tightest 0.22) |
| SUNSET BEACH | hole 0.45 (tightest 0.28), large 0.38 (tightest 0.27), mover 0.42 (tightest 0.20), overhead 0.63 (tightest 0.35), small 0.45 (tightest 0.15), void 0.30 (tightest 0.27) |
| MIDNIGHT MOUNTAINS | hole 0.45 (tightest 0.30), huge 0.62 (tightest 0.40), large 0.38 (tightest 0.13), mover 0.40 (tightest 0.20), overhead 0.62 (tightest 0.25), small 0.40 (tightest 0.17), void 0.35 (tightest 0.32) |
| VICTORY DAWN | hole 0.47 (tightest 0.30), huge 0.63 (tightest 0.43), large 0.40 (tightest 0.15), mover 0.40 (tightest 0.25), overhead 0.62 (tightest 0.27), small 0.42 (tightest 0.15), void 0.40 (tightest 0.37) |

"No way through" counts obstacles the player met with no timing at all that got past (for
example a wide block with too little energy for the double jump). It should be 0.
"After a slip" counts the same, but only within a few seconds of the player's own slip: a tap
made while still in the air from the last jump is a double jump, which can float into the
next obstacle. The game was fair; the player wasted the energy or the jump.
