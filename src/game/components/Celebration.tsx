import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

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
