import { useRef, useEffect, Suspense, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { usePlayerMovement } from '../hooks/usePlayerMovement';
import { MODEL_CONFIG } from '../config/models';
import { LightState, GameState } from '../hooks/useGame';
import { getSupabaseUrl } from '@/lib/supabase';

interface PlayerProps {
  lightState: LightState;
  gameState: GameState;
  onElimination: () => void;
  onPositionUpdate: (position: number) => void;
  modelPath?: string;
  onRefReady?: (ref: React.RefObject<THREE.Group>) => void;
}

// Fallback primitive player component
const PrimitivePlayer = () => (
  <>
    {/* Body */}
    <mesh position={[0, 1, 0]} castShadow>
      <boxGeometry args={[0.8, 1.6, 0.4]} />
      <meshLambertMaterial color="#4a90e2" />
    </mesh>
    
    {/* Head */}
    <mesh position={[0, 2.2, 0]} castShadow>
      <sphereGeometry args={[0.3]} />
      <meshLambertMaterial color="#ffdbac" />
    </mesh>
    
    {/* Arms */}
    <mesh position={[-0.6, 1.2, 0]} castShadow>
      <boxGeometry args={[0.2, 0.8, 0.2]} />
      <meshLambertMaterial color="#ffdbac" />
    </mesh>
    <mesh position={[0.6, 1.2, 0]} castShadow>
      <boxGeometry args={[0.2, 0.8, 0.2]} />
      <meshLambertMaterial color="#ffdbac" />
    </mesh>
    
    {/* Legs */}
    <mesh position={[-0.3, 0.2, 0]} castShadow>
      <boxGeometry args={[0.2, 0.8, 0.2]} />
      <meshLambertMaterial color="#333" />
    </mesh>
    <mesh position={[0.3, 0.2, 0]} castShadow>
      <boxGeometry args={[0.2, 0.8, 0.2]} />
      <meshLambertMaterial color="#333" />
    </mesh>
  </>
);

// Loading component
const PlayerLoading = () => (
  <group>
    <mesh position={[0, 1, 0]}>
      <sphereGeometry args={[0.5]} />
      <meshBasicMaterial color="#666" wireframe />
    </mesh>
    <mesh position={[0, 1, 0]}>
      <boxGeometry args={[1, 2, 0.5]} />
      <meshBasicMaterial color="#666" wireframe />
    </mesh>
  </group>
);

// GLB Player component (no state updates during render/Suspense)
const GLBPlayer = ({ modelPath, state }: { modelPath: string; state: 'idle' | 'run' | 'fall' | 'happy' }) => {
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
        if (mixerRef.current) mixerRef.current.stopAllAction();
      } catch {}
    };
  }, []);

  // Switch clips based on state with explicit name matching
  useEffect(() => {
    const mixer = mixerRef.current;
    if (!mixer || !animations) return;

    // Helper to find the best matching clip by names
    const findByNames = (names: string[]): THREE.AnimationClip | undefined => {
      for (const name of names) {
        const clip = animations.find(a => new RegExp(name, 'i').test(a.name));
        if (clip) return clip;
      }
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
      clip = findByNames(['run', 'walk']);
    } else if (state === 'fall') {
      clip = findByNames(['fall', 'death', 'die']);
    } else if (state === 'happy') {
      clip = findByNames(['happy', 'victory', 'win', 'celebration']);
    }

    if (!clip) return;

    const action = mixer.clipAction(clip);
    if (state === 'fall') {
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = true;
    } else {
      action.setLoop(THREE.LoopRepeat, Infinity);
    }
    action.reset().fadeIn(0.2).play();
    actionRef.current = action;
  }, [state, animations]);

  return (
    <primitive 
      object={scene} 
      scale={[1, 1, 1]} 
      position={[0, 0, 0]}
    />
  );
};

export const Player = ({ lightState, gameState, onElimination, onPositionUpdate, modelPath, onRefReady }: PlayerProps) => {
  const eliminationAnimation = useRef(false);
  const [usePrimitive, setUsePrimitive] = useState(!modelPath);
  
  const [isMoving, setIsMoving] = useState(false);
  const [assetChecked, setAssetChecked] = useState(false);

  const { playerGroupRef } = usePlayerMovement(
    lightState,
    onElimination,
    onPositionUpdate,
    gameState === 'playing',
    setIsMoving
  );

  // Add refs near the top of Player component
  const fallRef = useRef<THREE.Group>(null);
  const offsetRef = useRef<THREE.Group>(null);

  // Expose the player ref to parent for camera follow
  useEffect(() => {
    if (onRefReady) onRefReady(playerGroupRef);
  }, [onRefReady, playerGroupRef]);

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
    if (gameState === 'eliminated' && !eliminationAnimation.current) {
      eliminationAnimation.current = true;

      const startRot = fallRef.current?.rotation.x ?? 0;
      const startTime = Date.now();
      const duration = 1000;

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const t = Math.min(elapsed / duration, 1);
        const easeOut = 1 - Math.pow(1 - t, 3);

        if (fallRef.current && offsetRef.current) {
          // Rotate only the inner pivot
          fallRef.current.rotation.x = startRot - (Math.PI / 2) * easeOut;

          // Ground by aligning lowest point to y=0 using the fallRef bbox
          try {
            fallRef.current.updateMatrixWorld(true);
            const box = new THREE.Box3().setFromObject(fallRef.current);
            const minY = box.min.y;
            if (isFinite(minY)) {
              // offsetRef moves vertically to cancel any lift/drop from pose
              offsetRef.current.position.y -= minY;
            }
          } catch {}
        }

        if (t < 1) requestAnimationFrame(animate);
      };

      requestAnimationFrame(animate);
    } else if (gameState !== 'eliminated') {
      eliminationAnimation.current = false;
      if (fallRef.current && offsetRef.current) {
        fallRef.current.rotation.x = 0;
        offsetRef.current.position.y = 0;
      }
    }
  }, [gameState]);

  // Determine which model to use based on state
  const resolvedModelPath = useMemo(() => {
    // Prefer explicit path passed in, else use config
    const base = modelPath || MODEL_CONFIG.player.path;
    
    if (gameState === 'eliminated' && MODEL_CONFIG.player.falling) {
      // For falling animation, use Supabase URL in production, local in development
      const isProduction = import.meta.env.PROD;
      return isProduction ? getSupabaseUrl(MODEL_CONFIG.player.falling) : `/models/${MODEL_CONFIG.player.falling}`;
    }
    if (gameState === 'playing' && isMoving && MODEL_CONFIG.player.walking) {
      // For walking animation, use Supabase URL in production, local in development
      const isProduction = import.meta.env.PROD;
      return isProduction ? getSupabaseUrl(MODEL_CONFIG.player.walking) : `/models/${MODEL_CONFIG.player.walking}`;
    }
    return base;
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
 