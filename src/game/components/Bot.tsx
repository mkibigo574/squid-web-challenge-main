import { Suspense, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { LightState, GameState } from '../hooks/useGame';
import { useBotMovement } from '../hooks/useBotMovement';
import { MODEL_CONFIG } from '../config/models';
import { NameTag } from './NameTag';
import { useGLTF } from '@react-three/drei';
import { SkeletonUtils } from 'three-stdlib';

interface BotProps {
  lightState: LightState;
  gameState: GameState;
  name: string;
  startX: number;
}

function EliminationEffectBot() {
  const particles = useMemo(() => (
    Array.from({ length: 20 }).map((_, i) => ({
      id: i,
      position: new THREE.Vector3(0, 1, 0),
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 4,
        Math.random() * 3 + 1,
        (Math.random() - 0.5) * 4
      ),
      life: 1
    }))
  ), []);

  useFrame((_, delta) => {
    particles.forEach(p => {
      p.position.addScaledVector(p.velocity, delta);
      p.velocity.y -= 9.8 * delta;
      p.life -= delta * 0.5;
    });
  });

  return (
    <group>
      <mesh position={[0, 1, 0]}>
        <sphereGeometry args={[0.5]} />
        <meshBasicMaterial color="#ff6b6b" transparent opacity={0.8} />
      </mesh>
      {particles.map(p => (
        p.life > 0 ? (
          <mesh key={p.id} position={p.position}>
            <sphereGeometry args={[0.05]} />
            <meshBasicMaterial 
              color={p.id % 3 === 0 ? '#ff6b6b' : p.id % 3 === 1 ? '#4ecdc4' : '#ffe66d'} 
              transparent 
              opacity={p.life}
            />
          </mesh>
        ) : null
      ))}
    </group>
  );
}

const BotGLB = ({ modelPath, state }: { modelPath: string; state: string }) => {
  const { scene, animations } = useGLTF(modelPath);
  let scene, animations;
  try {
    const gltf = useGLTF(modelPath);
    scene = gltf.scene;
    animations = gltf.animations;
  } catch (error) {
    console.warn('Failed to load bot model, using fallback:', error);
    scene = null;
    animations = [];
  }
  
  if (!scene) {
    // Fallback bot using primitive shapes
    return (
      <group>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[0.6, 1.5, 0.3]} />
          <meshStandardMaterial color="red" />
        </mesh>
        <mesh position={[0, 0.9, 0]} castShadow receiveShadow>
          <sphereGeometry args={[0.25]} />
          <meshStandardMaterial color="pink" />
        </mesh>
      </group>
    );
  }
  
  // Clone per instance to avoid shared graph/material issues
  const cloned = useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const mixer = useMemo(() => new THREE.AnimationMixer(cloned), [cloned]);
  const clip = useMemo(() => {
    if (!animations || animations.length === 0) return undefined;
    if (state === 'run') return animations.find(a => /run|walk/i.test(a.name)) || animations[0];
    if (state === 'happy') return animations.find(a => /happy|win|celebr/i.test(a.name)) || animations[0];
    return undefined;
  }, [animations, state]);

  useMemo(() => {
    cloned.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        // Ensure unique material instance per bot, then tint red
        const m = child.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(m)) {
          child.material = m.map((mat) => {
            const clone = (mat as any)?.clone ? (mat as any).clone() : mat;
            if ((clone as any)?.color) {
              (clone as any).color.set('#ff3333');
            }
            return clone;
          });
        } else if (m) {
          const clone = (m as any)?.clone ? (m as any).clone() : m;
          if ((clone as any)?.color) {
            (clone as any).color.set('#ff3333');
          }
          child.material = clone as any;
        }
      }
    });
    if (clip) {
      const action = mixer.clipAction(clip);
      action.setLoop(THREE.LoopRepeat, Infinity).reset().fadeIn(0.2).play();
    } else {
      mixer.stopAllAction();
    }
  }, [cloned, mixer, clip]);

  // Advance animations
  useFrame((_, delta) => {
    mixer.update(delta);
  });

  return <primitive object={cloned} position={[0,0,0]} />;
};

export function Bot({ lightState, gameState, name, startX }: BotProps) {
  const { botGroupRef, isMoving, hasWon, isEliminated } = useBotMovement(
    lightState,
    () => {},
    () => {},
    gameState === 'playing',
    startX,
    {
      maxSpeedUnitsPerSec: 7 + Math.random() * 3,
      cautiousness: Math.random(),
      reactionMs: [120, 320]
    }
  );

  const modelPath = MODEL_CONFIG.player.path;
  const animState = hasWon() || gameState === 'won' ? 'happy' : isMoving() ? 'run' : 'idle';

  return (
    <group ref={botGroupRef} position={[startX, 0, -5]}>
      {!isEliminated() && (
        <Suspense fallback={null}>
          <BotGLB modelPath={modelPath} state={animState} />
        </Suspense>
      )}
      {isEliminated() && <EliminationEffectBot />}
      <NameTag name={name} position={[0, 2.5, 0]} isEliminated={isEliminated()} color="#f59e0b" />
    </group>
  );
}


