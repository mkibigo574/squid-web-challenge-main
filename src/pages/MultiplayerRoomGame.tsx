import { useRef, useEffect, useState, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
// Removed OrbitControls for deterministic camera follow
import * as THREE from 'three';
import { multiplayerManager } from '@/lib/multiplayer';
import { useHostLoop } from '../game/host/useHostLoop';
import { Environment } from '../game/components/Environment';
import { Player } from '../game/components/Player';
import { Doll } from '../game/components/Doll';
import { Soldier } from '../game/components/Soldier';
import { Celebration } from '../game/components/Celebration';
import { MultiplayerTugOfWar } from '../game/MultiplayerTugOfWar';
import { MODEL_CONFIG } from '../game/config/models';
import { FIELD_CONFIG } from '../game/config/field';

type PresencePlayer = { id: string; name?: string; isEliminated?: boolean; x?: number; z?: number; isMoving?: boolean };
type GameType = 'red-light-green-light' | 'tug-of-war';

// Camera modes for multiplayer
type CameraMode = 'follow' | 'closeup' | 'drone' | 'firstPerson';

function PositionReporter({ groupRef, light, onSelfEliminate, onMovementChange }: { 
  groupRef: React.RefObject<THREE.Group>, 
  light: 'green'|'red', 
  onSelfEliminate: () => void,
  onMovementChange?: (isMoving: boolean) => void
}) {
  const last = useRef<{ x: number; z: number; t: number } | null>(null);
  const lastMoving = useRef<boolean>(false);
  const lastSent = useRef<number>(0);
  const eliminated = useRef(false);
  const redSince = useRef<number | null>(null);
  const movingDuringRedMs = useRef(0);

  useEffect(() => {
    if (light === 'red' && redSince.current == null) redSince.current = performance.now();
    if (light === 'green') { redSince.current = null; movingDuringRedMs.current = 0; }
  }, [light]);

  useFrame(() => {
    const g = groupRef.current;
    if (!g) return;

    const now = performance.now();
    const dt = (now - (last.current?.t || now)) / 1000;
    const x = g.position.x;
    const z = g.position.z;

    // Add null check for last.current before accessing its properties
    if (last.current === null) {
      last.current = { x, z, t: now };
      return;
    }

    const dx = x - last.current.x, dz = z - last.current.z;

    const distSq = dx * dx + dz * dz;
    const MIN_DIST_PER_FRAME = 0.0004;
    const isMoving = distSq > MIN_DIST_PER_FRAME;

    const movementChanged = isMoving !== lastMoving.current;
    if (movementChanged) {
      multiplayerManager.updatePresence({ x, z, isMoving });
      lastSent.current = now;
      lastMoving.current = isMoving;
      
      // Notify parent component about movement change
      onMovementChange?.(isMoving);
    } else if (now - lastSent.current > 100) {
      multiplayerManager.updatePresence({ x, z, isMoving });
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

    if (g.position.z >= FIELD_CONFIG.WIN_Z_THRESHOLD) onWin();
  });
  return null;
}

// Camera rig with multiple modes - same as single player
const FollowCamera = ({ targetRef, cameraMode }: { targetRef: React.RefObject<THREE.Group>; cameraMode: CameraMode }) => {
  const { camera } = useThree();
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    cam.near = 0.1;
    cam.far = 500;
    cam.up.set(0, 1, 0);
    cam.updateProjectionMatrix();
  }, [camera]);

  useFrame(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const target = targetRef.current;
    if (!target) return;

    target.updateWorldMatrix(true, false);
    const worldPos = new THREE.Vector3();
    target.getWorldPosition(worldPos);

    let desiredPos = cam.position.clone();
    let lookAt = new THREE.Vector3();
    let targetFov = cam.fov;

    if (cameraMode === 'follow') {
      desiredPos = worldPos.clone().add(new THREE.Vector3(2.5, 3.0, -6.0));
      lookAt = worldPos.clone().add(new THREE.Vector3(0, 1.0, 6));
      targetFov = 50;
    } else if (cameraMode === 'closeup') {
      desiredPos = worldPos.clone().add(new THREE.Vector3(1.2, 1.2, -2.2));
      lookAt = worldPos.clone().add(new THREE.Vector3(0, 1.4, 3));
      targetFov = 35;
    } else if (cameraMode === 'drone') {
      desiredPos = new THREE.Vector3(0, 50, 10);
      lookAt = new THREE.Vector3(0, 0, 10);
      targetFov = 60;
    } else {
      const time = performance.now() * 0.001;
      const shake = new THREE.Vector3(
        Math.sin(time * 12) * 0.03,
        Math.sin(time * 15 + 1) * 0.025,
        0
      );
      desiredPos = worldPos.clone().add(new THREE.Vector3(0.0, 1.6, 0.2)).add(shake);
      lookAt = worldPos.clone().add(new THREE.Vector3(0, 1.5, 6));
      targetFov = 55;
    }

    cam.position.lerp(desiredPos, 0.12);
    cam.lookAt(lookAt);
    cam.fov += (targetFov - cam.fov) * 0.1;
    cam.updateProjectionMatrix();
  });
  return null;
};

