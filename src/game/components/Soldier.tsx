import { Suspense, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { MODEL_CONFIG } from '../config/models';
import { SkeletonUtils } from 'three-stdlib';
import { processScene } from '../utils/modelLoader';
interface SoldierProps {
  position: [number, number, number];
  rotation?: [number, number, number];
}

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
  return <primitive object={cloned} />;
};

export const Soldier = ({ position, rotation = [0, Math.PI, 0] }: SoldierProps) => {
  const supabasePath = MODEL_CONFIG.soldier.supabasePath;
  const localPath = MODEL_CONFIG.soldier.localPath;
  return (
    <group position={position} rotation={rotation}>
      <Suspense fallback={null}>
        <GLBSoldier supabasePath={supabasePath} localPath={localPath} />
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
