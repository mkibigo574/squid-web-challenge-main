import { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface TugOfWarFallingPlayerProps {
  position: [number, number, number];
  teamSide: 'left' | 'right';
  isActive: boolean;
}

export const TugOfWarFallingPlayer = ({ position, teamSide, isActive }: TugOfWarFallingPlayerProps) => {
  const groupRef = useRef<THREE.Group>(null);
  const [fallVelocity, setFallVelocity] = useState(0);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    if (isActive) {
      setFallVelocity(0);
      setRotation(0);
    }
  }, [isActive]);

  useFrame((state, delta) => {
    if (!groupRef.current || !isActive) return;

    // Apply gravity
    const gravity = 9.8;
    const newVelocity = fallVelocity + gravity * delta;
    setFallVelocity(newVelocity);

    // Update position
    const currentPos = groupRef.current.position;
    currentPos.y -= newVelocity * delta;
    currentPos.x += (teamSide === 'left' ? -1 : 1) * delta * 2; // Drift sideways
    currentPos.z += Math.sin(state.clock.elapsedTime * 5) * delta * 0.5; // Wobble

    // Update rotation
    const newRotation = rotation + delta * 3;
    setRotation(newRotation);
    groupRef.current.rotation.z = newRotation;

    // Remove when fallen too far
    if (currentPos.y < -10) {
      groupRef.current.visible = false;
    }
  });

  if (!isActive) return null;

  return (
    <group ref={groupRef} position={position}>
      {/* Falling player body */}
      <mesh>
        <boxGeometry args={[0.6, 1.2, 0.6]} />
        <meshStandardMaterial color={teamSide === 'left' ? '#DC143C' : '#32CD32'} />
      </mesh>
      
      {/* Dramatic trail effect */}
      <mesh position={[0, 1, 0]}>
        <sphereGeometry args={[0.1]} />
        <meshStandardMaterial color="#FFD700" transparent opacity={0.7} />
      </mesh>
    </group>
  );
};
