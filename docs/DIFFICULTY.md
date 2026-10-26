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
| steady | NEON CITY | 55% | 0% | 0.1 | 1.0s (1.1s) | 0.3 (0-1) | 73 | 218 of 220 | 16.3s (35.9s) |
| steady | SUNSET BEACH | 57% | 0% | 0.0 | 0.9s (1.0s) | 0.9 (0-3) | 89 | 255 of 258 | 15.5s (23.9s) |
| steady | MIDNIGHT MOUNTAINS | 60% | 0% | 0.0 | 0.9s (0.9s) | 1.4 (0-4) | 78 | 192 of 228 | 18.6s (32.2s) |
| steady | VICTORY DAWN | 61% | 0% | 0.0 | 0.9s (0.9s) | 1.5 (0-3) | 85 | 188 of 252 | 18.4s (30.1s) |
| average | NEON CITY | 55% | 0% | 0.2 | 1.0s (1.1s) | 0.5 (0-2) | 73 | 209 of 218 | 18.0s (35.9s) |
| average | SUNSET BEACH | 58% | 0% | 0.0 | 0.9s (1.0s) | 0.5 (0-2) | 85 | 237 of 246 | 15.8s (34.0s) |
| average | MIDNIGHT MOUNTAINS | 60% | 0% | 0.0 | 0.8s (0.9s) | 1.4 (0-4) | 80 | 186 of 231 | 17.3s (30.0s) |
| average | VICTORY DAWN | 61% | 0% | 0.0 | 0.9s (0.9s) | 1.9 (0-4) | 89 | 172 of 246 | 15.9s (25.2s) |
| beginner | NEON CITY | 54% | 0% | 0.0 | 0.9s (1.1s) | 0.1 (0-1) | 72 | 132 of 151 | 13.4s (20.3s) |
| beginner | SUNSET BEACH | 57% | 0% | 0.0 | 0.9s (0.9s) | 0.5 (0-2) | 86 | 163 of 186 | 15.0s (29.5s) |
| beginner | MIDNIGHT MOUNTAINS | 57% | 0% | 0.0 | 0.7s (0.9s) | 0.7 (0-3) | 78 | 93 of 125 | 13.6s (25.0s) |
| beginner | VICTORY DAWN | 60% | 0% | 0.0 | 0.8s (0.9s) | 1.3 (0-3) | 84 | 98 of 149 | 14.6s (29.8s) |

## Obstacles by kind

How many of each kind a run meets, from the steady player's runs.

| Stage | small | large | mover | overhead | hole | huge | void |
|---|---|---|---|---|---|---|---|
| NEON CITY | 64 | 16 | 7 | 60 | 20 | 1 | 0 |
| SUNSET BEACH | 47 | 9 | 12 | 46 | 45 | 0 | 1 |
| MIDNIGHT MOUNTAINS | 59 | 12 | 18 | 51 | 25 | 2 | 1 |
| VICTORY DAWN | 57 | 15 | 9 | 59 | 32 | 2 | 2 |

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
