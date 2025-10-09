import { useCallback, useEffect, useRef, useState } from 'react';
import { multiplayerManager } from '@/lib/multiplayer';

export type V2Phase = 'lobby' | 'floating' | 'positioning' | 'pulling' | 'falling' | 'results';

export type V2Player = {
  id: string;
  name?: string;
  team: 'red' | 'blue';
  position: number; // index along rope (-8..8 world units semantics)
  pullPower: number; // 0..1
  isPulling: boolean;
};

export function useTowV2() {
  const [phase, setPhase] = useState<V2Phase>('lobby');
  const [players, setPlayers] = useState<V2Player[]>([]);
  const [rope, setRope] = useState(0); // -1..1
  const [countdown, setCountdown] = useState(3);
  const [host, setHost] = useState(false);
  const [winner, setWinner] = useState<null | 'red' | 'blue'>(null);

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
      // Derive team by sign of initial position; fallback alternate assignment
      const mapped: V2Player[] = raw.map((p, idx) => ({
        id: p.id,
        name: p.name,
        team: (p.position ?? (idx % 2 === 0 ? -1 : 1)) < 0 ? 'red' : 'blue',
        position: typeof p.position === 'number' ? p.position : (idx % 2 === 0 ? -6 : 6),
        pullPower: typeof p.pullStrength === 'number' ? p.pullStrength : 0,
        isPulling: !!p.isPulling,
      }));
      setPlayers(mapped);
      
      // Auto-transition to floating phase when players join
      if (mapped.length > 0 && phaseRef.current === 'lobby') {
        setPhase('floating');
        if (hostRef.current) {
          broadcastState({ v2: true, phase: 'floating' });
        }
      }
    };
    const onRope = (payload: any) => {
      if (typeof payload?.rope === 'number') setRope(Math.max(-1, Math.min(1, payload.rope)));
    };
    const onState = (payload: any) => {
      if (payload?.v2 !== true) return;
      if (payload.phase) setPhase(payload.phase);
      if (typeof payload.countdown === 'number') setCountdown(payload.countdown);
      if (typeof payload.rope === 'number') setRope(payload.rope);
      if (payload.winner) setWinner(payload.winner);
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
  }, []);

  // compute rope from players while pulling (host only)
  useEffect(() => {
    if (!host || phase !== 'pulling') return;
    const id = setInterval(() => {
      const now = Date.now();
      if (now - lastUpdateRef.current < 100) return;
      lastUpdateRef.current = now;

      const red = players.filter(p => p.team === 'red');
      const blue = players.filter(p => p.team === 'blue');
      const redPower = red.reduce((s, p) => s + (p.isPulling ? p.pullPower : 0), 0);
      const bluePower = blue.reduce((s, p) => s + (p.isPulling ? p.pullPower : 0), 0);
      const delta = (bluePower - redPower) * 0.15; // increased bias factor for faster movement
      let next = Math.max(-1, Math.min(1, rope + delta));
      // victory detection
      if (next >= 0.95) {
        next = 1;
        setRope(next);
        setPhase('falling'); // new phase for falling animation
        setWinner('blue');
        broadcastState({ v2: true, phase: 'falling', rope: next, winner: 'blue' });
        // Delay before showing results to allow falling animation
        setTimeout(() => {
          setPhase('results');
          broadcastState({ v2: true, phase: 'results', rope: next, winner: 'blue' });
        }, 3000); // 3 seconds for falling animation
        return;
      }
      if (next <= -0.95) {
        next = -1;
        setRope(next);
        setPhase('falling'); // new phase for falling animation
        setWinner('red');
        broadcastState({ v2: true, phase: 'falling', rope: next, winner: 'red' });
        // Delay before showing results to allow falling animation
        setTimeout(() => {
          setPhase('results');
          broadcastState({ v2: true, phase: 'results', rope: next, winner: 'red' });
        }, 3000); // 3 seconds for falling animation
        return;
      }
      setRope(next);
      broadcastState({ v2: true, phase: 'pulling', rope: next });
    }, 100);
    return () => clearInterval(id);
  }, [host, phase, players, rope, broadcastState]);

  const start = useCallback(() => {
    if (!host) return;
    if (phase === 'floating') {
      // Transition from floating to positioning (still floating)
      setPhase('positioning');
      setCountdown(0);
      setWinner(null);
      setRope(0);
      broadcastState({ v2: true, phase: 'positioning', countdown: 0, rope: 0, winner: null });
    }
  }, [host, phase, broadcastState]);

  const setSelfPulling = useCallback((isPulling: boolean, power: number) => {
    multiplayerManager.updatePresence({
      id: selfIdRef.current,
      isPulling,
      pullStrength: power,
    });
  }, []);

  const chooseTeam = useCallback((team: 'red' | 'blue') => {
    const position = team === 'red' ? -6 : 6;
    multiplayerManager.updatePresence({ position });
  }, []);

  const startGame = useCallback(() => {
    if (!host) return;
    if (phase === 'positioning') {
      setPhase('pulling');
      broadcastState({ v2: true, phase: 'pulling', rope: 0 });
    }
  }, [host, phase, broadcastState]);

  const reset = useCallback(() => {
    if (!host) return;
    setPhase('lobby');
    setWinner(null);
    setRope(0);
    broadcastState({ v2: true, phase: 'lobby', rope: 0, winner: null });
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
  };
}


