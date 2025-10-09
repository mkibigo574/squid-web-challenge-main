import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export const TugOfWarEnvironment = () => {
  const groundRef = useRef<THREE.Mesh>(null);
  const pulseRef = useRef<THREE.Mesh>(null);
  const markerGroupRef = useRef<THREE.Group>(null);
  
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
  });

  return (
    <group>
      {/* Background floor to catch stylized lighting */}
      <mesh ref={groundRef} position={[0, -8, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[80, 60]} />
        <meshStandardMaterial color="#111018" />
      </mesh>

      {/* Central purple stage with gold trim */}
      <group position={[0, 0, 0]}>
        {/* Purple deck */}
        <mesh position={[0, 0, 0]} receiveShadow castShadow>
          <boxGeometry args={[18, 0.8, 12]} />
          <meshStandardMaterial color="#5b3aa5" metalness={0.2} roughness={0.4} />
        </mesh>
        {/* Gold border */}
        <mesh position={[0, -0.45, 0]} castShadow>
          <boxGeometry args={[19.2, 0.2, 13.2]} />
          <meshStandardMaterial color="#d4a017" metalness={0.8} roughness={0.2} />
        </mesh>
      </group>

      {/* Side platforms - elevated left/right pads with simple scaffold accents */}
      <group>
        <mesh position={[-16, 1.2, 0]} castShadow receiveShadow>
          <boxGeometry args={[10, 1.2, 6]} />
          <meshStandardMaterial color="#2e2a3f" />
        </mesh>
        <mesh position={[16, 1.2, 0]} castShadow receiveShadow>
          <boxGeometry args={[10, 1.2, 6]} />
          <meshStandardMaterial color="#2e2a3f" />
        </mesh>
        {[-16, 16].map((x) => (
          <group key={x} position={[x, 0, 0]}>
            <mesh position={[0, -1.2, 2.8]}>
              <boxGeometry args={[10, 0.2, 0.2]} />
              <meshStandardMaterial color="#6f5a24" />
            </mesh>
            <mesh position={[0, -1.2, -2.8]}>
              <boxGeometry args={[10, 0.2, 0.2]} />
              <meshStandardMaterial color="#6f5a24" />
            </mesh>
            <mesh position={[4.8, -3, 0]}>
              <boxGeometry args={[0.2, 4, 0.2]} />
              <meshStandardMaterial color="#6f5a24" />
            </mesh>
            <mesh position={[-4.8, -3, 0]}>
              <boxGeometry args={[0.2, 4, 0.2]} />
              <meshStandardMaterial color="#6f5a24" />
            </mesh>
          </group>
        ))}
      </group>

      {/* Rope anchors near stage edges */}
      <mesh position={[-9.5, 1.4, 0]}>
        <cylinderGeometry args={[0.18, 0.18, 0.6]} />
        <meshStandardMaterial color="#404040" />
      </mesh>
      <mesh position={[9.5, 1.4, 0]}>
        <cylinderGeometry args={[0.18, 0.18, 0.6]} />
        <meshStandardMaterial color="#404040" />
      </mesh>

      {/* Hanging red triangle midpoint marker */}
      <group ref={markerGroupRef} position={[0, 3, 0]}>
        {/* Cable */}
        <mesh position={[0, 0.6, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 1.2]} />
          <meshStandardMaterial color="#cccccc" />
        </mesh>
        {/* Red cone (triangular marker stylization) */}
        <mesh ref={pulseRef} position={[0, 0, 0]} castShadow>
          <coneGeometry args={[0.9, 1.2, 3]} />
          <meshStandardMaterial color="#e0192d" emissive="#780a14" metalness={0.4} roughness={0.35} />
        </mesh>
      </group>

      {/* Background gradient panels and central light streak */}
      <group position={[0, 0, -8]}>
        <mesh rotation={[0, 0, 0]}>
          <planeGeometry args={[70, 40]} />
          <meshStandardMaterial color="#1a1230" />
        </mesh>
        <mesh position={[0, 0, 0.01]}>
          <planeGeometry args={[2, 40]} />
          <meshStandardMaterial color="#3d2b7b" emissive="#3d2b7b" emissiveIntensity={0.4} />
        </mesh>
      </group>

      {/* Stylized arena lighting matching reference */}
      <ambientLight intensity={0.35} />
      <spotLight position={[-20, 18, 10]} angle={0.6} intensity={1.2} color="#6a40d8" penumbra={0.6} castShadow />
      <spotLight position={[20, 18, -10]} angle={0.6} intensity={1.0} color="#ff8c3a" penumbra={0.6} castShadow />
      <directionalLight position={[0, 15, 5]} intensity={0.6} castShadow />
    </group>
  );
};


