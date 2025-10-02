import { useState, useEffect, useCallback, useRef } from 'react';
import { multiplayerManager } from '@/lib/multiplayer';

export type TugOfWarGameState = 'waiting' | 'countdown' | 'playing' | 'won' | 'eliminated';
export type RopePosition = 'left' | 'center' | 'right';

interface TugOfWarPlayer {
  id: string;
  name?: string;
  isEliminated: boolean;
  isPulling: boolean;
  pullStrength: number;
  position: number; // -8 (left) to 8 (right)
  pullForce?: number; // Force being applied by this player
  ts?: number;
}

export const useMultiplayerTugOfWar = () => {
  const [gameState, setGameState] = useState<TugOfWarGameState>('waiting');
  const [ropePosition, setRopePosition] = useState<RopePosition>('center');
  const [timeLeft, setTimeLeft] = useState(30);
  const [countdown, setCountdown] = useState(3);
  const [isPulling, setIsPulling] = useState(false);
  const [pullStrength, setPullStrength] = useState(0);
  const [players, setPlayers] = useState<TugOfWarPlayer[]>([]);
  const [isHost, setIsHost] = useState(false);
  const [winners, setWinners] = useState<string[]>([]);
  const [ended, setEnded] = useState(false);
  
  const selfId = useRef<string>(multiplayerManager.getSelfId() || crypto.randomUUID());
  const gameUpdateInterval = useRef<NodeJS.Timeout | null>(null);
  const lastRopeUpdate = useRef<number>(0);
  const timeLeftRef = useRef<number>(30);
  
  const GAME_DURATION = 30;
  const PULL_STRENGTH_INCREASE = 0.02;
  const PULL_STRENGTH_DECAY = 0.01;
  const ROPE_MOVEMENT_THRESHOLD = 0.3;
  const ROPE_UPDATE_INTERVAL = 1000; // Update rope position every 1 second


  // Initialize multiplayer connection
  useEffect(() => {
    const handlePlayersUpdate = (updatedPlayers: any[]) => {
      const tugOfWarPlayers: TugOfWarPlayer[] = updatedPlayers.map(player => ({
        id: player.id,
        name: player.name,
        isEliminated: player.isEliminated || false,
        isPulling: player.isPulling || false,
        pullStrength: player.pullStrength || 0,
        position: player.position || 0,
        ts: player.ts
      }));
      setPlayers(tugOfWarPlayers);
    };

    const handleGameStateChange = (newState: any) => {
      console.log('🎮 Game state change received:', newState);
      
      if (newState.gameState) {
        console.log('🎮 Setting gameState to:', newState.gameState);
        setGameState(newState.gameState);
      }
      if (newState.ropePosition) {
        console.log('🎮 Setting ropePosition to:', newState.ropePosition);
        setRopePosition(newState.ropePosition);
      }
      if (newState.timeLeft !== undefined) {
        console.log('🎮 Setting timeLeft to:', newState.timeLeft);
        setTimeLeft(newState.timeLeft);
        timeLeftRef.current = newState.timeLeft; // Sync the ref as well
      }
      if (newState.countdown !== undefined) {
        console.log('🎮 Setting countdown to:', newState.countdown);
        setCountdown(newState.countdown);
      }
      if (newState.winners) {
        console.log('🎮 Setting winners to:', newState.winners);
        setWinners(newState.winners);
      } else if (newState.winners === undefined && newState.gameState === 'won') {
        console.log('🎮 WARNING: Game state is won but no winners provided!', newState);
      }
      if (newState.ended !== undefined) {
        console.log('🎮 Setting ended to:', newState.ended);
        setEnded(newState.ended);
      }
    };

    const handleTimeUpdate = (payload: any) => {
      if (payload.timeLeft !== undefined) {
        console.log('Client received time update:', payload.timeLeft);
        timeLeftRef.current = payload.timeLeft;
        setTimeLeft(payload.timeLeft);
      }
      if (payload.gameState) {
        setGameState(payload.gameState);
      }
    };

    const handleCountdownUpdate = (payload: any) => {
      if (payload.countdown !== undefined) {
        setCountdown(payload.countdown);
      }
    };

    const handleHostChange = (hostId: string) => {
      setIsHost(hostId === selfId.current);
    };

    // Set up event listeners
    multiplayerManager.onEvent('PLAYERS_UPDATED', handlePlayersUpdate);
    multiplayerManager.onEvent('GAME_STATE_CHANGED', handleGameStateChange);
    multiplayerManager.onEvent('HOST_CHANGED', handleHostChange);
    multiplayerManager.onEvent('TUG_OF_WAR_TIME_UPDATE', handleTimeUpdate);
    multiplayerManager.onEvent('TUG_OF_WAR_COUNTDOWN_UPDATE', handleCountdownUpdate);

    // Initialize self as host if no other players
    const currentPlayers = multiplayerManager.getPlayers();
    if (currentPlayers.length <= 1) {
      setIsHost(true);
    }

    return () => {
      multiplayerManager.offEvent('PLAYERS_UPDATED', handlePlayersUpdate);
      multiplayerManager.offEvent('GAME_STATE_CHANGED', handleGameStateChange);
      multiplayerManager.offEvent('HOST_CHANGED', handleHostChange);
      multiplayerManager.offEvent('TUG_OF_WAR_TIME_UPDATE', handleTimeUpdate);
      multiplayerManager.offEvent('TUG_OF_WAR_COUNTDOWN_UPDATE', handleCountdownUpdate);
    };
  }, []);

  const checkWinCondition = useCallback(() => {
    // Only check win condition when game is actually playing
    if (gameState === 'playing') {
      // Check if any team has been pulled into the center pit (position close to 0)
      const CENTER_PIT_THRESHOLD = 1.0; // Distance from center to consider "in the pit"
      
      const redTeamPlayers = players.filter(player => !player.isEliminated && player.position < 0);
      const greenTeamPlayers = players.filter(player => !player.isEliminated && player.position >= 0);
      
      console.log('🎯 Checking win condition:', {
        gameState,
        redTeamCount: redTeamPlayers.length,
        greenTeamCount: greenTeamPlayers.length,
        redTeamPositions: redTeamPlayers.map(p => ({ id: p.id, position: p.position, absPos: Math.abs(p.position) })),
        greenTeamPositions: greenTeamPlayers.map(p => ({ id: p.id, position: p.position, absPos: Math.abs(p.position) })),
        centerPitThreshold: CENTER_PIT_THRESHOLD
      });
      
      let winningPlayers: string[] = [];
      
      // Check if red team has been pulled into the center pit
      if (redTeamPlayers.length > 0 && redTeamPlayers.every(player => Math.abs(player.position) <= CENTER_PIT_THRESHOLD)) {
        // Green team wins - they pulled red team into the pit
        winningPlayers = greenTeamPlayers.map(p => p.id);
        console.log('🎯 Green team wins - Red team pulled into center pit!', { 
          redTeamPositions: redTeamPlayers.map(p => p.position),
          greenTeamWinners: winningPlayers
        });
      }
      // Check if green team has been pulled into the center pit
      else if (greenTeamPlayers.length > 0 && greenTeamPlayers.every(player => Math.abs(player.position) <= CENTER_PIT_THRESHOLD)) {
        // Red team wins - they pulled green team into the pit
        winningPlayers = redTeamPlayers.map(p => p.id);
        console.log('🎯 Red team wins - Green team pulled into center pit!', { 
          greenTeamPositions: greenTeamPlayers.map(p => p.position),
          redTeamWinners: winningPlayers
        });
      }
      
      if (winningPlayers.length > 0) {
        console.log('🎯 WIN CONDITION MET! Setting winners:', winningPlayers);
        console.log('🎯 Setting local state - winners:', winningPlayers, 'ended: true, gameState: won');
        setWinners(winningPlayers);
        setEnded(true);
        setGameState('won');
        
        if (isHost) {
          console.log('🎯 Broadcasting game state change with winners:', winningPlayers);
          multiplayerManager.broadcast('game_state_changed', { 
            gameState: 'won',
            winners: winningPlayers,
            ended: true 
          });
        }
      }
    }
  }, [gameState, players, isHost]);

  const updateRopePosition = useCallback(() => {
    // Only update rope position when game is playing
    if (gameState !== 'playing') return;
    
    const now = Date.now();
    if (now - lastRopeUpdate.current < ROPE_UPDATE_INTERVAL) return;
    
    lastRopeUpdate.current = now;

    // Calculate rope position based on actual player positions
    const leftPlayers = players.filter(p => !p.isEliminated && p.position < 0);
    const rightPlayers = players.filter(p => !p.isEliminated && p.position >= 0);
    
    if (leftPlayers.length > 0 && rightPlayers.length > 0) {
      // Calculate average positions of each team
      const leftAvgPos = leftPlayers.reduce((sum, p) => sum + p.position, 0) / leftPlayers.length;
      const rightAvgPos = rightPlayers.reduce((sum, p) => sum + p.position, 0) / rightPlayers.length;
      
      // Calculate the center point between the two teams
      const centerPoint = (leftAvgPos + rightAvgPos) / 2;
      
      // Determine rope position based on center point
      let newPosition: RopePosition = 'center';
      
      if (centerPoint > ROPE_MOVEMENT_THRESHOLD) {
        newPosition = 'right';
      } else if (centerPoint < -ROPE_MOVEMENT_THRESHOLD) {
        newPosition = 'left';
      } else {
        newPosition = 'center';
      }

      setRopePosition(prev => {
        // Broadcast rope position change
        if (isHost && newPosition !== prev) {
          multiplayerManager.broadcast('rope_position_changed', { ropePosition: newPosition });
        }

        return newPosition;
      });

      // Check for win condition (based on players being pulled into center pit)
      checkWinCondition();
    }
  }, [gameState, players, isHost, checkWinCondition]);

  const updateGameTime = useCallback(() => {
    if (timeLeftRef.current > 0 && isHost && gameState === 'playing') {
      const newTimeLeft = Math.max(0, timeLeftRef.current - 1);
      timeLeftRef.current = newTimeLeft;
      setTimeLeft(newTimeLeft);
      
      console.log('Host updating timer:', newTimeLeft);
      
      // Broadcast time update to all clients
      multiplayerManager.broadcast('tug_of_war_time_update', { 
        timeLeft: newTimeLeft,
        gameState: 'playing'
      });

      if (newTimeLeft <= 0) {
        console.log('Timer reached 0, ending game');
        endGame();
      }
    }
  }, [isHost, gameState]);

  const startGame = useCallback(() => {
    if (!isHost) return;
    
    console.log('🎮 Starting Tug of War game - setting timer to exactly 30');
    console.log('🎮 Current state before start:', { gameState, ropePosition, timeLeft, ended });
    
    setGameState('countdown');
    setCountdown(3);
    setTimeLeft(GAME_DURATION);
    timeLeftRef.current = GAME_DURATION;
    setRopePosition('center');
    setWinners([]);
    setEnded(false);
    
    // Reset all players
    const resetPlayers = players.map(player => ({
      ...player,
      isPulling: false,
      pullStrength: 0,
      position: 0,
      isEliminated: false
    }));
    setPlayers(resetPlayers);
    
    console.log('🎮 State after reset:', { gameState: 'countdown', ropePosition: 'center', timeLeft: GAME_DURATION });
    
    // Broadcast initial state with exact timer
    multiplayerManager.broadcast('game_state_changed', {
      gameState: 'countdown',
      countdown: 3,
      timeLeft: GAME_DURATION,
      ropePosition: 'center',
      winners: [],
      ended: false
    });
  }, [isHost, players, gameState, ropePosition, timeLeft, ended]);

  const resetGame = useCallback(() => {
    if (!isHost) return;
    
    console.log('🔄 Resetting Tug of War game - clearing all state');
    console.log('🔄 Current state before reset:', { gameState, ropePosition, timeLeft, ended, isPulling, pullStrength });
    
    // Clear any running intervals first
    if (gameUpdateInterval.current) {
      clearInterval(gameUpdateInterval.current);
      gameUpdateInterval.current = null;
    }
    
    // Reset all game states in the correct order
    setEnded(false);
    setWinners([]);
    setRopePosition('center');
    setTimeLeft(GAME_DURATION);
    timeLeftRef.current = GAME_DURATION;
    setCountdown(3);
    setIsPulling(false);
    setPullStrength(0);
    setGameState('waiting');
    
    // Reset all players
    const resetPlayers = players.map(player => ({
      ...player,
      isPulling: false,
      pullStrength: 0,
      position: 0,
      isEliminated: false
    }));
    setPlayers(resetPlayers);
    
    console.log('🔄 State after reset:', { 
      gameState: 'waiting', 
      ropePosition: 'center', 
      timeLeft: GAME_DURATION,
      ended: false,
      isPulling: false,
      pullStrength: 0
    });
    
    // Small delay to ensure state is set before broadcasting
    setTimeout(() => {
      multiplayerManager.broadcast('game_state_changed', {
        gameState: 'waiting',
        timeLeft: GAME_DURATION,
        ropePosition: 'center',
        countdown: 3,
        winners: [],
        ended: false
      });
      console.log('🔄 Reset complete - game should be in waiting state');
    }, 100);
  }, [isHost, players, gameState, ropePosition, timeLeft, ended, isPulling, pullStrength]);

  const pullRope = useCallback(() => {
    if (gameState === 'playing') {
      setIsPulling(true);
      setPullStrength(prev => Math.min(1, prev + PULL_STRENGTH_INCREASE));
      
      // Broadcast pulling state
      multiplayerManager.broadcast('player_pulling', {
        playerId: selfId.current,
        isPulling: true,
        pullStrength: Math.min(1, pullStrength + PULL_STRENGTH_INCREASE)
      });
    }
  }, [gameState, pullStrength]);

  const releaseRope = useCallback(() => {
    setIsPulling(false);
    setPullStrength(0);
    
    // Broadcast release state
    multiplayerManager.broadcast('player_released', {
      playerId: selfId.current,
      isPulling: false,
      pullStrength: 0
    });
  }, []);

  const endGame = useCallback(() => {
    if (!isHost) return;
    
    console.log('🏁 ENDING GAME - Current state:', { gameState, ropePosition, timeLeft, ended });
    console.trace('🏁 End game called from:');
    
    // Determine winners based on rope position when time runs out
    let winningPlayers: string[] = [];
    
    const redTeamPlayers = players.filter(player => !player.isEliminated && player.position < 0);
    const greenTeamPlayers = players.filter(player => !player.isEliminated && player.position >= 0);
    
    console.log('🏁 Team analysis:', {
      ropePosition,
      redTeamCount: redTeamPlayers.length,
      greenTeamCount: greenTeamPlayers.length,
      redTeamPositions: redTeamPlayers.map(p => p.position),
      greenTeamPositions: greenTeamPlayers.map(p => p.position)
    });
    
    if (redTeamPlayers.length > 0 && greenTeamPlayers.length > 0) {
      // Determine winner based on rope position
      if (ropePosition === 'left') {
        // Red team has pulled the rope to their side - they win
        winningPlayers = redTeamPlayers.map(p => p.id);
        console.log('🏁 Red team wins - rope pulled to left side');
      } else if (ropePosition === 'right') {
        // Green team has pulled the rope to their side - they win
        winningPlayers = greenTeamPlayers.map(p => p.id);
        console.log('🏁 Green team wins - rope pulled to right side');
      } else {
        // Rope is in center - determine winner by which team is further from center
        const redTeamAvgDistance = redTeamPlayers.reduce((sum, p) => sum + Math.abs(p.position), 0) / redTeamPlayers.length;
        const greenTeamAvgDistance = greenTeamPlayers.reduce((sum, p) => sum + Math.abs(p.position), 0) / greenTeamPlayers.length;
        
        if (redTeamAvgDistance > greenTeamAvgDistance) {
          // Red team is further from center - they win
          winningPlayers = redTeamPlayers.map(p => p.id);
          console.log('🏁 Red team wins - further from center (tie-breaker)');
        } else if (greenTeamAvgDistance > redTeamAvgDistance) {
          // Green team is further from center - they win
          winningPlayers = greenTeamPlayers.map(p => p.id);
          console.log('🏁 Green team wins - further from center (tie-breaker)');
        } else {
          // True tie - no winners
          winningPlayers = [];
          console.log('🏁 Tie game - no winners');
        }
      }
    } else if (redTeamPlayers.length > 0) {
      // Only red team has players - they win by default
      winningPlayers = redTeamPlayers.map(p => p.id);
      console.log('🏁 Red team wins - only team with players');
    } else if (greenTeamPlayers.length > 0) {
      // Only green team has players - they win by default
      winningPlayers = greenTeamPlayers.map(p => p.id);
      console.log('🏁 Green team wins - only team with players');
    } else {
      // No players - no winners
      winningPlayers = [];
      console.log('🏁 No players - no winners');
    }
    
    console.log('🏁 Game ended - Winners determined:', { 
      ropePosition, 
      winningPlayers,
      players: players.map(p => ({ id: p.id, position: p.position, isEliminated: p.isEliminated }))
    });
    
    console.log('🏁 Setting local state - winners:', winningPlayers, 'ended: true, gameState: won');
    setWinners(winningPlayers);
    setEnded(true);
    setGameState('won');
    
    console.log('🏁 Broadcasting game state change with winners:', winningPlayers);
    multiplayerManager.broadcast('game_state_changed', {
      gameState: 'won',
      ended: true,
      winners: winningPlayers
    });
  }, [isHost, ropePosition, players, gameState, timeLeft, ended]);

  // Game update loop
  useEffect(() => {
    if (gameState === 'playing') {
      console.log('Starting game update loop, timeLeft:', timeLeft);
      
      gameUpdateInterval.current = setInterval(() => {
        updateRopePosition();
        updateGameTime();
      }, ROPE_UPDATE_INTERVAL);
    } else {
      if (gameUpdateInterval.current) {
        clearInterval(gameUpdateInterval.current);
        gameUpdateInterval.current = null;
      }
    }

    return () => {
      if (gameUpdateInterval.current) {
        clearInterval(gameUpdateInterval.current);
      }
    };
  }, [gameState, updateRopePosition, updateGameTime]);

  // Countdown logic
  useEffect(() => {
    if (gameState === 'countdown' && countdown > 0 && isHost) {
      const timer = setTimeout(() => {
        const newCountdown = countdown - 1;
        setCountdown(newCountdown);
        
        // Broadcast countdown update to all clients
        multiplayerManager.broadcast('tug_of_war_countdown_update', { countdown: newCountdown });
      }, 1000);

      return () => clearTimeout(timer);
    } else if (gameState === 'countdown' && countdown === 0 && isHost) {
      console.log('Countdown finished - starting game with timer at exactly 30');
      
      // Ensure timer is properly reset before starting
      timeLeftRef.current = GAME_DURATION;
      setTimeLeft(GAME_DURATION);
      
      setGameState('playing');
      
      // Broadcast game state change to all clients with exact timer
      multiplayerManager.broadcast('game_state_changed', { 
        gameState: 'playing',
        timeLeft: GAME_DURATION,
        ropePosition: 'center'
      });
      
      console.log('Game started with timer at:', timeLeftRef.current);
    }
  }, [gameState, countdown, isHost]);

  // Sync timeLeft ref with state
  useEffect(() => {
    timeLeftRef.current = timeLeft;
  }, [timeLeft]);

  // Debug winners state changes
  useEffect(() => {
    console.log('🏆 Winners state changed:', {
      winners,
      winnersLength: winners.length,
      gameState,
      ended,
      isHost
    });
  }, [winners, gameState, ended, isHost]);

  // Update self player data
  useEffect(() => {
    const selfPlayer = {
      id: selfId.current,
      isPulling,
      pullStrength,
      position: Math.random() > 0.5 ? 1 : -1, // Randomly assign left or right team
      isEliminated: false,
      ts: Date.now()
    };

    multiplayerManager.updatePresence(selfPlayer);
  }, [isPulling, pullStrength]);

  return {
    gameState,
    ropePosition,
    timeLeft,
    countdown,
    isPulling,
    pullStrength,
    players,
    setPlayers,
    isHost,
    winners,
    ended,
    startGame,
    resetGame,
    pullRope,
    releaseRope
  };
};