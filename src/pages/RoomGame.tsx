import { useRef, useEffect, useState, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Canvas, useFrame } from '@react-three/fiber';
import { multiplayerManager } from '@/lib/multiplayer';
import { useHostLoop } from '../game/host/useHostLoop';
import { Environment } from '../game/components/Environment';
import { Player } from '../game/components/Player';
import { Doll } from '../game/components/Doll';
import { Soldier } from '../game/components/Soldier';
import { MODEL_CONFIG } from '../game/config/models';

type PresencePlayer = { id: string; name?: string; isEliminated?: boolean; x?: number; z?: number; isMoving?: boolean };

function PositionReporter({ groupRef, light, onSelfEliminate }: { groupRef: React.RefObject<THREE.Group>, light: 'green'|'red', onSelfEliminate: () => void }) {
  const last = useRef({ x: 0, z: 0, t: 0 });
  const lastSent = useRef(0);
  const lastMoving = useRef(false);
  const eliminated = useRef(false);
  const redSince = useRef<number | null>(null);
  const movingDuringRedMs = useRef(0);

  useEffect(() => {
    if (light === 'red' && redSince.current == null) redSince.current = performance.now();
    if (light === 'green') { redSince.current = null; movingDuringRedMs.current = 0; }
  }, [light]);

  useFrame(() => {
    const g = groupRef.current;
    if (!g || eliminated.current) return;

    const now = performance.now();
    const dt = Math.max(1, now - last.current.t);
    const x = g.position.x, z = g.position.z;
    const dx = x - last.current.x, dz = z - last.current.z;

    const distSq = dx * dx + dz * dz;
    const MIN_DIST_PER_FRAME = 0.0004;
    const isMoving = distSq > MIN_DIST_PER_FRAME;

    const movementChanged = isMoving !== lastMoving.current;
    if (movementChanged) {
      multiplayerManager.updatePlayerPosition({ x, z }, isMoving, true);
      lastSent.current = now;
      lastMoving.current = isMoving;
    } else if (now - lastSent.current > 100) {
      multiplayerManager.updatePlayerPosition({ x, z }, isMoving);
      lastSent.current = now;
    }

    if (light === 'red' && redSince.current != null) {
      const GRACE_MS = 200;
      const SUSTAIN_MS = 150;
      if (now - redSince.current > GRACE_MS) {
        if (isMoving) movingDuringRedMs.current += dt;
        else movingDuringRedMs.current = 0;
        if (movingDuringRedMs.current > SUSTAIN_MS) {
          eliminated.current = true;
          onSelfEliminate();
          multiplayerManager.setSelfPresence({ isEliminated: true, isMoving: false, x, z });
        }
      }
    }

    last.current = { x, z, t: now };
  });
  return null;
}

function RemotePlayers({ players, selfId }: { players: PresencePlayer[]; selfId: string }) {
  console.log('RemotePlayers rendering:', players.length, 'players');
  console.log('Players data:', players.map(p => ({ 
    id: p.id, 
    name: p.name, 
    isEliminated: p.isEliminated, 
    x: p.x, 
    z: p.z 
  })));
  
  return (
    <>
      {players.filter(p => p.id !== selfId).map(p => (
        <group key={p.id} position={[p.x ?? 0, 0, p.z ?? 0]}>
          {/* Fall animation group - same logic as Player component */}
          <group 
            rotation={p.isEliminated ? [Math.PI / 2, 0, 0] : [0, 0, 0]} 
            position={p.isEliminated ? [0, -0.5, 0] : [0, 0, 0]}
          >
            <mesh>
              <boxGeometry args={[0.6, 1.2, 0.6]} />
              <meshStandardMaterial 
                color={p.isEliminated ? 'red' : (p.isMoving ? 'orange' : 'deepskyblue')} 
              />
            </mesh>
          </group>
        </group>
      ))}
    </>
  );
}

function WinChecker({ playerRef, onWin }: { playerRef: React.RefObject<THREE.Group>, onWin: () => void }) {
  useFrame(() => {
    const g = playerRef.current;
    if (!g) return;

    if (g.position.z >= 25) onWin();
  });
  return null;
}

