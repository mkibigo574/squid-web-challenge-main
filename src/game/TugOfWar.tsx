import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useTugOfWar } from './hooks/useTugOfWar';
import { TugOfWarEnvironment } from './components/TugOfWarEnvironment';
import { TugOfWarRope } from './components/TugOfWarRope';
import { TugOfWarPlayer } from './components/TugOfWarPlayer';
import { TugOfWarUI } from './components/TugOfWarUI';
import { LevelProgression } from './components/LevelProgression';
import { MODEL_CONFIG } from './config/models';
import { preloadAllModels } from './utils/modelPreloader';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Celebration } from './components/Celebration';
import { GameLevel } from './hooks/useGameLevels';

interface TugOfWarProps {
  onLevelChange?: (level: GameLevel) => void;
  onNextLevel?: () => void;
}

export const TugOfWar = ({ onLevelChange, onNextLevel }: TugOfWarProps = {}) => {
  const {
    gameState,
    ropePosition,
    timeLeft,
    playerPosition,
    countdown,
    startGame,
    resetGame,
    pullRope,
    releaseRope,
    isPulling
  } = useTugOfWar();

  const audioRef = useRef<{ [key: string]: HTMLAudioElement }>({});
  const [isPlayerPulling, setIsPlayerPulling] = useState(false);

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
      tugSound: new Audio('/audio/Running%20footsteps.wav'), // Reuse footsteps for tugging
      buzzer: new Audio('/audio/Buzzer.wav'),
      youWin: new Audio('/audio/win_game.wav'),
      countdown: new Audio('/audio/green_light.wav'), // Reuse green light for countdown
    };

    // Configure audio
    const tugSound = audioRef.current.tugSound;
    tugSound.loop = true;
    tugSound.volume = 0.4;
    
    const buzzerAudio = audioRef.current.buzzer;
    buzzerAudio.volume = 0.8;
    
    const youWinAudio = audioRef.current.youWin;
    youWinAudio.volume = 0.8;
    
    const countdownAudio = audioRef.current.countdown;
    countdownAudio.volume = 0.7;
  }, []);

  // Tugging sound management
  useEffect(() => {
    const tugSound = audioRef.current.tugSound;
    
    if (isPlayerPulling && gameState === 'playing') {
      if (tugSound.paused) {
        tugSound.currentTime = 0;
        tugSound.play().catch(() => {
          console.log('Tug sound play failed (autoplay restrictions)');
        });
      }
    } else {
      if (!tugSound.paused) {
        tugSound.pause();
        tugSound.currentTime = 0;
      }
    }

    return () => {
      if (tugSound && !tugSound.paused) {
        tugSound.pause();
        tugSound.currentTime = 0;
      }
    };
  }, [isPlayerPulling, gameState]);

  // Play buzzer sound when player loses
  useEffect(() => {
    if (gameState === 'eliminated') {
      const buzzerAudio = audioRef.current.buzzer;
      if (buzzerAudio && buzzerAudio.src) {
        buzzerAudio.currentTime = 0;
        buzzerAudio.play().catch(() => {
          console.log('Buzzer audio play failed (autoplay restrictions)');
        });
      }
    }
  }, [gameState]);

  // Play win sound when player wins
  useEffect(() => {
    if (gameState === 'won') {
      const youWinAudio = audioRef.current.youWin;
      if (youWinAudio && youWinAudio.src) {
        youWinAudio.currentTime = 0;
        youWinAudio.play().catch(() => {
          console.log('You win audio play failed (autoplay restrictions)');
        });
      }
    }
  }, [gameState]);

  // Play countdown sound
  useEffect(() => {
    if (gameState === 'countdown' && countdown > 0) {
      const countdownAudio = audioRef.current.countdown;
      if (countdownAudio && countdownAudio.src) {
        countdownAudio.play().catch(() => {
          console.log('Countdown audio play failed (autoplay restrictions)');
        });
      }
    }
  }, [countdown, gameState]);

  // Camera rig with multiple modes
  type CameraMode = 'follow' | 'closeup' | 'drone' | 'side';
  const FollowCamera = ({ targetRef, cameraMode }: { targetRef: React.RefObject<THREE.Group>; cameraMode: CameraMode }) => {
    const { camera } = useThree();
    useEffect(() => {
      const cam = camera as THREE.PerspectiveCamera;
      cam.near = 0.1;
      cam.far = 500;
      cam.updateProjectionMatrix();
    }, [camera]);

    useEffect(() => {
      let raf = 0;
      const update = () => {
        const target = targetRef.current;
        if (target) {
          const worldPos = target.position.clone();
          let desiredPos = camera.position.clone();
          let lookAt = new THREE.Vector3();
          const cam = camera as THREE.PerspectiveCamera;
          let targetFov = cam.fov;

          if (cameraMode === 'follow') {
            // Follow from behind and slightly above
            desiredPos = worldPos.clone().add(new THREE.Vector3(0, 4, -8));
            lookAt = worldPos.clone().add(new THREE.Vector3(0, 0, 0));
            targetFov = 50;
          } else if (cameraMode === 'closeup') {
            // Close-up side view
            desiredPos = worldPos.clone().add(new THREE.Vector3(3, 2, 0));
            lookAt = worldPos.clone().add(new THREE.Vector3(0, 1, 0));
            targetFov = 40;
          } else if (cameraMode === 'drone') {
            // Top-down view
            desiredPos = new THREE.Vector3(0, 20, 0);
            lookAt = new THREE.Vector3(0, 0, 0);
            targetFov = 60;
          } else {
            // Side view for tug of war
            desiredPos = new THREE.Vector3(8, 3, 0);
            lookAt = new THREE.Vector3(0, 0, 0);
            targetFov = 45;
          }

          cam.position.lerp(desiredPos, 0.12);
          cam.lookAt(lookAt);

          cam.fov += (targetFov - cam.fov) * 0.1;
          cam.updateProjectionMatrix();
        }
        raf = requestAnimationFrame(update);
      };
      raf = requestAnimationFrame(update);
      return () => cancelAnimationFrame(raf);
    }, [camera, targetRef, cameraMode]);
    return null;
  };

  // Stable ref for player to follow
  const playerRef = useRef<THREE.Group>(null);
  const [cameraMode, setCameraMode] = useState<CameraMode>('side');

  // Spacebar cycles camera modes
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setCameraMode((mode) =>
          mode === 'follow' ? 'closeup' : mode === 'closeup' ? 'drone' : mode === 'drone' ? 'side' : 'follow'
        );
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Handle keyboard input for tugging
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (gameState === 'playing') {
        if (e.code === 'KeyW' || e.code === 'ArrowUp') {
          e.preventDefault();
          pullRope();
          setIsPlayerPulling(true);
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'KeyW' || e.code === 'ArrowUp') {
        e.preventDefault();
        releaseRope();
        setIsPlayerPulling(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [gameState, pullRope, releaseRope]);

  return (
    <div className="w-full h-screen relative bg-gradient-to-b from-orange-400 to-red-600">
      {/* Level Progression */}
      <LevelProgression 
        onLevelChange={onLevelChange || (() => {})}
        onNextLevel={onNextLevel || (() => {})}
        showNextLevelButton={gameState === 'won'}
      />
      
      <Canvas
        shadows
        camera={{ 
          position: [8, 3, 0],
          fov: 45,
          near: 0.1,
          far: 300
        }}
      >
        {/* Camera rig; press Space to cycle modes */}
        <FollowCamera targetRef={playerRef} cameraMode={cameraMode} />
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 10, -5]} intensity={0.8} castShadow />
        
        <TugOfWarEnvironment />
        
        <TugOfWarPlayer
          gameState={gameState}
          onPositionUpdate={(position) => {
            // Handle position updates if needed
          }}
          modelPath={MODEL_CONFIG.player.path}
          onRefReady={(ref) => { (playerRef as any).current = ref.current; }}
          isPulling={isPulling}
        />
        
        <TugOfWarRope 
          ropePosition={ropePosition}
          gameState={gameState}
        />
        
        <Celebration gameState={gameState} />
      </Canvas>
      
      <TugOfWarUI
        gameState={gameState}
        timeLeft={timeLeft}
        countdown={countdown}
        ropePosition={ropePosition}
        onStartGame={startGame}
        onResetGame={resetGame}
        onNextLevel={() => {
          // This will be handled by the parent component
          console.log('Next level requested');
        }}
      />
    </div>
  );
};
