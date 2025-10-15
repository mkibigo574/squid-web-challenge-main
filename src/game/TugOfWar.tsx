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

  // Initialize audio - DISABLED for Tug of War until proper sounds are created
  useEffect(() => {
    // Audio disabled for Tug of War game
    // TODO: Add proper Tug of War specific sounds
    audioRef.current = {
      tugSound: null, // Disabled
      buzzer: null, // Disabled
      youWin: null, // Disabled
      countdown: null, // Disabled
    };
  }, []);

  // Tugging sound management - DISABLED
  useEffect(() => {
    // Sound disabled for Tug of War game
    // TODO: Add proper Tug of War specific sounds
    return () => {
      // Cleanup disabled
    };
  }, [isPlayerPulling, gameState]);

  // Play buzzer sound when player loses - DISABLED
  useEffect(() => {
    // Sound disabled for Tug of War game
    // TODO: Add proper Tug of War specific sounds
  }, [gameState]);

  // Play win sound when player wins - DISABLED
  useEffect(() => {
    // Sound disabled for Tug of War game
    // TODO: Add proper Tug of War specific sounds
  }, [gameState]);

  // Play countdown sound - DISABLED
  useEffect(() => {
    // Sound disabled for Tug of War game
    // TODO: Add proper Tug of War specific sounds
  }, [countdown, gameState]);


  // Initialize audio for Tug of War
  useEffect(() => {
    audioRef.current = {
      winGame: new Audio('/audio/win_game.wav'),
      buzzer: new Audio('/audio/Buzzer.wav'),
      tugging: new Audio('/audio/tugging_sound.wav'),
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

  // Play win sound when player wins
  const playWinSound = () => {
    const winAudio = audioRef.current.winGame;
    if (winAudio && winAudio.src) {
      winAudio.currentTime = 0;
      winAudio.play().catch(() => {
        console.log('Win audio play failed (autoplay restrictions)');
      });
    }
  };

  // Play buzzer sound when player loses
  const playBuzzerSound = () => {
    const buzzerAudio = audioRef.current.buzzer;
    if (buzzerAudio && buzzerAudio.src) {
      buzzerAudio.currentTime = 0;
      buzzerAudio.play().catch(() => {
        console.log('Buzzer audio play failed (autoplay restrictions)');
      });
    }
  };

  // Play tugging sound
  const playTuggingSound = () => {
    const tuggingAudio = audioRef.current.tugging;
    if (tuggingAudio && tuggingAudio.src && gameState === 'playing') {
      tuggingAudio.currentTime = 0;
      tuggingAudio.volume = 0.7;
      tuggingAudio.play().catch(() => {
        console.log('Tugging audio play failed (autoplay restrictions)');
      });
    }
  };

  // Stop tugging sound with fade out
  const stopTuggingSound = () => {
    const tuggingAudio = audioRef.current.tugging;
    if (tuggingAudio && !tuggingAudio.paused) {
      // Fade out over 0.5 seconds
      const fadeOutDuration = 500; // milliseconds
      const startVolume = tuggingAudio.volume;
      const fadeOutSteps = 20; // Number of steps for smooth fade
      const stepDuration = fadeOutDuration / fadeOutSteps;
      const volumeDecrement = startVolume / fadeOutSteps;
      
      let currentStep = 0;
      const fadeInterval = setInterval(() => {
        currentStep++;
        const newVolume = Math.max(0, startVolume - (volumeDecrement * currentStep));
        tuggingAudio.volume = newVolume;
        
        if (currentStep >= fadeOutSteps || newVolume <= 0) {
          clearInterval(fadeInterval);
          tuggingAudio.pause();
          tuggingAudio.currentTime = 0;
          tuggingAudio.volume = 0.7; // Reset volume for next time
        }
      }, stepDuration);
    }
  };

  // Play win sound when player wins
  useEffect(() => {
    if (gameState === 'won') {
      playWinSound();
    }
  }, [gameState]);

  // Play buzzer sound when player loses
  useEffect(() => {
    if (gameState === 'eliminated') {
      playBuzzerSound();
    }
  }, [gameState]);


  // Squid Game style camera - optimized for tug of war viewing
  const SquidGameCamera = () => {
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

  // Stable ref for player to follow
  const playerRef = useRef<THREE.Group>(null);
  const aiPlayerRef = useRef<THREE.Group>(null);
  
  // Player position and force tracking
  const [leftPlayerPosition, setLeftPlayerPosition] = useState(-6);
  const [rightPlayerPosition, setRightPlayerPosition] = useState(6);
  const [leftPullForce, setLeftPullForce] = useState(0);
  const [rightPullForce, setRightPullForce] = useState(0);
  const [pullStrength, setPullStrength] = useState(0);

  // Handle keyboard input for tugging
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (gameState === 'playing') {
        if (e.code === 'KeyW' || e.code === 'ArrowUp' || e.code === 'Space') {
          e.preventDefault();
          pullRope();
          setIsPlayerPulling(true);
=
          // Play tugging sound on key press
          playTuggingSound();
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'KeyW' || e.code === 'ArrowUp' || e.code === 'Space') {
        e.preventDefault();
        releaseRope();
        setIsPlayerPulling(false);<<<<<<< HEAD

        // Stop tugging sound on key release
        stopTuggingSound();
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
    <div className="w-full h-screen relative bg-gray-900">
      {/* Level Progression */}
      <LevelProgression 
        onLevelChange={onLevelChange || (() => {})}
        onNextLevel={onNextLevel || (() => {})}
        showNextLevelButton={gameState === 'won'}
      />
      
      <Canvas
        shadows
        camera={{ 
          position: [0, 6, 12],
          fov: 60,
          near: 0.1,
          far: 500
        }}
      >
        {/* Squid Game style camera */}
        <SquidGameCamera />
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 10, -5]} intensity={0.8} castShadow />
        
        <TugOfWarEnvironment />
        
        {/* Left Team Player */}
        <TugOfWarPlayer
          gameState={gameState}
          onPositionUpdate={(position) => {
            // Handle left player position updates
            setLeftPlayerPosition(position);
          }}
          modelPath={MODEL_CONFIG.player.path}
          onRefReady={(ref) => { (playerRef as any).current = ref.current; }}
          isPulling={isPulling}
          pullStrength={pullStrength}
          ropePosition={ropePosition}
          teamSide="left"
          onPullForce={(force) => {
            setLeftPullForce(force);
            setPullStrength(force);
          }}
          isAI={false}
          opponentPosition={rightPlayerPosition}
        />
        
        {/* Right Team Player (AI) */}
        <TugOfWarPlayer
          gameState={gameState}
          onPositionUpdate={(position) => {
            // Handle right player position updates
            setRightPlayerPosition(position);
          }}
          modelPath={MODEL_CONFIG.player.path}
          onRefReady={(ref) => { (aiPlayerRef as any).current = ref.current; }}
          isPulling={false} // AI doesn't pull, it resists
          pullStrength={0}
          ropePosition={ropePosition}
          teamSide="right"
          onPullForce={(force) => setRightPullForce(force)}
          isAI={true}
          opponentPosition={leftPlayerPosition}
        />
        
        <TugOfWarRope 
          ropePosition={ropePosition}
          gameState={gameState}
          leftPlayerPos={leftPlayerPosition}
          rightPlayerPos={rightPlayerPosition}
          hasLeftPlayer={true}
          hasRightPlayer={true}
        />
        
        <Celebration gameState={gameState} />
      </Canvas>
      
      <TugOfWarUI
        gameState={gameState}
        timeLeft={timeLeft}
        countdown={countdown}
        ropePosition={ropePosition}
        isPulling={isPulling}
        pullStrength={0}
        players={[]}
        isHost={true}
        winners={[]}
        ended={false}
        currentPlayerId={'local'}
        onStartGame={startGame}
        onResetGame={resetGame}
        onPullRope={pullRope}
        onReleaseRope={releaseRope}
        onNextLevel={() => {
          // This will be handled by the parent component
          console.log('Next level requested');
        }}
      />
    </div>
  );
};
