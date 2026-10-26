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
| steady | NEON CITY | 100% | 1.5 | 4.2 | 3.8 | 180s | 168 | overhead 0.7, small 0.5, hole 0.1 | 0 |
| steady | SUNSET BEACH | 100% | 1.4 | 4.1 | 3.5 | 174s | 160 | small 0.5, hole 0.3, overhead 0.3 | 0 |
| steady | MIDNIGHT MOUNTAINS | 100% | 1.6 | 4.2 | 4.0 | 176s | 168 | small 0.8, hole 0.3, overhead 0.3 | 0 |
| steady | VICTORY DAWN | 100% | 1.6 | 4.4 | 4.0 | 178s | 175 | overhead 0.6, small 0.4, hole 0.3 | 0 |
| average | NEON CITY | 100% | 6.7 | 18.4 | 16.8 | 180s | 167 | small 2.4, overhead 2.0, hole 0.9 | 0 |
| average | SUNSET BEACH | 95% | 5.8 | 16.4 | 14.4 | 173s | 160 | overhead 1.6, small 1.6, hole 1.3 | 0 |
| average | MIDNIGHT MOUNTAINS | 90% | 6.8 | 18.5 | 16.6 | 174s | 166 | small 2.8, overhead 2.1, hole 0.8 | 1 |
| average | VICTORY DAWN | 85% | 6.8 | 18.7 | 15.3 | 165s | 162 | small 2.7, overhead 2.1, hole 1.2 | 0 |
| beginner | NEON CITY | 45% | 10.9 | 29.0 | 22.0 | 126s | 120 | small 5.2, overhead 2.6, large 1.3 | 0 |
| beginner | SUNSET BEACH | 40% | 10.7 | 29.9 | 22.6 | 130s | 121 | hole 3.2, small 3.1, overhead 2.0 | 0 |
| beginner | MIDNIGHT MOUNTAINS | 30% | 10.0 | 27.4 | 19.5 | 97s | 93 | small 3.5, mover 2.0, overhead 1.9 | 0 |
| beginner | VICTORY DAWN | 20% | 9.6 | 24.4 | 15.6 | 106s | 106 | small 4.7, hole 1.7, overhead 1.6 | 0 |

## Timing windows

How long the player has to press, in seconds, for each kind of obstacle: the typical
window, and the tightest one met. Wider is more forgiving. Groups (two blocks one jump
clears) count under their first obstacle.

| Stage | Window by obstacle |
|---|---|
| NEON CITY | hole 0.45 (tightest 0.43), huge 0.67 (tightest 0.50), large 0.37 (tightest 0.35), mover 0.42 (tightest 0.15), overhead 0.77 (tightest 0.25), small 0.45 (tightest 0.17), void 0.27 (tightest 0.03) |
| SUNSET BEACH | hole 0.47 (tightest 0.43), large 0.38 (tightest 0.37), mover 0.40 (tightest 0.18), overhead 0.73 (tightest 0.32), small 0.45 (tightest 0.17), void 0.32 (tightest 0.30) |
| MIDNIGHT MOUNTAINS | hole 0.47 (tightest 0.37), huge 0.70 (tightest 0.53), large 0.40 (tightest 0.37), mover 0.38 (tightest 0.22), overhead 0.75 (tightest 0.10), small 0.47 (tightest 0.15), void 0.35 (tightest 0.03) |
| VICTORY DAWN | hole 0.48 (tightest 0.38), huge 0.72 (tightest 0.25), large 0.40 (tightest 0.37), mover 0.42 (tightest 0.25), overhead 0.77 (tightest 0.07), small 0.47 (tightest 0.17), void 0.38 (tightest 0.03) |

"No way through" counts obstacles the player met with no timing at all that got past (for
example a wide block with too little energy for the double jump). It should be 0.
