import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { LightState } from './useGame';

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

  // World and speed scaling
  const START_Z = -5;
  const FINISH_Z = 25;
  const FIELD_LENGTH_UNITS = FINISH_Z - START_Z; // 30 units
  const FIELD_LENGTH_METERS = 400; // approximate 400m track
  const HUMAN_RUN_MPS = 6; // ~6 m/s (fast jog)
  const UNITS_PER_SEC = HUMAN_RUN_MPS / (FIELD_LENGTH_METERS / FIELD_LENGTH_UNITS); // ≈ 0.45 units/s

  const MOVE_SPEED = UNITS_PER_SEC;
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
      // Camera forward (XZ)
      const camForward = new THREE.Vector3();
      camera.getWorldDirection(camForward);
      camForward.y = 0;
      camForward.normalize();
      // Camera right = forward x up
      const camRight = new THREE.Vector3();
      camRight.crossVectors(camForward, new THREE.Vector3(0, 1, 0)).normalize();

      moveVector.addScaledVector(camForward, input.y);
      moveVector.addScaledVector(camRight, input.x);
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

    // Constrain movement: track spans z in [-5, 25]
    playerGroup.position.x = Math.max(-10, Math.min(10, playerGroup.position.x));
    if (playerGroup.position.z >= FINISH_Z) {
      // Snap to finish and face backward
      playerGroup.position.z = FINISH_Z;
      playerGroup.rotation.y = Math.PI; // turn around
      velocity.set(0, 0, 0);
    } else {
      playerGroup.position.z = Math.max(START_Z, Math.min(FINISH_Z, playerGroup.position.z));
    }

    // Update game position (forward progress)
    // Progress is distance from start line at z=-5 toward finish at z=25 → [0..30]
    onPositionUpdate(Math.max(0, playerGroup.position.z - (-5)));
  });

  return { playerGroupRef };
};