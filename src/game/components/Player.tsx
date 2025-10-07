import { useRef, useEffect, Suspense, useState, useMemo, forwardRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { usePlayerMovement } from '../hooks/usePlayerMovement';
import { MODEL_CONFIG } from '../config/models';
import { LightState, GameState } from '../hooks/useGame';
import { multiplayerManager } from '@/lib/multiplayer';
import { NameTag } from './NameTag';

interface PlayerProps {
  lightState: LightState;
  gameState: GameState;
  onElimination: () => void;
  onPositionUpdate: (position: number) => void;
  modelPath?: string;
  onRefReady?: (ref: React.RefObject<THREE.Group>) => void;
  onMovementChange?: (isMoving: boolean) => void; // Add this prop
  canMove?: boolean; // Add this prop to control movement
  resetKey?: number; // Add reset key prop
  name?: string; // Add name prop for name tag
  isSelf?: boolean; // Add isSelf prop for "YOU" tag
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

// Magical elimination effect component
const EliminationEffect = () => {
  const [particles, setParticles] = useState<Array<{ id: number; position: [number, number, number]; velocity: [number, number, number]; life: number }>>([]);
  const [showEffect, setShowEffect] = useState(true);

  useEffect(() => {
    // Create particle explosion
    const newParticles = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      position: [0, 1, 0] as [number, number, number],
      velocity: [
        (Math.random() - 0.5) * 4,
        Math.random() * 3 + 1,
        (Math.random() - 0.5) * 4
      ] as [number, number, number],
      life: 1
    }));
    setParticles(newParticles);

    // Hide effect after animation
    const timer = setTimeout(() => setShowEffect(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  useFrame((_, delta) => {
    setParticles(prev => 
      prev.map(particle => ({
        ...particle,
        position: [
          particle.position[0] + particle.velocity[0] * delta,
          particle.position[1] + particle.velocity[1] * delta,
          particle.position[2] + particle.velocity[2] * delta
        ] as [number, number, number],
        velocity: [
          particle.velocity[0],
          particle.velocity[1] - 9.8 * delta, // gravity
          particle.velocity[2]
        ] as [number, number, number],
        life: particle.life - delta * 0.5
      })).filter(particle => particle.life > 0)
    );
  });

  if (!showEffect) return null;

  return (
    <group>
      {/* Central magical burst */}
      <mesh position={[0, 1, 0]}>
        <sphereGeometry args={[0.5]} />
        <meshBasicMaterial color="#ff6b6b" transparent opacity={0.8} />
      </mesh>
      
      {/* Particle explosion */}
      {particles.map(particle => (
        <mesh key={particle.id} position={particle.position}>
          <sphereGeometry args={[0.05]} />
          <meshBasicMaterial 
            color={particle.id % 3 === 0 ? "#ff6b6b" : particle.id % 3 === 1 ? "#4ecdc4" : "#ffe66d"} 
            transparent 
            opacity={particle.life} 
          />
        </mesh>
      ))}
      
      {/* Magical sparkles */}
      {Array.from({ length: 8 }).map((_, i) => (
        <mesh key={`sparkle-${i}`} position={[
          (Math.random() - 0.5) * 2,
          Math.random() * 2,
          (Math.random() - 0.5) * 2
        ]}>
          <sphereGeometry args={[0.02]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.9} />
        </mesh>
      ))}
    </group>
  );
};

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

export const Player = forwardRef<THREE.Group, PlayerProps>(({ 
  lightState, 
  gameState, 
  onElimination, 
  onPositionUpdate, 
  modelPath, 
  onRefReady,
  onMovementChange, // Add this prop
  canMove = true, // Add this prop with default value
  resetKey = 0 // Add reset key prop
}, ref) => {
  const eliminationAnimation = useRef(false);
  const [usePrimitive, setUsePrimitive] = useState(!modelPath);
  
  const [isMoving, setIsMoving] = useState(false);
  const [assetChecked, setAssetChecked] = useState(false);

  // Reset internal state when resetKey changes
  useEffect(() => {
    if (resetKey > 0) {
      setIsMoving(false);
      console.log('Player internal state reset');
    }
  }, [resetKey]);

  const { playerGroupRef } = usePlayerMovement(
    lightState,
    onElimination,
    onPositionUpdate,
    gameState === 'playing' && canMove, // Only allow movement if game is playing AND canMove is true
    (isMoving) => {
      setIsMoving(isMoving);
      onMovementChange?.(isMoving); // Pass movement state to parent
    },
    resetKey // Pass reset key to usePlayerMovement
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
    <group ref={ref || playerGroupRef} position={[0, 0, -5]}>
      <group ref={offsetRef} position={[0, 0, 0]}>
        <group ref={fallRef} position={[0, 0, 0]}>
          {/* Show player only if not eliminated */}
          {gameState !== 'eliminated' && (
            <Suspense fallback={<PlayerLoading />}>
              {resolvedModelPath && !usePrimitive && assetChecked ? (
                <GLBPlayer
                  modelPath={resolvedModelPath}
                  state={gameState === 'won' ? 'happy' : (gameState === 'playing' && isMoving) ? 'run' : 'idle'}
                />
              ) : (
                <PrimitivePlayer />
              )}
            </Suspense>
          )}
          
          {/* Magical elimination effect */}
          {gameState === 'eliminated' && (
            <EliminationEffect />
          )}
          
          {/* Name tag */}
          {name && (
            <NameTag 
              name={name} 
              position={[0, 2.5, 0]} 
              isEliminated={gameState === 'eliminated'}
              color="#4a90e2"
              isSelf={isSelf}
            />
          )}
        </group>
      </group>
    </group>
  );
});
 