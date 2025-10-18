import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { materialManager } from '../utils/materials';

interface TugOfWarRopeProps {
  ropePosition: 'left' | 'center' | 'right';
  gameState: 'waiting' | 'countdown' | 'playing' | 'won' | 'eliminated';
  pullStrength?: number;
  isPulling?: boolean;
  leftPlayerPos?: number;
  rightPlayerPos?: number;
  hasLeftPlayer?: boolean;
  hasRightPlayer?: boolean;
}

export const TugOfWarRope = ({ ropePosition, gameState, pullStrength = 0, isPulling = false, leftPlayerPos = -6, rightPlayerPos = 6, hasLeftPlayer = true, hasRightPlayer = true }: TugOfWarRopeProps) => {
  const ropeRef = useRef<THREE.Group>(null);
  const indicatorRef = useRef<THREE.Mesh>(null);
  const indicatorMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const leftHandleRef = useRef<THREE.Group>(null);
  const rightHandleRef = useRef<THREE.Group>(null);
  const ropeSegments = 40; // More segments for smoother movement
  const ropeLength = 12;
  const animationTimeRef = useRef(0);

  // Calculate rope position based on actual player positions
  const getTargetOffset = () => {
    // Calculate the center point between the two players
    const centerPoint = (leftPlayerPos + rightPlayerPos) / 2;
    return centerPoint;
  };

  // Real-time rope movement with smooth interpolation
  useFrame((state, delta) => {
    if (ropeRef.current) {
      const targetOffset = getTargetOffset();
      const currentOffset = ropeRef.current.position.x;
      
      // Time-based damping for smooth, stable motion (less jitter)
      const smooth = THREE.MathUtils.damp(currentOffset, targetOffset, 6, delta);
      const newOffset = smooth;
      ropeRef.current.position.x = newOffset;

      // Keep indicator aligned in world space with rope center
      if (indicatorRef.current) {
        indicatorRef.current.position.x = newOffset;
      }
      if (indicatorMatRef.current) {
        const colorHex = newOffset > 0.5 ? '#44FF44' : newOffset < -0.5 ? '#FF4444' : '#FFD700';
        indicatorMatRef.current.color = new THREE.Color(colorHex);
        indicatorMatRef.current.emissive = new THREE.Color(colorHex);
        indicatorMatRef.current.emissiveIntensity = 0.25;
      }

      // Keep handles aligned: follow player if present; otherwise, stay attached to rope ends
      if (leftHandleRef.current) {
        leftHandleRef.current.position.x = hasLeftPlayer ? (leftPlayerPos - newOffset) : -6; // local to rope
      }
      if (rightHandleRef.current) {
        rightHandleRef.current.position.x = hasRightPlayer ? (rightPlayerPos - newOffset) : 6; // local to rope
      }

      // Advance animation time for subtle color variation
      animationTimeRef.current += delta;
    }
  });

  // Get color for rope section based on position and pull strength
  const getSectionColor = (segmentIndex: number) => {
    const segmentPosition = (segmentIndex / (ropeSegments - 1)) * ropeLength - ropeLength / 2;
    const normalizedPosition = (segmentPosition + ropeLength / 2) / ropeLength; // 0 to 1
    
    // Create alternating red/green pattern with pull strength influence
    const basePattern = Math.floor(normalizedPosition * 8) % 2; // 8 sections alternating
    const pullInfluence = Math.sin(animationTimeRef.current * 6 + segmentIndex) * pullStrength * 0.2;
    
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
    <group>
      {/* Moving rope group - on elevated surface */}
      <group ref={ropeRef} position={[0, 1.5, 0]}>
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
              <primitive object={materialManager.getMaterial('rope')} />
            </mesh>
          );
        })}
        </group>

        {/* Rope handles with team colors - Enhanced Squid Game style */}
        <group ref={leftHandleRef} position={[-6, 0, 0]}>
          {/* Red Team Handle */}
          <mesh>
            <cylinderGeometry args={[0.3, 0.3, 0.6]} />
            <meshStandardMaterial color="#DC143C" />
          </mesh>
          {/* Red Team Label */}
          <mesh position={[0, 2, 0]}>
            <planeGeometry args={[1.5, 0.4]} />
            <meshStandardMaterial color="#DC143C" transparent opacity={0.9} />
          </mesh>
          {/* Red Team Text */}
          <mesh position={[0, 2.2, 0.01]}>
            <planeGeometry args={[1.2, 0.2]} />
            <meshStandardMaterial color="#FFFFFF" transparent opacity={0.8} />
          </mesh>
        </group>
        <group ref={rightHandleRef} position={[6, 0, 0]}>
          {/* Blue Team Handle */}
          <mesh>
            <cylinderGeometry args={[0.3, 0.3, 0.6]} />
            <meshStandardMaterial color="#0066CC" />
          </mesh>
          {/* Blue Team Label */}
          <mesh position={[0, 2, 0]}>
            <planeGeometry args={[1.5, 0.4]} />
            <meshStandardMaterial color="#0066CC" transparent opacity={0.9} />
          </mesh>
          {/* Blue Team Text */}
          <mesh position={[0, 2.2, 0.01]}>
            <planeGeometry args={[1.2, 0.2]} />
            <meshStandardMaterial color="#FFFFFF" transparent opacity={0.8} />
          </mesh>
        </group>

      </group>

      {/* Win zones with pulsing effect */}
      {gameState === 'playing' && (
        <>
          {/* Left win zone */}
          <mesh position={[-5.5, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[1.2, 0.3]} />
            <meshStandardMaterial 
              color="#FF0000" 
              transparent 
              opacity={0.4 + Math.sin(animationTimeRef.current * 3) * 0.2} 
            />
          </mesh>
          
          {/* Right win zone */}
          <mesh position={[5.5, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[1.2, 0.3]} />
            <meshStandardMaterial 
              color="#00FF00" 
              transparent 
              opacity={0.4 + Math.sin(animationTimeRef.current * 3) * 0.2} 
            />
          </mesh>
        </>
      )}

      {/* Rope movement indicator (world-aligned, dynamic color) */}
      {gameState === 'playing' && (
        <group>
          <mesh ref={indicatorRef} position={[0, 1.2, 0]}>
            <cylinderGeometry args={[0.08, 0.08, 0.2]} />
            <meshStandardMaterial ref={indicatorMatRef} color="#FFD700" emissive="#FFD700" emissiveIntensity={0.25} />
          </mesh>
        </group>
      )}

      {/* Center marker (static, immobile) */}
      <mesh position={[0, 1, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 0.8]} />
        <meshStandardMaterial color="#FFD700" />
      </mesh>
    </group>
  );
};

