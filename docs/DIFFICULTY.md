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
| steady | NEON CITY | 100% | 1.2 | 3.1 | 3.0 | 180s | 139 | overhead 0.5, small 0.5, hole 0.3 | 0 |
| steady | SUNSET BEACH | 100% | 1.3 | 3.5 | 3.3 | 174s | 138 | hole 0.4, small 0.3, overhead 0.3 | 0 |
| steady | MIDNIGHT MOUNTAINS | 100% | 1.5 | 4.0 | 3.4 | 176s | 148 | small 0.7, overhead 0.4, hole 0.3 | 0 |
| steady | VICTORY DAWN | 100% | 1.5 | 4.3 | 3.7 | 178s | 158 | overhead 0.5, hole 0.3, small 0.3 | 0 |
| average | NEON CITY | 95% | 4.8 | 12.8 | 11.7 | 175s | 135 | small 2.2, overhead 1.4, large 0.5 | 0 |
| average | SUNSET BEACH | 100% | 4.7 | 13.3 | 12.3 | 174s | 138 | hole 1.4, small 1.2, overhead 1.0 | 0 |
| average | MIDNIGHT MOUNTAINS | 95% | 6.2 | 16.3 | 13.5 | 172s | 144 | small 2.8, overhead 1.6, hole 0.8 | 1 |
| average | VICTORY DAWN | 90% | 5.8 | 15.8 | 13.0 | 172s | 153 | small 2.2, overhead 1.9, hole 0.8 | 0 |
| beginner | NEON CITY | 55% | 11.3 | 30.7 | 24.4 | 148s | 115 | small 4.5, overhead 2.6, large 1.8 | 0 |
| beginner | SUNSET BEACH | 45% | 9.7 | 26.8 | 19.6 | 133s | 106 | hole 3.2, small 3.0, overhead 1.5 | 0 |
| beginner | MIDNIGHT MOUNTAINS | 40% | 9.5 | 25.2 | 18.1 | 117s | 99 | small 3.8, mover 2.0, hole 1.6 | 0 |
| beginner | VICTORY DAWN | 30% | 9.5 | 25.6 | 17.3 | 119s | 106 | small 3.6, overhead 2.1, hole 2.0 | 1 |

## Timing windows

How long the player has to press, in seconds, for each kind of obstacle: the typical
window, and the tightest one met. Wider is more forgiving. Groups (two blocks one jump
clears) count under their first obstacle.

| Stage | Window by obstacle |
|---|---|
| NEON CITY | hole 0.45 (tightest 0.43), huge 0.67 (tightest 0.65), large 0.37 (tightest 0.35), mover 0.43 (tightest 0.15), overhead 0.87 (tightest 0.23), small 0.45 (tightest 0.17) |
| SUNSET BEACH | hole 0.47 (tightest 0.43), large 0.38 (tightest 0.37), mover 0.37 (tightest 0.18), overhead 0.82 (tightest 0.50), small 0.45 (tightest 0.17) |
| MIDNIGHT MOUNTAINS | hole 0.47 (tightest 0.38), huge 0.72 (tightest 0.58), large 0.40 (tightest 0.37), mover 0.40 (tightest 0.22), overhead 0.80 (tightest 0.08), small 0.47 (tightest 0.15) |
| VICTORY DAWN | hole 0.48 (tightest 0.38), huge 0.73 (tightest 0.58), large 0.42 (tightest 0.37), mover 0.42 (tightest 0.25), overhead 0.80 (tightest 0.07), small 0.47 (tightest 0.17) |

"No way through" counts obstacles the player met with no timing at all that got past (for
example a wide block with too little energy for the double jump). It should be 0.
