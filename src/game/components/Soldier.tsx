import { Suspense, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { MODEL_CONFIG } from '../config/models';
import { SkeletonUtils } from 'three-stdlib';

interface SoldierProps {
  position: [number, number, number];
  rotation?: [number, number, number];
}

const GLBSoldier = ({ path }: { path: string }) => {
  try {
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

    return <primitive object={cloned} />;
  } catch (error) {
    console.warn('Failed to load soldier model, using fallback:', error);
    // Fallback to simple geometry
    return (
      <group>
        <mesh position={[0, 0.5, 0]}>
          <boxGeometry args={[0.6, 1.2, 0.6]} />
          <meshStandardMaterial color="#8B4513" />
        </mesh>
        <mesh position={[0, 1.2, 0]}>
          <sphereGeometry args={[0.3]} />
          <meshStandardMaterial color="#FFDBAC" />
        </mesh>
      </group>
    );
  }
};

export const Soldier = ({ position, rotation = [0, Math.PI, 0] }: SoldierProps) => {
  const path = MODEL_CONFIG.soldier.path;
  return (
    <group position={position} rotation={rotation}>
      <Suspense fallback={null}>
        <GLBSoldier path={path} />
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

