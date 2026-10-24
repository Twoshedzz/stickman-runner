# Difficulty report

Written by `npm run difficulty`: the pretend player (`src/game/difficulty/pretendPlayer.ts`)
plays each stage 20 times at each skill level, from full health (10), with the real
game code. Do not edit by hand; run it again after changing obstacles, patterns or pacing.

Skill levels: how far off each press lands (standard deviation), and how often an obstacle
gets no reaction at all.

- **steady**: ±0.04 sec, misses 1 in 100
- **average**: ±0.07 sec, misses 3 in 100
- **beginner**: ±0.11 sec, misses 6 in 100

| Skill | Stage | Survives | Hits | Health lost | Hearts healed | Lasts | Obstacles | Hit most by (per run) | No way through |
|---|---|---|---|---|---|---|---|---|---|
| steady | NEON CITY | 100% | 1.1 | 2.9 | 2.9 | 180s | 125 | small 0.7, large 0.3, overhead 0.1 | 0 |
| steady | SUNSET BEACH | 100% | 1.1 | 3.0 | 2.9 | 174s | 133 | small 0.5, hole 0.3, large 0.1 | 0 |
| steady | MIDNIGHT MOUNTAINS | 100% | 1.4 | 3.7 | 3.3 | 176s | 137 | small 0.5, overhead 0.4, hole 0.2 | 0 |
| steady | VICTORY DAWN | 100% | 1.6 | 4.3 | 3.9 | 178s | 147 | small 0.8, hole 0.3, overhead 0.3 | 0 |
| average | NEON CITY | 100% | 4.5 | 11.8 | 11.6 | 180s | 125 | small 2.2, overhead 1.1, mover 0.8 | 0 |
| average | SUNSET BEACH | 100% | 4.8 | 13.5 | 12.9 | 174s | 133 | small 1.4, hole 1.4, overhead 0.9 | 0 |
| average | MIDNIGHT MOUNTAINS | 100% | 5.4 | 14.3 | 13.2 | 176s | 138 | small 2.5, overhead 1.3, mover 0.6 | 0 |
| average | VICTORY DAWN | 100% | 5.8 | 15.7 | 13.7 | 178s | 147 | small 2.0, overhead 1.9, hole 1.1 | 0 |
| beginner | NEON CITY | 80% | 12.1 | 34.0 | 30.8 | 165s | 114 | small 5.4, large 3.2, overhead 1.9 | 0 |
| beginner | SUNSET BEACH | 60% | 10.1 | 27.9 | 23.1 | 140s | 108 | small 3.2, hole 2.3, overhead 1.9 | 0 |
| beginner | MIDNIGHT MOUNTAINS | 50% | 10.5 | 28.1 | 21.1 | 130s | 103 | small 4.4, mover 2.1, overhead 1.6 | 0 |
| beginner | VICTORY DAWN | 35% | 8.9 | 24.4 | 16.4 | 127s | 104 | small 3.1, overhead 1.8, hole 1.8 | 0 |

## Timing windows

How long the player has to press, in seconds, for each kind of obstacle: the typical
window, and the tightest one met. Wider is more forgiving. Groups (two blocks one jump
clears) count under their first obstacle.

| Stage | Window by obstacle |
|---|---|
| NEON CITY | large 0.37 (tightest 0.35), mover 0.42 (tightest 0.18), overhead 0.98 (tightest 0.57), small 0.45 (tightest 0.28) |
| SUNSET BEACH | hole 0.47 (tightest 0.43), large 0.38 (tightest 0.37), mover 0.40 (tightest 0.20), overhead 0.92 (tightest 0.45), small 0.45 (tightest 0.17) |
| MIDNIGHT MOUNTAINS | hole 0.47 (tightest 0.38), huge 0.72 (tightest 0.63), large 0.40 (tightest 0.35), mover 0.38 (tightest 0.22), overhead 0.83 (tightest 0.12), small 0.47 (tightest 0.15) |
| VICTORY DAWN | hole 0.48 (tightest 0.40), huge 0.73 (tightest 0.63), large 0.40 (tightest 0.37), mover 0.45 (tightest 0.25), overhead 0.82 (tightest 0.18), small 0.47 (tightest 0.17) |

"No way through" counts obstacles the player met with no timing at all that got past (for
example a wide block with too little energy for the double jump). It should be 0.
