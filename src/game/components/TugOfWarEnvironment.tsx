import { useRef } from 'react';
import * as THREE from 'three';

export const TugOfWarEnvironment = () => {
  const groundRef = useRef<THREE.Mesh>(null);
  

  return (
    <group>
      {/* Ground - Larger field for better visibility */}
      <mesh ref={groundRef} position={[0, -0.5, 0]} receiveShadow>
        <planeGeometry args={[30, 15]} />
        <meshStandardMaterial color="#8B4513" />
      </mesh>

      {/* Center line */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[30, 0.2]} />
        <meshStandardMaterial color="#FFFFFF" />
      </mesh>


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
      <group position={[0, 2, -10]}>
        <mesh>
          <boxGeometry args={[30, 0.5, 2]} />
          <meshStandardMaterial color="#666666" />
        </mesh>
        {/* Spectators */}
        {Array.from({ length: 25 }, (_, i) => (
          <mesh key={i} position={[(i - 12) * 0.8, 1, 0]}>
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


