import { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

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
}

export const TugOfWarPlayer = ({ 
  gameState, 
  onPositionUpdate, 
  modelPath, 
  onRefReady, 
  isPulling,
  pullStrength = 0,
  ropePosition = 'center',
  teamSide = 'right',
  onPullForce
}: TugOfWarPlayerProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const [model, setModel] = useState<THREE.Group | null>(null);
  const [mixer, setMixer] = useState<THREE.AnimationMixer | null>(null);
  const [currentAction, setCurrentAction] = useState<THREE.AnimationAction | null>(null);
  const [velocity, setVelocity] = useState(0);
  const [position, setPosition] = useState(teamSide === 'left' ? -6 : 6);

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

  // Physics-based movement system
  useFrame((state, delta) => {
    if (!groupRef.current || gameState !== 'playing') return;

    const currentPos = groupRef.current.position.x;
    const targetSide = teamSide === 'left' ? -6 : 6;
    
    // Calculate forces
    let totalForce = 0;
    
    // 1. Restoring force - pull back to starting position (weaker when actively pulling)
    const restoringStrength = isPulling ? 0.02 : 0.05;
    const restoringForce = (targetSide - currentPos) * restoringStrength;
    totalForce += restoringForce;
    
    // 2. Pulling force - when this player is pulling, move away from center (enhanced)
    if (isPulling) {
      const pullForce = teamSide === 'left' ? -pullStrength * 2.5 : pullStrength * 2.5;
      totalForce += pullForce;
    }
    
    // 3. Opponent pulling force - when opponent is pulling, this player gets pulled towards center (enhanced)
    // This is the key mechanic: when one team pulls, the other team gets pulled toward center
    if (ropePosition !== 'center') {
      const opponentPullStrength = 0.8; // Increased from 0.4
      const opponentPullForce = teamSide === 'left' ? opponentPullStrength : -opponentPullStrength;
      totalForce += opponentPullForce;
    }
    
    // 4. Rope position influence - when rope moves, players should move accordingly
    if (ropePosition === 'right' && teamSide === 'right') {
      // Right team is winning, move further right
      totalForce += 0.6;
    } else if (ropePosition === 'right' && teamSide === 'left') {
      // Left team is losing, move closer to center
      totalForce += 0.4;
    } else if (ropePosition === 'left' && teamSide === 'left') {
      // Left team is winning, move further left
      totalForce -= 0.6;
    } else if (ropePosition === 'left' && teamSide === 'right') {
      // Right team is losing, move closer to center
      totalForce -= 0.4;
    }
    
    // Apply physics with momentum
    const friction = 0.55; // Higher friction for more controlled movement
    const newVelocity = (velocity + totalForce * delta * 20) * friction;
    const newPosition = currentPos + newVelocity * delta * 20;
    
    // Check for elimination - if player gets too close to center gap
    const centerGapThreshold = 1.5; // Distance from center where players fall
    if (Math.abs(newPosition) < centerGapThreshold) {
      // Player falls through the gap - start falling animation
      const fallVelocity = -5; // Fast fall
      groupRef.current.position.y += fallVelocity * delta;
      
      // If fallen below surface, mark as eliminated
      if (groupRef.current.position.y < 0) {
        // Trigger elimination logic here
        console.log('Player eliminated by falling through gap!');
      }
    } else {
      // Normal movement on elevated surface
      const clampedPosition = Math.max(-10, Math.min(10, newPosition));
      groupRef.current.position.x = clampedPosition;
      groupRef.current.position.y = 1.5; // Keep on elevated surface
      setVelocity(newVelocity);
      setPosition(clampedPosition);
    }
    
    // Notify parent of position change
    if (onPositionUpdate) {
      onPositionUpdate(clampedPosition);
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

  return (
    <group ref={groupRef}>
      {model ? (
        <primitive object={model} />
      ) : (
        // Fallback geometry while model loads
        <mesh position={[0, 0.6, 0]}>
          <boxGeometry args={[0.6, 1.2, 0.6]} />
          <meshStandardMaterial color="#4ECDC4" />
        </mesh>
      )}
      
      {/* Pulling indicator */}
      {isPulling && gameState === 'playing' && (
        <mesh position={[0, 1.5, 0]}>
          <sphereGeometry args={[0.1]} />
          <meshStandardMaterial color="#FFD700" />
        </mesh>
      )}
      
      {/* Victory/Defeat effects */}
      {gameState === 'won' && (
        <group>
          {Array.from({ length: 10 }, (_, i) => (
            <mesh 
              key={i} 
              position={[
                Math.cos(i * 0.6) * 2,
                Math.sin(Date.now() * 0.01 + i) * 0.5 + 1,
                Math.sin(i * 0.6) * 2
              ]}
            >
              <sphereGeometry args={[0.1]} />
              <meshStandardMaterial color="#FFD700" />
            </mesh>
          ))}
        </group>
      )}
      
      {gameState === 'eliminated' && (
        <mesh position={[0, 0.3, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <boxGeometry args={[0.6, 1.2, 0.6]} />
          <meshStandardMaterial color="#FF6B6B" />
        </mesh>
      )}
    </group>
  );
};
