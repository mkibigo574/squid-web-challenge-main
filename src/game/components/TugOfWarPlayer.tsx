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
    
    // 2. Pulling force - when this player is pulling, move away from center
    if (isPulling) {
      const pullForce = teamSide === 'left' ? -pullStrength * 1.2 : pullStrength * 1.2;
      totalForce += pullForce;
    }
    
    // 3. Opponent pulling force - when opponent is pulling, this player gets pulled towards center
    // This is the key mechanic: when one team pulls, the other team gets pulled toward center
    if (ropePosition !== 'center') {
      const opponentPullStrength = 0.4;
      const opponentPullForce = teamSide === 'left' ? opponentPullStrength : -opponentPullStrength;
      totalForce += opponentPullForce;
    }
    
    // Apply physics with momentum
    const friction = 0.95; // Higher friction for more controlled movement
    const newVelocity = (velocity + totalForce * delta * 20) * friction;
    const newPosition = currentPos + newVelocity * delta * 20;
    
    // Clamp position to reasonable bounds (prevent going too far from center)
    const clampedPosition = Math.max(-7, Math.min(7, newPosition));
    
    // Update position
    groupRef.current.position.x = clampedPosition;
    setVelocity(newVelocity);
    setPosition(clampedPosition);
    
    // Notify parent of position change
    if (onPositionUpdate) {
      onPositionUpdate(clampedPosition);
    }
    
    // Notify parent of pull force
    if (onPullForce) {
      onPullForce(Math.abs(totalForce));
    }
  });

  // Reset position when game resets
  useEffect(() => {
    if (gameState === 'waiting' || gameState === 'countdown') {
      const resetPosition = teamSide === 'left' ? -6 : 6;
      if (groupRef.current) {
        groupRef.current.position.set(resetPosition, 0, 0);
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
