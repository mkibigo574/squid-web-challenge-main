import { useState, useEffect, useCallback } from 'react';

export type TugOfWarGameState = 'waiting' | 'countdown' | 'playing' | 'won' | 'eliminated';
export type RopePosition = 'left' | 'center' | 'right';

export const useTugOfWar = () => {
  const [gameState, setGameState] = useState<TugOfWarGameState>('waiting');
  const [ropePosition, setRopePosition] = useState<RopePosition>('center');
  const [timeLeft, setTimeLeft] = useState(30);
  const [playerPosition, setPlayerPosition] = useState(0);
  const [countdown, setCountdown] = useState(3);
  const [isPulling, setIsPulling] = useState(false);
  const [pullStrength, setPullStrength] = useState(0);
  
  const GAME_DURATION = 30;
  const PULL_STRENGTH_INCREASE = 0.02;
  const PULL_STRENGTH_DECAY = 0.01;
  const ROPE_MOVEMENT_THRESHOLD = 0.3;

  const startGame = useCallback(() => {
    setGameState('countdown');
    setCountdown(3);
    setTimeLeft(GAME_DURATION);
    setPlayerPosition(0);
    setRopePosition('center');
    setPullStrength(0);
    setIsPulling(false);
  }, []);

  const resetGame = useCallback(() => {
    setGameState('waiting');
    setTimeLeft(GAME_DURATION);
    setPlayerPosition(0);
    setCountdown(3);
    setRopePosition('center');
    setPullStrength(0);
    setIsPulling(false);
  }, []);

  const pullRope = useCallback(() => {
    if (gameState === 'playing') {
      setIsPulling(true);
    }
  }, [gameState]);

  const releaseRope = useCallback(() => {
    setIsPulling(false);
  }, []);

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
      // Time's up - check if player won
      if (ropePosition === 'right') {
        setGameState('won');
      } else {
        setGameState('eliminated');
      }
    }
  }, [gameState, timeLeft, ropePosition]);

  // Rope physics and AI opponent
  useEffect(() => {
    if (gameState !== 'playing') return;

    let animationFrame: number;
    
    const updateRope = () => {
      setPullStrength(prev => {
        let newStrength = prev;
        
        // Player pulling increases strength
        if (isPulling) {
          newStrength = Math.min(1, newStrength + PULL_STRENGTH_INCREASE);
        } else {
          // Decay when not pulling
          newStrength = Math.max(0, newStrength - PULL_STRENGTH_DECAY);
        }
        
        // AI opponent pulls back (simulated)
        const aiStrength = 0.3 + Math.random() * 0.2; // AI strength varies
        const netPull = newStrength - aiStrength;
        
        // Update rope position based on net pull
        setRopePosition(prev => {
          if (netPull > ROPE_MOVEMENT_THRESHOLD) {
            return 'right'; // Player winning
          } else if (netPull < -ROPE_MOVEMENT_THRESHOLD) {
            return 'left'; // AI winning
          } else {
            return 'center'; // Balanced
          }
        });
        
        // Check for win condition
        if (netPull > ROPE_MOVEMENT_THRESHOLD && prev === 'right') {
          setGameState('won');
        } else if (netPull < -ROPE_MOVEMENT_THRESHOLD && prev === 'left') {
          setGameState('eliminated');
        }
        
        return newStrength;
      });
      
      animationFrame = requestAnimationFrame(updateRope);
    };
    
    animationFrame = requestAnimationFrame(updateRope);
    
    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [gameState, isPulling]);

  return {
    gameState,
    ropePosition,
    timeLeft,
    playerPosition,
    countdown,
    isPulling,
    pullStrength,
    startGame,
    resetGame,
    pullRope,
    releaseRope
  };
};


