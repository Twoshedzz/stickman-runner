# Stickman Runner

A retro-synthwave style endless runner game built with **React Native**, **Expo**, and **Shopify Skia**.

## 🎮 How to Play

* **Tap / Space / Up Arrow**: Jump
* **Double Tap (in air)**: Double Jump (Costs Energy ⚡)
* **Goal**: Run as far as possible!

### Rules

* ⚠️ **Avoid Yellow Obstacles**: Hitting them causes damage or game over.
* ⚡ **Manage Energy**: Energy regenerates over time. Double jumping consumes it.
* ❤️ **Collect Hearts**: Pink hearts restore health.

## 🏗️ Project Structure

This project follows a custom game loop architecture, avoiding heavy game engines for learning purposes.

```
/src
  /game
    /constants.ts      # Physics, Dimensions, Colors, Difficulty settings
    /loop
      useGameLoop.ts   # Main Game Loop (update logic, tick handling)
    /systems
      physics.ts       # Gravity, Jump logic, Movement
      collisions.ts    # AABB Collision detection (Player vs Obstacles)
      renderer.ts      # Rendering helpers
  /components
    GameCanvas.tsx     # Main rendering component (Skia Canvas)
  /screens
    GameScreen.tsx     # Main Entry Point, UI Overlay, Input Handling
/app
  index.tsx            # Expo Router Entry Point
  _layout.tsx          # Root Layout
```

## 🛠️ Tech Stack

* **Framework**: [Expo](https://expo.dev) + [React Native](https://reactnative.dev)
* **Rendering**: [@shopify/react-native-skia](https://shopify.github.io/react-native-skia/) (High performance 2D graphics)
* **Language**: TypeScript

## 🚀 Running the Project

1. **Install Dependencies**:

    ```bash
    npm install
    ```

2. **Start the Server**:

    ```bash
    npx expo start
    ```

3. **Run on Device**:
    * Scan the QR code with **Expo Go** on your iOS/Android device.
    * Press `w` to run in the web browser (limited performance).

## 🎨 Visual Style

The game features a **Synthwave / Neon** aesthetic with:

* Bloom/Glow effects (simulated via opacity layers for performance)
* Parallax scrolling background (City, Sun, Sky)
* Dynamic lighting particles

## 📝 Credits

Built as a collaborative learning project to explore game development logic from scratch without a black-box engine.
