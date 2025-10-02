import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useGame } from './hooks/useGame';
import { Environment } from './components/Environment';
import { Player } from './components/Player';
import { Doll } from './components/Doll';
import { GameUI } from './components/GameUI';
import { ModelTester } from './components/ModelTester';
import { Soldier } from './components/Soldier';
import { LevelProgression } from './components/LevelProgression';
import { MODEL_CONFIG } from './config/models';
import { preloadAllModels } from './utils/modelPreloader';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Celebration } from './components/Celebration';
import { FIELD_CONFIG } from './config/field';
import { GameLevel } from './hooks/useGameLevels';








interface RedLightGreenLightProps {
  onLevelChange?: (level: GameLevel) => void;
  onNextLevel?: () => void;
}

export const RedLightGreenLight = ({ onLevelChange, onNextLevel }: RedLightGreenLightProps = {}) => {
  const {
    gameState,
    lightState,
    timeLeft,
    playerPosition,
    countdown,
    progress,
    startGame,
    resetGame,
    eliminatePlayer,
    updatePlayerPosition
  } = useGame();

  const audioRef = useRef<{ [key: string]: HTMLAudioElement }>({});
  const footstepsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isPlayerMoving, setIsPlayerMoving] = useState(false);

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

  // Initialize audio with your running footsteps file
  useEffect(() => {
    audioRef.current = {
      greenLight: new Audio('/audio/green_light.wav'), // Green light sound
      redLight: new Audio('/audio/red_light.wav'), // Red light sound
      footsteps: new Audio('/audio/Running%20footsteps.wav'), // URL encoded for spaces
      buzzer: new Audio('/audio/Buzzer.wav'), // Buzzer sound for elimination
      youWin: new Audio('/audio/win_game.wav'), // Win sound
    };

    // Configure footsteps audio
    const footstepsAudio = audioRef.current.footsteps;
    footstepsAudio.loop = true;
    footstepsAudio.volume = 0.6; // Adjust volume as needed
    
    // Configure green light audio
    const greenLightAudio = audioRef.current.greenLight;
    greenLightAudio.volume = 0.7; // Moderate volume for green light announcement
    
    // Configure red light audio
    const redLightAudio = audioRef.current.redLight;
    redLightAudio.volume = 0.7; // Moderate volume for red light announcement
    
    // Configure buzzer audio
    const buzzerAudio = audioRef.current.buzzer;
    buzzerAudio.volume = 0.8; // Slightly louder for elimination sound
    
    // Configure win audio
    const youWinAudio = audioRef.current.youWin;
    youWinAudio.volume = 0.8; // Moderate volume for win announcement
    
    // Add error handling for audio loading
    footstepsAudio.addEventListener('error', (e) => {
      console.error('Failed to load footsteps audio:', e);
    });
    
    footstepsAudio.addEventListener('canplaythrough', () => {
      console.log('Footsteps audio loaded successfully');
    });
    
    greenLightAudio.addEventListener('error', (e) => {
      console.error('Failed to load green light audio:', e);
    });
    
    greenLightAudio.addEventListener('canplaythrough', () => {
      console.log('Green light audio loaded successfully');
    });
    
    redLightAudio.addEventListener('error', (e) => {
      console.error('Failed to load red light audio:', e);
    });
    
    redLightAudio.addEventListener('canplaythrough', () => {
      console.log('Red light audio loaded successfully');
    });
    
    buzzerAudio.addEventListener('error', (e) => {
      console.error('Failed to load buzzer audio:', e);
    });
    
    buzzerAudio.addEventListener('canplaythrough', () => {
      console.log('Buzzer audio loaded successfully');
    });
    
    youWinAudio.addEventListener('error', (e) => {
      console.error('Failed to load you win audio:', e);
    });
    
    youWinAudio.addEventListener('canplaythrough', () => {
      console.log('You win audio loaded successfully');
    });
  }, []);

  // Footsteps management
  useEffect(() => {
    const footstepsAudio = audioRef.current.footsteps;
    
    if (isPlayerMoving && gameState === 'playing' && lightState === 'green') {
      // Start footsteps when player is moving during green light
      if (footstepsAudio.paused) {
        footstepsAudio.currentTime = 0; // Reset to beginning
        footstepsAudio.play().catch(() => {
          console.log('Footsteps audio play failed (autoplay restrictions)');
        });
      }
    } else {
      // Stop footsteps when not moving or during red light
      if (!footstepsAudio.paused) {
        footstepsAudio.pause();
        footstepsAudio.currentTime = 0;
      }
    }

    return () => {
      // Cleanup: stop footsteps when component unmounts
      if (footstepsAudio && !footstepsAudio.paused) {
        footstepsAudio.pause();
        footstepsAudio.currentTime = 0;
      }
    };
  }, [isPlayerMoving, gameState, lightState]);

  // Play audio cues
  useEffect(() => {
    if (gameState === 'playing') {
      const audio = audioRef.current[lightState === 'green' ? 'greenLight' : 'redLight'];
      if (audio && audio.src) {
        audio.play().catch(() => {}); // Ignore autoplay restrictions
      }
    }
  }, [lightState, gameState]);

  // Play buzzer sound when player gets eliminated
  useEffect(() => {
    if (gameState === 'eliminated') {
      const buzzerAudio = audioRef.current.buzzer;
      if (buzzerAudio && buzzerAudio.src) {
        buzzerAudio.currentTime = 0; // Reset to beginning
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
        youWinAudio.currentTime = 0; // Reset to beginning
        youWinAudio.play().catch(() => {
          console.log('You win audio play failed (autoplay restrictions)');
        });
      }
    }
  }, [gameState]);

  // Camera rig with multiple modes
  type CameraMode = 'follow' | 'closeup' | 'drone' | 'firstPerson';
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
            desiredPos = worldPos.clone().add(new THREE.Vector3(2.5, 3.0, -6.0));
            lookAt = worldPos.clone().add(new THREE.Vector3(0, 1.0, 6));
            targetFov = 50;
          } else if (cameraMode === 'closeup') {
            // Cinematic close-up: slightly below and to the side, tighter FOV
            desiredPos = worldPos.clone().add(new THREE.Vector3(1.2, 1.2, -2.2));
            lookAt = worldPos.clone().add(new THREE.Vector3(0, 1.4, 3));
            targetFov = 35;
          } else if (cameraMode === 'drone') {
            // High-altitude top-down over the field center
            desiredPos = new THREE.Vector3(0, 50, 10);
            lookAt = new THREE.Vector3(0, 0, 10);
            targetFov = 60;
          } else {
            // firstPerson: at player head, slight handheld shake
            const time = performance.now() * 0.001;
            const shake = new THREE.Vector3(
              Math.sin(time * 12) * 0.03,
              Math.sin(time * 15 + 1) * 0.025,
              0
            );
            desiredPos = worldPos.clone().add(new THREE.Vector3(0.0, 1.6, 0.2)).add(shake);
            lookAt = worldPos.clone().add(new THREE.Vector3(0, 1.5, 6));
            targetFov = 55;
          }

          cam.position.lerp(desiredPos, 0.12);
          cam.lookAt(lookAt);

          // Smoothly lerp FOV per mode
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
  const [cameraMode, setCameraMode] = useState<CameraMode>('follow');

  // Spacebar cycles camera modes
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setCameraMode((mode) =>
          mode === 'follow' ? 'closeup' : mode === 'closeup' ? 'drone' : mode === 'drone' ? 'firstPerson' : 'follow'
        );
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className="w-full h-screen relative bg-gradient-to-b from-blue-400 to-blue-600">
      {/* Level Progression */}
      <LevelProgression 
        onLevelChange={onLevelChange || (() => {})}
        onNextLevel={onNextLevel || (() => {})}
        showNextLevelButton={gameState === 'won'}
      />
      
      <Canvas
        shadows
        camera={{ 
          position: FIELD_CONFIG.CAMERA_POSITION,
          fov: 50,
          near: 0.1,
          far: 300
        }}
      >
        {/* Camera rig; press Space to cycle modes */}
        <FollowCamera targetRef={playerRef} cameraMode={cameraMode} />
        <Environment />
        <Player
          lightState={lightState}
          gameState={gameState}
          onElimination={eliminatePlayer}
          onPositionUpdate={updatePlayerPosition}
          modelPath={MODEL_CONFIG.player.path}
          onRefReady={(ref) => { (playerRef as any).current = ref.current; }}
          onMovementChange={setIsPlayerMoving} // Pass movement state up
        />
        {/* Soldiers flanking the doll, facing players */}
        <Doll lightState={lightState} gameState={gameState} modelPath={MODEL_CONFIG.doll.path} />
        <Soldier position={FIELD_CONFIG.SOLDIER_POSITIONS[0]} rotation={[0, Math.PI, 0]} />
        <Soldier position={FIELD_CONFIG.SOLDIER_POSITIONS[1]} rotation={[0, Math.PI, 0]} />
        {/* FollowCamera is mounted above */}
        
        {/* Camera controls - disabled during gameplay for better experience */}
        {/* Fixed camera for consistency; controls disabled to preserve framing */}
        <Celebration gameState={gameState} />
      </Canvas>
      
      <GameUI
        gameState={gameState}
        lightState={lightState}
        timeLeft={timeLeft}
        countdown={countdown}
        progress={progress}
        onStartGame={startGame}
        onResetGame={resetGame}
      />
      
      {/* Model tester for debugging - remove in production */}
      <ModelTester />
    </div>
  );
};