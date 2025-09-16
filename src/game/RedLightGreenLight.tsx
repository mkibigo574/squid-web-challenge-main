import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useGame } from './hooks/useGame';
import { Environment } from './components/Environment';
import { Player } from './components/Player';
import { Doll } from './components/Doll';
import { GameUI } from './components/GameUI';
import { ModelTester } from './components/ModelTester';
import { Soldier } from './components/Soldier';
import { MODEL_CONFIG } from './config/models';
import { preloadAllModels } from './utils/modelPreloader';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Celebration } from './components/Celebration';

export const RedLightGreenLight = () => {
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

  // Initialize audio (placeholder for now)
  useEffect(() => {
    // Placeholder audio elements - replace with actual files
    audioRef.current = {
      greenLight: new Audio(), // '/audio/green_light.mp3'
      redLight: new Audio(),   // '/audio/red_light.mp3'
      footsteps: new Audio(),  // '/audio/footsteps.mp3'
      buzzer: new Audio(),     // '/audio/buzzer.mp3'
    };
  }, []);

  // Play audio cues
  useEffect(() => {
    if (gameState === 'playing') {
      const audio = audioRef.current[lightState === 'green' ? 'greenLight' : 'redLight'];
      if (audio && audio.src) {
        audio.play().catch(() => {}); // Ignore autoplay restrictions
      }
    }
  }, [lightState, gameState]);

  useEffect(() => {
    if (gameState === 'eliminated') {
      const audio = audioRef.current.buzzer;
      if (audio && audio.src) {
        audio.play().catch(() => {});
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
      <Canvas
        shadows
        camera={{ 
          position: [0, 5, -10],
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
        />
        {/* Soldiers flanking the doll, facing players */}
        <Doll lightState={lightState} gameState={gameState} modelPath={MODEL_CONFIG.doll.path} />
        <Soldier position={[-5, 0, 25]} rotation={[0, Math.PI, 0]} />
        <Soldier position={[5, 0, 25]} rotation={[0, Math.PI, 0]} />
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