export default function MultiplayerRoomGame() {
  const { code } = useParams<{ code: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [players, setPlayers] = useState<PresencePlayer[]>([]);
  const [status, setStatus] = useState('Connecting…');
  const [gameType, setGameType] = useState<GameType>('red-light-green-light');

  const self = useMemo(() => ({
    id: searchParams.get('id') || crypto.randomUUID(),
    name: searchParams.get('name') || 'Player'
  }), [searchParams]);

  const isCreator = searchParams.get('creator') === 'true';
  const hasJoined = useRef(false);
  const joinPromise = useRef<Promise<void> | null>(null);

  const playerRef = useRef<THREE.Group>(null);

  // Camera mode state
  const [cameraMode, setCameraMode] = useState<CameraMode>('follow');

  // Red Light Green Light game state
  const [gameState, setGameState] = useState<'waiting'|'countdown'|'playing'>('waiting');
  const [lightState, setLightState] = useState<'green'|'red'>('green');
  const [timeLeft, setTimeLeft] = useState<number>(50);
  const [isHost, setIsHost] = useState(false);
  const [selfElim, setSelfElim] = useState(false);
  const [selfWon, setSelfWon] = useState(false);
  const [ended, setEnded] = useState(false);
  const [winners, setWinners] = useState<string[]>([]);

  // Progress tracking for multiplayer
  const [playerPosition, setPlayerPosition] = useState(0);
  const progress = playerPosition / FIELD_CONFIG.FIELD_LENGTH_UNITS;

  // Audio management
  const audioRef = useRef<{ [key: string]: HTMLAudioElement }>({});
  const [isPlayerMoving, setIsPlayerMoving] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Use host loop for Red Light Green Light
  const [hostLoopKey, setHostLoopKey] = useState(0);
  const { startGame: startHostLoop, reset: resetHostLoop } = useHostLoop(isHost, gameState, hostLoopKey);

  // Initialize audio
  useEffect(() => {
    audioRef.current = {
      greenLight: new Audio('/audio/green_light.wav'),
      redLight: new Audio('/audio/red_light.wav'),
      footsteps: new Audio('/audio/Running%20footsteps.wav'),
      buzzer: new Audio('/audio/Buzzer.wav'),
      youWin: new Audio('/audio/win_game.wav'),
    };

    // Configure audio
    Object.values(audioRef.current).forEach(audio => {
      audio.volume = 0.7;
      audio.muted = isMuted;
    });

    return () => {
      Object.values(audioRef.current).forEach(audio => {
        audio.pause();
        audio.currentTime = 0;
      });
    };
  }, [isMuted]);

  // Mute toggle function
  const toggleMute = () => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    
    Object.values(audioRef.current).forEach(audio => {
      audio.muted = newMutedState;
    });
    
    console.log(`Audio ${newMutedState ? 'muted' : 'unmuted'}`);
  };

  // Spacebar cycles camera modes - same as single player
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setCameraMode((mode) => {
          const nextMode = mode === 'follow' ? 'closeup' : mode === 'closeup' ? 'drone' : mode === 'drone' ? 'firstPerson' : 'follow';
          console.log('🎥 Camera mode changed from', mode, 'to', nextMode);
          return nextMode;
        });
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Join room logic
  useEffect(() => {
    if (!code || hasJoined.current) return;
    
    hasJoined.current = true;
    setStatus('Joining room...');
    
    const joinRoom = async () => {
      try {
        await multiplayerManager.joinRoom(code, self, isCreator);
        setStatus('Connected');
        
        // Set room metadata
        multiplayerManager.setRoomMetadata({
          hostId: isCreator ? self.id : undefined,
          createdAt: Date.now(),
          isCreator,
          gameType: 'red-light-green-light'
        });
        
        // Set host status immediately if creator
        if (isCreator) {
          setIsHost(true);
          console.log('Set as host (creator)');
        }
      } catch (error) {
        console.error('Failed to join room:', error);
        setStatus('Failed to connect');
      }
    };

    joinPromise.current = joinRoom();
  }, [code, self, isCreator]);

  // Set up multiplayer event listeners
  useEffect(() => {
    const handlePlayersUpdate = (updatedPlayers: any[]) => {
      setPlayers(updatedPlayers);
    };

    const handleGameStateChange = (newState: any) => {
      if (newState.gameState) setGameState(newState.gameState);
      if (newState.lightState) setLightState(newState.lightState);
      if (newState.timeLeft !== undefined) setTimeLeft(newState.timeLeft);
      if (newState.winners) setWinners(newState.winners);
      if (newState.ended !== undefined) setEnded(newState.ended);

      // Trigger local win/elim based on authoritative end-of-round winners
      if (newState.ended === true) {
        const winnersArr: string[] = Array.isArray(newState.winners) ? newState.winners : [];
        const iWon = winnersArr.includes(self.id!);
        setSelfWon(iWon);
        setSelfElim(!iWon);
      }
    };

    const handlePlayerEliminated = (payload: any) => {
      if (payload.playerId === self.id) {
        setSelfElim(true);
      }
    };

    const handleHostChange = (hostId: string) => {
      const isNowHost = hostId === self.id;
      setIsHost(isNowHost);
      console.log('Host changed:', hostId, 'Am I host?', isNowHost);
    };

    multiplayerManager.onEvent('PLAYERS_UPDATED', handlePlayersUpdate);
    multiplayerManager.onEvent('GAME_STATE_CHANGED', handleGameStateChange);
    multiplayerManager.onEvent('PLAYER_ELIMINATED', handlePlayerEliminated);
    multiplayerManager.onEvent('HOST_CHANGED', handleHostChange);

    return () => {
      multiplayerManager.offEvent('PLAYERS_UPDATED', handlePlayersUpdate);
      multiplayerManager.offEvent('GAME_STATE_CHANGED', handleGameStateChange);
      multiplayerManager.offEvent('PLAYER_ELIMINATED', handlePlayerEliminated);
      multiplayerManager.offEvent('HOST_CHANGED', handleHostChange);
    };
  }, [self.id]);

  // Game logic for Red Light Green Light
  const handleStartGame = () => {
    if (!isHost) return;
    
    console.log('Starting Red Light Green Light game');
    startHostLoop(); // Use the host loop instead of manual state management
  };

  const handleLeave = () => {
    multiplayerManager.leaveRoom();
    navigate('/lobby');
  };

  const handleGameTypeChange = (newGameType: GameType) => {
    setGameType(newGameType);
    multiplayerManager.setRoomMetadata({ gameType: newGameType });
  };

  // Render Red Light Green Light game
  const renderRedLightGreenLight = () => (
    <div className="w-full h-screen relative bg-gradient-to-b from-blue-400 to-blue-600">
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
        
        {/* Mute Button */}
        <button 
          className={`px-3 py-1 rounded text-white hover:opacity-80 transition-opacity ${
            isMuted ? 'bg-red-600' : 'bg-green-600'
          }`}
          onClick={toggleMute}
          title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
        >
          {isMuted ? '🔇' : '🔊'}
        </button>
        
        <span className="px-3 py-1 rounded bg-white/60 text-sm">
          {gameState} • {lightState} • {Math.ceil(timeLeft)}s • Players: {players.length} • Host: {isHost ? 'Yes' : 'No'} • Camera: {cameraMode}
        </span>
      </div>

      {/* Game Type Selector */}
      <div className="absolute top-3 right-3 z-10 flex gap-2">
        <button
          className={`px-3 py-1 rounded text-white ${
            gameType === 'red-light-green-light' ? 'bg-blue-600' : 'bg-gray-600'
          }`}
          onClick={() => handleGameTypeChange('red-light-green-light')}
        >
          🚦 Red Light Green Light
        </button>
        <button
          className={`px-3 py-1 rounded text-white ${
            gameType === 'tug-of-war' ? 'bg-orange-600' : 'bg-gray-600'
          }`}
          onClick={() => handleGameTypeChange('tug-of-war')}
        >
          🪢 Tug of War
        </button>
      </div>

      {/* Game Over Screen */}
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

      {/* Waiting for Host Screen */}
      {gameState === 'waiting' && !isHost && (
        <div className="absolute inset-x-0 top-14 z-10 mx-auto max-w-md bg-white/90 rounded p-4 text-center">
          <div className="text-lg font-semibold mb-2">Waiting for Host</div>
          <div className="text-sm text-gray-600">The host will start the game when ready.</div>
        </div>
      )}

      {/* Countdown Screen */}
      {gameState === 'countdown' && (
        <div className="absolute inset-x-0 top-14 z-10 mx-auto max-w-md bg-white/90 rounded p-4 text-center">
          <div className="text-lg font-semibold mb-2">Game Starting Soon!</div>
          <div className="text-sm text-gray-600">Get ready...</div>
        </div>
      )}

      {/* Center UI (Single-player style win/elimination overlays) */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-auto z-50">
        {(selfWon || (ended && winners.includes(self.id!))) && (
          <div className="space-y-4">
            <div className="animate-bounce">
              <h2 className="text-8xl font-bold text-green-400 drop-shadow-lg">🎉 YOU WIN! 🎉</h2>
              <p className="text-2xl text-white drop-shadow-lg">Congratulations! You reached the finish line!</p>
              <div className="text-4xl">🎈🎊🎉🎈🎊🎉</div>
            </div>
            <button
              onClick={() => {
                if (!isHost) return; // Only host triggers a new round
                multiplayerManager.broadcastGameReset(50);
                // Local clear
                setSelfElim(false);
                setSelfWon(false);
                setEnded(false);
                setWinners([]);
                setGameState('waiting');
                setLightState('green');
                setTimeLeft(50);
                setIsPlayerMoving(false);
                setPlayerPosition(0);
                setHostLoopKey(prev => prev + 1);
                resetHostLoop();
                if (playerRef.current) {
                  playerRef.current.position.set(0, 0, -5);
                  playerRef.current.rotation.y = 0;
                }
                multiplayerManager.setSelfPresence({ isEliminated: false, isMoving: false });
              }}
              className={`text-xl px-8 py-4 rounded ${isHost ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-500 cursor-not-allowed'}`}
              disabled={!isHost}
            >
              {isHost ? 'Play Again' : 'Waiting for Host'}
            </button>
          </div>
        )}

        {(selfElim || (ended && !winners.includes(self.id!))) && !selfWon && (
          <div className="space-y-4">
            <h2 className="text-6xl font-bold text-red-400">ELIMINATED!</h2>
            <p className="text-xl text-white">
              {timeLeft === 0 ? 'Time ran out!' : 'You moved during red light!'}
            </p>
            <button
              onClick={() => {
                if (!isHost) return; // Only host triggers a new round
                multiplayerManager.broadcastGameReset(50);
                // Local clear
                setSelfElim(false);
                setSelfWon(false);
                setEnded(false);
                setWinners([]);
                setGameState('waiting');
                setLightState('green');
                setTimeLeft(50);
                setIsPlayerMoving(false);
                setPlayerPosition(0);
                setHostLoopKey(prev => prev + 1);
                resetHostLoop();
                if (playerRef.current) {
                  playerRef.current.position.set(0, 0, -5);
                  playerRef.current.rotation.y = 0;
                }
                multiplayerManager.setSelfPresence({ isEliminated: false, isMoving: false });
              }}
              className={`text-xl px-8 py-4 rounded ${isHost ? '' : 'bg-gray-500 cursor-not-allowed'} ${isHost ? 'bg-green-600 hover:bg-green-700' : ''}`}
              disabled={!isHost}
            >
              {isHost ? 'Try Again' : 'Waiting for Host'}
            </button>
          </div>
        )}
      </div>

      {/* Progress bar */}
      {gameState === 'playing' && (
        <div className="absolute bottom-8 left-8 right-8 pointer-events-auto">
          <div className="bg-black/50 p-4 rounded-lg">
            <div className="text-white mb-2">Progress to Finish Line</div>
            <div className="text-white text-sm mb-2">Debug: Progress = {progress.toFixed(3)} ({Math.min(100, Math.max(0, progress * 100)).toFixed(1)}%)</div>
            <div className="w-full bg-gray-700 rounded-full h-4">
              <div 
                className="bg-green-500 h-4 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
              />
            </div>
            <div className="text-white text-xs mt-2">
              Press <kbd className="bg-gray-600 px-1 rounded">SPACE</kbd> to cycle camera modes: {cameraMode}
            </div>
            <div className="text-white text-xs mt-1">
              All cameras face the doll and show the entire playground
            </div>
          </div>
        </div>
      )}

      {/* Game Status */}
      {gameState === 'playing' && (
        <div className="absolute top-4 right-4 z-10 bg-black/90 rounded p-3 text-center">
          <div className="text-lg font-semibold text-green-400 mb-1">Game in Progress!</div>
          <div className={`text-sm ${lightState === 'green' ? 'text-green-300' : 'text-red-400'}`}>
            {lightState === 'green' ? 'Green Light!' : 'Red Light!'}
          </div>
        </div>
      )}

      {/* 3D Game Canvas */}
      <Canvas
        shadows
        camera={{ 
          position: [-5, 8, -15], // Better initial position to see the field
          fov: 60,
          near: 0.1,
          far: 500
        }}
      >
        {/* Camera rig; press Space to cycle modes */}
        <FollowCamera targetRef={playerRef} cameraMode={cameraMode} />
        
        {/* Lighting */}
        <ambientLight intensity={0.4} />
        <directionalLight
          position={[10, 10, 5]}
          intensity={1}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        
        {/* Environment */}
        <Environment />
        
        {/* Doll */}
        <Doll lightState={lightState} gameState={gameState} modelPath={MODEL_CONFIG.doll.path} />
        
        {/* Soldiers */}
        {FIELD_CONFIG.SOLDIER_POSITIONS.map((position, index) => (
          <Soldier key={index} position={position} rotation={[0, Math.PI, 0]} />
        ))}
        
         {/* Player */}
         <Player
           lightState={lightState}
           gameState={ended ? (winners.includes(self.id!) ? 'won' : 'eliminated') : (selfElim ? 'eliminated' : (selfWon ? 'won' : 'playing'))}
           onElimination={() => {
             setSelfElim(true);
             multiplayerManager.setSelfPresence({ isEliminated: true, isMoving: false });
           }}
           onPositionUpdate={(position) => {
             setPlayerPosition(position);
           }}
           modelPath={MODEL_CONFIG.player.path}
           onRefReady={(ref) => { (playerRef as any).current = ref.current; }}
           canMove={gameState === 'playing'}
           resetKey={hostLoopKey}
           onMovementChange={setIsPlayerMoving}
         />

        {/* Position Reporter */}
        <PositionReporter
          groupRef={playerRef}
          light={lightState}
          onSelfEliminate={() => setSelfElim(true)}
          onMovementChange={setIsPlayerMoving}
        />

        {/* Remote Players */}
        <RemotePlayers players={players} selfId={self.id!} />

        {/* Win Checker */}
        <WinChecker playerRef={playerRef} onWin={() => setSelfWon(true)} />
        
        {/* Celebration effect */}
        {(selfWon || (ended && winners.includes(self.id!))) && (
          <Celebration gameState="won" />
        )}
        
        {/* Controls removed to avoid interfering with scripted camera */}
      </Canvas>

      {/* Camera Controls */}
      <div className="absolute bottom-4 left-4 z-10 flex gap-2">
        {(['follow', 'closeup', 'drone', 'firstPerson'] as CameraMode[]).map((mode) => (
          <button
            key={mode}
            className={`px-3 py-1 rounded text-sm ${
              cameraMode === mode ? 'bg-blue-600 text-white' : 'bg-white/80 text-gray-800'
            }`}
            onClick={() => setCameraMode(mode)}
          >
            {mode.charAt(0).toUpperCase() + mode.slice(1)}
          </button>
        ))}
      </div>

      {/* Instructions */}
      <div className="absolute bottom-4 right-4 text-white bg-black/50 p-3 rounded-lg">
        <div className="text-sm font-semibold mb-2">Controls:</div>
        <div className="text-xs space-y-1">
          <div>Use <kbd className="bg-gray-700 px-1 rounded">WASD</kbd> or <kbd className="bg-gray-700 px-1 rounded">Arrow Keys</kbd> to move</div>
          <div>Move only on <span className="text-green-400">Green Light</span></div>
          <div>Stop on <span className="text-red-400">Red Light</span></div>
        </div>
      </div>
    </div>
  );

  // Render Tug of War game
  const renderTugOfWar = () => (
    <div className="w-full h-screen relative">
      <div className="absolute top-3 left-3 z-10 flex gap-3">
        <button 
          className="px-3 py-1 rounded bg-red-500 text-white hover:bg-red-600" 
          onClick={handleLeave}
        >
          Leave Game
        </button>
        <Link to="/" className="px-3 py-1 rounded bg-white/80">Single Player</Link>
        
        {/* Mute Button */}
        <button 
          className={`px-3 py-1 rounded text-white hover:opacity-80 transition-opacity ${
            isMuted ? 'bg-red-600' : 'bg-green-600'
          }`}
          onClick={toggleMute}
          title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
        >
          {isMuted ? '🔇' : '🔊'}
        </button>
        
        <span className="px-3 py-1 rounded bg-white/60 text-sm">
          Players: {players.length} • Host: {isHost ? 'Yes' : 'No'}
        </span>
      </div>

      {/* Game Type Selector */}
      <div className="absolute top-3 right-3 z-10 flex gap-2">
        <button
          className={`px-3 py-1 rounded text-white ${
            gameType === 'red-light-green-light' ? 'bg-blue-600' : 'bg-gray-600'
          }`}
          onClick={() => handleGameTypeChange('red-light-green-light')}
        >
          🚦 Red Light Green Light
        </button>
        <button
          className={`px-3 py-1 rounded text-white ${
            gameType === 'tug-of-war' ? 'bg-orange-600' : 'bg-gray-600'
          }`}
          onClick={() => handleGameTypeChange('tug-of-war')}
        >
          🪢 Tug of War
        </button>
      </div>

      <MultiplayerTugOfWar />
    </div>
  );

  if (status !== 'Connected') {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="text-center">
          <div className="text-2xl font-bold mb-4">{status}</div>
          <div className="text-sm text-gray-400">Room Code: {code}</div>
        </div>
      </div>
    );
  }

  return (
    <>
      {gameType === 'red-light-green-light' && renderRedLightGreenLight()}
      {gameType === 'tug-of-war' && renderTugOfWar()}
    </>
  );
}