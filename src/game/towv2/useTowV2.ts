import { useCallback, useEffect, useRef, useState } from 'react';
import { multiplayerManager } from '@/lib/multiplayer';

export type V2Phase = 'lobby' | 'floating' | 'positioning' | 'pulling' | 'falling' | 'results' | 'tournament' | 'round-selection' | 'round-results' | 'tournament-winner';

export type V2Player = {
  id: string;
  name?: string;
  team: 'red' | 'blue';
  position: number; // index along rope (-8..8 world units semantics)
  pullPower: number; // 0..1
  isPulling: boolean;
  isEliminated?: boolean;
  playerNumber?: number; // 1-9 for tournament tracking
};

export type TournamentPlayer = {
  id: string;
  name: string;
  playerNumber: number;
  team: 'red' | 'blue';
  isEliminated: boolean;
};

export type RoundResult = {
  roundNumber: number;
  redPlayers: TournamentPlayer[];
  bluePlayers: TournamentPlayer[];
  winner: 'red' | 'blue';
  eliminatedPlayers: TournamentPlayer[];
};

export function useTowV2() {
  const [phase, setPhase] = useState<V2Phase>('lobby');
  const [players, setPlayers] = useState<V2Player[]>([]);
  const [rope, setRope] = useState(0); // -1..1
  const [countdown, setCountdown] = useState(3);
  const [host, setHost] = useState(false);
  const [winner, setWinner] = useState<null | 'red' | 'blue'>(null);
  const [selectedTeam, setSelectedTeam] = useState<null | 'red' | 'blue'>(null);
  
  // Tournament state - start in tournament mode by default
  const [tournamentMode, setTournamentMode] = useState(true);
  const [redTeamPlayers, setRedTeamPlayers] = useState<TournamentPlayer[]>([]);
  const [blueTeamPlayers, setBlueTeamPlayers] = useState<TournamentPlayer[]>([]);
  const [currentRound, setCurrentRound] = useState(1);
  const [roundResults, setRoundResults] = useState<RoundResult[]>([]);
  const [selectedRedPlayers, setSelectedRedPlayers] = useState<TournamentPlayer[]>([]);
  const [selectedBluePlayers, setSelectedBluePlayers] = useState<TournamentPlayer[]>([]);
  const [tournamentWinner, setTournamentWinner] = useState<null | 'red' | 'blue'>(null);

  const selfIdRef = useRef<string>(multiplayerManager.getSelfId() || crypto.randomUUID());
  const lastUpdateRef = useRef<number>(0);
  const phaseRef = useRef<V2Phase>(phase);
  const hostRef = useRef<boolean>(host);
  const lastBroadcastRef = useRef<string>('');

  // Update refs when values change
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    hostRef.current = host;
  }, [host]);

  // Helper function to prevent duplicate broadcasts
  const broadcastState = useCallback((state: any) => {
    const stateKey = JSON.stringify(state);
    if (stateKey !== lastBroadcastRef.current) {
      lastBroadcastRef.current = stateKey;
      multiplayerManager.broadcast('game_state_changed', state);
    }
  }, []);

  // subscribe to presence and events
  useEffect(() => {
    const onPlayers = (raw: any[]) => {
      // Derive team by presence team info, then by position, then fallback to alternate assignment
      const mapped: V2Player[] = raw.map((p, idx) => {
        let team: 'red' | 'blue';
        if (p.team === 'red' || p.team === 'blue') {
          // Use team from presence if available
          team = p.team;
        } else if (typeof p.position === 'number') {
          // Use position to determine team
          team = p.position < 0 ? 'red' : 'blue';
        } else {
          // Fallback to alternate assignment
          team = idx % 2 === 0 ? 'red' : 'blue';
        }
        
        return {
          id: p.id,
          name: p.name,
          team,
          position: typeof p.position === 'number' ? p.position : (team === 'red' ? -6 : 6),
          pullPower: typeof p.pullStrength === 'number' ? p.pullStrength : 0,
          isPulling: !!p.isPulling,
        };
      });
      setPlayers(mapped);
      
      // Auto-transition to floating phase when players join
      if (mapped.length > 0 && phaseRef.current === 'lobby') {
        setPhase('floating');
        setSelectedTeam(null); // Reset selected team when transitioning to floating
        
        // Auto-initialize tournament if in tournament mode
        if (tournamentMode && redTeamPlayers.length === 0) {
          // Create 9 players for each team
          const redPlayers: TournamentPlayer[] = Array.from({ length: 9 }, (_, i) => ({
            id: `red-${i + 1}`,
            name: `Red Player ${i + 1}`,
            playerNumber: i + 1,
            team: 'red',
            isEliminated: false,
          }));
          
          const bluePlayers: TournamentPlayer[] = Array.from({ length: 9 }, (_, i) => ({
            id: `blue-${i + 1}`,
            name: `Blue Player ${i + 1}`,
            playerNumber: i + 1,
            team: 'blue',
            isEliminated: false,
          }));
          
          setRedTeamPlayers(redPlayers);
          setBlueTeamPlayers(bluePlayers);
          setCurrentRound(1);
          setRoundResults([]);
          setSelectedRedPlayers([]);
          setSelectedBluePlayers([]);
          setTournamentWinner(null);
          
          // Broadcast tournament initialization
          if (hostRef.current) {
            broadcastState({ 
              v2: true, 
              phase: 'floating',
              tournamentMode: true,
              redTeamPlayers: redPlayers,
              blueTeamPlayers: bluePlayers,
              currentRound: 1
            });
          }
        }
        
        if (hostRef.current) {
          broadcastState({ v2: true, phase: 'floating' });
        }
      }
    };
    const onRope = (payload: any) => {
      if (typeof payload?.rope === 'number') {
        console.log('Rope position received from external source:', payload.rope);
        setRope(Math.max(-1, Math.min(1, payload.rope)));
      }
    };
    const onState = (payload: any) => {
      if (payload?.v2 !== true) return;
      if (payload.phase) {
        console.log('Phase changed via state:', payload.phase);
        setPhase(payload.phase);
      }
      if (typeof payload.countdown === 'number') setCountdown(payload.countdown);
      if (typeof payload.rope === 'number') {
        console.log('Rope position changed via state:', payload.rope);
        setRope(payload.rope);
      }
      if (payload.winner) setWinner(payload.winner);
      
      // Tournament state synchronization
      if (payload.tournamentMode !== undefined) setTournamentMode(payload.tournamentMode);
      if (payload.redTeamPlayers) setRedTeamPlayers(payload.redTeamPlayers);
      if (payload.blueTeamPlayers) setBlueTeamPlayers(payload.blueTeamPlayers);
      if (payload.currentRound) setCurrentRound(payload.currentRound);
      if (payload.roundResults) setRoundResults(payload.roundResults);
      if (payload.selectedRedPlayers) setSelectedRedPlayers(payload.selectedRedPlayers);
      if (payload.selectedBluePlayers) setSelectedBluePlayers(payload.selectedBluePlayers);
      if (payload.tournamentWinner) setTournamentWinner(payload.tournamentWinner);
    };

    multiplayerManager.onEvent('PLAYERS_UPDATED', onPlayers);
    multiplayerManager.onEvent('GAME_STATE_CHANGED', onState);
    multiplayerManager.onEvent('ROPE_POSITION_CHANGED', onRope as any);

    // initial host guess
    setHost(true);

    return () => {
      multiplayerManager.offEvent('PLAYERS_UPDATED', onPlayers);
      multiplayerManager.offEvent('GAME_STATE_CHANGED', onState);
      multiplayerManager.offEvent('ROPE_POSITION_CHANGED', onRope as any);
    };
  }, [tournamentMode, redTeamPlayers.length]);

  // Tournament functions - defined early to avoid circular dependency
  const selectRoundPlayers = useCallback((customRedPlayers?: TournamentPlayer[], customBluePlayers?: TournamentPlayer[], customRound?: number) => {
    if (!host) return;
    
    // Use custom players if provided, otherwise use current state
    const currentRedPlayers = customRedPlayers || redTeamPlayers;
    const currentBluePlayers = customBluePlayers || blueTeamPlayers;
    const currentRoundNumber = customRound || currentRound;
    
    // Get available (non-eliminated) players
    const availableRed = currentRedPlayers.filter(p => !p.isEliminated);
    const availableBlue = currentBluePlayers.filter(p => !p.isEliminated);
    
    console.log('Selecting round players:', { 
      totalRed: currentRedPlayers.length, 
      availableRed: availableRed.length,
      totalBlue: currentBluePlayers.length, 
      availableBlue: availableBlue.length,
      redEliminated: currentRedPlayers.filter(p => p.isEliminated).length,
      blueEliminated: currentBluePlayers.filter(p => p.isEliminated).length,
      round: currentRoundNumber
    });
    
    // Check if tournament is over - either team has no players left
    if (availableRed.length === 0) {
      console.log('Red team eliminated - Blue team wins!');
      setTournamentWinner('blue');
      setPhase('tournament-winner');
      broadcastState({ v2: true, phase: 'tournament-winner', tournamentWinner: 'blue' });
      return;
    }
    if (availableBlue.length === 0) {
      console.log('Blue team eliminated - Red team wins!');
      setTournamentWinner('red');
      setPhase('tournament-winner');
      broadcastState({ v2: true, phase: 'tournament-winner', tournamentWinner: 'red' });
      return;
    }
    
    // Check if either team has less than 3 players - tournament cannot continue
    if (availableRed.length < 3) {
      console.log('Red team has insufficient players for next round:', availableRed.length);
      setTournamentWinner('blue');
      setPhase('tournament-winner');
      broadcastState({ v2: true, phase: 'tournament-winner', tournamentWinner: 'blue' });
      return;
    }
    if (availableBlue.length < 3) {
      console.log('Blue team has insufficient players for next round:', availableBlue.length);
      setTournamentWinner('red');
      setPhase('tournament-winner');
      broadcastState({ v2: true, phase: 'tournament-winner', tournamentWinner: 'red' });
      return;
    }
    
    // Select exactly 3 random players from each team (both teams guaranteed to have at least 3)
    const selectRandomPlayers = (players: TournamentPlayer[], count: number) => {
      const shuffled = [...players].sort(() => 0.5 - Math.random());
      return shuffled.slice(0, count);
    };
    
    const selectedRed = selectRandomPlayers(availableRed, 3);
    const selectedBlue = selectRandomPlayers(availableBlue, 3);
    
    console.log('Selected players for round:', {
      red: selectedRed.map(p => ({ id: p.id, playerNumber: p.playerNumber, isEliminated: p.isEliminated })),
      blue: selectedBlue.map(p => ({ id: p.id, playerNumber: p.playerNumber, isEliminated: p.isEliminated }))
    });
    
    setSelectedRedPlayers(selectedRed);
    setSelectedBluePlayers(selectedBlue);
    
    // Go directly to pulling phase for tournament rounds
    setPhase('pulling');
    setRope(0);
    
    broadcastState({ 
      v2: true, 
      phase: 'pulling',
      rope: 0,
      selectedRedPlayers: selectedRed,
      selectedBluePlayers: selectedBlue,
      currentRound: currentRoundNumber
    });
  }, [host, redTeamPlayers, blueTeamPlayers, currentRound, broadcastState]);

  const endRound = useCallback((roundWinner: 'red' | 'blue') => {
    if (!host) return;
    
    const eliminatedPlayers = roundWinner === 'red' ? selectedBluePlayers : selectedRedPlayers;
    console.log('Ending round:', { roundWinner, eliminatedPlayers });
    
    // Mark players as eliminated
    const updatedRedPlayers = redTeamPlayers.map(p => 
      eliminatedPlayers.some(ep => ep.id === p.id) ? { ...p, isEliminated: true } : p
    );
    const updatedBluePlayers = blueTeamPlayers.map(p => 
      eliminatedPlayers.some(ep => ep.id === p.id) ? { ...p, isEliminated: true } : p
    );
    
    console.log('Updated players:', { 
      updatedRedPlayers: updatedRedPlayers.map(p => ({ id: p.id, isEliminated: p.isEliminated })),
      updatedBluePlayers: updatedBluePlayers.map(p => ({ id: p.id, isEliminated: p.isEliminated })),
      remainingRed: updatedRedPlayers.filter(p => !p.isEliminated).length,
      remainingBlue: updatedBluePlayers.filter(p => !p.isEliminated).length
    });
    
    // Batch all state updates together to ensure UI updates immediately
    setRedTeamPlayers(updatedRedPlayers);
    setBlueTeamPlayers(updatedBluePlayers);
    
    // Create round result
    const roundResult: RoundResult = {
      roundNumber: currentRound,
      redPlayers: selectedRedPlayers,
      bluePlayers: selectedBluePlayers,
      winner: roundWinner,
      eliminatedPlayers: eliminatedPlayers,
    };
    
    setRoundResults(prev => [...prev, roundResult]);
    setPhase('round-results');
    
    // Broadcast the updated state immediately
    broadcastState({ 
      v2: true, 
      phase: 'round-results',
      roundResult,
      redTeamPlayers: updatedRedPlayers,
      blueTeamPlayers: updatedBluePlayers
    });
    
    // Check if tournament can continue after this round
    const remainingRed = updatedRedPlayers.filter(p => !p.isEliminated);
    const remainingBlue = updatedBluePlayers.filter(p => !p.isEliminated);
    
    // Auto-advance to next round after 3 seconds with countdown
    setTimeout(() => {
      // Check if tournament should end due to insufficient players
      if (remainingRed.length < 3 || remainingBlue.length < 3) {
        console.log('Tournament ending due to insufficient players:', { 
          remainingRed: remainingRed.length, 
          remainingBlue: remainingBlue.length 
        });
        
        // Determine winner based on remaining players
        const tournamentWinner = remainingRed.length >= remainingBlue.length ? 'red' : 'blue';
        setTournamentWinner(tournamentWinner);
        setPhase('tournament-winner');
        broadcastState({ v2: true, phase: 'tournament-winner', tournamentWinner });
        return;
      }
      
      const nextRound = currentRound + 1;
      setCurrentRound(nextRound);
      // Start countdown phase for next round
      setPhase('floating');
      broadcastState({ v2: true, phase: 'floating', currentRound: nextRound });
      
      // After 3 seconds, select next round players and start
      // Pass the updated player state directly to avoid closure issues
      setTimeout(() => {
        console.log('About to select round players for round:', nextRound);
        console.log('Using updated state for selection:', {
          redTeamPlayers: updatedRedPlayers.map(p => ({ id: p.id, isEliminated: p.isEliminated })),
          blueTeamPlayers: updatedBluePlayers.map(p => ({ id: p.id, isEliminated: p.isEliminated }))
        });
        selectRoundPlayers(updatedRedPlayers, updatedBluePlayers, nextRound);
      }, 1000); // Reduced delay to 1 second for faster testing
    }, 3000);
  }, [host, selectedRedPlayers, selectedBluePlayers, redTeamPlayers, blueTeamPlayers, currentRound, selectRoundPlayers, broadcastState]);

  // Reset rope to center when game resets
  useEffect(() => {
    if (phase === 'lobby' || phase === 'floating') {
      console.log('Phase changed to', phase, '- resetting rope to 0');
      setRope(0);
    }
  }, [phase]);

  // compute rope from players while pulling (host only)
  useEffect(() => {
    if (!host || phase !== 'pulling') return;
    const id = setInterval(() => {
      const now = Date.now();
      if (now - lastUpdateRef.current < 150) return; // Reduced frequency for better performance
      lastUpdateRef.current = now;

      const red = players.filter(p => p.team === 'red');
      const blue = players.filter(p => p.team === 'blue');
      const redPower = red.reduce((s, p) => s + (p.isPulling ? p.pullPower : 0), 0);
      const bluePower = blue.reduce((s, p) => s + (p.isPulling ? p.pullPower : 0), 0);
      
      // Check if any team is pulling
      const isAnyTeamPulling = redPower > 0 || bluePower > 0;
      
      let delta;
      if (isAnyTeamPulling) {
        // Normal pulling physics when teams are active
        delta = (bluePower - redPower) * 0.15;
      } else {
        // Loose rope physics when no team is pulling - rope slowly returns to center
        const centerForce = -rope * 0.05; // Gentle pull toward center
        const looseness = 0.02; // Add some random looseness
        const randomFactor = (Math.random() - 0.5) * looseness;
        delta = centerForce + randomFactor;
      }
      
      let next = Math.max(-1, Math.min(1, rope + delta));
      // victory detection
      if (next >= 0.95) {
        next = 1;
        setRope(next);
        setPhase('falling'); // new phase for falling animation
        setWinner('blue');
        broadcastState({ v2: true, phase: 'falling', rope: next, winner: 'blue' });
        
        // Handle tournament vs single game
        if (tournamentMode) {
          // In tournament mode, end the round after falling animation
          setTimeout(() => {
            endRound('blue');
          }, 3000);
        } else {
          // In single game mode, show results
          setTimeout(() => {
            setPhase('results');
            broadcastState({ v2: true, phase: 'results', rope: next, winner: 'blue' });
          }, 3000);
        }
        return;
      }
      if (next <= -0.95) {
        next = -1;
        setRope(next);
        setPhase('falling'); // new phase for falling animation
        setWinner('red');
        broadcastState({ v2: true, phase: 'falling', rope: next, winner: 'red' });
        
        // Handle tournament vs single game
        if (tournamentMode) {
          // In tournament mode, end the round after falling animation
          setTimeout(() => {
            endRound('red');
          }, 3000);
        } else {
          // In single game mode, show results
          setTimeout(() => {
            setPhase('results');
            broadcastState({ v2: true, phase: 'results', rope: next, winner: 'red' });
          }, 3000);
        }
        return;
      }
      setRope(next);
      broadcastState({ v2: true, phase: 'pulling', rope: next });
    }, 100);
    return () => clearInterval(id);
  }, [host, phase, players, rope, broadcastState, tournamentMode, endRound]);

  const start = useCallback(() => {
    if (!host) return;
    if (phase === 'floating') {
      if (tournamentMode) {
        // In tournament mode, go to team selection first
        setPhase('positioning');
        setCountdown(0);
        setWinner(null);
        setRope(0);
        broadcastState({ v2: true, phase: 'positioning', countdown: 0, rope: 0, winner: null });
      } else {
        // In single game mode, go to positioning
        setPhase('positioning');
        setCountdown(0);
        setWinner(null);
        setRope(0);
        broadcastState({ v2: true, phase: 'positioning', countdown: 0, rope: 0, winner: null });
      }
    }
  }, [host, phase, broadcastState, tournamentMode]);

  const setSelfPulling = useCallback((isPulling: boolean, power: number) => {
    multiplayerManager.updatePresence({
      id: selfIdRef.current,
      isPulling,
      pullStrength: power,
    });
  }, []);

  const chooseTeam = useCallback((team: 'red' | 'blue') => {
    const position = team === 'red' ? -6 : 6;
    setSelectedTeam(team);
    // Update presence with team info to ensure consistent team assignment
    multiplayerManager.updatePresence({ 
      position
    });
  }, []);

  const startGame = useCallback(() => {
    if (!host) return;
    if (phase === 'positioning') {
      if (tournamentMode) {
        // In tournament mode, select round players and start the game immediately
        const availableRed = redTeamPlayers.filter(p => !p.isEliminated);
        const availableBlue = blueTeamPlayers.filter(p => !p.isEliminated);
        
        // Check if tournament is over - either team has no players left
        if (availableRed.length === 0) {
          console.log('Red team eliminated - Blue team wins!');
          setTournamentWinner('blue');
          setPhase('tournament-winner');
          broadcastState({ v2: true, phase: 'tournament-winner', tournamentWinner: 'blue' });
          return;
        }
        if (availableBlue.length === 0) {
          console.log('Blue team eliminated - Red team wins!');
          setTournamentWinner('red');
          setPhase('tournament-winner');
          broadcastState({ v2: true, phase: 'tournament-winner', tournamentWinner: 'red' });
          return;
        }
        
        // Check if either team has less than 3 players - tournament cannot continue
        if (availableRed.length < 3) {
          console.log('Red team has insufficient players for next round:', availableRed.length);
          setTournamentWinner('blue');
          setPhase('tournament-winner');
          broadcastState({ v2: true, phase: 'tournament-winner', tournamentWinner: 'blue' });
          return;
        }
        if (availableBlue.length < 3) {
          console.log('Blue team has insufficient players for next round:', availableBlue.length);
          setTournamentWinner('red');
          setPhase('tournament-winner');
          broadcastState({ v2: true, phase: 'tournament-winner', tournamentWinner: 'red' });
          return;
        }
        
        // Select exactly 3 players from each team (both teams guaranteed to have at least 3)
        const selectRandomPlayers = (players: TournamentPlayer[], count: number) => {
          const shuffled = [...players].sort(() => 0.5 - Math.random());
          return shuffled.slice(0, count);
        };
        
        const selectedRed = selectRandomPlayers(availableRed, 3);
        const selectedBlue = selectRandomPlayers(availableBlue, 3);
        
        setSelectedRedPlayers(selectedRed);
        setSelectedBluePlayers(selectedBlue);
        
        // Start the game immediately
        setPhase('pulling');
        setRope(0);
        broadcastState({ 
          v2: true, 
          phase: 'pulling', 
          rope: 0,
          selectedRedPlayers: selectedRed,
          selectedBluePlayers: selectedBlue,
          currentRound
        });
      } else {
        // In single game mode, go directly to pulling
        setPhase('pulling');
        broadcastState({ v2: true, phase: 'pulling', rope: 0 });
      }
    }
  }, [host, phase, broadcastState, tournamentMode, redTeamPlayers, blueTeamPlayers, currentRound]);

  const reset = useCallback(() => {
    if (!host) return;
    console.log('Reset called - rope before:', rope);
    setPhase('lobby');
    setWinner(null);
    setRope(0);
    setSelectedTeam(null);
    console.log('Reset called - rope after setRope(0):', 0);
    broadcastState({ v2: true, phase: 'lobby', rope: 0, winner: null });
  }, [host, broadcastState, rope]);

  // Tournament functions
  const initializeTournament = useCallback(() => {
    if (!host) return;
    
    // Create 9 players for each team
    const redPlayers: TournamentPlayer[] = Array.from({ length: 9 }, (_, i) => ({
      id: `red-${i + 1}`,
      name: `Red Player ${i + 1}`,
      playerNumber: i + 1,
      team: 'red',
      isEliminated: false,
    }));
    
    const bluePlayers: TournamentPlayer[] = Array.from({ length: 9 }, (_, i) => ({
      id: `blue-${i + 1}`,
      name: `Blue Player ${i + 1}`,
      playerNumber: i + 1,
      team: 'blue',
      isEliminated: false,
    }));
    
    setRedTeamPlayers(redPlayers);
    setBlueTeamPlayers(bluePlayers);
    setCurrentRound(1);
    setRoundResults([]);
    setSelectedRedPlayers([]);
    setSelectedBluePlayers([]);
    setTournamentWinner(null);
    setTournamentMode(true);
    setPhase('tournament');
    
    broadcastState({ 
      v2: true, 
      phase: 'tournament', 
      tournamentMode: true,
      redTeamPlayers: redPlayers,
      blueTeamPlayers: bluePlayers,
      currentRound: 1
    });
  }, [host, broadcastState]);

  const startRound = useCallback(() => {
    if (!host) return;
    setPhase('pulling');
    setRope(0);
    broadcastState({ v2: true, phase: 'pulling', rope: 0 });
  }, [host, broadcastState]);

  const resetTournament = useCallback(() => {
    if (!host) return;
    setTournamentMode(false);
    setRedTeamPlayers([]);
    setBlueTeamPlayers([]);
    setCurrentRound(1);
    setRoundResults([]);
    setSelectedRedPlayers([]);
    setSelectedBluePlayers([]);
    setTournamentWinner(null);
    setPhase('lobby');
    broadcastState({ v2: true, phase: 'lobby', tournamentMode: false });
  }, [host, broadcastState]);

  return {
    phase,
    players,
    rope,
    countdown,
    host,
    start,
    setSelfPulling,
    chooseTeam,
    startGame,
    reset,
    winner,
    selectedTeam,
    // Tournament exports
    tournamentMode,
    redTeamPlayers,
    blueTeamPlayers,
    currentRound,
    roundResults,
    selectedRedPlayers,
    selectedBluePlayers,
    tournamentWinner,
    initializeTournament,
    selectRoundPlayers,
    startRound,
    endRound,
    resetTournament,
  };
}


