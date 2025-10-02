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

  // Initialize audio
  useEffect(() => {
    audioRef.current = {
      pull: new Audio('/audio/pull_rope.wav'),
      win: new Audio('/audio/win_game.wav'),
      countdown: new Audio('/audio/countdown.wav')
    };

    // Configure audio
    Object.values(audioRef.current).forEach(audio => {
      audio.volume = 0.7;
    });

    return () => {
      Object.values(audioRef.current).forEach(audio => {
        audio.pause();
        audio.currentTime = 0;
      });
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

  // Play audio cues
  useEffect(() => {
    if (isPulling && gameState === 'playing') {
      const pullAudio = audioRef.current.pull;
      if (pullAudio && pullAudio.paused) {
        pullAudio.play().catch(() => {
          console.log('Pull audio play failed (autoplay restrictions)');
        });
      }
    }
  }, [isPulling, gameState]);

  useEffect(() => {
    if (gameState === 'won' || ended) {
      const winAudio = audioRef.current.win;
      if (winAudio) {
        winAudio.currentTime = 0;
        winAudio.play().catch(() => {
          console.log('Win audio play failed (autoplay restrictions)');
        });
      }
    }
  }, [gameState, ended]);

  // Camera controller
  const CameraController = () => {
    const { camera } = useThree();
    
    useEffect(() => {
      camera.position.set(0, 5, 8);
      camera.lookAt(0, 0, 0);
    }, [camera]);

    return null;
  };

  return (
    <div className="w-full h-screen relative bg-gradient-to-b from-orange-400 to-red-600">
      <Canvas
        shadows
        camera={{
          position: [0, 5, 8],
          fov: 45,
          near: 0.1,
          far: 300
        }}
      >
        <CameraController />
        
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
        />
        
        {/* Players */}
        {players.map((player, index) => (
          <TugOfWarPlayer
            key={player.id}
            gameState={gameState}
            isPulling={player.isPulling}
            pullStrength={player.pullStrength}
            ropePosition={ropePosition}
            teamSide={index % 2 === 0 ? 'left' : 'right'}
            modelPath={MODEL_CONFIG.player.path}
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
          />
        ))}
        
        {/* Celebration effect */}
        {(gameState === 'won' || ended) && (
          <Celebration />
        )}
        
        {/* Controls */}
        <OrbitControls
          enablePan={false}
          enableZoom={true}
          enableRotate={true}
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={Math.PI / 2}
          minDistance={5}
          maxDistance={15}
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
      <div className="absolute bottom-4 left-4 text-white bg-black/50 p-3 rounded-lg">
        <div className="text-sm font-semibold mb-2">Controls:</div>
        <div className="text-xs space-y-1">
          <div>Hold <kbd className="bg-gray-700 px-1 rounded">SPACE</kbd> to pull the rope</div>
          <div>Release <kbd className="bg-gray-700 px-1 rounded">SPACE</kbd> to stop pulling</div>
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
