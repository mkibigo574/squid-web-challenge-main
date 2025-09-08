import { useRef } from 'react';
import * as THREE from 'three';

export const Environment = () => {
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[10, 10, 5]}
        intensity={1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />

      {/* Ground at y=0 */}
      <mesh receiveShadow position={[0, 0, 10]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[40, 40]} />
        <meshLambertMaterial color="#8b5a2b" />
      </mesh>

      {/* Start line at z = -5 */}
      <mesh position={[0, 0.01, -5]}>
        <boxGeometry args={[20, 0.1, 0.5]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>

      {/* Finish line at z = 25 */}
      <mesh position={[0, 0.01, 25]}>
        <boxGeometry args={[20, 0.1, 0.5]} />
        <meshBasicMaterial color="#ff0000" />
      </mesh>

      {/* Side barriers */}
      <mesh position={[-11, 1, 10]}>
        <boxGeometry args={[1, 2, 40]} />
        <meshLambertMaterial color="#8b4513" />
      </mesh>
      <mesh position={[11, 1, 10]}>
        <boxGeometry args={[1, 2, 40]} />
        <meshLambertMaterial color="#8b4513" />
      </mesh>

      {/* Background gradient */}
      <mesh position={[0, 15, 35]}>
        <planeGeometry args={[100, 30]} />
        <meshBasicMaterial color="#87ceeb" />
      </mesh>
    </>
  );
};