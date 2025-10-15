import { Suspense, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
<<<<<<< HEAD
import { MODEL_CONFIG } from '../config/models';
import { SkeletonUtils } from 'three-stdlib';
=======
import { SkeletonUtils } from 'three-stdlib';
import { MODEL_CONFIG } from '../config/models';
import { processScene } from '../utils/modelLoader';
>>>>>>> 3a81eb1 (Implemented tugging sound with fade out effect.  Added win_game.wav for winning teams. Added buzzer.wav for losing teams. Enhanced elimination modal for losing teams. Updated player models to use Supabase models with standing animations. Added audio mute/unmute functionality. Improved tug of war game experience with proper sound effects)

interface SoldierProps {
  position: [number, number, number];
  rotation?: [number, number, number];
}

<<<<<<< HEAD
const GLBSoldier = ({ path }: { path: string }) => {
  const { scene } = useGLTF(path);

  // Clone the scene so each instance has its own graph
  const cloned = useMemo(() => SkeletonUtils.clone(scene), [scene]);

  // Enable shadows and ground the clone
  useMemo(() => {
    cloned.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    const box = new THREE.Box3().setFromObject(cloned);
    cloned.position.y -= box.min.y || 0;
  }, [cloned]);

=======
const GLBSoldier = ({ supabasePath, localPath }: { supabasePath: string; localPath: string }) => {
  let scene, animations;
  let source = 'none';
  
  // Try Supabase first
  try {
    const gltf = useGLTF(supabasePath);
    scene = gltf.scene;
    animations = gltf.animations || [];
    source = 'supabase';
    console.log('Successfully loaded soldier model from Supabase');
  } catch (supabaseError) {
    console.warn('Failed to load soldier model from Supabase, trying local fallback:', supabaseError);
    
    // Try local fallback
    try {
      const gltf = useGLTF(localPath);
      scene = gltf.scene;
      animations = gltf.animations || [];
      source = 'local';
      console.log('Successfully loaded soldier model from local storage');
    } catch (localError) {
      console.warn('Failed to load soldier model from local storage, using primitive fallback:', localError);
      scene = null;
      animations = [];
      source = 'primitive';
    }
  }
  
  if (!scene) {
    // Fallback to primitive shape
    return (
      <group>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[1, 2, 0.5]} />
          <meshStandardMaterial color="brown" />
        </mesh>
        <mesh position={[0, 1.2, 0]} castShadow receiveShadow>
          <sphereGeometry args={[0.4]} />
          <meshStandardMaterial color="pink" />
        </mesh>
      </group>
    );
  }
  
  const cloned = processScene(scene);
>>>>>>> 3a81eb1 (Implemented tugging sound with fade out effect.  Added win_game.wav for winning teams. Added buzzer.wav for losing teams. Enhanced elimination modal for losing teams. Updated player models to use Supabase models with standing animations. Added audio mute/unmute functionality. Improved tug of war game experience with proper sound effects)
  return <primitive object={cloned} />;
};

export const Soldier = ({ position, rotation = [0, Math.PI, 0] }: SoldierProps) => {
<<<<<<< HEAD
  const path = MODEL_CONFIG.soldier.path;
  return (
    <group position={position} rotation={rotation}>
      <Suspense fallback={null}>
        <GLBSoldier path={path} />
=======
  const supabasePath = MODEL_CONFIG.soldier.supabasePath;
  const localPath = MODEL_CONFIG.soldier.localPath;
  return (
    <group position={position} rotation={rotation}>
      <Suspense fallback={null}>
        <GLBSoldier supabasePath={supabasePath} localPath={localPath} />
>>>>>>> 3a81eb1 (Implemented tugging sound with fade out effect.  Added win_game.wav for winning teams. Added buzzer.wav for losing teams. Enhanced elimination modal for losing teams. Updated player models to use Supabase models with standing animations. Added audio mute/unmute functionality. Improved tug of war game experience with proper sound effects)
      </Suspense>
    </group>
  );
};

// Preload both Supabase and local versions with error handling
try {
  useGLTF.preload(MODEL_CONFIG.soldier.supabasePath);
} catch (error) {
  console.warn('Failed to preload soldier model from Supabase:', error);
}

try {
  useGLTF.preload(MODEL_CONFIG.soldier.localPath);
} catch (error) {
  console.warn('Failed to preload soldier model locally:', error);
}

