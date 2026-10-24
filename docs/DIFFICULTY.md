# Difficulty report

Written by `npm run difficulty`: the pretend player (`src/game/difficulty/pretendPlayer.ts`)
plays each stage 12 times at each skill level, from full health (10), with the real
game code. Do not edit by hand; run it again after changing obstacles, patterns or pacing.

Skill levels: how far off each press lands (standard deviation), and how often an obstacle
gets no reaction at all.

- **steady**: ±0.04 sec, misses 1 in 100
- **average**: ±0.07 sec, misses 3 in 100
- **beginner**: ±0.11 sec, misses 6 in 100

| Skill | Stage | Survives | Hits | Health lost | Hearts healed | Lasts | Obstacles | Hit most by (per run) | No way through |
|---|---|---|---|---|---|---|---|---|---|
| steady | NEON CITY | 100% | 1.2 | 3.0 | 3.0 | 180s | 125 | small 0.7, overhead 0.3, large 0.2 | 0 |
| steady | SUNSET BEACH | 100% | 1.1 | 3.3 | 3.0 | 174s | 120 | small 0.3, large 0.3, overhead 0.3 | 0 |
| steady | MIDNIGHT MOUNTAINS | 100% | 1.5 | 3.8 | 3.5 | 176s | 128 | small 0.8, overhead 0.4, hole 0.2 | 0 |
| steady | VICTORY DAWN | 100% | 1.3 | 3.3 | 2.9 | 178s | 133 | small 0.7, overhead 0.4, hole 0.1 | 0 |
| average | NEON CITY | 100% | 4.8 | 12.7 | 12.4 | 180s | 125 | small 2.3, overhead 1.6, mover 0.6 | 0 |
| average | SUNSET BEACH | 100% | 4.8 | 13.9 | 13.1 | 174s | 119 | small 1.5, overhead 1.4, large 1.2 | 0 |
| average | MIDNIGHT MOUNTAINS | 100% | 5.6 | 14.4 | 12.4 | 176s | 127 | small 2.8, overhead 1.3, hole 0.7 | 0 |
| average | VICTORY DAWN | 92% | 5.5 | 14.6 | 12.1 | 173s | 129 | small 2.8, overhead 1.0, large 0.8 | 0 |
| beginner | NEON CITY | 92% | 12.5 | 34.1 | 32.3 | 174s | 120 | small 5.8, large 2.3, mover 2.3 | 0 |
| beginner | SUNSET BEACH | 42% | 8.7 | 24.3 | 17.7 | 128s | 88 | small 3.0, mover 1.8, large 1.6 | 0 |
| beginner | MIDNIGHT MOUNTAINS | 25% | 9.3 | 23.8 | 15.3 | 115s | 83 | small 4.8, overhead 1.5, hole 1.3 | 0 |
| beginner | VICTORY DAWN | 25% | 8.2 | 20.3 | 12.2 | 100s | 75 | small 4.2, overhead 1.6, hole 0.8 | 0 |

## Timing windows

How long the player has to press, in seconds, for each kind of obstacle: the typical
window, and the tightest one met. Wider is more forgiving. Groups (two blocks one jump
clears) count under their first obstacle.

| Stage | Window by obstacle |
|---|---|
| NEON CITY | large 0.37 (tightest 0.35), mover 0.42 (tightest 0.17), overhead 0.98 (tightest 0.58), small 0.45 (tightest 0.28) |
| SUNSET BEACH | hole 0.47 (tightest 0.43), large 0.38 (tightest 0.37), mover 0.40 (tightest 0.20), overhead 1.00 (tightest 0.48), small 0.45 (tightest 0.28) |
| MIDNIGHT MOUNTAINS | hole 0.47 (tightest 0.38), huge 0.73 (tightest 0.72), large 0.40 (tightest 0.37), mover 0.38 (tightest 0.22), overhead 1.00 (tightest 0.40), small 0.47 (tightest 0.15) |
| VICTORY DAWN | hole 0.48 (tightest 0.38), huge 0.75 (tightest 0.65), large 0.40 (tightest 0.38), mover 0.43 (tightest 0.27), overhead 1.00 (tightest 0.42), small 0.47 (tightest 0.17) |

"No way through" counts obstacles the player met with no timing at all that got past (for
example a wide block with too little energy for the double jump). It should be 0.
