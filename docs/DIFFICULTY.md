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
| steady | NEON CITY | 100% | 1.5 | 4.2 | 3.9 | 180s | 168 | overhead 0.7, small 0.5, large 0.1 | 0 |
| steady | SUNSET BEACH | 100% | 1.4 | 4.1 | 3.8 | 174s | 162 | small 0.5, overhead 0.4, hole 0.3 | 0 |
| steady | MIDNIGHT MOUNTAINS | 100% | 1.6 | 4.2 | 4.2 | 176s | 169 | small 0.8, overhead 0.4, hole 0.3 | 0 |
| steady | VICTORY DAWN | 100% | 1.6 | 4.3 | 4.0 | 178s | 177 | overhead 0.7, small 0.5, hole 0.2 | 0 |
| average | NEON CITY | 100% | 6.7 | 18.4 | 16.7 | 180s | 168 | small 2.4, overhead 2.1, hole 0.9 | 0 |
| average | SUNSET BEACH | 100% | 5.8 | 15.9 | 14.6 | 174s | 161 | overhead 1.6, small 1.6, hole 1.4 | 0 |
| average | MIDNIGHT MOUNTAINS | 100% | 6.8 | 17.6 | 17.1 | 176s | 169 | small 3.3, overhead 1.4, hole 1.2 | 0 |
| average | VICTORY DAWN | 85% | 6.8 | 18.5 | 15.3 | 173s | 172 | overhead 2.4, small 2.3, hole 1.1 | 0 |
| beginner | NEON CITY | 45% | 10.8 | 28.4 | 21.4 | 126s | 120 | small 5.2, overhead 2.7, hole 1.3 | 0 |
| beginner | SUNSET BEACH | 55% | 10.5 | 28.7 | 22.4 | 133s | 124 | small 3.4, hole 3.0, overhead 2.1 | 0 |
| beginner | MIDNIGHT MOUNTAINS | 20% | 9.2 | 25.1 | 16.9 | 92s | 88 | small 2.8, mover 2.4, overhead 1.9 | 0 |
| beginner | VICTORY DAWN | 25% | 8.6 | 22.8 | 14.4 | 99s | 98 | small 3.3, hole 1.8, overhead 1.7 | 0 |

## Timing windows

How long the player has to press, in seconds, for each kind of obstacle: the typical
window, and the tightest one met. Wider is more forgiving. Groups (two blocks one jump
clears) count under their first obstacle.

| Stage | Window by obstacle |
|---|---|
| NEON CITY | hole 0.45 (tightest 0.43), huge 0.67 (tightest 0.38), large 0.37 (tightest 0.35), mover 0.42 (tightest 0.15), overhead 0.78 (tightest 0.22), small 0.45 (tightest 0.17) |
| SUNSET BEACH | hole 0.47 (tightest 0.43), large 0.38 (tightest 0.37), mover 0.38 (tightest 0.18), overhead 0.75 (tightest 0.23), small 0.45 (tightest 0.17) |
| MIDNIGHT MOUNTAINS | hole 0.47 (tightest 0.37), huge 0.72 (tightest 0.52), large 0.40 (tightest 0.37), mover 0.37 (tightest 0.22), overhead 0.75 (tightest 0.20), small 0.47 (tightest 0.15) |
| VICTORY DAWN | hole 0.48 (tightest 0.38), huge 0.72 (tightest 0.50), large 0.40 (tightest 0.37), mover 0.42 (tightest 0.25), overhead 0.77 (tightest 0.07), small 0.47 (tightest 0.17) |

"No way through" counts obstacles the player met with no timing at all that got past (for
example a wide block with too little energy for the double jump). It should be 0.
