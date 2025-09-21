import { useEffect, useRef } from 'react';

import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { LightState } from './useGame';
import { FIELD_CONFIG } from '../config/field'; // Add this import

export const usePlayerMovement = (
  lightState: LightState,
  onElimination: () => void,
  onPositionUpdate: (position: number) => void,
  gameActive: boolean,
  onMoveChange?: (isMoving: boolean) => void
) => {
  const playerGroupRef = useRef<THREE.Group>(null);
  const velocityRef = useRef(new THREE.Vector3(0, 0, 0));
  const keysPressed = useRef<Set<string>>(new Set());
  const wasMovingDuringRedLight = useRef(false);
  const lastMovingRef = useRef<boolean>(false);
  const { camera } = useThree();

  // Use centralized field configuration
  const MOVE_SPEED = FIELD_CONFIG.UNITS_PER_SEC;
  const FRICTION = 0.9;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!gameActive) return;
      keysPressed.current.add(event.code);
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      keysPressed.current.delete(event.code);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameActive]);

  useFrame((state, delta) => {
    if (!playerGroupRef.current || !gameActive) return;

    const velocity = velocityRef.current;
    const playerGroup = playerGroupRef.current;

    // Calculate camera-relative movement based on input
    const input = new THREE.Vector2(0, 0);
    if (keysPressed.current.has('KeyW') || keysPressed.current.has('ArrowUp')) input.y += 1;
    if (keysPressed.current.has('KeyS') || keysPressed.current.has('ArrowDown')) input.y -= 1;
    if (keysPressed.current.has('KeyA') || keysPressed.current.has('ArrowLeft')) input.x -= 1;
    if (keysPressed.current.has('KeyD') || keysPressed.current.has('ArrowRight')) input.x += 1;

    const moveVector = new THREE.Vector3(0, 0, 0);
    if (input.lengthSq() > 0) {
      // Fixed movement directions - now correct!
      const forward = new THREE.Vector3(0, 0, 1);  // +Z is forward (toward doll)
      const right = new THREE.Vector3(1, 0, 0);    // +X is right
      
      // Apply input correctly: W/Up = forward, S/Down = backward, A/Left = left, D/Right = right
      moveVector.addScaledVector(forward, input.y);
      moveVector.addScaledVector(right, input.x);
      moveVector.normalize();
      moveVector.multiplyScalar(MOVE_SPEED * delta);
    }

    // Check for movement during red light
    const isMoving = moveVector.length() > 0;
    if (onMoveChange && isMoving !== lastMovingRef.current) {
      lastMovingRef.current = isMoving;
      onMoveChange(isMoving);
    }
    
    if (lightState === 'red' && isMoving) {
      wasMovingDuringRedLight.current = true;
      console.log('Movement detected during red light!');
      // Delay elimination slightly to show the movement
      setTimeout(() => {
        if (wasMovingDuringRedLight.current) {
          onElimination();
        }
      }, 100);
    } else if (lightState === 'green') {
      wasMovingDuringRedLight.current = false;
    }

    // Apply movement only during green light
    if (lightState === 'green') {
      velocity.add(moveVector);
      if (isMoving) {
        console.log('Moving during green light:', playerGroup.position.z);
      }
    }

    // Apply friction
    velocity.multiplyScalar(FRICTION);

    // Update position (XZ only). Keep Y fixed to stand on ground.
    playerGroup.position.x += velocity.x;
    playerGroup.position.z += velocity.z;
    playerGroup.position.y = 0;

    // Orient player to face movement direction if moving
    if (velocity.lengthSq() > 1e-6) {
      const heading = Math.atan2(velocity.x, velocity.z);
      // Smoothly rotate toward heading
      const currentY = playerGroup.rotation.y;
      const diff = ((heading - currentY + Math.PI) % (2 * Math.PI)) - Math.PI;
      playerGroup.rotation.y = currentY + diff * 0.2;
    }

    // Constrain movement using field config
    playerGroup.position.x = Math.max(FIELD_CONFIG.PLAYER_X_BOUNDS[0], Math.min(FIELD_CONFIG.PLAYER_X_BOUNDS[1], playerGroup.position.x));
    if (playerGroup.position.z >= FIELD_CONFIG.WIN_Z_THRESHOLD) {
      // Snap to finish and position to the left of the doll
      playerGroup.position.z = FIELD_CONFIG.WIN_Z_THRESHOLD;
      playerGroup.position.x = -3; // Position to the left of the doll (doll is at x=0)
      playerGroup.rotation.y = Math.PI; // turn around
      velocity.set(0, 0, 0);
    } else {
      playerGroup.position.z = Math.max(FIELD_CONFIG.PLAYER_Z_BOUNDS[0], Math.min(FIELD_CONFIG.PLAYER_Z_BOUNDS[1], playerGroup.position.z));
    }

    // Update game position using field config
    onPositionUpdate(FIELD_CONFIG.getProgressFromZ(playerGroup.position.z));
  });

  return { playerGroupRef };
};