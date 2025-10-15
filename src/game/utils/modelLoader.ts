import { useMemo } from 'react';
import * as THREE from 'three';
import { SkeletonUtils } from 'three-stdlib';

// Helper to process loaded scene
export const processScene = (scene: THREE.Object3D) => {
  const cloned = useMemo(() => SkeletonUtils.clone(scene), [scene]);
  
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
  
  return cloned;
};
