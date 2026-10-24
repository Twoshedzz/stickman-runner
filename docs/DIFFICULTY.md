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
| steady | NEON CITY | 100% | 1.1 | 3.1 | 3.0 | 180s | 137 | small 0.5, overhead 0.3, hole 0.2 | 0 |
| steady | SUNSET BEACH | 100% | 1.2 | 3.4 | 3.1 | 174s | 137 | hole 0.5, overhead 0.4, small 0.3 | 0 |
| steady | MIDNIGHT MOUNTAINS | 100% | 1.4 | 3.6 | 3.4 | 176s | 147 | small 0.6, hole 0.5, overhead 0.3 | 0 |
| steady | VICTORY DAWN | 95% | 1.6 | 4.7 | 3.5 | 173s | 153 | overhead 0.7, small 0.5, hole 0.2 | 0 |
| average | NEON CITY | 100% | 5.0 | 13.9 | 13.7 | 180s | 137 | small 1.7, overhead 1.1, large 0.8 | 0 |
| average | SUNSET BEACH | 100% | 4.8 | 13.5 | 12.9 | 174s | 137 | small 1.3, hole 1.3, overhead 1.2 | 0 |
| average | MIDNIGHT MOUNTAINS | 90% | 6.2 | 15.6 | 13.3 | 172s | 144 | small 3.1, overhead 1.4, mover 0.8 | 0 |
| average | VICTORY DAWN | 100% | 6.3 | 16.6 | 14.3 | 178s | 157 | small 2.8, overhead 1.8, hole 1.3 | 0 |
| beginner | NEON CITY | 90% | 12.2 | 33.0 | 30.4 | 166s | 126 | small 5.7, large 2.3, overhead 1.9 | 0 |
| beginner | SUNSET BEACH | 60% | 10.3 | 28.9 | 23.2 | 144s | 114 | small 3.0, hole 2.8, overhead 1.8 | 0 |
| beginner | MIDNIGHT MOUNTAINS | 40% | 10.8 | 28.2 | 20.6 | 120s | 101 | small 4.2, mover 2.5, overhead 2.1 | 0 |
| beginner | VICTORY DAWN | 25% | 8.3 | 22.1 | 13.7 | 101s | 90 | small 3.6, overhead 1.4, hole 1.4 | 0 |

## Timing windows

How long the player has to press, in seconds, for each kind of obstacle: the typical
window, and the tightest one met. Wider is more forgiving. Groups (two blocks one jump
clears) count under their first obstacle.

| Stage | Window by obstacle |
|---|---|
| NEON CITY | hole 0.45 (tightest 0.43), large 0.37 (tightest 0.35), mover 0.42 (tightest 0.15), overhead 0.98 (tightest 0.52), small 0.45 (tightest 0.28) |
| SUNSET BEACH | hole 0.47 (tightest 0.43), large 0.38 (tightest 0.37), mover 0.38 (tightest 0.20), overhead 0.85 (tightest 0.52), small 0.45 (tightest 0.17) |
| MIDNIGHT MOUNTAINS | hole 0.47 (tightest 0.38), huge 0.72 (tightest 0.58), large 0.40 (tightest 0.37), mover 0.40 (tightest 0.22), overhead 0.80 (tightest 0.18), small 0.47 (tightest 0.15) |
| VICTORY DAWN | hole 0.48 (tightest 0.38), huge 0.72 (tightest 0.33), large 0.40 (tightest 0.37), mover 0.45 (tightest 0.25), overhead 0.80 (tightest 0.12), small 0.47 (tightest 0.17) |

"No way through" counts obstacles the player met with no timing at all that got past (for
example a wide block with too little energy for the double jump). It should be 0.