const RoomGame = () => {
  const { code } = useParams();
  const [sp] = useSearchParams();
  const navigate = useNavigate();

  const [players, setPlayers] = useState<PresencePlayer[]>([]);
  const [status, setStatus] = useState('Connecting…');

  const self = useMemo(() => ({
    id: sp.get('id') || crypto.randomUUID(),
    name: sp.get('name') || 'Player'
  }), [sp]);

  const isCreator = sp.get('creator') === 'true';
  const hasJoined = useRef(false);
  const joinPromise = useRef<Promise<void> | null>(null);

  const playerRef = useRef<THREE.Group>(null);

  const [gameState, setGameState] = useState<'waiting'|'countdown'|'playing'>('waiting');
  const [lightState, setLightState] = useState<'green'|'red'>('green');
  const [timeLeft, setTimeLeft] = useState<number>(60);
  const [isHost, setIsHost] = useState(false);
  const [selfElim, setSelfElim] = useState(false);
  const [selfWon, setSelfWon] = useState(false);
  const [ended, setEnded] = useState(false);
  const [winners, setWinners] = useState<string[]>([]);

  // subscribe to game state changes
  useEffect(() => {
    const onGame = (payload: any) => {
      setGameState(payload.gameState);
      setLightState(payload.lightState);
      setTimeLeft(payload.timeLeft);
      if (payload.gameState === 'ended') {
        setEnded(true);
        setWinners(Array.isArray(payload.winners) ? payload.winners : []);
      } else {
        setEnded(false);
        setWinners([]);
      }
    };
    multiplayerManager.onEvent('GAME_STATE_CHANGED', onGame);
    return () => { multiplayerManager.offEvent('GAME_STATE_CHANGED', onGame); };
  }, []);

  // subscribe to host changes
  useEffect(() => {
    const onHostChange = (payload: any) => {
      setIsHost(payload.hostId === self.id);
    };
    const onRoomUpdate = (metadata: any) => {
      setIsHost(metadata?.hostId === self.id);
    };
    
    multiplayerManager.onEvent('HOST_CHANGED', onHostChange);
    multiplayerManager.onEvent('ROOM_UPDATED', onRoomUpdate);
    
    return () => {
      multiplayerManager.offEvent('HOST_CHANGED', onHostChange);
      multiplayerManager.offEvent('ROOM_UPDATED', onRoomUpdate);
    };
  }, [self.id]);

  // run host loop if chosen - pass the current game state
  const { startGame } = useHostLoop(isHost, gameState);

  // Set up players event listener
  useEffect(() => {
    const onPlayers = (p: PresencePlayer[]) => {
      console.log('Players updated:', p.length, 'players');
      setPlayers(p);
    };
    
    multiplayerManager.onEvent('PLAYERS_UPDATED', onPlayers);
    
    return () => {
      multiplayerManager.offEvent('PLAYERS_UPDATED', onPlayers);
    };
  }, []);

  // Join room and set up polling
  useEffect(() => {
    if (!code || hasJoined.current || joinPromise.current) return;
    
    console.log('Joining room with code:', code, 'self:', self.id, 'isCreator:', isCreator);
    hasJoined.current = true;
    
    const joinRoom = async () => {
      try {
        await multiplayerManager.joinRoom(code, { id: self.id!, name: self.name! }, isCreator);
        setStatus(`In room ${code}`);
        
        // Check host status immediately after joining
        const roomMetadata = multiplayerManager.getRoomMetadata();
        if (roomMetadata?.hostId === self.id) {
          setIsHost(true);
        }
        
      } catch (error) {
        console.error('Failed to join room:', error);
        setStatus('Failed to join room');
      } finally {
        joinPromise.current = null;
      }
    };
    
    joinPromise.current = joinRoom();
    
    return () => {
      console.log('Cleaning up room connection');
      hasJoined.current = false;
      joinPromise.current = null;
      multiplayerManager.leaveRoom();
    };
  }, [code, self.id, self.name, isCreator]);

  useEffect(() => {
    const onElim = (playerId: string) => {
      if (playerId === self.id) {
        setSelfElim(true);
        multiplayerManager.setSelfPresence({ isEliminated: true, isMoving: false });
      }
    };
    multiplayerManager.onEvent('PLAYER_ELIMINATED', onElim);
    return () => multiplayerManager.offEvent('PLAYER_ELIMINATED', onElim);
  }, [self.id]);

  useEffect(() => {
    if (timeLeft <= 0 && !selfElim && !selfWon) {
      setSelfElim(true);
      multiplayerManager.setSelfPresence({ isEliminated: true, isMoving: false });
    }
  }, [timeLeft, selfElim, selfWon]);

  const handleLeave = async () => {
    await multiplayerManager.leaveRoom();
    navigate('/lobby');
  };

  const handleStartGame = () => {
    console.log('Start game clicked!', { isHost, gameState, startGame });
    if (isHost) {
      console.log('Calling startGame function');
      startGame();
    } else {
      console.log('Not host, cannot start game');
    }
  };

  return (
    <div className="w-full h-screen relative">
      <div className="absolute top-3 left-3 z-10 flex gap-3">
        {isHost && (
          <button className="px-3 py-1 rounded bg-yellow-500 text-white" disabled>
            Host
          </button>
        )}
        {isHost && gameState === 'waiting' && (
          <button 
            className="px-3 py-1 rounded bg-green-600 text-white hover:bg-green-700" 
            onClick={handleStartGame}
          >
            Start Game
          </button>
        )}
        <button 
          className="px-3 py-1 rounded bg-red-500 text-white hover:bg-red-600" 
          onClick={handleLeave}
        >
          Leave Game
        </button>
        <Link to="/" className="px-3 py-1 rounded bg-white/80">Single Player</Link>
        <span className="px-3 py-1 rounded bg-white/60 text-sm">
          {gameState} • {lightState} • {Math.ceil(timeLeft)}s • Players: {players.length} • Host: {isHost ? 'Yes' : 'No'}
        </span>
      </div>

      {ended && (
        <div className="absolute inset-x-0 top-14 z-10 mx-auto max-w-md bg-white/90 rounded p-4 text-center">
          <div className="text-lg font-semibold mb-2">Game Over</div>
          {winners.length > 0 ? (
            <div>Winners: {winners.map(w => players.find(p => p.id === w)?.name || w).join(', ')}</div>
          ) : (
            <div>No winners this round.</div>
          )}
        </div>
      )}

      {gameState === 'waiting' && !isHost && (
        <div className="absolute inset-x-0 top-14 z-10 mx-auto max-w-md bg-white/90 rounded p-4 text-center">
          <div className="text-lg font-semibold mb-2">Waiting for Host</div>
          <div className="text-sm text-gray-600">The host will start the game when ready.</div>
        </div>
      )}

      {gameState === 'countdown' && (
        <div className="absolute inset-x-0 top-14 z-10 mx-auto max-w-md bg-white/90 rounded p-4 text-center">
          <div className="text-lg font-semibold mb-2">Game Starting Soon!</div>
          <div className="text-sm text-gray-600">Get ready...</div>
        </div>
      )}

      {gameState === 'playing' && (
        <div className="absolute inset-x-0 top-14 z-10 mx-auto max-w-md bg-white/90 rounded p-4 text-center">
          <div className="text-lg font-semibold mb-2">Game in Progress!</div>
          <div className="text-sm text-gray-600">Light: {lightState}</div>
        </div>
      )}

      <Canvas shadows camera={{ position: [0, 5, -10], fov: 50 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 10, -5]} intensity={0.8} castShadow />
        <Environment />

        <Player
          lightState={lightState}
          gameState={ended ? (winners.includes(self.id!) ? 'won' : 'eliminated') : (selfElim ? 'eliminated' : (selfWon ? 'won' : 'playing'))}
          onElimination={() => {
            setSelfElim(true);
            multiplayerManager.setSelfPresence({ isEliminated: true, isMoving: false });
          }}
          onPositionUpdate={() => {}}
          modelPath={MODEL_CONFIG.player.path}
          onRefReady={(ref) => { (playerRef as any).current = ref.current; }}
        />

        <PositionReporter groupRef={playerRef} light={lightState} onSelfEliminate={() => setSelfElim(true)} />
        <Doll lightState={lightState} gameState={gameState} modelPath={MODEL_CONFIG.doll.path} />
        <Soldier position={[-5, 0, 25]} rotation={[0, Math.PI, 0]} />
        <Soldier position={[5, 0, 25]} rotation={[0, Math.PI, 0]} />

        <RemotePlayers players={players} selfId={self.id!} />
        <WinChecker playerRef={playerRef} onWin={() => setSelfWon(true)} />
      </Canvas>

      {ended && isHost && (
        <button
          className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded bg-white/80"
          onClick={() => {
            // host resets game
            multiplayerManager.broadcastReset(60);
            // local clear
            setSelfElim(false);
            setSelfWon(false);
            setEnded(false);
            setWinners([]);
            multiplayerManager.setSelfPresence({ isEliminated: false, isMoving: false });
          }}
        >
          Reset
        </button>
      )}
    </div>
  );
};

export default RoomGame;
