import { useState, useEffect, useCallback } from 'react';
import { FIELD_CONFIG } from '../config/field'; // Add this import

export type GameState = 'waiting' | 'countdown' | 'playing' | 'won' | 'eliminated';
export type LightState = 'green' | 'red';

export const useGame = () => {
  const [gameState, setGameState] = useState<GameState>('waiting');
  const [lightState, setLightState] = useState<LightState>('green');
  const [timeLeft, setTimeLeft] = useState(60);
  const [playerPosition, setPlayerPosition] = useState(0);
  const [countdown, setCountdown] = useState(3);
  
  const FINISH_LINE = FIELD_CONFIG.FIELD_LENGTH_UNITS; // Use field config
  const GAME_DURATION = 60;

  const startGame = useCallback(() => {
    setGameState('countdown');
    setCountdown(3);
    setTimeLeft(GAME_DURATION);
    setPlayerPosition(0);
    setLightState('green');
  }, []);

  const resetGame = useCallback(() => {
    setGameState('waiting');
    setTimeLeft(GAME_DURATION);
    setPlayerPosition(0);
    setCountdown(3);
    setLightState('green');
  }, []);

  const eliminatePlayer = useCallback(() => {
    if (gameState === 'playing') {
      setGameState('eliminated');
    }
  }, [gameState]);

  const updatePlayerPosition = useCallback((newPosition: number) => {
    setPlayerPosition(newPosition);
    if (newPosition >= FINISH_LINE && gameState === 'playing') {
      setGameState('won');
    }
  }, [gameState, FINISH_LINE]);

  // Countdown logic
  useEffect(() => {
    if (gameState === 'countdown' && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (gameState === 'countdown' && countdown === 0) {
      setGameState('playing');
    }
  }, [gameState, countdown]);

  // Game timer
  useEffect(() => {
    if (gameState === 'playing' && timeLeft > 0) {
      const timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (gameState === 'playing' && timeLeft === 0) {
      setGameState('eliminated');
    }
  }, [gameState, timeLeft]);

  // Doll state changes with minimum dwell time per state
  useEffect(() => {
    if (gameState !== 'playing') return;

    let timeoutId: number | undefined;

    const scheduleNext = () => {
      // At least 2–3+ seconds per state (2–4s random window)
      const dwellMs = 2000 + Math.random() * 2000;
      timeoutId = window.setTimeout(() => {
        setLightState(prev => (prev === 'green' ? 'red' : 'green'));
        scheduleNext();
      }, dwellMs);
    };

    scheduleNext();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [gameState]);

  return {
    gameState,
    lightState,
    timeLeft,
    playerPosition,
    countdown,
    startGame,
    resetGame,
    eliminatePlayer,
    updatePlayerPosition,
    progress: playerPosition / FINISH_LINE,
    FINISH_LINE
  };
};