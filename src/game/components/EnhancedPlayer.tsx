import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { materialManager } from '../utils/materials';

interface EnhancedPlayerProps {
  position: [number, number, number];
  rotation?: [number, number, number];
  color?: string;
  isPulling?: boolean;
  pullStrength?: number;
  gameState?: 'waiting' | 'countdown' | 'playing' | 'won' | 'eliminated';
}

export const EnhancedPlayer = ({ 
  position, 
  rotation = [0, 0, 0], 
  color = '#4ECDC4',
  isPulling = false,
  pullStrength = 0,
  gameState = 'waiting'
}: EnhancedPlayerProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Mesh>(null);
  const headRef = useRef<THREE.Mesh>(null);
  const leftArmRef = useRef<THREE.Mesh>(null);
  const rightArmRef = useRef<THREE.Mesh>(null);
  const leftLegRef = useRef<THREE.Mesh>(null);
  const rightLegRef = useRef<THREE.Mesh>(null);

  // Create enhanced materials
  const bodyMaterial = useMemo(() => {
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      roughness: 0.8,
      metalness: 0.1,
    });
    return material;
  }, [color]);

  const skinMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(0.9, 0.8, 0.7), // Skin tone
      roughness: 0.9,
      metalness: 0.0,
    });
  }, []);

  const clothingMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: new THREE.Color(0.2, 0.2, 0.2), // Dark clothing
      roughness: 0.9,
      metalness: 0.0,
    });
  }, []);

  // Animation based on game state and pulling
  useFrame((state) => {
    if (!groupRef.current) return;

    const time = state.clock.elapsedTime;
    const pullIntensity = isPulling ? pullStrength : 0;

    // Breathing animation
    const breathe = Math.sin(time * 2) * 0.02;
    if (bodyRef.current) {
      bodyRef.current.scale.y = 1 + breathe;
    }

    // Pulling animation
    if (isPulling && gameState === 'playing') {
      // Lean forward when pulling
      groupRef.current.rotation.z = Math.sin(time * 8) * 0.1 * pullIntensity;
      
      // Arm movement
      if (leftArmRef.current && rightArmRef.current) {
        const armSwing = Math.sin(time * 12) * 0.3 * pullIntensity;
        leftArmRef.current.rotation.x = armSwing;
        rightArmRef.current.rotation.x = -armSwing;
      }

      // Leg movement
      if (leftLegRef.current && rightLegRef.current) {
        const legSwing = Math.sin(time * 10) * 0.2 * pullIntensity;
        leftLegRef.current.rotation.x = legSwing;
        rightLegRef.current.rotation.x = -legSwing;
      }
    } else {
      // Idle animation
      if (leftArmRef.current && rightArmRef.current) {
        const idleSwing = Math.sin(time * 1.5) * 0.05;
        leftArmRef.current.rotation.x = idleSwing;
        rightArmRef.current.rotation.x = idleSwing;
      }
    }

    // Victory animation
    if (gameState === 'won') {
      groupRef.current.rotation.y = Math.sin(time * 3) * 0.2;
      groupRef.current.position.y = position[1] + Math.sin(time * 4) * 0.1;
    }

    // Defeat animation
    if (gameState === 'eliminated') {
      groupRef.current.rotation.x = Math.PI / 2;
      groupRef.current.position.y = position[1] - 0.5;
    }
  });

  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      {/* Body */}
      <mesh ref={bodyRef} position={[0, 0.9, 0]} castShadow receiveShadow>
        <capsuleGeometry args={[0.35, 0.8, 4, 10]} />
        <primitive object={bodyMaterial} />
      </mesh>

      {/* Head */}
      <mesh ref={headRef} position={[0, 1.8, 0]} castShadow receiveShadow>
        <sphereGeometry args={[0.32, 16, 16]} />
        <primitive object={skinMaterial} />
      </mesh>

      {/* Eyes */}
      <mesh position={[-0.1, 1.85, 0.25]} castShadow>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshStandardMaterial color="#000000" />
      </mesh>
      <mesh position={[0.1, 1.85, 0.25]} castShadow>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshStandardMaterial color="#000000" />
      </mesh>

      {/* Left Arm */}
      <mesh ref={leftArmRef} position={[-0.6, 1.2, 0]} castShadow receiveShadow>
        <capsuleGeometry args={[0.12, 0.6, 4, 8]} />
        <primitive object={skinMaterial} />
      </mesh>

      {/* Right Arm */}
      <mesh ref={rightArmRef} position={[0.6, 1.2, 0]} castShadow receiveShadow>
        <capsuleGeometry args={[0.12, 0.6, 4, 8]} />
        <primitive object={skinMaterial} />
      </mesh>

      {/* Left Leg */}
      <mesh ref={leftLegRef} position={[-0.2, 0.2, 0]} castShadow receiveShadow>
        <capsuleGeometry args={[0.15, 0.8, 4, 8]} />
        <primitive object={clothingMaterial} />
      </mesh>

      {/* Right Leg */}
      <mesh ref={rightLegRef} position={[0.2, 0.2, 0]} castShadow receiveShadow>
        <capsuleGeometry args={[0.15, 0.8, 4, 8]} />
        <primitive object={clothingMaterial} />
      </mesh>

      {/* Hands */}
      <mesh position={[-0.6, 0.8, 0]} castShadow>
        <sphereGeometry args={[0.08, 8, 8]} />
        <primitive object={skinMaterial} />
      </mesh>
      <mesh position={[0.6, 0.8, 0]} castShadow>
        <sphereGeometry args={[0.08, 8, 8]} />
        <primitive object={skinMaterial} />
      </mesh>

      {/* Feet */}
      <mesh position={[-0.2, -0.2, 0.1]} castShadow>
        <boxGeometry args={[0.2, 0.1, 0.3]} />
        <primitive object={clothingMaterial} />
      </mesh>
      <mesh position={[0.2, -0.2, 0.1]} castShadow>
        <boxGeometry args={[0.2, 0.1, 0.3]} />
        <primitive object={clothingMaterial} />
      </mesh>

      {/* Pulling effect */}
      {isPulling && gameState === 'playing' && (
        <group>
          {/* Energy particles */}
          {Array.from({ length: 5 }, (_, i) => (
            <mesh 
              key={i}
              position={[
                (Math.random() - 0.5) * 2,
                Math.random() * 2,
                (Math.random() - 0.5) * 2
              ]}
            >
              <sphereGeometry args={[0.02]} />
              <meshStandardMaterial 
                color="#FFD700" 
                transparent 
                opacity={0.6}
                emissive="#FFD700"
                emissiveIntensity={0.3}
              />
            </mesh>
          ))}
        </group>
      )}

      {/* Victory effect */}
      {gameState === 'won' && (
        <group>
          {Array.from({ length: 10 }, (_, i) => (
            <mesh 
              key={i}
              position={[
                Math.cos(i * 0.6) * 2,
                Math.sin(Date.now() * 0.01 + i) * 0.5 + 1,
                Math.sin(i * 0.6) * 2
              ]}
            >
              <sphereGeometry args={[0.1]} />
              <meshStandardMaterial 
                color="#FFD700" 
                transparent 
                opacity={0.8}
                emissive="#FFD700"
                emissiveIntensity={0.5}
              />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
};
