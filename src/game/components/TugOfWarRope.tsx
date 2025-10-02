import { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface TugOfWarRopeProps {
  ropePosition: 'left' | 'center' | 'right';
  gameState: 'waiting' | 'countdown' | 'playing' | 'won' | 'eliminated';
  pullStrength?: number;
  isPulling?: boolean;
  leftPlayerPos?: number;
  rightPlayerPos?: number;
}

export const TugOfWarRope = ({ ropePosition, gameState, pullStrength = 0, isPulling = false, leftPlayerPos = -6, rightPlayerPos = 6 }: TugOfWarRopeProps) => {
  const ropeRef = useRef<THREE.Group>(null);
  const ropeSegments = 30; // More segments for smoother movement
  const ropeLength = 12;
  const [ropeOffset, setRopeOffset] = useState(0);
  const [animationTime, setAnimationTime] = useState(0);

  // Calculate rope position based on actual player positions
  const getTargetOffset = () => {
    // Calculate the center point between the two players
    const centerPoint = (leftPlayerPos + rightPlayerPos) / 2;
    return centerPoint;
  };

  // Real-time rope movement with smooth interpolation
  useFrame((state) => {
    if (ropeRef.current) {
      const targetOffset = getTargetOffset();
      const currentOffset = ropeRef.current.position.x;
      
      // Smooth interpolation to target position
      const lerpFactor = 0.15;
      const newOffset = currentOffset + (targetOffset - currentOffset) * lerpFactor;
      ropeRef.current.position.x = newOffset;
      
      // Update rope offset for section coloring
      setRopeOffset(newOffset);
      
      // Update animation time for tension effects
      setAnimationTime(state.clock.elapsedTime);
    }
  });

  // Get color for rope section based on position and pull strength
  const getSectionColor = (segmentIndex: number) => {
    const segmentPosition = (segmentIndex / (ropeSegments - 1)) * ropeLength - ropeLength / 2;
    const normalizedPosition = (segmentPosition + ropeLength / 2) / ropeLength; // 0 to 1
    
    // Create alternating red/green pattern with pull strength influence
    const basePattern = Math.floor(normalizedPosition * 8) % 2; // 8 sections alternating
    const pullInfluence = Math.sin(animationTime * 10 + segmentIndex) * pullStrength * 0.3;
    
    if (gameState !== 'playing') {
      return "#666666"; // Gray when not playing
    }
    
    // Red and green alternating with pull strength animation
    if (basePattern === 0) {
      return `hsl(${120 + pullInfluence * 60}, 70%, ${50 + pullStrength * 30}%)`; // Green with variation
    } else {
      return `hsl(${0 + pullInfluence * 60}, 70%, ${50 + pullStrength * 30}%)`; // Red with variation
    }
  };


  return (
    <group ref={ropeRef} position={[0, 1, 0]}>
      {/* Main rope with real-time sections */}
      <group>
        {Array.from({ length: ropeSegments }, (_, i) => {
          const segmentPosition = (i / (ropeSegments - 1)) * ropeLength - ropeLength / 2;
          
          return (
            <mesh 
              key={i} 
              position={[segmentPosition, 0, 0]}
              rotation={[0, 0, Math.PI / 2]}
            >
              <cylinderGeometry args={[0.06, 0.06, 0.4]} />
              <meshStandardMaterial 
                color={getSectionColor(i)}
                emissive={isPulling ? "#444444" : "#000000"}
                emissiveIntensity={pullStrength * 0.3}
              />
            </mesh>
          );
        })}
      </group>

      {/* Rope handles with team colors */}
      <group position={[-6, 0, 0]}>
        <mesh>
          <cylinderGeometry args={[0.2, 0.2, 0.4]} />
          <meshStandardMaterial color="#FF4444" />
        </mesh>
        {/* Red Team Label */}
        <mesh position={[0, 1.5, 0]}>
          <planeGeometry args={[1, 0.3]} />
          <meshStandardMaterial color="#FF4444" transparent opacity={0.8} />
        </mesh>
      </group>
      <group position={[6, 0, 0]}>
        <mesh>
          <cylinderGeometry args={[0.2, 0.2, 0.4]} />
          <meshStandardMaterial color="#44FF44" />
        </mesh>
        {/* Green Team Label */}
        <mesh position={[0, 1.5, 0]}>
          <planeGeometry args={[1, 0.3]} />
          <meshStandardMaterial color="#44FF44" transparent opacity={0.8} />
        </mesh>
      </group>

      {/* Center marker with pulsing effect */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 0.8]} />
        <meshStandardMaterial 
          color="#FFD700"
          emissive="#FFD700"
          emissiveIntensity={0.2 + Math.sin(animationTime * 5) * 0.1}
        />
      </mesh>

      {/* Win zones with pulsing effect */}
      {gameState === 'playing' && (
        <>
          {/* Left win zone */}
          <mesh position={[-5.5, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[1.2, 0.3]} />
            <meshStandardMaterial 
              color="#FF0000" 
              transparent 
              opacity={0.4 + Math.sin(animationTime * 3) * 0.2} 
            />
          </mesh>
          
          {/* Right win zone */}
          <mesh position={[5.5, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[1.2, 0.3]} />
            <meshStandardMaterial 
              color="#00FF00" 
              transparent 
              opacity={0.4 + Math.sin(animationTime * 3) * 0.2} 
            />
          </mesh>
        </>
      )}


      {/* Rope movement indicator */}
      {gameState === 'playing' && (
        <group>
          <mesh position={[ropeOffset, 1.2, 0]}>
            <cylinderGeometry args={[0.08, 0.08, 0.2]} />
            <meshStandardMaterial 
              color={ropeOffset > 0.5 ? "#44FF44" : ropeOffset < -0.5 ? "#FF4444" : "#FFD700"}
              emissive={ropeOffset > 0.5 ? "#44FF44" : ropeOffset < -0.5 ? "#FF4444" : "#FFD700"}
              emissiveIntensity={0.3}
            />
          </mesh>
        </group>
      )}
    </group>
  );
};

