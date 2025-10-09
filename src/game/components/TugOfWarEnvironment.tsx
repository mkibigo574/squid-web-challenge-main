import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export const TugOfWarEnvironment = () => {
  const groundRef = useRef<THREE.Mesh>(null);
  const pulseRef = useRef<THREE.Mesh>(null);
  const markerGroupRef = useRef<THREE.Group>(null);
  const chainsawRef = useRef<THREE.Group>(null);
  
  // Pulsing emissive for the hanging midpoint marker
  useFrame((state) => {
    if (pulseRef.current) {
      const t = state.clock.elapsedTime;
      const intensity = Math.sin(t * 4) * 0.35 + 0.65;
      (pulseRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = intensity;
    }
    if (markerGroupRef.current) {
      const t = state.clock.elapsedTime;
      // Gentle pendulum sway and bob
      markerGroupRef.current.rotation.z = Math.sin(t * 1.2) * 0.08;
      markerGroupRef.current.position.y = 3 + Math.sin(t * 2.0) * 0.06;
    }
    // Rotate the chainsaw chain
    if (chainsawRef.current) {
      const t = state.clock.elapsedTime;
      chainsawRef.current.rotation.y = t * 8; // Fast rotation
    }
  });

  return (
    <group>
      {/* Background floor to catch stylized lighting */}
      <mesh ref={groundRef} position={[0, -8, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[80, 60]} />
        <meshStandardMaterial color="#111018" />
      </mesh>

      {/* Central brown stage with gold trim (widened to fit extended teams) */}
      <group position={[0, -6, 0]}>
        {/* Brown deck */}
        <mesh position={[0, 0, 0]} receiveShadow castShadow>
          <boxGeometry args={[48, 0.8, 12]} />
          <meshStandardMaterial color="#8B4513" metalness={0.2} roughness={0.4} />
        </mesh>
        {/* Gold border */}
        <mesh position={[0, -0.45, 0]} castShadow>
          <boxGeometry args={[49.2, 0.2, 13.2]} />
          <meshStandardMaterial color="#d4a017" metalness={0.8} roughness={0.2} />
        </mesh>
      </group>

      {/* Side platforms - elevated left/right pads with simple scaffold accents (span to platform ends) */}
      <group position={[0, 8, 0]}>
        <mesh position={[-13.5, 1.2, 0]} castShadow receiveShadow>
          <boxGeometry args={[20, 1.2, 6]} />
          <meshStandardMaterial color="#5b3aa5" />
        </mesh>
        <mesh position={[13.5, 1.2, 0]} castShadow receiveShadow>
          <boxGeometry args={[20, 1.2, 6]} />
          <meshStandardMaterial color="#5b3aa5" />
        </mesh>
        {[-13.5, 13.5].map((x) => (
          <group key={x} position={[x, 0, 0]}>
            <mesh position={[0, -1.2, 2.8]}>
              <boxGeometry args={[20, 0.2, 0.2]} />
              <meshStandardMaterial color="#6f5a24" />
            </mesh>
            <mesh position={[0, -1.2, -2.8]}>
              <boxGeometry args={[20, 0.2, 0.2]} />
              <meshStandardMaterial color="#6f5a24" />
            </mesh>
            <mesh position={[9.8, -8.2, 0]}>
              <boxGeometry args={[0.2, 14, 0.2]} />
              <meshStandardMaterial color="#8B4513" />
            </mesh>
            <mesh position={[-9.8, -8.2, 0]}>
              <boxGeometry args={[0.2, 14, 0.2]} />
              <meshStandardMaterial color="#8B4513" />
            </mesh>
          </group>
        ))}
      </group>

      {/* Rope anchors near widened stage edges */}
      <mesh position={[-22, 9.4, 0]}>
        <cylinderGeometry args={[0.18, 0.18, 0.6]} />
        <meshStandardMaterial color="#404040" />
      </mesh>
      <mesh position={[22, 9.4, 0]}>
        <cylinderGeometry args={[0.18, 0.18, 0.6]} />
        <meshStandardMaterial color="#404040" />
      </mesh>

      {/* Central rope anchor - positioned above the rope */}
      <mesh position={[0, 10.0, 0]}>
        <cylinderGeometry args={[0.18, 0.18, 0.6]} />
        <meshStandardMaterial color="#404040" />
      </mesh>

      {/* Rotating chainsaw chain in the center gap */}
      <group ref={chainsawRef} position={[0, -5, 0]}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.3, 0.3, 12]} />
          <meshStandardMaterial color="#ff0000" metalness={0.9} roughness={0.1} />
        </mesh>
        {/* Chain links around the cylinder */}
        {Array.from({ length: 16 }, (_, i) => {
          const angle = (i / 16) * Math.PI * 2;
          const x = Math.cos(angle) * 0.4;
          const z = Math.sin(angle) * 0.4;
          return (
            <mesh key={i} position={[x, 0, z]} rotation={[0, angle, 0]}>
              <boxGeometry args={[0.12, 0.2, 0.08]} />
              <meshStandardMaterial color="#cc0000" metalness={0.9} roughness={0.1} />
            </mesh>
          );
        })}
        {/* Sharp teeth */}
        {Array.from({ length: 32 }, (_, i) => {
          const angle = (i / 32) * Math.PI * 2;
          const x = Math.cos(angle) * 0.5;
          const z = Math.sin(angle) * 0.5;
          return (
            <mesh key={`tooth-${i}`} position={[x, 0, z]} rotation={[0, angle, 0]}>
              <coneGeometry args={[0.04, 0.15, 4]} />
              <meshStandardMaterial color="#ff0000" metalness={0.9} roughness={0.1} />
            </mesh>
          );
        })}
      </group>

      {/* Removed midpoint guillotine/marker for cleaner stage */}

      {/* Background gradient panels and central light streak */}
      <group position={[0, 0, -8]}>
        <mesh rotation={[0, 0, 0]}>
          <planeGeometry args={[120, 60]} />
          <meshStandardMaterial color="#0f0a2e" />
        </mesh>
      </group>

      {/* Stylized arena lighting matching reference */}
      <ambientLight intensity={0.3} />
      <spotLight position={[-28, 22, 12]} angle={0.55} intensity={1.4} color="#6a40d8" penumbra={0.7} castShadow />
      <spotLight position={[28, 22, -12]} angle={0.55} intensity={1.2} color="#ff8c3a" penumbra={0.7} castShadow />
      <directionalLight position={[0, 18, 6]} intensity={0.7} castShadow />
      
      {/* Chainsaw lighting */}
      <pointLight position={[0, -5, 0]} intensity={1.2} color="#ff4444" distance={8} />
    </group>
  );
};


