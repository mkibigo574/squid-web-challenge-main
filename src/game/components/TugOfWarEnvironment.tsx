import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export const TugOfWarEnvironment = () => {
  const groundRef = useRef<THREE.Mesh>(null);
  const warningLightRef = useRef<THREE.Mesh>(null);
  
  // Animate warning lights
  useFrame((state) => {
    if (warningLightRef.current) {
      const time = state.clock.elapsedTime;
      const intensity = Math.sin(time * 4) * 0.5 + 0.5; // Pulsing effect
      warningLightRef.current.material.emissiveIntensity = intensity;
    }
  });

  return (
    <group>
      {/* Ground - Industrial concrete floor */}
      <mesh ref={groundRef} position={[0, -8, 0]} receiveShadow>
        <planeGeometry args={[60, 40]} />
        <meshStandardMaterial color="#1A1A1A" />
      </mesh>

      {/* Elevated Platforms - Squid Game Style */}
      <group position={[0, 0, 0]}>
        {/* Left platform - Industrial concrete */}
        <mesh position={[-3, 0, 0]} receiveShadow>
          <boxGeometry args={[6, 1, 20]} />
          <meshStandardMaterial color="#2A2A2A" />
        </mesh>
        
        {/* Right platform - Industrial concrete */}
        <mesh position={[3, 0, 0]} receiveShadow>
          <boxGeometry args={[6, 1, 20]} />
          <meshStandardMaterial color="#2A2A2A" />
        </mesh>
        
        {/* Center gap - Black void */}
        <mesh position={[0, -0.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[2, 20]} />
          <meshStandardMaterial color="#000000" />
        </mesh>
        
        {/* Gap edges - Clean white lines */}
        <mesh position={[-1, 0.5, 0]}>
          <boxGeometry args={[0.1, 1, 20]} />
          <meshStandardMaterial color="#FFFFFF" />
        </mesh>
        <mesh position={[1, 0.5, 0]}>
          <boxGeometry args={[0.1, 1, 20]} />
          <meshStandardMaterial color="#FFFFFF" />
        </mesh>
        
        {/* Center line - White stripe */}
        <mesh position={[0, 0.51, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[2, 20]} />
          <meshStandardMaterial color="#FFFFFF" transparent opacity={0.3} />
        </mesh>
      </group>

      {/* Rope anchors - Industrial style */}
      <mesh position={[-6, 1.5, 0]}>
        <cylinderGeometry args={[0.15, 0.15, 0.3]} />
        <meshStandardMaterial color="#404040" />
      </mesh>
      <mesh position={[6, 1.5, 0]}>
        <cylinderGeometry args={[0.15, 0.15, 0.3]} />
        <meshStandardMaterial color="#404040" />
      </mesh>

      {/* Industrial lighting - Minimalist */}
      <ambientLight intensity={0.3} />
      <directionalLight position={[0, 10, 5]} intensity={0.8} castShadow />
      <pointLight position={[0, 8, 0]} intensity={0.5} color="#FFFFFF" />
    </group>
  );
};


