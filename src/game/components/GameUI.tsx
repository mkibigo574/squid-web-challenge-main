import { GameState, LightState } from '../hooks/useGame';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface GameUIProps {
  gameState: GameState;
  lightState: LightState;
  timeLeft: number;
  countdown: number;
  progress: number;
  onStartGame: () => void;
  onResetGame: () => void;
}

interface BalloonProps {
  position: [number, number, number];
  color: string;
  speed: number;
}

const Balloon = ({ position, color, speed }: BalloonProps) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      // Float upward
      groupRef.current.position.y += speed * 0.01;
      // Gentle swaying motion
      groupRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 2) * 0.1;
    }
  });

  return (
    <group ref={groupRef} position={position}>
      {/* Balloon body */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshBasicMaterial color={color} />
      </mesh>
      {/* Balloon string */}
      <mesh position={[0, -0.5, 0]}>
        <cylinderGeometry args={[0.01, 0.01, 1]} />
        <meshBasicMaterial color="#8B4513" />
      </mesh>
    </group>
  );
};

interface ConfettiProps {
  position: [number, number, number];
  color: string;
  speed: number;
}

const Confetti = ({ position, color, speed }: ConfettiProps) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      // Fall down with rotation
      groupRef.current.position.y -= speed * 0.02;
      groupRef.current.rotation.x += 0.1;
      groupRef.current.rotation.z += 0.05;
      // Gentle side-to-side movement
      groupRef.current.position.x += Math.sin(state.clock.elapsedTime * 3) * 0.01;
    }
  });

  return (
    <group ref={groupRef} position={position}>
      <mesh ref={meshRef}>
        <planeGeometry args={[0.1, 0.2]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </group>
  );
};

interface CelebrationProps {
  gameState: string;
}

export const Celebration = ({ gameState }: CelebrationProps) => {
  const balloonColors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
  const confettiColors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'];

  if (gameState !== 'won') return null;

  return (
    <>
      {/* Balloons */}
      {Array.from({ length: 20 }, (_, i) => (
        <Balloon
          key={`balloon-${i}`}
          position={[
            (Math.random() - 0.5) * 40, // Random X position
            Math.random() * 10, // Random starting height
            (Math.random() - 0.5) * 40  // Random Z position
          ]}
          color={balloonColors[Math.floor(Math.random() * balloonColors.length)]}
          speed={0.5 + Math.random() * 0.5}
        />
      ))}

      {/* Confetti */}
      {Array.from({ length: 50 }, (_, i) => (
        <Confetti
          key={`confetti-${i}`}
          position={[
            (Math.random() - 0.5) * 20, // Random X position
            15 + Math.random() * 10, // Start from above
            (Math.random() - 0.5) * 20  // Random Z position
          ]}
          color={confettiColors[Math.floor(Math.random() * confettiColors.length)]}
          speed={1 + Math.random() * 2}
        />
      ))}
    </>
  );
};

export const GameUI = ({
  gameState,
  lightState,
  timeLeft,
  countdown,
  progress,
  onStartGame,
  onResetGame
}: GameUIProps) => {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Top UI */}
      <div className="absolute top-4 left-0 right-0 flex justify-between items-center px-8 pointer-events-auto">
        {/* Light State Indicator */}
        <div className={`text-2xl font-bold px-4 py-2 rounded-lg ${
          lightState === 'green' 
            ? 'bg-green-500 text-white' 
            : 'bg-red-500 text-white'
        }`}>
          {lightState === 'green' ? 'GREEN LIGHT' : 'RED LIGHT'}
        </div>
        
        {/* Timer */}
        <div className="text-3xl font-bold text-white bg-black/50 px-4 py-2 rounded-lg">
          {timeLeft}s
        </div>
      </div>

      {/* Center UI */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-auto">
        {gameState === 'waiting' && (
          <div className="space-y-4">
            <Button onClick={onStartGame} size="lg" className="text-xl px-8 py-4">
              Start Game
            </Button>
          </div>
        )}
        
        {gameState === 'countdown' && (
          <div className="text-8xl font-bold text-white">
            {countdown > 0 ? countdown : 'GO!'}
          </div>
        )}
        
        {gameState === 'won' && (
          <div className="space-y-4 animate-bounce">
            <h2 className="text-8xl font-bold text-green-400 drop-shadow-lg">
              🎉 YOU WIN! 🎉
            </h2>
            <p className="text-2xl text-white drop-shadow-lg">
              Congratulations! You reached the finish line!
            </p>
            <div className="text-4xl">🎈🎊🎉🎈🎊🎉</div>
            <Button onClick={onResetGame} size="lg" className="text-xl px-8 py-4 bg-green-600 hover:bg-green-700">
              Play Again
            </Button>
          </div>
        )}
        
        {gameState === 'eliminated' && (
          <div className="space-y-4">
            <h2 className="text-6xl font-bold text-red-400">ELIMINATED!</h2>
            <p className="text-xl text-white">
              {timeLeft === 0 ? 'Time ran out!' : 'You moved during red light!'}
            </p>
            <Button onClick={onResetGame} size="lg" className="text-xl px-8 py-4">
              Try Again
            </Button>
          </div>
        )}
      </div>

      {/* Instructions (bottom-left) */}
      <div className="absolute bottom-4 left-4 max-w-sm pointer-events-none">
        <div className="bg-black/50 text-white px-4 py-3 rounded-lg leading-snug">
          <div className="font-bold">Red Light, Green Light</div>
          <div className="text-sm">Move during GREEN LIGHT, freeze during RED LIGHT!</div>
          <div className="text-sm">Use WASD or Arrow Keys to move</div>
        </div>
      </div>

      {/* Bottom UI */}
      {gameState === 'playing' && (
        <div className="absolute bottom-8 left-8 right-8 pointer-events-auto">
          <div className="bg-black/50 p-4 rounded-lg">
            <div className="text-white mb-2">Progress to Finish Line</div>
            <Progress value={progress * 100} className="h-4" />
          </div>
        </div>
      )}

      {/* Controls hint */}
      {gameState === 'playing' && (
        <div className="absolute bottom-4 right-4 text-white bg-black/50 px-3 py-2 rounded">
          WASD / Arrow Keys to move
        </div>
      )}
    </div>
  );
};