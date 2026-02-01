# Stickman Runner

## Project Overview
Stickman Runner is a **2D platform running game** built as a **learning and collaboration project** between an adult and a child.

The primary goals are:
- Build something **fun and playable quickly**
- Learn together by reading and modifying code
- Ship to **iOS early**, without locking ourselves out of web testing
- Keep the codebase **simple, readable, and educational**

This project deliberately avoids heavy game engines in favour of a small, understandable custom game loop.

---

## Platform Strategy

- **Mobile-first**, targeting **iOS**
- Also runnable on **web** for fast iteration and sharing
- **Single codebase**

We use **Expo** so the game can:
- Run instantly on real phones via **Expo Go**
- Later be packaged for iOS using **EAS Build**
- Avoid early native complexity

---

## Tech Stack (Locked)

- Expo
- React Native
- TypeScript
- `@shopify/react-native-skia` for 2D rendering

We are **not** using:
- Unity
- Phaser-in-React-Native
- Any heavyweight game engine

The intent is to build a **small custom runner engine**:
- game loop
- gravity & jumping
- obstacle spawning
- collision detection

This is intentional for learning and clarity.

---

## Current Status

- Project created using:
  ```bash
  npm create expo-app@latest stickman-runner
  ```
- TypeScript template selected
- App runs successfully via Expo dev server

---

## Architectural Principles (Important)

These rules should be followed throughout development:

### 1. Separate game logic from rendering
- Game state (positions, velocity, score) must not live directly in JSX
- Rendering should be a pure view of the current game state

### 2. Keep React simple
- Avoid overusing hooks for core game logic
- Prefer a single game loop that drives updates

### 3. Start with shapes, not art
- Use rectangles and lines initially
- Sprites, animations, and polish come later

### 4. Small, shippable milestones
- Every step should result in something playable
- Avoid building large systems without feedback

---

## Suggested Folder Structure

The project should gradually move toward this structure:

```
/src
  /game
    state.ts          // positions, velocity, score
    constants.ts      // gravity, jump force, sizes
    systems/
      physics.ts
      collisions.ts
      spawn.ts
    loop/
      useGameLoop.ts  // tick / update loop
  /screens
    GameScreen.tsx
  /components
    TouchControls.tsx
/assets
/docs
```

This separation is intentional and should be preserved.

---

## First Milestone (Initial Build)

### Target: "Stickman jumps over a box"

Minimal required features:
- Ground line
- Player (stickman represented as a rectangle)
- Gravity
- Tap anywhere to jump
- One obstacle moving toward the player
- Collision resets the game

Constraints:
- No menus
- No sound
- No animations
- No polish

This milestone **must**:
- Run on a real phone via Expo Go
- Be understandable by a novice reader

---

## Input Model

- Tap anywhere on screen = jump
- No left/right movement initially
- Runner is auto-running, or obstacles move toward the player

---

## Collaboration Context

This repo is worked on by **two people** (adult + child).

Code should therefore:
- Use clear, descriptive naming
- Include comments where helpful
- Prefer readability over cleverness

Think: *teach by reading the code*.

---

## Non-Goals (For Now)

The following are explicitly out of scope initially:
- App Store submission
- Monetisation
- Backend services
- Complex animations or shaders
- Multiplayer

---

## Tone & Approach

- Optimise for **clarity over cleverness**
- Avoid premature abstraction
- Explain *why* things are done, not just *what*

Fun and learning come first.

