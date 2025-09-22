import { useRef, useEffect, useState, useMemo } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { multiplayerManager } from '@/lib/multiplayer';
import { useHostLoop } from '../game/host/useHostLoop';
import { Environment } from '../game/components/Environment';
import { Player } from '../game/components/Player';
import { Doll } from '../game/components/Doll';
import { Soldier } from '../game/components/Soldier';
import { Celebration } from '../game/components/Celebration';
import { MODEL_CONFIG } from '../game/config/models';
import { FIELD_CONFIG } from '../game/config/field';

type PresencePlayer = { id: string; name?: string; isEliminated?: boolean; x?: number; z?: number; isMoving?: boolean };

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
      multiplayerManager.updatePlayerPosition({ x, z }, isMoving, true);
      lastSent.current = now;
      lastMoving.current = isMoving;
      
      // Notify parent component about movement change
      onMovementChange?.(isMoving);
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
    cam.updateProjectionMatrix();
  }, [camera]);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      const target = targetRef.current;
      if (target) {
        const worldPos = target.position.clone();
        let desiredPos = camera.position.clone();
        let lookAt = new THREE.Vector3();
        const cam = camera as THREE.PerspectiveCamera;
        let targetFov = cam.fov;

        if (cameraMode === 'follow') {
          desiredPos = worldPos.clone().add(new THREE.Vector3(2.5, 3.0, -6.0));
          lookAt = worldPos.clone().add(new THREE.Vector3(0, 1.0, 6));
          targetFov = 50;
        } else if (cameraMode === 'closeup') {
          // Cinematic close-up: slightly below and to the side, tighter FOV
          desiredPos = worldPos.clone().add(new THREE.Vector3(1.2, 1.2, -2.2));
          lookAt = worldPos.clone().add(new THREE.Vector3(0, 1.4, 3));
          targetFov = 35;
        } else if (cameraMode === 'drone') {
          // High-altitude top-down over the field center
          desiredPos = new THREE.Vector3(0, 50, 10);
          lookAt = new THREE.Vector3(0, 0, 10);
          targetFov = 60;
        } else {
          // firstPerson: at player head, slight handheld shake
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

        // Smoothly lerp FOV per mode
        cam.fov += (targetFov - cam.fov) * 0.1;
        cam.updateProjectionMatrix();
      }
      raf = requestAnimationFrame(update);
    };
    raf = requestAnimationFrame(update);
    return () => cancelAnimationFrame(raf);
  }, [camera, targetRef, cameraMode]);
  return null;
};

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

  // Camera mode state - same as single player
  const [cameraMode, setCameraMode] = useState<CameraMode>('follow');

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

  // Audio management for footsteps
  const audioRef = useRef<{ [key: string]: HTMLAudioElement }>({});
  const [isPlayerMoving, setIsPlayerMoving] = useState(false);

  // Initialize audio with running footsteps file
  useEffect(() => {
    audioRef.current = {
      greenLight: new Audio('/audio/green_light.wav'), // Green light sound
      redLight: new Audio('/audio/red_light.wav'), // Red light sound
      footsteps: new Audio('/audio/Running%20footsteps.wav'), // URL encoded for spaces
      buzzer: new Audio('/audio/Buzzer.wav'), // Buzzer sound for elimination
      youWin: new Audio('/audio/win_game.wav'), // Win sound
    };

    // Configure footsteps audio
    const footstepsAudio = audioRef.current.footsteps;
    footstepsAudio.loop = true;
    footstepsAudio.volume = 0.6; // Adjust volume as needed
    
    // Configure green light audio
    const greenLightAudio = audioRef.current.greenLight;
    greenLightAudio.volume = 0.7; // Moderate volume for green light announcement
    
    // Configure red light audio
    const redLightAudio = audioRef.current.redLight;
    redLightAudio.volume = 0.7; // Moderate volume for red light announcement
    
    // Configure buzzer audio
    const buzzerAudio = audioRef.current.buzzer;
    buzzerAudio.volume = 0.8; // Slightly louder for elimination sound
    
    // Configure win audio
    const youWinAudio = audioRef.current.youWin;
    youWinAudio.volume = 0.8; // Moderate volume for win announcement
    
    // Add error handling for audio loading
    footstepsAudio.addEventListener('error', (e) => {
      console.error('Failed to load footsteps audio:', e);
    });
    
    footstepsAudio.addEventListener('canplaythrough', () => {
      console.log('Footsteps audio loaded successfully');
    });
    
    greenLightAudio.addEventListener('error', (e) => {
      console.error('Failed to load green light audio:', e);
    });
    
    greenLightAudio.addEventListener('canplaythrough', () => {
      console.log('Green light audio loaded successfully');
    });
    
    redLightAudio.addEventListener('error', (e) => {
      console.error('Failed to load red light audio:', e);
    });
    
    redLightAudio.addEventListener('canplaythrough', () => {
      console.log('Red light audio loaded successfully');
    });
    
    buzzerAudio.addEventListener('error', (e) => {
      console.error('Failed to load buzzer audio:', e);
    });
    
    buzzerAudio.addEventListener('canplaythrough', () => {
      console.log('Buzzer audio loaded successfully');
    });
    
    youWinAudio.addEventListener('error', (e) => {
      console.error('Failed to load you win audio:', e);
    });
    
    youWinAudio.addEventListener('canplaythrough', () => {
      console.log('You win audio loaded successfully');
    });
  }, []);

  // Footsteps management
  useEffect(() => {
    const footstepsAudio = audioRef.current.footsteps;
    
    if (isPlayerMoving && gameState === 'playing' && lightState === 'green') {
      // Start footsteps when player is moving during green light
      if (footstepsAudio.paused) {
        footstepsAudio.currentTime = 0; // Reset to beginning
        footstepsAudio.play().catch(() => {
          console.log('Footsteps audio play failed (autoplay restrictions)');
        });
      }
    } else {
      // Stop footsteps when not moving or during red light
      if (!footstepsAudio.paused) {
        footstepsAudio.pause();
        footstepsAudio.currentTime = 0;
      }
    }

    return () => {
      // Cleanup: stop footsteps when component unmounts
      if (footstepsAudio && !footstepsAudio.paused) {
        footstepsAudio.pause();
        footstepsAudio.currentTime = 0;
      }
    };
  }, [isPlayerMoving, gameState, lightState]);

  // Play audio cues for light state changes
  useEffect(() => {
    // Only play light audio if game is playing AND player hasn't won yet
    if (gameState === 'playing' && !selfWon) {
      const audio = audioRef.current[lightState === 'green' ? 'greenLight' : 'redLight'];
      if (audio && audio.src) {
        audio.play().catch(() => {
          console.log('Light audio play failed (autoplay restrictions)');
        });
      }
    }
  }, [lightState, gameState, selfWon]);

  // Play buzzer sound when player gets eliminated
  useEffect(() => {
    if (selfElim) {
      const buzzerAudio = audioRef.current.buzzer;
      if (buzzerAudio && buzzerAudio.src) {
        buzzerAudio.currentTime = 0; // Reset to beginning
        buzzerAudio.play().catch(() => {
          console.log('Buzzer audio play failed (autoplay restrictions)');
        });
      }
    }
  }, [selfElim]);

  // Play win sound when player wins
  useEffect(() => {
    if (selfWon) {
      const youWinAudio = audioRef.current.youWin;
      if (youWinAudio && youWinAudio.src) {
        youWinAudio.currentTime = 0; // Reset to beginning
        youWinAudio.play().catch(() => {
          console.log('You win audio play failed (autoplay restrictions)');
        });
      }
    }
  }, [selfWon]);

  // Spacebar cycles camera modes - same as single player
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setCameraMode((mode) =>
          mode === 'follow' ? 'closeup' : mode === 'closeup' ? 'drone' : mode === 'drone' ? 'firstPerson' : 'follow'
        );
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

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
  // Use a key to force remount when game resets to clear internal state
  const [hostLoopKey, setHostLoopKey] = useState(0);
  const { startGame, reset: resetHostLoop } = useHostLoop(isHost, gameState, hostLoopKey);

  // Debug logging
  useEffect(() => {
    console.log('RoomGame state:', { isHost, gameState, hostLoopKey, startGame: !!startGame, progress, playerPosition });
  }, [isHost, gameState, hostLoopKey, startGame, progress, playerPosition]);

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

  // Listen for game reset events
  useEffect(() => {
    const onGameReset = () => {
      console.log('Game reset received, resetting local state');
      // Reset all local state
      setSelfElim(false);
      setSelfWon(false);
      setEnded(false);
      setWinners([]);
      setGameState('waiting');
      setLightState('green');
      setTimeLeft(50);
      setIsPlayerMoving(false); // Reset movement state to stop running in place
      setPlayerPosition(0); // Reset player position for progress bar
      setHostLoopKey(prev => prev + 1); // Force host loop remount
      resetHostLoop(); // Manually reset host loop
      // Reset player position
      if (playerRef.current) {
        playerRef.current.position.set(0, 0, -5);
        playerRef.current.rotation.y = 0;
      }
      // Reset presence
      multiplayerManager.setSelfPresence({ isEliminated: false, isMoving: false });
    };

    multiplayerManager.onEvent('GAME_RESET', onGameReset);
    return () => multiplayerManager.offEvent('GAME_RESET', onGameReset);
  }, []);

  const handleLeave = async () => {
    await multiplayerManager.leaveRoom();
    navigate('/lobby');
  };

  const handleStartGame = () => {
    console.log('Start game clicked!', { isHost, gameState, startGame: !!startGame, hostLoopKey });
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

      {/* Progress bar - same as single player */}
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
          </div>
        </div>
      )}

      {/* Game in Progress section */}
      {gameState === 'playing' && (
        <div className="absolute top-4 right-4 z-10 bg-black/90 rounded p-3 text-center">
          <div className="text-lg font-semibold text-green-400 mb-1">Game in Progress!</div>
          <div className={`text-sm ${lightState === 'green' ? 'text-green-300' : 'text-red-400'}`}>
            {lightState === 'green' ? 'Green Light!' : 'Red Light!'}
          </div>
        </div>
      )}

      <Canvas
        shadows
        camera={{ 
          position: FIELD_CONFIG.CAMERA_POSITION,
          fov: 50,
          near: 0.1,
          far: 300
        }}
      >
        {/* Camera rig; press Space to cycle modes */}
        <FollowCamera targetRef={playerRef} cameraMode={cameraMode} />
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
          onPositionUpdate={(position) => {
            console.log('Position update received:', position, 'Progress:', position / FIELD_CONFIG.FIELD_LENGTH_UNITS);
            setPlayerPosition(position);
          }}
          modelPath={MODEL_CONFIG.player.path}
          onRefReady={(ref) => { (playerRef as any).current = ref.current; }}
          canMove={gameState === 'playing'} // Only allow movement when game is playing
          resetKey={hostLoopKey} // Pass reset key to Player component
        />

        <PositionReporter 
          groupRef={playerRef} 
          light={lightState} 
          onSelfEliminate={() => setSelfElim(true)}
          onMovementChange={setIsPlayerMoving}
        />
        <Doll lightState={lightState} gameState={gameState} modelPath={MODEL_CONFIG.doll.path} />
        {FIELD_CONFIG.SOLDIER_POSITIONS.map((position, index) => (
          <Soldier key={index} position={position} rotation={[0, Math.PI, 0]} />
        ))}

        <RemotePlayers players={players} selfId={self.id!} />
        <WinChecker playerRef={playerRef} onWin={() => setSelfWon(true)} />
        
        {/* Celebration effects for winner */}
        <Celebration gameState={selfWon ? 'won' : 'playing'} />
      </Canvas>

      {ended && isHost && (
        <button
          className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded bg-white/80"
          onClick={() => {
            console.log('Reset button clicked!');
            console.log('Before reset - isHost:', isHost, 'gameState:', gameState, 'hostLoopKey:', hostLoopKey);
            // host resets game - use broadcastGameReset instead of broadcastReset
            multiplayerManager.broadcastGameReset(50);
            // local clear
            setSelfElim(false);
            setSelfWon(false);
            setEnded(false);
            setWinners([]);
            setGameState('waiting'); // Add this to ensure start button appears
            setLightState('green');  // Add this to ensure light resets
            setTimeLeft(50);         // Add this to ensure timer resets
            setIsPlayerMoving(false); // Reset movement state to stop running in place
            setPlayerPosition(0); // Reset player position for progress bar
            setHostLoopKey(prev => {
              const newKey = prev + 1;
              console.log('Incrementing hostLoopKey from', prev, 'to', newKey);
              return newKey;
            }); // Force host loop remount
            resetHostLoop(); // Manually reset host loop
            // Reset player position
            if (playerRef.current) {
              playerRef.current.position.set(0, 0, -5);
              playerRef.current.rotation.y = 0;
            }
            multiplayerManager.setSelfPresence({ isEliminated: false, isMoving: false });
            console.log('Reset complete - gameState should be waiting, start button should appear');
          }}
        >
          Reset
        </button>
      )}
    </div>
  );
};

export default RoomGame;


