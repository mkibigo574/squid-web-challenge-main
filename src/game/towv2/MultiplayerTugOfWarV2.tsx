import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { TugOfWarEnvironment } from '../components/TugOfWarEnvironment';
import { useTowV2 } from './useTowV2';

// Fresh minimal Tug of War V2 scene scaffold
// World height refs
const PLATFORM_TOP_Y = 9.8; // lowered platforms by -2 → new top
const PLAYER_BASE_Y = PLATFORM_TOP_Y - 0.2; // feet center at 0.2 → base so soles rest on top
const HAND_LOCAL_Y = 1.2; // hands relative to player group
const BROWN_FLOOR_TOP_Y = -6 + 0.4; // central brown deck positioned at -6 with thickness 0.8
const FLOATING_OFFSET = 2.0; // how high players float above platforms during floating phase

function Rope({ value, phase = 'pulling' }: { value: number; phase?: string }) {
  // Dynamic rope that anchors to outermost players on each side
  const group = useRef<THREE.Group>(null);
  const ropeCenterX = value * 10;
  // Recompute team grip points (mirror of TeamPlayers)
  const shift = 9.0; // increased by 1 unit total (0.5 per side)
  const leftOffsets = [-3.8 - shift, -3.0 - shift, -2.2 - shift];
  const rightOffsets = [3.8 + shift, 3.0 + shift, 2.2 + shift];
  const leftPoints = leftOffsets.map((ox) => ropeCenterX + ox);
  const rightPoints = rightOffsets.map((ox) => ropeCenterX + ox);
  const leftEndX = Math.min(...leftPoints);
  const rightEndX = Math.max(...rightPoints);

  useFrame(() => {
    if (!group.current) return;
    // Align rope height to player hand height above the platform
    let ropeY = PLAYER_BASE_Y + HAND_LOCAL_Y;
    if (phase === 'floating' || phase === 'positioning') {
      ropeY += FLOATING_OFFSET;
    }
    group.current.position.set(0, ropeY, 0);
    
    // Debug: Log rope positioning
    console.log('Rope positioning debug:', {
      ropeY,
      leftEndX,
      rightEndX,
      ropeCenterX,
      phase
    });
  });

  const spacing = 0.35;
  const ropeLength = Math.max(spacing, rightEndX - leftEndX);
  const segments = Math.max(2, Math.floor(ropeLength / spacing));

  return (
    <group ref={group}>
      {Array.from({ length: segments }, (_, i) => {
        const x = leftEndX + i * spacing;
        return (
          <mesh key={i} position={[x, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.06, 0.06, 0.3]} />
            <meshStandardMaterial color={i % 2 === 0 ? '#caa85a' : '#986a2a'} />
          </mesh>
        );
      })}
          {/* Visual grip markers at each player's hands */}
          {leftPoints.concat(rightPoints).map((px, idx) => (
            <mesh key={`g${idx}`} position={[px, 0, 0]}>
              <torusGeometry args={[0.12, 0.03, 8, 16]} />
              <meshStandardMaterial color="#dddddd" />
            </mesh>
          ))}
          {/* Red cloth marker at the center of the rope */}
          <mesh position={[ropeCenterX, 0, 0]}>
            <torusGeometry args={[0.15, 0.05, 8, 16]} />
            <meshStandardMaterial color="#dc2626" />
          </mesh>
    </group>
  );
}

