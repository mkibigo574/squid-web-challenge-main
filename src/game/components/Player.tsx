import { useRef, useEffect, Suspense, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { usePlayerMovement } from '../hooks/usePlayerMovement';
import { MODEL_CONFIG } from '../config/models';
import { LightState, GameState } from '../hooks/useGame';
import { multiplayerManager } from '@/lib/multiplayer';

interface PlayerProps {
  lightState: LightState;
  gameState: GameState;
  onElimination: () => void;
  onPositionUpdate: (position: number) => void;
  modelPath?: string;
  onRefReady?: (ref: React.RefObject<THREE.Group>) => void;
  onMovementChange?: (isMoving: boolean) => void; // Add this prop
  canMove?: boolean; // Add this prop to control movement
}

// Fallback primitive player component
const PrimitivePlayer = () => (
  <group>
    {/* Body */}
    <mesh position={[0, 1, 0]} castShadow>
      <cylinderGeometry args={[0.3, 0.4, 2]} />
      <meshLambertMaterial color="#4a90e2" />
    </mesh>
    
    {/* Head */}
    <mesh position={[0, 2.2, 0]} castShadow>
      <sphereGeometry args={[0.4]} />
      <meshLambertMaterial color="#ffdbac" />
    </mesh>
    
    {/* Arms */}
    <mesh position={[-0.6, 1.5, 0]} castShadow>
      <cylinderGeometry args={[0.1, 0.1, 1.2]} />
      <meshLambertMaterial color="#ffdbac" />
    </mesh>
    <mesh position={[0.6, 1.5, 0]} castShadow>
      <cylinderGeometry args={[0.1, 0.1, 1.2]} />
      <meshLambertMaterial color="#ffdbac" />
    </mesh>
    
    {/* Legs */}
    <mesh position={[-0.2, 0.2, 0]} castShadow>
      <cylinderGeometry args={[0.15, 0.15, 1]} />
      <meshLambertMaterial color="#2c3e50" />
    </mesh>
    <mesh position={[0.2, 0.2, 0]} castShadow>
      <cylinderGeometry args={[0.15, 0.15, 1]} />
      <meshLambertMaterial color="#2c3e50" />
    </mesh>
  </group>
);

const PlayerLoading = () => (
  <group>
    <mesh position={[0, 1, 0]}>
      <cylinderGeometry args={[0.3, 0.4, 2]} />
      <meshBasicMaterial color="#666" wireframe />
    </mesh>
    <mesh position={[0, 2.2, 0]}>
      <sphereGeometry args={[0.4]} />
      <meshBasicMaterial color="#666" wireframe />
    </mesh>
  </group>
);

// GLB Player component (no state updates during render/Suspense)
const GLBPlayer = ({ modelPath, state }: { modelPath: string; state: string }) => {
  const { scene, animations } = useGLTF(modelPath);
  const mixerRef = useRef<THREE.AnimationMixer>();
  const actionRef = useRef<THREE.AnimationAction | null>(null);

  useEffect(() => {
    if (!scene) return;
    // Enable shadows on all meshes
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    // Setup animation mixer
    if (animations && animations.length > 0) {
      mixerRef.current = new THREE.AnimationMixer(scene);
    }
  }, [scene, animations]);

  useFrame((_, delta) => {
    if (mixerRef.current) mixerRef.current.update(delta);
  });

  useEffect(() => {
    return () => {
      try {
        if (actionRef.current) actionRef.current.stop();
        mixerRef.current?.stopAllAction();
      } catch {}
    };
  }, []);

  // Switch clips based on state with explicit name matching
  useEffect(() => {
    const mixer = mixerRef.current;
    if (!mixer || !animations) return;

    console.log('GLBPlayer state change:', state, 'Available animations:', animations.map(a => a.name));

    // Helper to find the best matching clip by names
    const findByNames = (names: string[]): THREE.AnimationClip | undefined => {
      for (const name of names) {
        const clip = animations.find(a => new RegExp(name, 'i').test(a.name));
        if (clip) {
          console.log(`Found animation: ${clip.name} for pattern: ${name}`);
          return clip;
        }
      }
      console.log(`No animation found for patterns: ${names.join(', ')}`);
      return undefined;
    };

    // Stop any previous action
    if (actionRef.current) {
      actionRef.current.fadeOut(0.15);
      actionRef.current.stop();
      actionRef.current = null;
    }

    if (state === 'idle') {
      // Show bind/rest pose by not playing any clip
      mixer.stopAllAction();
      return;
    }

    let clip: THREE.AnimationClip | undefined;
    if (state === 'run') {
      clip = findByNames(['run', 'walk', 'running', 'walking']);
    } else if (state === 'fall') {
      clip = findByNames(['fall', 'death', 'die', 'falling', 'eliminated', 'elimination']);
    } else if (state === 'happy') {
      clip = findByNames(['happy', 'victory', 'win', 'celebration', 'winning']);
    }

    if (!clip) {
      console.log(`No animation clip found for state: ${state}`);
      return;
    }

    const action = mixer.clipAction(clip);
    if (state === 'fall') {
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = true;
      // Make fall animation more visible
      action.timeScale = 0.8; // Slightly slower but not too slow
      console.log(`Fall animation duration: ${clip.duration}s, timeScale: 0.8`);
    } else {
      action.setLoop(THREE.LoopRepeat, Infinity);
    }
    action.reset().fadeIn(0.3).play(); // Slightly longer fade for smoother transition
    actionRef.current = action;
    console.log(`Playing animation: ${clip.name} for state: ${state}`);
  }, [state, animations]);

  return (
    <primitive 
      object={scene} 
      scale={[1, 1, 1]} 
      position={[0, 0, 0]}
    />
  );
};

export const Player = ({ 
  lightState, 
  gameState, 
  onElimination, 
  onPositionUpdate, 
  modelPath, 
  onRefReady,
  onMovementChange, // Add this prop
  canMove = true // Add this prop with default value
}: PlayerProps) => {
  const eliminationAnimation = useRef(false);
  const [usePrimitive, setUsePrimitive] = useState(!modelPath);
  
  const [isMoving, setIsMoving] = useState(false);
  const [assetChecked, setAssetChecked] = useState(false);

  const { playerGroupRef } = usePlayerMovement(
    lightState,
    onElimination,
    onPositionUpdate,
    gameState === 'playing' && canMove, // Only allow movement if game is playing AND canMove is true
    (isMoving) => {
      setIsMoving(isMoving);
      onMovementChange?.(isMoving); // Pass movement state to parent
    }
  );

  // Add refs near the top of Player component
  const fallRef = useRef<THREE.Group>(null);
  const offsetRef = useRef<THREE.Group>(null);

  // Expose the player ref to parent for camera follow
  useEffect(() => {
    if (onRefReady) onRefReady(playerGroupRef);
  }, [onRefReady, playerGroupRef]);

  // Listen for game reset events
  useEffect(() => {
    const onGameReset = () => {
      if (playerGroupRef.current) {
        // Reset player to starting position
        playerGroupRef.current.position.set(0, 0, -5);
        playerGroupRef.current.rotation.y = 0;
        console.log('Player reset to starting position');
      }
    };

    multiplayerManager.onEvent('GAME_RESET', onGameReset);
    return () => multiplayerManager.offEvent('GAME_RESET', onGameReset);
  }, [playerGroupRef]);

  // Proactively verify model asset availability to avoid canvas crash
  useEffect(() => {
    let cancelled = false;
    if (!modelPath) {
      setUsePrimitive(true);
      setAssetChecked(true);
      return;
    }
    fetch(modelPath, { method: 'HEAD' })
      .then((res) => {
        if (cancelled) return;
        if (!res.ok) setUsePrimitive(true);
        setAssetChecked(true);
      })
      .catch(() => {
        if (cancelled) return;
        setUsePrimitive(true);
        setAssetChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, [modelPath]);

  // If model path is missing, use primitive fallback
  useEffect(() => {
    if (!modelPath) setUsePrimitive(true);
  }, [modelPath]);

  // Elimination animation
  useEffect(() => {
    console.log('Elimination effect triggered, gameState:', gameState, 'eliminationAnimation.current:', eliminationAnimation.current);
    
    if (gameState === 'eliminated' && !eliminationAnimation.current) {
      eliminationAnimation.current = true;
      
      console.log('Setting elimination animation, fallRef.current:', fallRef.current);
      
      // Let the GLB animation handle the fall, don't add manual rotation
      // The Fall3 animation should handle the visual fall effect
      if (fallRef.current) {
        // Only apply subtle position adjustment, let animation do the work
        fallRef.current.position.y = -0.2; // Small adjustment, not dramatic
        console.log('Applied subtle fall position adjustment');
      }
    } else if (gameState !== 'eliminated') {
      eliminationAnimation.current = false;
      
      if (fallRef.current) {
        // Reset fall animation
        fallRef.current.rotation.x = 0;
        fallRef.current.position.y = 0;
      }
    }
  }, [gameState]);

  // Resolve model path with environment awareness
  const resolvedModelPath = useMemo(() => {
    if (!modelPath) return null;
    return modelPath;
  }, [gameState, isMoving, modelPath]);

  // Reset position when game starts and keep grounded during countdown/waiting
  useEffect(() => {
    if (!playerGroupRef.current) return;
    if (gameState === 'countdown') {
      playerGroupRef.current.position.set(0, 0, -5);
      // Face the doll (+Z) by default
      playerGroupRef.current.rotation.y = 0;
    } else if (gameState === 'waiting') {
      // Ensure idle pose is on ground
      playerGroupRef.current.position.set(0, 0, -5);
      // Face the doll (+Z) by default
      playerGroupRef.current.rotation.y = 0;
    }
  }, [gameState]);

  return (
    <group ref={playerGroupRef} position={[0, 0, -5]}>
      <group ref={offsetRef} position={[0, 0, 0]}>
        <group ref={fallRef} position={[0, 0, 0]}>
          <Suspense fallback={<PlayerLoading />}>
            {resolvedModelPath && !usePrimitive && assetChecked ? (
              <GLBPlayer
                modelPath={resolvedModelPath}
                state={gameState === 'eliminated' ? 'fall' : gameState === 'won' ? 'happy' : (gameState === 'playing' && isMoving) ? 'run' : 'idle'}
              />
            ) : (
              <PrimitivePlayer />
            )}
          </Suspense>
        </group>
      </group>
    </group>
  );
};
 