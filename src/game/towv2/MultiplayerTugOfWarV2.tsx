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
      phase,
      PLAYER_BASE_Y,
      HAND_LOCAL_Y,
      FLOATING_OFFSET
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
      
      // Debug: Log positioning for first player
      if (side === 'left' && playerIndex === 0) {
        console.log('Player positioning debug:', {
          ropeY,
          playerY: currentYRef.current,
          handY: currentYRef.current + HAND_LOCAL_Y,
          phase,
          detached
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
      if (leftHand.current) leftHand.current.position.x = -0.06 + jitter;
      if (rightHand.current) rightHand.current.position.x = 0.06 - jitter;
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
      group.current.rotation.y = rotationY;
    }
  });

  return (
    <group ref={group} position={[x, 0, z]}>
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
      {/* hands gripping rope (around rope along z axis) */}
      <mesh ref={rightHand} position={[0, 1.2, 0.1]}>
        <sphereGeometry args={[0.1, 12, 12]} />
        <meshStandardMaterial color="#eee" />
      </mesh>
      <mesh ref={leftHand} position={[0, 1.2, -0.1]}>
        <sphereGeometry args={[0.1, 12, 12]} />
        <meshStandardMaterial color="#eee" />
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
  const { phase, rope, start, setSelfPulling, countdown, chooseTeam, startGame, reset, winner, players, selectedTeam } = useTowV2() as any;
  const [power, setPower] = useState(0);
  const [detachedRed, setDetachedRed] = useState(false);
  const [detachedBlue, setDetachedBlue] = useState(false);

  useEffect(() => {
    const onDown = () => setPower(p => Math.min(1, p + 0.25));
    window.addEventListener('keydown', onDown);
    window.addEventListener('mousedown', onDown);
    return () => { window.removeEventListener('keydown', onDown); window.removeEventListener('mousedown', onDown); };
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setPower(p => Math.max(0, p - 0.08));
    }, 100);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const pulling = phase === 'pulling' && power > 0.01;
    setSelfPulling(pulling, power);
  }, [phase, power, setSelfPulling]);

  // Trigger detachment based on rope position thresholds (same as win conditions)
  useEffect(() => {
    if (phase === 'pulling' || phase === 'falling') {
      // Red team detaches when rope reaches +0.95 or higher (blue is winning)
      if (!detachedRed && rope >= 0.95) {
        setDetachedRed(true);
      }
      // Blue team detaches when rope reaches -0.95 or lower (red is winning)
      if (!detachedBlue && rope <= -0.95) {
        setDetachedBlue(true);
      }
    } else if (phase === 'lobby' || phase === 'floating') {
      // Only reset detachment when explicitly resetting the game
      setDetachedRed(false);
      setDetachedBlue(false);
    }
    // Don't reset detachment during 'results' phase - let players stay fallen
  }, [phase, rope, detachedRed, detachedBlue]);


  return (
    <div className="w-full h-screen relative bg-black">
      <Canvas
        shadows
        camera={{ position: [0, 10, 30], fov: 55, near: 0.1, far: 2000 }}
        gl={{ toneMapping: THREE.ACESFilmicToneMapping }}
      >
        {/* Squid Game dark violet atmosphere */}
        <color attach="background" args={["#0b0720"]} />
        <fog attach="fog" args={["#0b0720", 20, 120]} />
        {(() => {
          function CameraAutoFrame() {
            const { camera, size } = useThree();
            useEffect(() => {
              const stageWidth = 48; // matches widened stage
              const margin = 8; // extra framing space
              const effectiveWidth = stageWidth + margin;
              const fovRad = (camera.fov * Math.PI) / 180;
              const distance = (effectiveWidth / 2) / Math.tan(fovRad / 2);
              camera.position.set(0, 10, distance);
              camera.lookAt(0, 1.0, 0);
              camera.updateProjectionMatrix();
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

      <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/90 text-sm bg-black/60 px-3 py-1 rounded">
        {phase === 'lobby' && 'Waiting for players...'}
        {phase === 'floating' && 'Players floating above platforms - Get ready!'}
        {phase === 'positioning' && 'Choose your team!'}
        {phase === 'pulling' && 'Tug of War!'}
        {phase === 'falling' && 'Players falling...'}
        {phase === 'results' && `Winner: ${winner === 'blue' ? 'Green' : winner === 'red' ? 'Red' : '—'}`}
      </div>
      <div className="absolute top-4 left-4 flex gap-2">
        {phase === 'floating' && (
          <button className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-1 rounded" onClick={start}>Choose your Team</button>
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
            <button 
              className={`px-3 py-1 rounded text-white font-semibold transition-all duration-200 ${
                selectedTeam 
                  ? 'bg-blue-600 hover:bg-blue-700 hover:scale-105' 
                  : 'bg-gray-500 cursor-not-allowed opacity-50'
              }`}
              onClick={startGame}
              disabled={!selectedTeam}
            >
              Start Tug of War
            </button>
          </>
        )}
        <button className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded" onClick={reset}>Reset</button>
      </div>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/90 text-sm bg-black/60 px-3 py-2 rounded">
        {phase !== 'results' ? (
          <>Power: {(power*100).toFixed(0)}% — click or press any key rapidly to pull</>
        ) : (
          <>Winner: {winner === 'blue' ? 'Green' : winner === 'red' ? 'Red' : '—'}</>
        )}
      </div>
    </div>
  );
};


