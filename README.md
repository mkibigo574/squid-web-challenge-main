# Squid Web Challenge — 3D Red Light/Green Light Game (React + R3F)

A browser-based 3D mini‑game inspired by Red Light, Green Light from Squid Game. Built with React, Vite, TypeScript, Tailwind CSS, and React Three Fiber. Includes a simple game loop, player movement, a doll that turns to detect movement, and a lightweight UI using shadcn‑ui. Features cloud storage integration with Supabase for optimal performance.


## Features

- **Playable mini‑game**: Stop when the doll turns, run when it looks away.
- **3D rendering**: Powered by `three` and `@react-three/fiber` with helpers from `@react-three/drei`.
- **Cloud storage**: Supabase integration for fast model loading with local fallback.
- **GLB model loading**: Player and animation assets are preloaded for smoother gameplay.
- **Responsive UI**: shadcn‑ui components + Tailwind CSS.
- **TypeScript-first**: Safer, more maintainable code.
- **Vite dev experience**: Fast HMR, optimized builds.
- **Progressive enhancement**: Graceful fallback from cloud to local assets.


## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **3D/Graphics**: three, @react-three/fiber, @react-three/drei
- **UI**: Tailwind CSS, shadcn‑ui (Radix UI primitives)
- **Backend/Storage**: Supabase (cloud storage for 3D models)
- **Routing**: react-router-dom
- **State/Forms**: React Hook Form, Zod (where applicable)
- **Build Tools**: Vite, TypeScript, ESLint


## Project Structure

```
./
├─ public/
│  ├─ models/                # GLB assets used by the game (local fallback)
│  └─ favicon.ico            # Game favicon
├─ src/
│  ├─ game/
│  │  ├─ components/         # 3D scene entities (Player, Doll, Environment, UI)
│  │  ├─ config/              # Model paths and constants
│  │  ├─ hooks/               # Game and movement logic hooks
│  │  ├─ utils/               # Model preloader with Supabase integration
│  │  └─ RedLightGreenLight.tsx
│  ├─ components/ui/          # shadcn‑ui components
│  ├─ lib/
│  │  └─ supabase.ts         # Supabase client configuration
│  ├─ pages/                  # App routes (Index, NotFound)
│  ├─ main.tsx                # App bootstrap
│  └─ App.tsx                 # Root app shell
├─ scripts/
│  ├─ upload-models.ts       # Upload models to Supabase
│  └─ test-*.ts              # Testing scripts
├─ dist/                      # Production build output
├─ env.example               # Environment variables template
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
- `src/game/utils/modelPreloader.ts`: Smart preloader with Supabase + local fallback.
- `src/game/config/models.ts`: Model paths and naming with cloud integration.
- `src/lib/supabase.ts`: Supabase client and storage configuration.
- `scripts/upload-models.ts`: Automated model upload to Supabase.


## Getting Started

Prerequisites:
- Node.js 18+ and npm
- Supabase account (optional, for cloud storage)

### 1. Install Dependencies

```sh
npm install
```

### 2. Environment Setup (Optional)

For cloud storage features, set up Supabase:

```sh
# Copy environment template
cp env.example .env.local
```

Edit `.env.local` with your Supabase credentials:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. Upload Models to Supabase (Optional)

```sh
npm run upload-models
```

### 4. Start Development Server

```sh
npm run dev
```

Open the app at the URL shown in the terminal (typically `http://localhost:8080`).

The game will work with local models by default. If Supabase is configured, it will use cloud storage with automatic fallback to local files.


## Scripts

- `npm run dev`: Start Vite dev server with HMR
- `npm run build`: Production build to `dist/`
- `npm run build:dev`: Development‑mode build (useful for profiling output)
- `npm run preview`: Preview the production build locally
- `npm run lint`: Run ESLint
- `npm run upload-models`: Upload GLB models to Supabase storage
- `npm run test-urls`: Test Supabase URL generation
- `npm run test-paths`: Test production path resolution
- `npm run test-model-paths`: Test model path configuration
- `npm run test-final-config`: Test final configuration setup


## Gameplay & Controls

- **Objective**: Reach the end of the runway without moving while the doll is looking.
- **Controls**:
  - Movement: Arrow keys or WASD to move forward.
  - Stop: Release keys before the doll turns to avoid detection.
- **Detection**: If you move when the doll is facing you, you lose.
- **Win Condition**: Reach the finish line while obeying stop/go rules.

## Gameplay Videos

Videos of the current gameplay can be viewed here: [Gameplay Demo](https://charlesdarwinuni-my.sharepoint.com/:v:/g/personal/s363610_students_cdu_edu_au/EQXS8XCHTOBKv1h2wU3oKEkBHVnVkYws5y0CqamRZYo2Ww?email=reem.sherif%40cdu.edu.au&e=fizOhS)


## Supabase Integration

The game features seamless cloud storage integration with Supabase for optimal performance and reliability.

### Model Storage Strategy

The game uses a **progressive enhancement** approach for 3D models:

1. **Primary**: Load from Supabase cloud storage (fast, cached)
2. **Fallback**: Load from local files in `public/models/`
3. **Safety**: Show primitive 3D shapes if both fail

### Benefits
- **Zero Downtime**: Game continues working with local files
- **Progressive Enhancement**: Gradually moves to cloud storage
- **Error Resilience**: Multiple fallback layers
- **Performance**: Models cached after first load
- **Easy Rollback**: Can switch back to local files instantly

### Quick Setup
1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Copy `env.example` to `.env.local` and add your credentials
3. Run `npm run upload-models` to upload assets
4. Start the game with `npm run dev`

For detailed setup instructions, see the [Supabase Migration Guide](./SUPABASE_MIGRATION.md).

## Assets

### Local Models
- GLB models live in `public/models/` as fallback
- The build output copies them to `dist/models/`
- Ensure filenames in `src/game/config/models.ts` match the assets present in `public/models/`
- If you replace models, keep consistent scales and animation clip names where referenced

### Cloud Models (Supabase)
- Models are automatically uploaded to Supabase storage
- Faster loading and better caching
- Automatic fallback ensures the game never breaks


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

### Environment Variables for Production

Make sure to set your Supabase environment variables in your deployment platform:
- `VITE_SUPABASE_URL`: Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Your Supabase anonymous key

### Performance Optimization

- Models are automatically optimized for web delivery
- Supabase CDN provides fast global access
- Local fallback ensures reliability
- Progressive loading prevents blocking


## Troubleshooting

### Model Loading Issues
- **Blank canvas or missing models**: Check browser console for loading status
  - `✅ Model loaded from Supabase: player` - Success from cloud
  - `✅ Fallback to local: player` - Using local fallback
  - `❌ Both Supabase and local failed: player` - Using primitive shapes
- **Verify paths**: Check `src/game/config/models.ts` and assets in `public/models/`
- **Supabase issues**: Verify `.env.local` credentials and bucket permissions

### Game Performance
- **Animation not playing**: Confirm clip names match what components expect
- **Performance issues**: Reduce model polycount, limit shadows, or lower render distance
- **Slow loading**: Check Supabase connection and consider local fallback

### Development Issues
- **Port conflicts**: Default port is 8080, change in `vite.config.ts` if needed
- **Build errors**: Check TypeScript errors and missing dependencies
- **Environment issues**: Ensure `.env.local` is properly configured

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
- **Cloud Features**: Expand Supabase integration for user data, leaderboards, and achievements

## Acknowledgements

- three.js and React Three Fiber community
- Radix UI and shadcn‑ui
- Tailwind CSS
- Supabase for cloud storage and backend services
- Squid Game for the inspiration
