import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface PlayerMovementProps {
  onMove: (deltaX: number, deltaZ: number) => void;
  gameState: string;
  lightState: string;
}

export const PlayerMovement = ({ onMove, gameState, lightState }: PlayerMovementProps) => {
  const { camera } = useThree();
  const keys = useRef<Set<string>>(new Set());

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      keys.current.add(event.code);
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      keys.current.delete(event.code);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useFrame((state, delta) => {
    if (gameState !== 'playing' || lightState !== 'green') return;

    const moveVector = new THREE.Vector3(0, 0, 0);
    const MOVE_SPEED = 0.1;

    if (keys.current.has('KeyW') || keys.current.has('ArrowUp')) {
      moveVector.z += MOVE_SPEED * delta * 60;
    }
    if (keys.current.has('KeyS') || keys.current.has('ArrowDown')) {
      moveVector.z -= MOVE_SPEED * delta * 60;
    }
    if (keys.current.has('KeyA') || keys.current.has('ArrowLeft')) {
      moveVector.x -= MOVE_SPEED * delta * 60;
    }
    if (keys.current.has('KeyD') || keys.current.has('ArrowRight')) {
      moveVector.x += MOVE_SPEED * delta * 60;
    }

    if (moveVector.length() > 0) {
      onMove(moveVector.x, moveVector.z);
    }
  });

  return null;
};