function SimplePlayer({ x, z, color, rotationY = 0, effort = 0, side = 'left' as 'left'|'right', detached = false, floorY = BROWN_FLOOR_TOP_Y, playerIndex = 0, phase = 'pulling' }) {
  const group = useRef<THREE.Group>(null);
  const leftHand = useRef<THREE.Mesh>(null);
  const rightHand = useRef<THREE.Mesh>(null);
  const headRef = useRef<THREE.Mesh>(null);
  const footLRef = useRef<THREE.Mesh>(null);
  const footRRef = useRef<THREE.Mesh>(null);
  const currentXRef = useRef<number>(x);
  const currentYRef = useRef<number>(PLAYER_BASE_Y);
  const vyRef = useRef<number>(0);
  const hasDetachedRef = useRef<boolean>(false);
  const isDisappearingRef = useRef<boolean>(false);
  const disappearStartTimeRef = useRef<number>(0);
  const bubblesRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (!detached) {
      // Follow rope-driven position/animation
      currentXRef.current = x;
      const sideSign = side === 'left' ? -1 : 1;
      const lean = sideSign * effort * 0.32 + Math.sin(t * 8 + (x + z)) * 0.05 * effort;
      const bob = Math.sin(t * 12 + x) * 0.06 * effort;
      
      // Handle floating phase (floating during floating and positioning phases)
      let baseY = PLAYER_BASE_Y;
      if (phase === 'floating' || phase === 'positioning') {
        baseY = PLAYER_BASE_Y + FLOATING_OFFSET;
        // Gentle floating animation
        const floatBob = Math.sin(t * 3) * 0.1;
        baseY += floatBob;
      }
      
      // Position players so their hands align with the rope
      // Use the exact same calculation as the rope component
      let ropeY = PLAYER_BASE_Y + HAND_LOCAL_Y;
      if (phase === 'floating' || phase === 'positioning') {
        ropeY += FLOATING_OFFSET;
      }
      // Player hands are at HAND_LOCAL_Y relative to player group
      // So player group should be at: ropeY - HAND_LOCAL_Y
      currentYRef.current = ropeY - HAND_LOCAL_Y + Math.max(0, bob);
      
      // Debug: Log hand positions for first player
      if (side === 'left' && playerIndex === 0) {
        console.log('Hand positioning debug:', {
          playerX: currentXRef.current,
          playerY: currentYRef.current,
          leftHandX: currentXRef.current - 0.1,
          rightHandX: currentXRef.current + 0.1,
          handY: currentYRef.current + HAND_LOCAL_Y,
          ropeY,
          phase
        });
      }
      vyRef.current = 0;
      hasDetachedRef.current = false;
      isDisappearingRef.current = false; // Reset disappearing state
      
      // Reset position to rope position when reattached
      currentXRef.current = x;
      if (group.current) {
        group.current.position.set(currentXRef.current, currentYRef.current, z);
        group.current.rotation.z = lean;
        group.current.visible = true; // Make sure player is visible
        group.current.scale.setScalar(1); // Reset scale
        
        // Reset material properties that might have been changed during disappearing
        group.current.traverse((child) => {
          if (child instanceof THREE.Mesh && child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach(mat => {
                if (mat instanceof THREE.MeshStandardMaterial) {
                  mat.transparent = false;
                  mat.opacity = 1;
                }
              });
            } else if (child.material instanceof THREE.MeshStandardMaterial) {
              child.material.transparent = false;
              child.material.opacity = 1;
            }
          }
        });
      }
      if (bubblesRef.current) {
        bubblesRef.current.clear(); // Clear any existing bubbles
        bubblesRef.current.visible = true; // Make sure bubbles are visible
      }
      const jitter = Math.sin(t * 24 + x * 0.3) * 0.04 * effort;
      if (leftHand.current) leftHand.current.position.x = -0.1 + jitter;
      if (rightHand.current) rightHand.current.position.x = 0.1 - jitter;
    } else {
      // Falling physics after detachment
      if (!hasDetachedRef.current) {
        hasDetachedRef.current = true;
        vyRef.current = -0.02;
        // Move to center gap area while maintaining relative positions
        const spacing = 0.8; // same spacing as when on rope
        const centerOffset = (playerIndex - 2.5) * spacing; // -2.5 to 2.5 range
        currentXRef.current = centerOffset;
      }
      // Simple gravity
      vyRef.current -= 0.012; // gravity accel
      currentYRef.current += vyRef.current;
      
      // Check if player hits the chainsaw level (Y = -5)
      const chainsawY = -5;
      if (!isDisappearingRef.current && currentYRef.current <= chainsawY) {
        isDisappearingRef.current = true;
        disappearStartTimeRef.current = t;
        
        // Create bubbles for magical effect
        if (bubblesRef.current) {
          bubblesRef.current.clear();
          for (let i = 0; i < 8; i++) {
            const bubble = new THREE.Mesh(
              new THREE.SphereGeometry(0.1 + Math.random() * 0.1, 8, 6),
              new THREE.MeshStandardMaterial({
                color: '#ffffff',
                transparent: true,
                opacity: 0.8,
                metalness: 0.1,
                roughness: 0.9
              })
            );
            bubble.position.set(
              (Math.random() - 0.5) * 2,
              0,
              (Math.random() - 0.5) * 2
            );
            bubblesRef.current.add(bubble);
          }
        }
      }
      
      // Magical disappearing effect
      if (isDisappearingRef.current) {
        const disappearTime = t - disappearStartTimeRef.current;
        const disappearDuration = 1.0; // 1 second disappearing effect
        
        if (disappearTime < disappearDuration) {
          // Fade out and scale down with magical effect
          const progress = disappearTime / disappearDuration;
          const scale = 1 - progress;
          const opacity = 1 - progress;
          
          if (group.current) {
            group.current.scale.setScalar(scale);
            group.current.rotation.y += 0.1; // Spinning while disappearing
            group.current.rotation.x += 0.05;
            
            // Apply opacity to all materials
            group.current.traverse((child) => {
              if (child instanceof THREE.Mesh && child.material) {
                if (Array.isArray(child.material)) {
                  child.material.forEach(mat => {
                    if (mat instanceof THREE.MeshStandardMaterial) {
                      mat.transparent = true;
                      mat.opacity = opacity;
                    }
                  });
                } else if (child.material instanceof THREE.MeshStandardMaterial) {
                  child.material.transparent = true;
                  child.material.opacity = opacity;
                }
              }
            });
          }
          
          // Bubble effect
          if (bubblesRef.current) {
            bubblesRef.current.children.forEach((bubble, index) => {
              const bubbleMesh = bubble as THREE.Mesh;
              const bubbleTime = disappearTime + index * 0.1;
              const bubbleProgress = (bubbleTime % 0.8) / 0.8; // 0.8 second bubble cycle
              
              // Float upward
              bubbleMesh.position.y = bubbleProgress * 3;
              
              // Gentle floating motion
              bubbleMesh.position.x += Math.sin(t * 2 + index) * 0.01;
              bubbleMesh.position.z += Math.cos(t * 2 + index) * 0.01;
              
              // Scale and fade
              const bubbleScale = 0.3 + bubbleProgress * 0.7;
              const bubbleOpacity = 1 - bubbleProgress;
              bubbleMesh.scale.setScalar(bubbleScale);
              
              if (bubbleMesh.material instanceof THREE.MeshStandardMaterial) {
                bubbleMesh.material.transparent = true;
                bubbleMesh.material.opacity = bubbleOpacity;
              }
            });
          }
        } else {
          // Completely hide the player and bubbles
          if (group.current) {
            group.current.visible = false;
          }
          if (bubblesRef.current) {
            bubblesRef.current.visible = false;
          }
        }
      } else {
        // Clamp to floor if not disappearing
        const minY = floorY + 0.2;
        if (currentYRef.current <= minY) {
          currentYRef.current = minY;
          vyRef.current = 0;
        }
      }
      
          if (group.current) {
            group.current.position.set(currentXRef.current, currentYRef.current, z);
            group.current.rotation.z = 0;
          }
    }
    // Head tilt based on effort
    if (headRef.current) {
      const headEff = detached ? 0 : effort;
      headRef.current.rotation.x = -0.2 * headEff;
      headRef.current.rotation.y = (side === 'left' ? 1 : -1) * 0.15 * headEff;
    }
    // Foot sliding backwards relative to pull direction
    const activeEffort = detached ? 0 : effort;
    const slide = 0.1 * activeEffort + Math.sin(t * 6 + z) * 0.03 * activeEffort;
    const dir = side === 'left' ? 1 : -1; // slide feet backward
    if (footLRef.current) footLRef.current.position.x = -0.18 + dir * slide;
    if (footRRef.current) footRRef.current.position.x = 0.18 + dir * slide;

    // Apply computed position
    if (group.current) {
      group.current.position.set(currentXRef.current, currentYRef.current, z);
      // Don't set rotation in useFrame - it's set in JSX
    }
  });

  return (
    <group ref={group} position={[x, 0, z]} rotation={[0, rotationY, 0]}>
      {/* body */}
      <mesh position={[0, 0.9, 0]} castShadow>
        <capsuleGeometry args={[0.35, 0.8, 4, 10]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* head */}
      <mesh ref={headRef} position={[0, 1.8, 0]} castShadow>
        <sphereGeometry args={[0.32, 16, 16]} />
        <meshStandardMaterial color="#222" />
      </mesh>
      {/* hands gripping rope (around rope along x axis) */}
      <mesh ref={rightHand} position={[0.1, 1.2, 0]}>
        <sphereGeometry args={[0.15, 12, 12]} />
        <meshStandardMaterial color="#ff6b6b" />
      </mesh>
      <mesh ref={leftHand} position={[-0.1, 1.2, 0]}>
        <sphereGeometry args={[0.15, 12, 12]} />
        <meshStandardMaterial color="#ff6b6b" />
      </mesh>
      {/* simple feet */}
      <mesh ref={footRRef} position={[0.18, 0.2, 0.08]}>
        <boxGeometry args={[0.18, 0.12, 0.28]} />
        <meshStandardMaterial color="#111" />
      </mesh>
      <mesh ref={footLRef} position={[-0.18, 0.2, 0.08]}>
        <boxGeometry args={[0.18, 0.12, 0.28]} />
        <meshStandardMaterial color="#111" />
      </mesh>
      {/* Magical bubbles for disappearing effect */}
      <group ref={bubblesRef} />
    </group>
  );
}

