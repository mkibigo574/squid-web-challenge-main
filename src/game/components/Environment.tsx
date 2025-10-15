import { useRef, Suspense } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { MODEL_CONFIG } from '../config/models';
import { FIELD_CONFIG } from '../config/field';

<<<<<<< HEAD
// Tree component using the 3D model; rely on Suspense for loading states
=======
// Tree component using the 3D model with fallback
>>>>>>> 3a81eb1 (Implemented tugging sound with fade out effect.  Added win_game.wav for winning teams. Added buzzer.wav for losing teams. Enhanced elimination modal for losing teams. Updated player models to use Supabase models with standing animations. Added audio mute/unmute functionality. Improved tug of war game experience with proper sound effects)
const TreeModel = ({ position, rotation = [0, 0, 0], scale = [1, 1, 1] }: { 
  position: [number, number, number], 
  rotation?: [number, number, number], 
  scale?: [number, number, number] 
}) => {
<<<<<<< HEAD
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
=======
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
    // Fallback to primitive tree
    return (
      <group position={position} rotation={rotation} scale={scale}>
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[0.3, 0.5, 2]} />
          <meshStandardMaterial color="brown" />
        </mesh>
        <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
          <coneGeometry args={[1, 2]} />
          <meshStandardMaterial color="green" />
        </mesh>
      </group>
    );
  }
>>>>>>> 3a81eb1 (Implemented tugging sound with fade out effect.  Added win_game.wav for winning teams. Added buzzer.wav for losing teams. Enhanced elimination modal for losing teams. Updated player models to use Supabase models with standing animations. Added audio mute/unmute functionality. Improved tug of war game experience with proper sound effects)
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
      <Suspense fallback={null}>
        <TreeModel 
          position={FIELD_CONFIG.TREE_POSITION}
          rotation={[0, 0, 0]}
          scale={[20, 50, -2]}
        />
      </Suspense>

      {/* Background gradient */}
      <mesh position={FIELD_CONFIG.BACKGROUND_POSITION}>
        <planeGeometry args={FIELD_CONFIG.BACKGROUND_SIZE} />
        <meshBasicMaterial color="#87ceeb" />
      </mesh>
    </>
  );
};