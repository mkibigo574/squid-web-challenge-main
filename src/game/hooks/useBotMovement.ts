import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { LightState } from './useGame';
import { FIELD_CONFIG } from '../config/field';

export interface BotTuning {
  maxSpeedUnitsPerSec: number;
  cautiousness: number; // 0 aggressive, 1 very cautious
  reactionMs: [number, number]; // min/max reaction delay to light changes
}

export function useBotMovement(
  lightState: LightState,
  onElimination: () => void,
  onPositionUpdate: (position: number) => void,
  gameActive: boolean,
  startX: number,
  tuning?: Partial<BotTuning>,
) {
  const botGroupRef = useRef<THREE.Group>(null);
  const velocityRef = useRef(new THREE.Vector3(0, 0, 0));
  const targetSpeedRef = useRef(0);
  const lastLightRef = useRef<LightState>('green');
  const reactionTimerRef = useRef<number | null>(null);
  const eliminatedRef = useRef(false);
  const wonRef = useRef(false);
  const zStartJitterRef = useRef<number>(0);
  const greenTravelRemainingRef = useRef<number>(0);
  const lastZRef = useRef<number>(FIELD_CONFIG.START_Z);
  const stalledTimeRef = useRef<number>(0);

  const config: BotTuning = {
    maxSpeedUnitsPerSec: 4.0,
    cautiousness: 0.3,
    reactionMs: [120, 350],
    ...tuning,
  };

  const accel = useMemo(() => config.maxSpeedUnitsPerSec * 4.0, [config.maxSpeedUnitsPerSec]); // quicker pickup
  const decel = useMemo(() => config.maxSpeedUnitsPerSec * (4.0 + config.cautiousness * 4.0), [config]);

  // Reset on game inactive (waiting/countdown/end)
  useEffect(() => {
    if (!gameActive) {
      // Reset bot to starting line
      const bot = botGroupRef.current;
      if (bot) {
        bot.position.set(startX, 0, FIELD_CONFIG.START_Z + zStartJitterRef.current);
        // Spread along X is handled by caller initial position
        lastZRef.current = bot.position.z;
      }
      velocityRef.current.set(0, 0, 0);
      targetSpeedRef.current = 0;
      eliminatedRef.current = false;
      wonRef.current = false;
      greenTravelRemainingRef.current = 0;
      stalledTimeRef.current = 0;
    }
  }, [gameActive, startX]);

  // Handle light changes with a reaction delay
  useEffect(() => {
    if (!gameActive) return;
    if (lightState === lastLightRef.current) return;
    lastLightRef.current = lightState;
    if (reactionTimerRef.current) {
      window.clearTimeout(reactionTimerRef.current);
      reactionTimerRef.current = null;
    }
    const delay = config.reactionMs[0] + Math.random() * (config.reactionMs[1] - config.reactionMs[0]);
    reactionTimerRef.current = window.setTimeout(() => {
      if (lightState === 'green') {
        targetSpeedRef.current = config.maxSpeedUnitsPerSec * (0.6 + Math.random() * 0.4);
        // Pick a random burst distance to travel this green phase
        // Typical progress per green ~ 8 to 18 units (faster)
        greenTravelRemainingRef.current = 8 + Math.random() * 10;
        // Kickstart from rest to avoid run-in-place
        if (Math.abs(velocityRef.current.z) < 0.05) {
          velocityRef.current.z = Math.max(velocityRef.current.z, targetSpeedRef.current * 0.3);
        }
        stalledTimeRef.current = 0;
      } else {
        targetSpeedRef.current = 0;
      }
    }, delay);
  }, [lightState, gameActive, config]);

  // Ensure immediate start on the very first green when game becomes active
  useEffect(() => {
    if (!gameActive) return;
    // On game activation, if current light is green, start without waiting for a change
    if (lightState === 'green') {
      // Initialize movement immediately
      targetSpeedRef.current = config.maxSpeedUnitsPerSec * (0.6 + Math.random() * 0.4);
      greenTravelRemainingRef.current = 2 + Math.random() * 6;
      if (Math.abs(velocityRef.current.z) < 0.05) {
        velocityRef.current.z = Math.max(velocityRef.current.z, targetSpeedRef.current * 0.3);
      }
      stalledTimeRef.current = 0;
      // Sync last light state to avoid double triggering
      lastLightRef.current = 'green';
    }
  }, [gameActive]);

  // Eliminate deterministically if moving on red
  useEffect(() => {
    if (!gameActive || lightState !== 'red' || eliminatedRef.current) return;
    const speed = Math.abs(velocityRef.current.z);
    if (speed > 0.1) {
      setTimeout(() => {
        if (!eliminatedRef.current) {
          onElimination();
          eliminatedRef.current = true;
          targetSpeedRef.current = 0;
          velocityRef.current.set(0, 0, 0);
        }
      }, 120);
    }
  }, [lightState, gameActive, onElimination]);

  useFrame((_, delta) => {
    const bot = botGroupRef.current;
    if (!bot || !gameActive || eliminatedRef.current || wonRef.current) return;

    // 1D forward movement along +Z; ease speed towards target
    const speed = velocityRef.current.z;
    const target = targetSpeedRef.current;
    const diff = target - speed;
    const rate = diff > 0 ? accel : decel;
    const step = Math.sign(diff) * Math.min(Math.abs(diff), rate * delta);
    velocityRef.current.z += step;

    // Apply friction when target is 0
    if (target <= 0.001) velocityRef.current.z *= 0.88;

    // Update position
    const dz = velocityRef.current.z * delta;
    if (lightState === 'green') {
      bot.position.z += dz;
    } else {
      // Not green: actively kill tiny residual velocity to avoid sliding
      if (Math.abs(velocityRef.current.z) < 0.02) {
        velocityRef.current.z = 0;
      }
    }
    bot.position.y = 0;

    // If in green phase burst, decrement remaining distance and stop when done
    if (lightState === 'green' && greenTravelRemainingRef.current > 0) {
      greenTravelRemainingRef.current = Math.max(0, greenTravelRemainingRef.current - Math.max(0, dz));
      if (greenTravelRemainingRef.current <= 0.001) {
        targetSpeedRef.current = 0; // stop until next green
      }
    }

    // Stall detection: if target > 0 but barely moving, give a small push
    if (lightState === 'green' && target > 0.05) {
      const advanced = bot.position.z - lastZRef.current;
      if (advanced < 0.005) {
        stalledTimeRef.current += delta;
        if (stalledTimeRef.current > 0.3) {
          velocityRef.current.z = Math.max(velocityRef.current.z, target * 0.6);
          stalledTimeRef.current = 0;
        }
      } else {
        stalledTimeRef.current = 0;
      }
    } else {
      stalledTimeRef.current = 0;
    }
    lastZRef.current = bot.position.z;

    // Subtle lateral wandering only while moving on green
    if (target > 0.01 && lightState === 'green') {
      bot.position.x = THREE.MathUtils.clamp(
        bot.position.x + (Math.sin(performance.now() * 0.001 + bot.position.z) * 0.15) * delta,
        FIELD_CONFIG.PLAYER_X_BOUNDS[0],
        FIELD_CONFIG.PLAYER_X_BOUNDS[1]
      );
    }

    // Rotate to face forward with slight noise
    const heading = Math.atan2(0, 1);
    bot.rotation.y += (heading - bot.rotation.y) * 0.1;

    // Bounds and win
    if (bot.position.z >= FIELD_CONFIG.WIN_Z_THRESHOLD) {
      bot.position.z = FIELD_CONFIG.WIN_Z_THRESHOLD;
      velocityRef.current.set(0, 0, 0);
      targetSpeedRef.current = 0;
      wonRef.current = true;
    } else {
      bot.position.z = Math.max(FIELD_CONFIG.PLAYER_Z_BOUNDS[0], Math.min(FIELD_CONFIG.PLAYER_Z_BOUNDS[1], bot.position.z));
    }

    onPositionUpdate(FIELD_CONFIG.getProgressFromZ(bot.position.z));
  });

  const isMoving = () => Math.abs(velocityRef.current.z) > 0.05 && gameActive && !eliminatedRef.current && !wonRef.current;
  const hasWon = () => wonRef.current;
  const isEliminated = () => eliminatedRef.current;

  return { botGroupRef, isMoving, hasWon, isEliminated };
}


