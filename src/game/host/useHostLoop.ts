import { useEffect, useRef, useState } from 'react';
import { multiplayerManager } from '@/lib/multiplayer';

export function useHostLoop(active: boolean, gameState: 'waiting' | 'countdown' | 'playing') {
  const [currentLightState, setCurrentLightState] = useState<'green' | 'red'>('green');
  const gameStartTime = useRef<number>(0);
  const gameDuration = 60; // 60 seconds
  const lightTimeoutRef = useRef<number | undefined>();
  const timerTimeoutRef = useRef<number | undefined>();
  const FINISH_Z = 25;

  // Clean up timeouts
  const clearTimeouts = () => {
    if (lightTimeoutRef.current) {
      clearTimeout(lightTimeoutRef.current);
      lightTimeoutRef.current = undefined;
    }
    if (timerTimeoutRef.current) {
      clearTimeout(timerTimeoutRef.current);
      timerTimeoutRef.current = undefined;
    }
  };

  // Light state management - 3-5 seconds per state for better playability
  useEffect(() => {
    if (!active || gameState !== 'playing') {
      clearTimeouts();
      return;
    }

    let timeoutId: number | undefined;

    const scheduleNext = () => {
      // 3-5 seconds per state for better playability
      const dwellMs = 3000 + Math.random() * 2000;
      timeoutId = window.setTimeout(() => {
        setCurrentLightState(prev => {
          const newLight = prev === 'green' ? 'red' : 'green';
          
          // Broadcast the light change immediately
          const elapsed = (performance.now() - gameStartTime.current) / 1000;
          const timeLeft = Math.max(0, gameDuration - elapsed);
          multiplayerManager.broadcastGameState('playing', newLight, Math.ceil(timeLeft));
          return newLight;
        });
        scheduleNext();
      }, dwellMs);
    };

    scheduleNext();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [active, gameState]);

  // Timer management - broadcast every second independently
  useEffect(() => {
    if (!active || gameState !== 'playing') {
      clearTimeouts();
      return;
    }

    const updateTimer = () => {
      const elapsed = (performance.now() - gameStartTime.current) / 1000;
      const timeLeft = Math.max(0, gameDuration - elapsed);
      
      if (timeLeft <= 0) {
        // Game ended - check for winners
        const players = multiplayerManager.getPlayersList();
        const winners = players.filter(p => !p.isEliminated && p.z && p.z >= FINISH_Z);
        const winnerIds = winners.map(p => p.id);
        
        console.log('Game ended. Winners:', winnerIds, 'All players:', players);
        multiplayerManager.broadcastFinal(winnerIds);
        return;
      }

      // Broadcast timer update every second with current light state
      multiplayerManager.broadcastGameState('playing', currentLightState, Math.ceil(timeLeft));
      
      // Schedule next update in 1 second
      timerTimeoutRef.current = window.setTimeout(updateTimer, 1000);
    };

    updateTimer();

    return () => {
      clearTimeouts();
    };
  }, [active, gameState, currentLightState]);

  // Function to start the game
  const startGame = () => {
    if (active) {
      // Reset light state
      setCurrentLightState('green');
      
      // Start countdown
      multiplayerManager.broadcastGameState('countdown', 'green', gameDuration);
      
      // Start playing after 3 seconds (matching single player countdown)
      setTimeout(() => {
        gameStartTime.current = performance.now();
        setCurrentLightState('green');
        multiplayerManager.broadcastGameState('playing', 'green', gameDuration);
      }, 3000);
    }
  };

  return { startGame };
}
