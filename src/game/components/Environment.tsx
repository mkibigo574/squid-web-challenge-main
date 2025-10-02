import { useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { MODEL_CONFIG } from '../config/models';
import { FIELD_CONFIG } from '../config/field';

// Tree component using the 3D model with error handling
const TreeModel = ({ position, rotation = [0, 0, 0], scale = [1, 1, 1] }: { 
  position: [number, number, number], 
  rotation?: [number, number, number], 
  scale?: [number, number, number] 
}) => {
  try {
    const { scene } = useGLTF(MODEL_CONFIG.tree.path);
    const clonedScene = useRef<THREE.Group>();

    if (!clonedScene.current) {
      clonedScene.current = scene.clone();
    }

    return (
      <group position={position} rotation={rotation} scale={scale}>
        <primitive object={clonedScene.current} />
      </group>
    );
  } catch (error) {
    console.warn('Failed to load tree model, using fallback:', error);
    // Fallback to simple geometry
    return (
      <group position={position} rotation={rotation} scale={scale}>
        <mesh>
          <cylinderGeometry args={[2, 4, 8]} />
          <meshLambertMaterial color="#228B22" />
        </mesh>
        <mesh position={[0, 4, 0]}>
          <sphereGeometry args={[3]} />
          <meshLambertMaterial color="#32CD32" />
        </mesh>
      </group>
    );
  }
};

// Preload the tree model with error handling
try {
  useGLTF.preload(MODEL_CONFIG.tree.path);
} catch (error) {
  console.warn('Failed to preload tree model:', error);
}

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
      <mesh receiveShadow position={FIELD_CONFIG.GROUND_PLANE_POSITION} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={FIELD_CONFIG.GROUND_PLANE_SIZE} />
        <meshLambertMaterial color="#8b5a2b" />
      </mesh>

      {/* Start line */}
      <mesh position={FIELD_CONFIG.START_LINE_POSITION}>
        <boxGeometry args={FIELD_CONFIG.LINE_SIZE} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>

      {/* Finish line */}
      <mesh position={FIELD_CONFIG.FINISH_LINE_POSITION}>
        <boxGeometry args={FIELD_CONFIG.LINE_SIZE} />
        <meshBasicMaterial color="#ff0000" />
      </mesh>

      {/* Side barriers */}
      {FIELD_CONFIG.SIDE_BARRIER_POSITIONS.map((position, index) => (
        <mesh key={index} position={position}>
          <boxGeometry args={FIELD_CONFIG.SIDE_BARRIER_SIZE} />
          <meshLambertMaterial color="#8b4513" />
        </mesh>
      ))}

      {/* Back wall behind the doll */}
      <mesh position={FIELD_CONFIG.BACK_WALL_POSITION}>
        <boxGeometry args={FIELD_CONFIG.BACK_WALL_SIZE} />
        <meshLambertMaterial color="#8b4513" />
      </mesh>

      {/* Tree behind the doll */}
      <TreeModel 
        position={FIELD_CONFIG.TREE_POSITION}
        rotation={[0, 0, 0]}
        scale={[20, 50, -2]}
      />

      {/* Background gradient */}
      <mesh position={FIELD_CONFIG.BACKGROUND_POSITION}>
        <planeGeometry args={FIELD_CONFIG.BACKGROUND_SIZE} />
        <meshBasicMaterial color="#87ceeb" />
      </mesh>
    </>
  );
};