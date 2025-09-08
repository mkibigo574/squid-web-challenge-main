# Redlight Runway — 3D Red Light/Green Light Game (React + R3F)

A browser-based 3D mini‑game inspired by Red Light, Green Light. Built with React, Vite, TypeScript, Tailwind CSS, and React Three Fiber. Includes a simple game loop, player movement, a doll that turns to detect movement, and a lightweight UI using shadcn‑ui.


## Features

- **Playable mini‑game**: Stop when the doll turns, run when it looks away.
- **3D rendering**: Powered by `three` and `@react-three/fiber` with helpers from `@react-three/drei`.
- **GLB model loading**: Player and animation assets are preloaded for smoother gameplay.
- **Responsive UI**: shadcn‑ui components + Tailwind CSS.
- **TypeScript-first**: Safer, more maintainable code.
- **Vite dev experience**: Fast HMR, optimized builds.


## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **3D/Graphics**: three, @react-three/fiber, @react-three/drei
- **UI**: Tailwind CSS, shadcn‑ui (Radix UI primitives)
- **Routing**: react-router-dom
- **State/Forms**: React Hook Form, Zod (where applicable)


## Project Structure

```
./
├─ public/
│  └─ models/                # GLB assets used by the game
├─ src/
│  ├─ game/
│  │  ├─ components/         # 3D scene entities (Player, Doll, Environment, UI)
│  │  ├─ config/              # Model paths and constants
│  │  ├─ hooks/               # Game and movement logic hooks
│  │  ├─ utils/               # Model preloader
│  │  └─ RedLightGreenLight.tsx
│  ├─ components/ui/          # shadcn‑ui components
│  ├─ pages/                  # App routes (Index, NotFound)
│  ├─ main.tsx                # App bootstrap
│  └─ App.tsx                 # Root app shell
├─ dist/                      # Production build output
└─ package.json
```

Key files:
- `src/game/RedLightGreenLight.tsx`: Main game container and loop.
- `src/game/components/Player.tsx`: Player model, animations, and movement integration.
- `src/game/components/Doll.tsx`: Doll behavior and detection logic.
- `src/game/components/Environment.tsx`: Scene setup and lighting.
- `src/game/components/GameUI.tsx`: In‑game HUD and controls.
- `src/game/hooks/useGame.ts`: Game state machine (phases, win/lose, timers).
- `src/game/hooks/usePlayerMovement.ts`: Keyboard input and movement rules.
- `src/game/utils/modelPreloader.ts`: Preloads GLB assets.
- `src/game/config/models.ts`: Model paths and naming.


## Getting Started

Prerequisites:
- Node.js 18+ and npm

Install dependencies:

```sh
npm install
```

Start the development server:

```sh
npm run dev
```

Open the app at the URL shown in the terminal (typically `http://localhost:5173`).


## Scripts

- `npm run dev`: Start Vite dev server with HMR
- `npm run build`: Production build to `dist/`
- `npm run build:dev`: Development‑mode build (useful for profiling output)
- `npm run preview`: Preview the production build locally
- `npm run lint`: Run ESLint


## Gameplay & Controls

- **Objective**: Reach the end of the runway without moving while the doll is looking.
- **Controls**:
  - Movement: Arrow keys or WASD to move forward.
  - Stop: Release keys before the doll turns to avoid detection.
- **Detection**: If you move when the doll is facing you, you lose.
- **Win Condition**: Reach the finish line while obeying stop/go rules.

## Gameplay Videos

Videos of the current gameplay can be viewed here: [Gameplay Demo](https://charlesdarwinuni-my.sharepoint.com/:v:/g/personal/s363610_students_cdu_edu_au/EQXS8XCHTOBKv1h2wU3oKEkBHVnVkYws5y0CqamRZYo2Ww?email=reem.sherif%40cdu.edu.au&e=fizOhS)


## Assets

GLB models live in `public/models/`. The build output copies them to `dist/models/`.
- Ensure filenames in `src/game/config/models.ts` match the assets present in `public/models/`.
- If you replace models, keep consistent scales and animation clip names where referenced.


## Styling & UI

- Tailwind classes are used throughout the app.
- shadcn‑ui components live in `src/components/ui/`. Prefer composition over heavy customization.


## Development Notes

- Keep game logic inside hooks (`useGame`, `usePlayerMovement`) and keep components focused on rendering/side effects.
- Prefer declarative scene updates (React Three Fiber) over imperative three.js calls when possible.
- When adding models, preload them via `modelPreloader` to avoid runtime stalls.
- Validate props and config with TypeScript and Zod if user inputs are added later.


## Building & Deployment

Create a production build:

```sh
npm run build
```

Static output is generated under `dist/` and can be served by any static host (Netlify, Vercel, GitHub Pages, Nginx, etc.). Use `npm run preview` to test locally.


## Troubleshooting

- Blank canvas or missing models: verify paths in `src/game/config/models.ts` and assets in `public/models/`.
- Animation not playing: confirm clip names match what components expect.
- Performance issues: reduce model polycount, limit shadows, or lower render distance in the scene.

## What's Next

- **3D Assets and animation design**: Add player movement, add different skins for multiplayer, enhance general appearance
- **Enhanced Gameplay**: Add multiple difficulty levels, time limits, and scoring system
- **Audio**: Implement sound effects for movement detection, background music, and voice cues
- **Multiplayer**: Add online multiplayer support with real-time synchronization
- **Mobile Support**: Optimize controls and UI for touch devices
- **Advanced Graphics**: Add particle effects, better lighting, and post-processing
- **Game Modes**: Implement different variations (reverse mode, team play, etc.)
- **Analytics**: Track player performance and game statistics
- **Accessibility**: Add colorblind support, keyboard navigation, and screen reader compatibility

## Acknowledgements

- three.js and React Three Fiber community
- Radix UI and shadcn‑ui
- Tailwind CSS
