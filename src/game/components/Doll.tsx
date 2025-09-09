import { useRef, useEffect, Suspense, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { LightState, GameState } from '../hooks/useGame';
import { getModelPath } from '../utils/modelPreloader';
import { MODEL_CONFIG } from '../config/models';

interface DollProps {
  lightState: LightState;
  gameState?: GameState;
  modelPath?: string;
}

// Fallback primitive doll component
const PrimitiveDoll = ({ lightState, gameState }: { lightState: LightState; gameState?: GameState }) => {
  const dollRef = useRef<THREE.Group>(null);
  const targetRotation = useRef(0);
  const currentRotation = useRef(0);

  useEffect(() => {
    // Before the game starts, always face the player
    if (gameState && gameState !== 'playing') {
      targetRotation.current = Math.PI;
      return;
    }
    // During gameplay: face player on red, look away on green
    targetRotation.current = lightState === 'red' ? Math.PI : 0;
  }, [lightState, gameState]);

  useFrame((state, delta) => {
    if (!dollRef.current) return;

    // Smooth rotation animation
    const rotationSpeed = 2; // radians per second
    const diff = targetRotation.current - currentRotation.current;
    
    if (Math.abs(diff) > 0.01) {
      const step = rotationSpeed * delta;
      if (diff > 0) {
        currentRotation.current = Math.min(currentRotation.current + step, targetRotation.current);
      } else {
        currentRotation.current = Math.max(currentRotation.current - step, targetRotation.current);
      }
      
      dollRef.current.rotation.y = currentRotation.current;
    }
  });

  return (
    <group ref={dollRef} position={[0, 0, 25]}>
      {/* Doll Base */}
      <mesh position={[0, 2, 0]} castShadow>
        <cylinderGeometry args={[1.5, 2, 4]} />
        <meshLambertMaterial color="#ff6b9d" />
      </mesh>
      
      {/* Head */}
      <mesh position={[0, 5, 0]} castShadow>
        <sphereGeometry args={[1.2]} />
        <meshLambertMaterial color="#ffdbac" />
      </mesh>
      
      {/* Eyes (facing forward when red light) */}
      <mesh position={[-0.4, 5.2, 1]} castShadow>
        <sphereGeometry args={[0.15]} />
        <meshBasicMaterial color="#000" />
      </mesh>
      <mesh position={[0.4, 5.2, 1]} castShadow>
        <sphereGeometry args={[0.15]} />
        <meshBasicMaterial color="#000" />
      </mesh>
      
      {/* Hair buns */}
      <mesh position={[-0.8, 6, 0]} castShadow>
        <sphereGeometry args={[0.4]} />
        <meshLambertMaterial color="#4a4a4a" />
      </mesh>
      <mesh position={[0.8, 6, 0]} castShadow>
        <sphereGeometry args={[0.4]} />
        <meshLambertMaterial color="#4a4a4a" />
      </mesh>
      
      {/* Arms */}
      <mesh position={[-1.5, 3, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.3, 2]} />
        <meshLambertMaterial color="#ffdbac" />
      </mesh>
      <mesh position={[1.5, 3, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.3, 2]} />
        <meshLambertMaterial color="#ffdbac" />
      </mesh>
      
      {/* Removed platform under doll for clean ground */}
    </group>
  );
};

// Loading component for doll
const DollLoading = () => (
  <group position={[0, 0, 25]}>
    <mesh position={[0, 2, 0]}>
      <cylinderGeometry args={[1.5, 2, 4]} />
      <meshBasicMaterial color="#666" wireframe />
    </mesh>
    <mesh position={[0, 5, 0]}>
      <sphereGeometry args={[1.2]} />
      <meshBasicMaterial color="#666" wireframe />
    </mesh>
  </group>
);

// GLB Doll component (no state updates during render/Suspense)
const GLBDoll = ({ modelPath, lightState, gameState }: { 
  modelPath: string; 
  lightState: LightState;
  gameState?: GameState;
}) => {
  const dollRef = useRef<THREE.Group>(null);
  const targetRotation = useRef(0);
  const currentRotation = useRef(0);

  const { scene } = useGLTF(modelPath);
    
    useEffect(() => {
      if (!scene) return;
      // Enable shadows
      scene.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      // Scale to ~4 units tall and ground to y=0
      const preBox = new THREE.Box3().setFromObject(scene);
      const preSize = preBox.getSize(new THREE.Vector3());
      const maxDim = Math.max(preSize.x, preSize.y, preSize.z) || 1;
      const scale = 4 / maxDim;
      scene.scale.setScalar(scale);
      const box = new THREE.Box3().setFromObject(scene);
      const min = box.min;
      scene.position.y -= min.y; // lift down so bottom touches ground
    }, [scene]);
    
    useEffect(() => {
      // Before the game starts, always face the player
      if (gameState && gameState !== 'playing') {
        targetRotation.current = Math.PI;
        return;
      }
      // During gameplay: face player on red, look away on green
      targetRotation.current = lightState === 'red' ? Math.PI : 0;
    }, [lightState, gameState]);

    useFrame((state, delta) => {
      if (!dollRef.current) return;

      // Smooth rotation animation
      const rotationSpeed = 2; // radians per second
      const diff = targetRotation.current - currentRotation.current;
      
      if (Math.abs(diff) > 0.01) {
        const step = rotationSpeed * delta;
        if (diff > 0) {
          currentRotation.current = Math.min(currentRotation.current + step, targetRotation.current);
        } else {
          currentRotation.current = Math.max(currentRotation.current - step, targetRotation.current);
        }
        
        dollRef.current.rotation.y = currentRotation.current;
      }
    });
    
    return (
      <group ref={dollRef} position={[0, 0, 25]}>
        <primitive object={scene} />
      </group>
    );
};

export const Doll = ({ lightState, gameState, modelPath }: DollProps) => {
  const [usePrimitive, setUsePrimitive] = useState(!modelPath);
  
  // Use enhanced model path selection
  const resolvedModelPath = modelPath || getModelPath(
    MODEL_CONFIG.doll.supabasePath, 
    MODEL_CONFIG.doll.localPath
  );
  
  useEffect(() => {
    if (!resolvedModelPath) setUsePrimitive(true);
  }, [resolvedModelPath]);

  return (
    <Suspense fallback={<DollLoading />}>
      {resolvedModelPath && !usePrimitive ? (
        <GLBDoll 
          modelPath={resolvedModelPath} 
          lightState={lightState} 
          gameState={gameState}
        />
      ) : (
        <PrimitiveDoll lightState={lightState} gameState={gameState} />
      )}
    </Suspense>
  );
};