function TeamPlayers({ rope, redEffort, blueEffort, detachedRed, detachedBlue, phase }: { rope: number; redEffort: number; blueEffort: number; detachedRed: boolean; detachedBlue: boolean; phase: string }) {
  // Rope runs along X at z=0; distribute players ALONG the rope near each side
  const ropeCenterX = rope * 10;
  const shift = 9.0; // increased by 1 unit total (0.5 per side)
  const leftOffsets = [-3.8 - shift, -3.0 - shift, -2.2 - shift];
  const rightOffsets = [3.8 + shift, 3.0 + shift, 2.2 + shift];
  const z = 0; // keep all players aligned with rope (no cross-rope spacing)
  

  return (
    <group>
      {leftOffsets.map((ox, i) => (
        <SimplePlayer key={`L${i}`} x={ropeCenterX + ox} z={z} color="#dc2626" rotationY={0} effort={redEffort} side="left" detached={detachedRed} floorY={BROWN_FLOOR_TOP_Y} playerIndex={i} phase={phase} />
      ))}
      {rightOffsets.map((ox, i) => (
        <SimplePlayer key={`R${i}`} x={ropeCenterX + ox} z={z} color="#16a34a" rotationY={Math.PI} effort={blueEffort} side="right" detached={detachedBlue} floorY={BROWN_FLOOR_TOP_Y} playerIndex={i + 3} phase={phase} />
      ))}
    </group>
  );
}

