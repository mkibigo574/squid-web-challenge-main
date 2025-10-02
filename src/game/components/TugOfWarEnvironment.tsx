import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export const TugOfWarEnvironment = () => {
  const groundRef = useRef<THREE.Mesh>(null);
  const leftTeamRef = useRef<THREE.Group>(null);
  const rightTeamRef = useRef<THREE.Group>(null);

  // Animate team members slightly
  useFrame((state) => {
    if (leftTeamRef.current) {
      leftTeamRef.current.children.forEach((child, index) => {
        if (child instanceof THREE.Mesh) {
          child.position.y = Math.sin(state.clock.elapsedTime * 2 + index) * 0.1;
        }
      });
    }
    
    if (rightTeamRef.current) {
      rightTeamRef.current.children.forEach((child, index) => {
        if (child instanceof THREE.Mesh) {
          child.position.y = Math.sin(state.clock.elapsedTime * 2 + index + Math.PI) * 0.1;
        }
      });
    }
  });

  return (
    <group>
      {/* Ground */}
      <mesh ref={groundRef} position={[0, -0.5, 0]} receiveShadow>
        <planeGeometry args={[20, 10]} />
        <meshStandardMaterial color="#8B4513" />
      </mesh>

      {/* Center line */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[20, 0.2]} />
        <meshStandardMaterial color="#FFFFFF" />
      </mesh>

      {/* Left team (AI) - 5 players */}
      <group ref={leftTeamRef} position={[-6, 0, 0]}>
        {Array.from({ length: 5 }, (_, i) => (
          <group key={i} position={[0, 0, (i - 2) * 1.5]}>
            <mesh position={[0, 0.5, 0]} castShadow>
              <boxGeometry args={[0.6, 1.2, 0.6]} />
              <meshStandardMaterial color="#FF6B6B" />
            </mesh>
            {/* Arms in pulling position */}
            <mesh position={[0.3, 0.5, 0]} rotation={[0, 0, Math.PI / 4]}>
              <boxGeometry args={[0.2, 0.6, 0.2]} />
              <meshStandardMaterial color="#FF6B6B" />
            </mesh>
            <mesh position={[-0.3, 0.5, 0]} rotation={[0, 0, -Math.PI / 4]}>
              <boxGeometry args={[0.2, 0.6, 0.2]} />
              <meshStandardMaterial color="#FF6B6B" />
            </mesh>
          </group>
        ))}
      </group>

      {/* Right team (Player) - 5 players */}
      <group ref={rightTeamRef} position={[6, 0, 0]}>
        {Array.from({ length: 5 }, (_, i) => (
          <group key={i} position={[0, 0, (i - 2) * 1.5]}>
            <mesh position={[0, 0.5, 0]} castShadow>
              <boxGeometry args={[0.6, 1.2, 0.6]} />
              <meshStandardMaterial color="#4ECDC4" />
            </mesh>
            {/* Arms in pulling position */}
            <mesh position={[0.3, 0.5, 0]} rotation={[0, 0, Math.PI / 4]}>
              <boxGeometry args={[0.2, 0.6, 0.2]} />
              <meshStandardMaterial color="#4ECDC4" />
            </mesh>
            <mesh position={[-0.3, 0.5, 0]} rotation={[0, 0, -Math.PI / 4]}>
              <boxGeometry args={[0.2, 0.6, 0.2]} />
              <meshStandardMaterial color="#4ECDC4" />
            </mesh>
          </group>
        ))}
      </group>

      {/* Rope anchors */}
      <mesh position={[-6, 1, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 0.2]} />
        <meshStandardMaterial color="#8B4513" />
      </mesh>
      <mesh position={[6, 1, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 0.2]} />
        <meshStandardMaterial color="#8B4513" />
      </mesh>

      {/* Spectator stands */}
      <group position={[0, 2, -8]}>
        <mesh>
          <boxGeometry args={[20, 0.5, 2]} />
          <meshStandardMaterial color="#666666" />
        </mesh>
        {/* Spectators */}
        {Array.from({ length: 20 }, (_, i) => (
          <mesh key={i} position={[(i - 10) * 0.8, 1, 0]}>
            <boxGeometry args={[0.4, 1.5, 0.4]} />
            <meshStandardMaterial color="#FFD700" />
          </mesh>
        ))}
      </group>

      {/* Lighting */}
      <pointLight position={[0, 10, 0]} intensity={0.5} />
      <pointLight position={[-5, 5, 0]} intensity={0.3} color="#FF6B6B" />
      <pointLight position={[5, 5, 0]} intensity={0.3} color="#4ECDC4" />
    </group>
  );
};


