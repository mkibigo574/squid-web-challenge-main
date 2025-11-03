import { useRef, useEffect, useState, Suspense } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { EnhancedPlayer } from './EnhancedPlayer';

interface TugOfWarPlayerProps {
  gameState: 'waiting' | 'countdown' | 'playing' | 'won' | 'eliminated';
  onPositionUpdate?: (position: number) => void;
  modelPath: string;
  onRefReady?: (ref: React.RefObject<THREE.Group>) => void;
  isPulling: boolean;
  pullStrength?: number;
  ropePosition?: 'left' | 'center' | 'right';
  teamSide?: 'left' | 'right';
  onPullForce?: (force: number) => void;
  isAI?: boolean;
  opponentPosition?: number;
  initialPosition?: number;
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

// GLB Player component (reused from Player.tsx)
const GLBPlayer = ({ modelPath, state }: { modelPath: string; state: string }) => {
  const gltf = useGLTF(modelPath);
  const scene = gltf.scene as THREE.Group | null;
  const animations = gltf.animations as THREE.AnimationClip[];
  
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
    if (state === 'pulling') {
      // For tug of war, use a more aggressive pulling animation
      clip = findByNames(['run', 'walk', 'running', 'walking', 'pull', 'pulling']);
    } else if (state === 'run') {
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

  if (!scene) {
    // Fallback player using primitive shapes
    return (
      <group>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[0.8, 1.8, 0.4]} />
          <meshStandardMaterial color="blue" />
        </mesh>
        <mesh position={[0, 1.1, 0]} castShadow receiveShadow>
          <sphereGeometry args={[0.3]} />
          <meshStandardMaterial color="pink" />
        </mesh>
        <mesh position={[-0.3, 0.5, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.2, 0.8, 0.2]} />
          <meshStandardMaterial color="blue" />
        </mesh>
        <mesh position={[0.3, 0.5, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.2, 0.8, 0.2]} />
          <meshStandardMaterial color="blue" />
        </mesh>
        <mesh position={[-0.2, -0.4, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.2, 0.6, 0.2]} />
          <meshStandardMaterial color="blue" />
        </mesh>
        <mesh position={[0.2, -0.4, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.2, 0.6, 0.2]} />
          <meshStandardMaterial color="blue" />
        </mesh>
      </group>
    );
  }

  return (
    <primitive 
      object={scene} 
      scale={[1, 1, 1]} 
      position={[0, 0, 0]}
    />
  );
};

export const TugOfWarPlayer = ({ 
  gameState, 
  onPositionUpdate, 
  modelPath, 
  onRefReady, 
  isPulling,
  pullStrength = 0,
  ropePosition = 'center',
  teamSide = 'right',
  onPullForce,
  isAI = false,
  opponentPosition = 0,
  initialPosition
}: TugOfWarPlayerProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const [model, setModel] = useState<THREE.Group | null>(null);
  const [mixer, setMixer] = useState<THREE.AnimationMixer | null>(null);
  const [currentAction, setCurrentAction] = useState<THREE.AnimationAction | null>(null);
  const [velocity, setVelocity] = useState(0);
  const [position, setPosition] = useState(initialPosition !== undefined ? initialPosition : (teamSide === 'left' ? -6 : 6));

  // Load the 3D model
  useEffect(() => {
    const loadModel = async () => {
      try {
        // Use a simple approach for now - we'll implement proper model loading later
        const fallbackModel = new THREE.Group();
        const body = new THREE.Mesh(
          new THREE.BoxGeometry(0.6, 1.2, 0.6),
          new THREE.MeshStandardMaterial({ color: '#4ECDC4' })
        );
        body.position.y = 0.6;
        fallbackModel.add(body);
        setModel(fallbackModel);
        
        if (onRefReady) {
          onRefReady(groupRef);
        }
      } catch (error) {
        console.error('Failed to load player model:', error);
        // Fallback to simple geometry
        const fallbackModel = new THREE.Group();
        const body = new THREE.Mesh(
          new THREE.BoxGeometry(0.6, 1.2, 0.6),
          new THREE.MeshStandardMaterial({ color: '#4ECDC4' })
        );
        body.position.y = 0.6;
        fallbackModel.add(body);
        setModel(fallbackModel);
        
        if (onRefReady) {
          onRefReady(groupRef);
        }
      }
    };
    
    loadModel();
  }, [modelPath, onRefReady]);

  // Handle animations
  useEffect(() => {
    if (!mixer || !model) return;

    // Find appropriate animation based on game state and pulling
    let animationName = 'idle';
    if (gameState === 'playing' && isPulling) {
      animationName = 'pulling'; // You might need to adjust this based on your model
    } else if (gameState === 'won') {
      animationName = 'victory';
    } else if (gameState === 'eliminated') {
      animationName = 'defeat';
    }

    // For now, we'll use a simple animation based on pulling state
    if (isPulling && gameState === 'playing') {
      // Create a simple pulling animation by rotating the model slightly
      const pullAnimation = () => {
        if (groupRef.current) {
          const time = Date.now() * 0.01;
          groupRef.current.rotation.z = Math.sin(time) * 0.1;
          groupRef.current.position.y = Math.sin(time * 2) * 0.05;
        }
      };
      
      const interval = setInterval(pullAnimation, 16); // ~60fps
      return () => clearInterval(interval);
    }
  }, [mixer, model, gameState, isPulling]);

  const [usePrimitive, setUsePrimitive] = useState(false);
  const [assetChecked] = useState(true);

  // Determine animation state based on game state and pulling
  const getAnimationState = (): string => {
    if (gameState === 'eliminated') {
      return 'fall';
    } else if (gameState === 'won') {
      return 'happy';
    } else if (gameState === 'playing' && isPulling) {
      return 'pulling';
    } else {
      return 'idle'; // Standing animation for waiting, countdown, and not pulling
    }
  };

  // Debug model path
  useEffect(() => {
    console.log('TugOfWarPlayer model path:', modelPath);
    console.log('TugOfWarPlayer usePrimitive:', usePrimitive);
    console.log('TugOfWarPlayer assetChecked:', assetChecked);
  }, [modelPath, usePrimitive, assetChecked]);

  // Trust Suspense/useGLTF for loading; only fallback if modelPath missing
  // (HEAD checks can incorrectly force fallback on some CDNs)

  // If model path is missing, use primitive fallback
  useEffect(() => {
    if (!modelPath) setUsePrimitive(true);
  }, [modelPath]);

  // Notify parent when ref is ready
  useEffect(() => {
    if (onRefReady) {
      onRefReady(groupRef);
    }
  }, [onRefReady]);

  // Physics-based movement system
  useFrame((state, delta) => {
    if (!groupRef.current || gameState !== 'playing') return;

    const currentPos = groupRef.current.position.x;
    const targetSide = teamSide === 'left' ? -6 : 6;
    
    // Calculate forces
    let totalForce = 0;
    
    // 1. Restoring force - pull back to starting position (weaker when actively pulling)
    const restoringStrength = isPulling ? 0.01 : 0.02;
    const restoringForce = (targetSide - currentPos) * restoringStrength;
    totalForce += restoringForce;
    
    // 2. Pulling force - when this player is pulling, move away from center (enhanced)
    if (isPulling) {
      const pullForce = teamSide === 'left' ? -pullStrength * 4.0 : pullStrength * 4.0;
      totalForce += pullForce;
    }
    
    // 3. AI Resistance - AI provides counter-force based on opponent's position
    if (isAI) {
      const distanceFromOpponent = Math.abs(currentPos - opponentPosition);
      const resistanceStrength = Math.min(2.0, distanceFromOpponent * 0.3);
      const resistanceForce = teamSide === 'left' ? resistanceStrength : -resistanceStrength;
      totalForce += resistanceForce;
      
      // AI also pulls back when being pulled too close to center
      if (Math.abs(currentPos) < 4) {
        const emergencyForce = teamSide === 'left' ? -1.5 : 1.5;
        totalForce += emergencyForce;
      }
    }
    
    // 4. Rope position influence - when rope moves, players should move accordingly
    if (ropePosition === 'right' && teamSide === 'right') {
      // Right team is winning, move further right
      totalForce += 1.2;
    } else if (ropePosition === 'right' && teamSide === 'left') {
      // Left team is losing, move closer to center
      totalForce += 0.8;
    } else if (ropePosition === 'left' && teamSide === 'left') {
      // Left team is winning, move further left
      totalForce -= 1.2;
    } else if (ropePosition === 'left' && teamSide === 'right') {
      // Right team is losing, move closer to center
      totalForce -= 0.8;
    }
    
    // 5. Dynamic rope tension - players get pulled toward each other based on distance
    const ropeTension = (opponentPosition - currentPos) * 0.1;
    totalForce += ropeTension;
    
    // Apply physics with momentum
    const friction = 0.7; // Higher friction for more controlled movement
    const newVelocity = (velocity + totalForce * delta * 30) * friction;
    const newPosition = currentPos + newVelocity * delta * 30;
    
    // Check for elimination - if player gets too close to center gap
    const centerGapThreshold = 1.0; // Distance from center where players fall
    if (Math.abs(newPosition) < centerGapThreshold) {
      // Player falls through the gap - start falling animation
      const fallVelocity = -8; // Fast fall
      groupRef.current.position.y += fallVelocity * delta;
      
      // If fallen below surface, mark as eliminated
      if (groupRef.current.position.y < 0) {
        // Trigger elimination logic here
        console.log('Player eliminated by falling through gap!');
      }
    } else {
      // Normal movement on elevated surface
      const clampedPosition = Math.max(-8, Math.min(8, newPosition));
      groupRef.current.position.x = clampedPosition;
      groupRef.current.position.y = 1.5; // Keep on elevated surface
      setVelocity(newVelocity);
      setPosition(clampedPosition);
      
      // Notify parent of position change
      if (onPositionUpdate) {
        onPositionUpdate(clampedPosition);
      }
    }
    
    // Notify parent of pull force
    if (onPullForce) {
      onPullForce(Math.abs(totalForce));
    }
  });

  // Reset position when game resets - on elevated surface
  useEffect(() => {
    if (gameState === 'waiting' || gameState === 'countdown') {
      const resetPosition = teamSide === 'left' ? -6 : 6;
      if (groupRef.current) {
        groupRef.current.position.set(resetPosition, 1.5, 0); // Elevated surface
      }
      setPosition(resetPosition);
      setVelocity(0);
    }
  }, [gameState, teamSide]);

  // Sync position when initialPosition changes (for multiplayer)
  useEffect(() => {
    if (initialPosition !== undefined && groupRef.current) {
      groupRef.current.position.set(initialPosition, 1.5, 0);
      setPosition(initialPosition);
    }
  }, [initialPosition]);

  return (
    <group ref={groupRef}>
      {/* Enhanced 3D Player Model */}
      <EnhancedPlayer
        position={[0, 0, 0]}
        rotation={[0, teamSide === 'left' ? 0 : Math.PI, 0]}
        color={teamSide === 'left' ? '#DC143C' : '#0066CC'}
        isPulling={isPulling}
        pullStrength={pullStrength}
        gameState={gameState}
      />
    </group>
  );
};