export const MultiplayerTugOfWarV2 = () => {
  const { 
    phase, rope, start, setSelfPulling, countdown, chooseTeam, startGame, reset, winner, players, selectedTeam,
    // Tournament props
    tournamentMode, redTeamPlayers, blueTeamPlayers, currentRound, roundResults, 
    selectedRedPlayers, selectedBluePlayers, tournamentWinner,
    initializeTournament, selectRoundPlayers, startRound, endRound, resetTournament
  } = useTowV2() as any;
  const [power, setPower] = useState(0);
  const [detachedRed, setDetachedRed] = useState(false);
  const [detachedBlue, setDetachedBlue] = useState(false);
  const [showWinModal, setShowWinModal] = useState(false);
  const [showEliminationModal, setShowEliminationModal] = useState(false);
  const [roundCountdown, setRoundCountdown] = useState(3);

  useEffect(() => {
    let lastInputTime = 0;
    const inputCooldown = 100; // 100ms cooldown between inputs
    
    const onKeyDown = (e: KeyboardEvent) => {
      // Only respond to 'W' key or 'Up arrow' key
      if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') {
        const now = Date.now();
        if (now - lastInputTime >= inputCooldown) {
          lastInputTime = now;
          setPower(p => Math.min(1, p + 0.25));
        }
      }
    };
    
    window.addEventListener('keydown', onKeyDown);
    return () => { 
      window.removeEventListener('keydown', onKeyDown); 
    };
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setPower(p => Math.max(0, p - 0.12)); // Increased decay rate since no holding allowed
    }, 100);
    return () => clearInterval(id);
  }, []);

  // Countdown effect for tournament rounds
  useEffect(() => {
    if (phase === 'floating' && tournamentMode) {
      setRoundCountdown(3);
      const countdownInterval = setInterval(() => {
        setRoundCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(countdownInterval);
    }
  }, [phase, tournamentMode]);

  useEffect(() => {
    const pulling = phase === 'pulling' && power > 0.01;
    setSelfPulling(pulling, power);
  }, [phase, power, setSelfPulling]);

  // Trigger detachment based on rope position thresholds (same as win conditions)
  useEffect(() => {
    console.log('Detachment effect:', { phase, rope, detachedRed, detachedBlue, selectedTeam });
    
    if (phase === 'pulling' || phase === 'falling') {
      // Red team detaches when rope reaches +0.95 or higher (blue is winning)
      if (!detachedRed && rope >= 0.95) {
        console.log('Red team eliminated, selectedTeam:', selectedTeam);
        setDetachedRed(true);
        // Show elimination modal only if current player is on red team
        if (selectedTeam === 'red') {
          console.log('Showing elimination modal for red team');
          setTimeout(() => {
            setShowEliminationModal(true);
          }, 100);
        }
      }
      // Blue team detaches when rope reaches -0.95 or lower (red is winning)
      if (!detachedBlue && rope <= -0.95) {
        console.log('Blue team eliminated, selectedTeam:', selectedTeam);
        setDetachedBlue(true);
        // Show elimination modal only if current player is on blue team
        if (selectedTeam === 'blue') {
          console.log('Showing elimination modal for blue team');
          setTimeout(() => {
            setShowEliminationModal(true);
          }, 100);
        }
      }
    } else if (phase === 'lobby' || phase === 'floating') {
      // Reset detachment when explicitly resetting the game
      setDetachedRed(false);
      setDetachedBlue(false);
      setShowWinModal(false);
      setShowEliminationModal(false);
    }
    // Don't reset modals during 'results' phase - let them stay visible
  }, [phase, rope, detachedRed, detachedBlue, selectedTeam]);

  // Show win modal when results phase starts - only for the winning team
  useEffect(() => {
    console.log('Win modal effect:', { phase, winner, selectedTeam, showWinModal });
    if (phase === 'results' && winner) {
      console.log('Results phase with winner:', winner, 'selectedTeam:', selectedTeam);
      if (selectedTeam === winner) {
        console.log('Showing win modal for winning team');
        // Add a small delay to ensure the modal shows properly
        setTimeout(() => {
          setShowWinModal(true);
        }, 100);
      } else {
        console.log('Not showing win modal - different team');
      }
    }
  }, [phase, winner, selectedTeam]);

  // Debug modal states
  useEffect(() => {
    console.log('Modal states:', { showWinModal, showEliminationModal, phase, winner, selectedTeam });
  }, [showWinModal, showEliminationModal, phase, winner, selectedTeam]);

  return (
    <div className="w-full h-screen relative bg-yellow-400">
      <Canvas
        shadows
        camera={{ position: [0, 10, 30], fov: 55, near: 0.1, far: 2000 }}
        gl={{ toneMapping: THREE.ACESFilmicToneMapping }}
      >
        {/* Yellow background atmosphere */}
        <color attach="background" args={["#ffff00"]} />
        <fog attach="fog" args={["#ffff00", 20, 120]} />
        {(() => {
          function CameraAutoFrame() {
            const { camera, size } = useThree();
            useEffect(() => {
              const stageWidth = 48; // matches widened stage
              const margin = 8; // extra framing space
              const effectiveWidth = stageWidth + margin;
              if ('fov' in camera) {
                const fovRad = (camera.fov * Math.PI) / 180;
                const distance = (effectiveWidth / 2) / Math.tan(fovRad / 2);
                camera.position.set(0, 10, distance);
                camera.lookAt(0, 1.0, 0);
                camera.updateProjectionMatrix();
              }
            }, [camera, size.width, size.height]);
            return null;
          }
          return <CameraAutoFrame />;
        })()}
        <ambientLight intensity={0.35} />
        <TugOfWarEnvironment />
        <Rope value={rope} phase={phase} />
        {/* Teams of 3 whose hands align to rope segments near each side */}
        {(() => { const redEff = Math.min(1, Math.max(0, players?.filter((p: any) => p.team === 'red' && p.isPulling).reduce((s: number, p: any) => s + (p.pullPower || 0), 0) / 3 || 0));
                  const blueEff = Math.min(1, Math.max(0, players?.filter((p: any) => p.team === 'blue' && p.isPulling).reduce((s: number, p: any) => s + (p.pullPower || 0), 0) / 3 || 0));
                  return <TeamPlayers rope={rope} redEffort={redEff} blueEffort={blueEff} detachedRed={detachedRed} detachedBlue={detachedBlue} phase={phase} />; })()}
      </Canvas>

      <div className="absolute top-4 left-1/2 -translate-x-1/2 text-black/90 text-sm bg-white/90 px-3 py-1 rounded border border-gray-400 shadow-lg">
        {phase === 'lobby' && 'Waiting for players...'}
        {phase === 'floating' && (tournamentMode ? `Round ${currentRound} - Players landing in ${roundCountdown} seconds...` : 'Players floating above platforms - Get ready!')}
        {phase === 'positioning' && (tournamentMode ? 'Choose your team for the tournament!' : 'Choose your team!')}
        {phase === 'pulling' && 'Tug of War!'}
        {phase === 'falling' && 'Players falling...'}
        {phase === 'results' && 'Game Over!'}
        {phase === 'tournament' && `Tournament Mode - Round ${currentRound}`}
        {phase === 'round-selection' && `Round ${currentRound} - Players Selected!`}
        {phase === 'round-results' && `Round ${currentRound} Complete!`}
        {phase === 'tournament-winner' && 'Tournament Complete!'}
      </div>
      <div className="absolute top-4 left-4 flex gap-2">
        {phase === 'floating' && (
          <button className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-1 rounded" onClick={start}>
            {tournamentMode ? 'Start Tournament' : 'Choose your Team'}
          </button>
        )}
        {phase === 'positioning' && (
          <>
            <button 
              className={`px-3 py-1 rounded text-white font-semibold transition-all duration-200 transform ${
                selectedTeam === 'red' 
                  ? 'bg-rose-500 scale-110 shadow-lg ring-2 ring-rose-300 ring-opacity-50' 
                  : 'bg-rose-600 hover:bg-rose-700 hover:scale-105'
              }`}
              onClick={() => chooseTeam('red')}
            >
              {selectedTeam === 'red' ? '✓ Red Team' : 'Join Red'}
            </button>
            <button 
              className={`px-3 py-1 rounded text-white font-semibold transition-all duration-200 transform ${
                selectedTeam === 'blue' 
                  ? 'bg-green-500 scale-110 shadow-lg ring-2 ring-green-300 ring-opacity-50' 
                  : 'bg-green-600 hover:bg-green-700 hover:scale-105'
              }`}
              onClick={() => chooseTeam('blue')}
            >
              {selectedTeam === 'blue' ? '✓ Green Team' : 'Join Green'}
            </button>
          </>
        )}
        <button className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded" onClick={reset}>Reset</button>
        {phase === 'lobby' && (
          <button className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded" onClick={initializeTournament}>Start Tournament</button>
        )}
        {phase === 'tournament' && (
          <button className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded" onClick={selectRoundPlayers}>Select Round Players</button>
        )}
        {tournamentMode && (
          <button className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded" onClick={resetTournament}>End Tournament</button>
        )}
      </div>
      
          {/* Start Round button - centered when team is selected in tournament mode */}
          {phase === 'positioning' && selectedTeam && tournamentMode && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ transform: 'translate(-50%, calc(-50% - 25rem))' }}>
              <button 
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xl px-8 py-4 rounded-lg shadow-2xl transform hover:scale-110 transition-all duration-300 border-2 border-blue-400"
                onClick={startGame}
              >
                Start Round
              </button>
            </div>
          )}
      
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-black/90 text-sm bg-white/90 px-3 py-2 rounded border border-gray-400 shadow-lg">
        {phase !== 'results' && (
          <>Power: {Math.round((phase === 'pulling' ? power : 0)*100)}% — press W or ↑ rapidly to pull (keyboard only!)</>
        )}
      </div>

      {/* Tournament Info Panel */}
      {tournamentMode && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-white/90 rounded-lg p-4 border border-gray-400 shadow-lg max-w-sm">
          <h3 className="font-bold text-lg mb-2">Tournament Progress</h3>
          <div className="text-sm space-y-1">
            <div>Round: {currentRound}</div>
            <div className="flex justify-between gap-8">
              <span className="text-red-600">Red Team: {redTeamPlayers.filter(p => !p.isEliminated).length}/9</span>
              <span className="text-green-600">Green Team: {blueTeamPlayers.filter(p => !p.isEliminated).length}/9</span>
            </div>
            {selectedRedPlayers.length > 0 && (
              <div className="mt-2">
                <div className="text-red-600 font-semibold">Round {currentRound} Players:</div>
                <div className="text-xs">
                  Red: {selectedRedPlayers.map(p => p.playerNumber).join(', ')}
                </div>
                <div className="text-xs">
                  Green: {selectedBluePlayers.map(p => p.playerNumber).join(', ')}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Red Team Roster - Left Side */}
      {tournamentMode && redTeamPlayers.length > 0 && (
        <div className="absolute top-16 left-4 bg-red-50/90 rounded-lg p-3 border-2 border-red-300 shadow-lg max-w-xs">
          <h4 className="font-bold text-red-700 mb-2 text-center">Red Team ({redTeamPlayers.filter(p => !p.isEliminated).length}/9)</h4>
          <div className="grid grid-cols-3 gap-1 text-xs">
            {redTeamPlayers.map((player) => (
              <div
                key={player.id}
                className={`p-1 rounded text-center ${
                  player.isEliminated 
                    ? 'bg-red-200 text-red-500 line-through' 
                    : selectedRedPlayers.some(p => p.id === player.id)
                    ? 'bg-red-600 text-white font-bold'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                P{player.playerNumber}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Blue Team Roster - Right Side */}
      {tournamentMode && blueTeamPlayers.length > 0 && (
        <div className="absolute top-16 right-4 bg-green-50/90 rounded-lg p-3 border-2 border-green-300 shadow-lg max-w-xs">
          <h4 className="font-bold text-green-700 mb-2 text-center">Green Team ({blueTeamPlayers.filter(p => !p.isEliminated).length}/9)</h4>
          <div className="grid grid-cols-3 gap-1 text-xs">
            {blueTeamPlayers.map((player) => (
              <div
                key={player.id}
                className={`p-1 rounded text-center ${
                  player.isEliminated 
                    ? 'bg-green-200 text-green-500 line-through' 
                    : selectedBluePlayers.some(p => p.id === player.id)
                    ? 'bg-green-600 text-white font-bold'
                    : 'bg-green-100 text-green-700'
                }`}
              >
                P{player.playerNumber}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Round Results Panel */}
      {phase === 'round-results' && roundResults.length > 0 && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white/95 rounded-lg p-6 border border-gray-400 shadow-2xl max-w-md">
          <h3 className="font-bold text-xl mb-4 text-center">Round {roundResults[roundResults.length - 1].roundNumber} Results</h3>
          <div className="text-center">
            <div className="text-2xl mb-2">
              {roundResults[roundResults.length - 1].winner === 'red' ? '🔴' : '🔵'} 
              {roundResults[roundResults.length - 1].winner === 'red' ? 'Red Team' : 'Blue Team'} Wins!
            </div>
            <div className="text-sm text-gray-600 mb-4">
              Eliminated: {roundResults[roundResults.length - 1].eliminatedPlayers.map(p => `${p.team === 'red' ? 'Red' : 'Blue'} P${p.playerNumber}`).join(', ')}
            </div>
            <div className="text-xs text-gray-500">Next round starting in 3 seconds...</div>
          </div>
        </div>
      )}

      {/* Tournament Winner Modal */}
      {phase === 'tournament-winner' && tournamentWinner && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md mx-4 text-center shadow-2xl">
            <div className="text-6xl mb-4">🏆</div>
            <h2 className="text-3xl font-bold text-gray-800 mb-2">
              {tournamentWinner === 'red' ? 'Red Team' : 'Blue Team'} Wins Tournament!
            </h2>
            <p className="text-gray-600 mb-6">Congratulations on your tournament victory!</p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => {
                  resetTournament();
                }}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105"
              >
                🏆 New Tournament
              </button>
              <button
                onClick={() => {
                  resetTournament();
                }}
                className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105"
              >
                🏠 Back to Lobby
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Win Modal */}
      {showWinModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md mx-4 text-center shadow-2xl">
            <div className="animate-bounce">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-3xl font-bold text-gray-800 mb-2">
                {selectedTeam === 'blue' ? 'Green Team' : 'Red Team'} Wins!
              </h2>
              <p className="text-gray-600 mb-6">Congratulations on your victory!</p>
            </div>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => {
                  setShowWinModal(false);
                  reset();
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105"
              >
                🎮 Play Again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Elimination Modal */}
      {showEliminationModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-8 max-w-md mx-4 text-center shadow-2xl">
            <div className="animate-pulse">
              <div className="text-6xl mb-4">💀</div>
              <h2 className="text-3xl font-bold text-red-800 mb-2">
                {selectedTeam === 'blue' ? 'Green Team' : 'Red Team'} Eliminated!
              </h2>
              <p className="text-red-600 mb-6">Better luck next time!</p>
            </div>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => {
                  setShowEliminationModal(false);
                  reset();
                }}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105"
              >
                🔄 Try Again
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


