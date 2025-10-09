import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useMultiplayerTugOfWar } from './hooks/useMultiplayerTugOfWar';
import { TugOfWarEnvironment } from './components/TugOfWarEnvironment';
import { TugOfWarRope } from './components/TugOfWarRope';
import { TugOfWarPlayer } from './components/TugOfWarPlayer';
import { TugOfWarUI } from './components/TugOfWarUI';
import { MODEL_CONFIG } from './config/models';
import { preloadAllModels } from './utils/modelPreloader';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Celebration } from './components/Celebration';
import { multiplayerManager } from '@/lib/multiplayer';

export const MultiplayerTugOfWar = () => {
  const {
    gameState,
    ropePosition,
    timeLeft,
    countdown,
    isPulling,
    pullStrength,
    players,
    setPlayers,
    isHost,
    winners,
    ended,
    startGame,
    resetGame,
    pullRope,
    releaseRope
  } = useMultiplayerTugOfWar();

  const audioRef = useRef<{ [key: string]: HTMLAudioElement }>({});
  const [isPlayerPulling, setIsPlayerPulling] = useState(false);
  const [currentPlayerId, setCurrentPlayerId] = useState<string>('unknown');

  // Get current player ID and update it when it changes
  useEffect(() => {
    const playerId = multiplayerManager.getSelfId();
    console.log('🎮 Current player ID detected:', playerId);
    if (playerId) {
      setCurrentPlayerId(playerId);
    }
  }, []);

  // Preload all models when component mounts
  useEffect(() => {
    const loadModels = async () => {
      try {
        await preloadAllModels();
        console.log('All models preloaded successfully');
      } catch (error) {
        console.warn('Some models failed to preload:', error);
      }
    };
    
    loadModels();
  }, []);

  // Initialize audio - DISABLED for Tug of War until proper sounds are created
  useEffect(() => {
    // Audio disabled for Tug of War game
    // TODO: Add proper Tug of War specific sounds
    audioRef.current = {
      pull: null, // Disabled
      win: null, // Disabled
      countdown: null // Disabled
    };

    return () => {
      // Cleanup disabled
    };
  }, []);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space' && gameState === 'playing') {
        event.preventDefault();
        event.stopPropagation();
        pullRope();
        setIsPlayerPulling(true);
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        event.preventDefault();
        event.stopPropagation();
        releaseRope();
        setIsPlayerPulling(false);
      }
    };

    // Add event listeners with capture to ensure they're handled first
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    window.addEventListener('keyup', handleKeyUp, { capture: true });

    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      window.removeEventListener('keyup', handleKeyUp, { capture: true });
    };
  }, [gameState, pullRope, releaseRope]);

  // Play audio cues - DISABLED
  useEffect(() => {
    // Sound disabled for Tug of War game
    // TODO: Add proper Tug of War specific sounds
  }, [isPulling, gameState]);

  // Win sound effect - DISABLED
  useEffect(() => {
    // Sound disabled for Tug of War game
    // TODO: Add proper Tug of War specific sounds
  }, [gameState, ended]);

  // Squid Game style camera for multiplayer
  const SquidGameCamera = () => {
    const { camera } = useThree();
    
    useEffect(() => {
      const cam = camera as THREE.PerspectiveCamera;
      cam.near = 0.1;
      cam.far = 1000;
      cam.updateProjectionMatrix();
    }, [camera]);

    useEffect(() => {
      let raf = 0;
      const update = () => {
        const cam = camera as THREE.PerspectiveCamera;
        
        // Squid Game style: Side view showing both teams clearly
        const desiredPos = new THREE.Vector3(0, 6, 12); // Elevated side view
        const lookAt = new THREE.Vector3(0, 1, 0); // Look at center of field
        
        // Smooth camera movement
        cam.position.lerp(desiredPos, 0.05);
        cam.lookAt(lookAt);
        
        // Set FOV for optimal tug of war viewing
        const targetFov = 65;
        cam.fov += (targetFov - cam.fov) * 0.1;
        cam.updateProjectionMatrix();
        
        raf = requestAnimationFrame(update);
      };
      raf = requestAnimationFrame(update);
      return () => cancelAnimationFrame(raf);
    }, [camera]);
    
    return null;
  };

  return (
    <div className="w-full h-screen relative bg-gray-900">
      <Canvas
        shadows
        camera={{
          position: [0, 6, 12],
          fov: 60,
          near: 0.1,
          far: 1000
        }}
      >
        <SquidGameCamera />
        
        {/* Lighting */}
        <ambientLight intensity={0.4} />
        <directionalLight
          position={[10, 10, 5]}
          intensity={1}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        
        {/* Environment */}
        <TugOfWarEnvironment />
        
        {/* Rope */}
        <TugOfWarRope 
          ropePosition={ropePosition}
          gameState={gameState}
          pullStrength={pullStrength}
          isPulling={isPulling}
          leftPlayerPos={players.find(p => p.position < 0)?.position || -6}
          rightPlayerPos={players.find(p => p.position >= 0)?.position || 6}
          hasLeftPlayer={players.some(p => p.position < 0)}
          hasRightPlayer={players.some(p => p.position >= 0)}
        />
        
        {/* Players */}
        {players.map((player, index) => {
          const teamSide = index % 2 === 0 ? 'left' : 'right';
          
          return (
            <TugOfWarPlayer
              key={player.id}
              gameState={gameState}
              isPulling={player.isPulling}
              pullStrength={player.pullStrength}
              ropePosition={ropePosition}
              teamSide={teamSide}
              modelPath={MODEL_CONFIG.player.path}
              initialPosition={player.position}
              onPositionUpdate={(pos) => {
                // Update player position in the players array
                setPlayers(prev => prev.map(p => 
                  p.id === player.id ? { ...p, position: pos } : p
                ));
              }}
              onPullForce={(force) => {
                // Update player pull force
                setPlayers(prev => prev.map(p => 
                  p.id === player.id ? { ...p, pullForce: force } : p
                ));
              }}
              isAI={false} // Multiplayer players are human
              opponentPosition={players.find(p => p.id !== player.id)?.position || 0}
            />
          );
        })}
        
        {/* Celebration effect */}
        {(gameState === 'won' || ended) && (
          <Celebration />
        )}
        
        {/* Enhanced Controls for better field viewing */}
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minPolarAngle={Math.PI / 8} // Allow looking down more
          maxPolarAngle={Math.PI / 1.5} // Allow looking up more
          minDistance={8} // Closer minimum distance
          maxDistance={25} // Much further maximum distance
          panSpeed={0.8}
          rotateSpeed={0.6}
          zoomSpeed={1.2}
          target={[0, 0, 0]} // Always focus on center of field
        />
      </Canvas>

      {/* UI */}
      <TugOfWarUI
        gameState={gameState}
        ropePosition={ropePosition}
        timeLeft={timeLeft}
        countdown={countdown}
        isPulling={isPulling}
        pullStrength={pullStrength}
        players={players}
        isHost={isHost}
        winners={winners}
        ended={ended}
        currentPlayerId={currentPlayerId}
        onStartGame={startGame}
        onResetGame={resetGame}
        onPullRope={pullRope}
        onReleaseRope={releaseRope}
      />

      {/* Instructions */}
      <div className="absolute bottom-4 left-4 text-white bg-red-900/80 p-3 rounded-lg border-2 border-red-600">
        <div className="text-sm font-semibold mb-2 text-red-200">🔴 SQUID GAME CONTROLS:</div>
        <div className="text-xs space-y-1">
          <div>Hold <kbd className="bg-red-700 px-1 rounded">SPACE</kbd> to pull the rope</div>
          <div>Release <kbd className="bg-red-700 px-1 rounded">SPACE</kbd> to stop pulling</div>
          <div>⚠️ Don't get pulled into the gap! ⚠️</div>
        </div>
      </div>

      {/* Player List */}
      <div className="absolute top-4 right-4 bg-black/50 text-white p-3 rounded-lg">
        <div className="text-sm font-semibold mb-2">Players ({players.length})</div>
        <div className="space-y-1">
          {players.map((player) => (
            <div key={player.id} className="text-xs flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                player.isPulling ? 'bg-green-400' : 'bg-gray-400'
              }`} />
              <span>{player.name || `Player ${player.id.slice(0, 4)}`}</span>
              {player.isEliminated && <span className="text-red-400">(Eliminated)</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
