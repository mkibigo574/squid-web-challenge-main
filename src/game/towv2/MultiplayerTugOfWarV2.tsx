import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import { TugOfWarEnvironment } from '../components/TugOfWarEnvironment';
import { useTowV2 } from './useTowV2';

// Fresh minimal Tug of War V2 scene scaffold
// World height refs
const PLATFORM_TOP_Y = 7.2; // platforms positioned on top of supporting poles
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
      // Follow rope-driven position/animation - optimized for performance
      currentXRef.current = x;
      const sideSign = side === 'left' ? -1 : 1;
      const lean = sideSign * effort * 0.32 + Math.sin(t * 4 + (x + z)) * 0.05 * effort; // Reduced frequency
      const bob = Math.sin(t * 6 + x) * 0.06 * effort; // Reduced frequency
      
      // Handle floating phase (floating during floating and positioning phases)
      let baseY = PLAYER_BASE_Y;
      if (phase === 'floating' || phase === 'positioning') {
        baseY = PLAYER_BASE_Y + FLOATING_OFFSET;
        // Gentle floating animation - optimized
        const floatBob = Math.sin(t * 2) * 0.1; // Reduced frequency
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
  const navigate = useNavigate();
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
  const [forceUpdate, setForceUpdate] = useState(0);
  const [keyPressFeedback, setKeyPressFeedback] = useState(false);
<<<<<<< HEAD
=======
  
  // Audio management
  const audioRef = useRef<{ [key: string]: HTMLAudioElement }>({});
  const [isMuted, setIsMuted] = useState(false);
  const fadeOutIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize audio
  useEffect(() => {
    console.log('🎵 Initializing audio...');
    audioRef.current = {
      winGame: new Audio('/audio/win_game.wav'),
      buzzer: new Audio('/audio/Buzzer.wav'),
      tugging: new Audio('/audio/tugging_sound.wav'),
    };

    // Configure audio and add event listeners for debugging
    Object.entries(audioRef.current).forEach(([key, audio]) => {
      audio.volume = 0.7;
      audio.muted = isMuted;
      
      // Add event listeners for debugging
      audio.addEventListener('loadstart', () => console.log(`${key} audio: loadstart`));
      audio.addEventListener('loadeddata', () => console.log(`${key} audio: loadeddata`));
      audio.addEventListener('canplay', () => console.log(`${key} audio: canplay`));
      audio.addEventListener('canplaythrough', () => console.log(`${key} audio: canplaythrough`));
      audio.addEventListener('error', (e) => console.error(`${key} audio error:`, e));
      audio.addEventListener('play', () => console.log(`${key} audio: play started`));
      audio.addEventListener('ended', () => console.log(`${key} audio: ended`));
    });

    return () => {
      Object.values(audioRef.current).forEach(audio => {
        audio.pause();
        audio.currentTime = 0;
      });
      // Clear any fade out interval
      if (fadeOutIntervalRef.current) {
        clearInterval(fadeOutIntervalRef.current);
        fadeOutIntervalRef.current = null;
      }
    };
  }, []);

  // Update audio mute state
  useEffect(() => {
    Object.values(audioRef.current).forEach(audio => {
      audio.muted = isMuted;
    });
    console.log(`Audio ${isMuted ? 'muted' : 'unmuted'}`);
  }, [isMuted]);

  // Play win sound
  const playWinSound = () => {
    console.log('🎉 Attempting to play win sound...');
    const winAudio = audioRef.current.winGame;
    console.log('Win audio object:', winAudio);
    console.log('Win audio src:', winAudio?.src);
    console.log('Win audio muted:', winAudio?.muted);
    console.log('Win audio volume:', winAudio?.volume);
    console.log('Win audio readyState:', winAudio?.readyState);
    
    if (winAudio && winAudio.src) {
      // Ensure audio is not muted
      winAudio.muted = false;
      winAudio.currentTime = 0;
      
      // Try to play the audio
      const playPromise = winAudio.play();
      
      if (playPromise !== undefined) {
        playPromise.then(() => {
          console.log('✅ Win audio played successfully!');
        }).catch((error) => {
          console.log('❌ Win audio play failed:', error);
          // Try to load the audio again if it failed
          winAudio.load();
        });
      }
    } else {
      console.log('❌ Win audio not available or no src');
    }
  };

  // Play buzzer sound
  const playBuzzerSound = () => {
    const buzzerAudio = audioRef.current.buzzer;
    if (buzzerAudio && buzzerAudio.src) {
      buzzerAudio.currentTime = 0;
      buzzerAudio.play().catch(() => {
        console.log('Buzzer audio play failed (autoplay restrictions)');
      });
    }
  };

  // Play tugging sound
  const playTuggingSound = () => {
    const tuggingAudio = audioRef.current.tugging;
    if (tuggingAudio && tuggingAudio.src && phase === 'pulling') {
      tuggingAudio.currentTime = 0;
      tuggingAudio.volume = 0.7;
      tuggingAudio.muted = isMuted;
      tuggingAudio.play().catch(() => {
        console.log('Tugging audio play failed (autoplay restrictions)');
      });
    }
  };

  // Stop tugging sound with fade out
  const stopTuggingSound = () => {
    const tuggingAudio = audioRef.current.tugging;
    if (tuggingAudio && !tuggingAudio.paused) {
      // Clear any existing fade out interval
      if (fadeOutIntervalRef.current) {
        clearInterval(fadeOutIntervalRef.current);
      }
      
      // Fade out over 0.5 seconds
      const fadeOutDuration = 500; // milliseconds
      const startVolume = tuggingAudio.volume;
      const fadeOutSteps = 20; // Number of steps for smooth fade
      const stepDuration = fadeOutDuration / fadeOutSteps;
      const volumeDecrement = startVolume / fadeOutSteps;
      
      let currentStep = 0;
      fadeOutIntervalRef.current = setInterval(() => {
        currentStep++;
        const newVolume = Math.max(0, startVolume - (volumeDecrement * currentStep));
        tuggingAudio.volume = newVolume;
        
        if (currentStep >= fadeOutSteps || newVolume <= 0) {
          if (fadeOutIntervalRef.current) {
            clearInterval(fadeOutIntervalRef.current);
            fadeOutIntervalRef.current = null;
          }
          tuggingAudio.pause();
          tuggingAudio.currentTime = 0;
          tuggingAudio.volume = 0.7; // Reset volume for next time
        }
      }, stepDuration);
    }
  };
>>>>>>> 3a81eb1 (Implemented tugging sound with fade out effect.  Added win_game.wav for winning teams. Added buzzer.wav for losing teams. Enhanced elimination modal for losing teams. Updated player models to use Supabase models with standing animations. Added audio mute/unmute functionality. Improved tug of war game experience with proper sound effects)

  // Handle new tournament - reset and start fresh
  const handleNewTournament = () => {
    console.log('Starting new tournament...');
    resetTournament();
    // Initialize a fresh tournament
    setTimeout(() => {
      initializeTournament();
    }, 100);
  };

  // Handle go to lobby - navigate back to lobby room
  const handleGoToLobby = () => {
    console.log('Navigating to lobby...');
    resetTournament();
    navigate('/lobby');
  };

  useEffect(() => {
    const pressedKeys = new Set<string>();
    let lastInputTime = 0;
    const inputCooldown = 200; // 200ms cooldown between inputs (increased to prevent rapid tapping)
    
    const onKeyDown = (e: KeyboardEvent) => {
      // Only respond to 'W' key or 'Up arrow' key
      if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') {
        // Prevent default to avoid multiple keydown events
        e.preventDefault();
        
        // Check if key is already being held down (cheating prevention)
        if (pressedKeys.has(e.key.toLowerCase())) {
          return; // Ignore if key is already pressed
        }
        
        // Add key to pressed set
        pressedKeys.add(e.key.toLowerCase());
        
        const now = Date.now();
        if (now - lastInputTime >= inputCooldown) {
          lastInputTime = now;
          // Single key press - add power once
          setPower(p => Math.min(1, p + 0.3)); // Increased power per press since no holding allowed
          
<<<<<<< HEAD
=======
          // Play tugging sound on key press
          playTuggingSound();
          
>>>>>>> 3a81eb1 (Implemented tugging sound with fade out effect.  Added win_game.wav for winning teams. Added buzzer.wav for losing teams. Enhanced elimination modal for losing teams. Updated player models to use Supabase models with standing animations. Added audio mute/unmute functionality. Improved tug of war game experience with proper sound effects)
          // Show visual feedback for key press
          setKeyPressFeedback(true);
          setTimeout(() => setKeyPressFeedback(false), 150);
        }
      }
    };
    
    const onKeyUp = (e: KeyboardEvent) => {
      // Remove key from pressed set when released
      if (e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') {
        pressedKeys.delete(e.key.toLowerCase());
<<<<<<< HEAD
=======
        // Stop tugging sound on key release
        stopTuggingSound();
>>>>>>> 3a81eb1 (Implemented tugging sound with fade out effect.  Added win_game.wav for winning teams. Added buzzer.wav for losing teams. Enhanced elimination modal for losing teams. Updated player models to use Supabase models with standing animations. Added audio mute/unmute functionality. Improved tug of war game experience with proper sound effects)
      }
    };
    
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    
    return () => { 
      window.removeEventListener('keydown', onKeyDown); 
      window.removeEventListener('keyup', onKeyUp);
    };
<<<<<<< HEAD
  }, []);
=======
  }, [phase, isMuted]);
>>>>>>> 3a81eb1 (Implemented tugging sound with fade out effect.  Added win_game.wav for winning teams. Added buzzer.wav for losing teams. Enhanced elimination modal for losing teams. Updated player models to use Supabase models with standing animations. Added audio mute/unmute functionality. Improved tug of war game experience with proper sound effects)

  useEffect(() => {
    const id = setInterval(() => {
      setPower(p => Math.max(0, p - 0.08)); // Balanced decay rate for single key presses
    }, 100);
    return () => clearInterval(id);
  }, []);

  // Force UI update when team players change to ensure eliminated players are properly reflected
  useEffect(() => {
    setForceUpdate(prev => prev + 1);
  }, [redTeamPlayers, blueTeamPlayers]);

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
<<<<<<< HEAD
=======
        // Play buzzer sound for elimination
        playBuzzerSound();
>>>>>>> 3a81eb1 (Implemented tugging sound with fade out effect.  Added win_game.wav for winning teams. Added buzzer.wav for losing teams. Enhanced elimination modal for losing teams. Updated player models to use Supabase models with standing animations. Added audio mute/unmute functionality. Improved tug of war game experience with proper sound effects)
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
<<<<<<< HEAD
=======
        // Play buzzer sound for elimination
        playBuzzerSound();
>>>>>>> 3a81eb1 (Implemented tugging sound with fade out effect.  Added win_game.wav for winning teams. Added buzzer.wav for losing teams. Enhanced elimination modal for losing teams. Updated player models to use Supabase models with standing animations. Added audio mute/unmute functionality. Improved tug of war game experience with proper sound effects)
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
<<<<<<< HEAD
=======
        // Play win sound for winning team
        playWinSound();
>>>>>>> 3a81eb1 (Implemented tugging sound with fade out effect.  Added win_game.wav for winning teams. Added buzzer.wav for losing teams. Enhanced elimination modal for losing teams. Updated player models to use Supabase models with standing animations. Added audio mute/unmute functionality. Improved tug of war game experience with proper sound effects)
        // Add a small delay to ensure the modal shows properly
        setTimeout(() => {
          setShowWinModal(true);
        }, 100);
      } else {
        console.log('Not showing win modal - different team');
      }
    }
  }, [phase, winner, selectedTeam]);

<<<<<<< HEAD
=======
  // Play win sound when round results phase starts - for winning team
  useEffect(() => {
    console.log('Round results effect:', { phase, roundResults, selectedTeam });
    if (phase === 'round-results' && roundResults.length > 0) {
      const latestResult = roundResults[roundResults.length - 1];
      console.log('Round results phase with winner:', latestResult.winner, 'selectedTeam:', selectedTeam);
      // Play win sound only for the winning team
      if (selectedTeam === latestResult.winner) {
        console.log('Playing win sound for round winner');
        playWinSound();
      }
    }
  }, [phase, roundResults, selectedTeam]);

  // Play win sound when tournament winner is determined - for winning team
  useEffect(() => {
    console.log('Tournament winner effect:', { phase, tournamentWinner, selectedTeam });
    if (phase === 'tournament-winner' && tournamentWinner) {
      console.log('Tournament winner determined:', tournamentWinner, 'selectedTeam:', selectedTeam);
      // Play win sound only for the winning team
      if (selectedTeam === tournamentWinner) {
        console.log('Playing win sound for tournament winner');
        playWinSound();
      }
    }
  }, [phase, tournamentWinner, selectedTeam]);

>>>>>>> 3a81eb1 (Implemented tugging sound with fade out effect.  Added win_game.wav for winning teams. Added buzzer.wav for losing teams. Enhanced elimination modal for losing teams. Updated player models to use Supabase models with standing animations. Added audio mute/unmute functionality. Improved tug of war game experience with proper sound effects)
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
<<<<<<< HEAD
=======
        {/* Audio Mute/Unmute Button */}
        <button
          onClick={() => setIsMuted(!isMuted)}
          className={`px-3 py-1 rounded text-white font-semibold transition-all duration-200 ${
            isMuted 
              ? 'bg-red-600 hover:bg-red-700' 
              : 'bg-green-600 hover:bg-green-700'
          }`}
          title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
        >
          {isMuted ? '🔇' : '🔊'}
        </button>
        
>>>>>>> 3a81eb1 (Implemented tugging sound with fade out effect.  Added win_game.wav for winning teams. Added buzzer.wav for losing teams. Enhanced elimination modal for losing teams. Updated player models to use Supabase models with standing animations. Added audio mute/unmute functionality. Improved tug of war game experience with proper sound effects)
        {phase === 'floating' && (
          <button className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded" onClick={start}>
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
                  ? 'bg-blue-500 scale-110 shadow-lg ring-2 ring-blue-300 ring-opacity-50' 
                  : 'bg-blue-600 hover:bg-blue-700 hover:scale-105'
              }`}
              onClick={() => chooseTeam('blue')}
            >
              {selectedTeam === 'blue' ? '✓ Blue Team' : 'Join Blue'}
            </button>
          </>
        )}
        {phase === 'lobby' && (
          <button className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded" onClick={initializeTournament}>Start Tournament</button>
        )}
        {phase === 'tournament' && (
          <button className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded" onClick={selectRoundPlayers}>Select Round Players</button>
        )}
        {tournamentMode && (
          <button className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded" onClick={handleGoToLobby}>End Tournament</button>
        )}
      </div>
      
          {/* Start Round button - centered when team is selected in tournament mode */}
          {phase === 'positioning' && selectedTeam && tournamentMode && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ transform: 'translate(-50%, calc(-50% - 25rem))' }}>
              <button 
                className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-black text-2xl px-12 py-6 rounded-2xl shadow-2xl transform hover:scale-110 transition-all duration-300 border-4 border-purple-400 animate-pulse"
                onClick={startGame}
              >
                🎮 Start Round 🎮
              </button>
            </div>
          )}
      
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-black/90 text-sm bg-white/90 px-3 py-2 rounded border border-gray-400 shadow-lg">
        {phase !== 'results' && (
          <div className="flex items-center gap-2">
            <span>Power: {Math.round((phase === 'pulling' ? power : 0)*100)}%</span>
            {keyPressFeedback && (
              <span className="text-green-600 font-bold animate-pulse">✓ PRESS!</span>
            )}
            <span className="text-xs text-gray-600">— press W or ↑ rapidly to pull (no holding!)</span>
          </div>
        )}
      </div>

      {/* Tournament Info Panel */}
      {tournamentMode && (
        <div key={`tournament-info-${forceUpdate}`} className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-gradient-to-br from-white via-gray-50 to-white rounded-xl p-3 border-2 border-purple-300 shadow-2xl max-w-sm transform transition-all duration-300 hover:scale-105 z-50 backdrop-blur-sm">
          {/* Animated background pattern */}
          <div className="absolute inset-0 bg-gradient-to-r from-purple-100 via-pink-100 to-purple-100 rounded-2xl opacity-30 animate-pulse"></div>
          
          <div className="relative z-10">
            <div className="flex items-center justify-center mb-2">
              <div className="text-xl mr-1 animate-spin">🏆</div>
              <h3 className="font-black text-lg bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Tournament Progress
              </h3>
            </div>
            
            <div className="bg-white/95 rounded-lg p-2 shadow-inner border border-gray-200">
              <div className="text-center mb-2">
                <div className="text-xl font-bold text-purple-700 mb-1">Round {currentRound}</div>
                <div className="w-full bg-gray-200 rounded-full h-1.5 mb-1">
                  <div 
                    className="bg-gradient-to-r from-purple-500 to-pink-500 h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min((currentRound / 10) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div className="text-center bg-red-50 rounded p-2 border border-red-200">
                  <div className="text-lg mb-1">🔴</div>
                  <div className="font-bold text-red-700 text-sm">Red Team</div>
                  <div className="text-sm font-black text-red-800">
                    {redTeamPlayers.filter(p => !p.isEliminated).length}/9
                  </div>
                </div>
                <div className="text-center bg-blue-50 rounded p-2 border border-blue-200">
                  <div className="text-lg mb-1">🔵</div>
                  <div className="font-bold text-blue-700 text-sm">Blue Team</div>
                  <div className="text-sm font-black text-blue-800">
                    {blueTeamPlayers.filter(p => !p.isEliminated).length}/9
                  </div>
                </div>
              </div>
              
            {selectedRedPlayers.length > 0 && (
                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded p-2 border border-yellow-300">
                  <div className="text-center font-bold text-yellow-800 text-xs mb-1">Round {currentRound} Players</div>
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    <div className="bg-red-100 rounded p-1">
                      <div className="font-semibold text-red-700">Red: {selectedRedPlayers.map(p => p.playerNumber).join(', ')}</div>
                </div>
                    <div className="bg-green-100 rounded p-1">
                      <div className="font-semibold text-green-700">Blue: {selectedBluePlayers.map(p => p.playerNumber).join(', ')}</div>
                    </div>
                </div>
              </div>
            )}
            </div>
          </div>
        </div>
      )}

      {/* Red Team Roster - Left Side */}
      {tournamentMode && redTeamPlayers.length > 0 && (
        <div key={`red-team-${forceUpdate}`} className="absolute top-14 left-2 bg-gradient-to-br from-red-50 via-red-100 to-red-50 rounded-xl p-2 border-2 border-red-400 shadow-lg max-w-xs transform transition-all duration-300 hover:scale-105">
          {/* Animated background */}
          <div className="absolute inset-0 bg-gradient-to-r from-red-200 via-pink-200 to-red-200 rounded-2xl opacity-20 animate-pulse"></div>
          
          <div className="relative z-10">
            <div className="flex items-center justify-center mb-2">
              <div className="text-lg mr-1 animate-bounce">🔴</div>
              <h4 className="font-black text-sm bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent">
                Red Team
              </h4>
              <div className="ml-1 bg-red-600 text-white px-2 py-0.5 rounded-full text-xs font-bold">
                {redTeamPlayers.filter(p => !p.isEliminated).length}/9
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-1">
            {redTeamPlayers.map((player) => (
              <div
                key={player.id}
                  className={`p-1 rounded text-center font-bold text-xs transform transition-all duration-300 hover:scale-110 ${
                  player.isEliminated 
                      ? 'bg-red-200 text-red-500 line-through opacity-60' 
                    : selectedRedPlayers.some(p => p.id === player.id)
                      ? 'bg-gradient-to-br from-red-600 to-red-700 text-white shadow-lg animate-pulse'
                      : 'bg-gradient-to-br from-red-100 to-red-200 text-red-700 hover:from-red-200 hover:to-red-300'
                  }`}
                >
                  <div className="text-sm">👤</div>
                  <div>P{player.playerNumber}</div>
                  {selectedRedPlayers.some(p => p.id === player.id) && (
                    <div className="text-xs mt-0.5">⭐</div>
                  )}
              </div>
            ))}
            </div>
            
            {/* Team status indicator */}
            <div className="mt-1 text-center">
              <div className="text-xs text-red-600 font-semibold">
                {redTeamPlayers.filter(p => !p.isEliminated).length >= 3 ? '✅ Ready' : '❌ Insufficient Players'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Blue Team Roster - Right Side */}
      {tournamentMode && blueTeamPlayers.length > 0 && (
        <div key={`blue-team-${forceUpdate}`} className="absolute top-14 right-2 bg-gradient-to-br from-blue-50 via-blue-100 to-blue-50 rounded-xl p-2 border-2 border-blue-400 shadow-lg max-w-xs transform transition-all duration-300 hover:scale-105">
          {/* Animated background */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-200 via-blue-300 to-blue-200 rounded-2xl opacity-20 animate-pulse"></div>
          
          <div className="relative z-10">
            <div className="flex items-center justify-center mb-2">
              <div className="text-lg mr-1 animate-bounce">🔵</div>
              <h4 className="font-black text-sm bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                Blue Team
              </h4>
              <div className="ml-1 bg-blue-600 text-white px-2 py-0.5 rounded-full text-xs font-bold">
                {blueTeamPlayers.filter(p => !p.isEliminated).length}/9
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-1">
            {blueTeamPlayers.map((player) => (
              <div
                key={player.id}
                  className={`p-1 rounded text-center font-bold text-xs transform transition-all duration-300 hover:scale-110 ${
                  player.isEliminated 
                      ? 'bg-green-200 text-green-500 line-through opacity-60' 
                    : selectedBluePlayers.some(p => p.id === player.id)
                      ? 'bg-gradient-to-br from-green-600 to-green-700 text-white shadow-lg animate-pulse'
                      : 'bg-gradient-to-br from-green-100 to-green-200 text-green-700 hover:from-green-200 hover:to-green-300'
                  }`}
                >
                  <div className="text-sm">👤</div>
                  <div>P{player.playerNumber}</div>
                  {selectedBluePlayers.some(p => p.id === player.id) && (
                    <div className="text-xs mt-0.5">⭐</div>
                  )}
              </div>
            ))}
            </div>
            
            {/* Team status indicator */}
            <div className="mt-1 text-center">
              <div className="text-xs text-green-600 font-semibold">
                {blueTeamPlayers.filter(p => !p.isEliminated).length >= 3 ? '✅ Ready' : '❌ Insufficient Players'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Round Results Panel */}
      {phase === 'round-results' && roundResults.length > 0 && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-br from-white via-gray-50 to-white rounded-3xl p-8 border-4 border-purple-300 shadow-2xl max-w-lg transform transition-all duration-500 animate-pulse">
          {/* Animated background */}
          <div className="absolute inset-0 bg-gradient-to-r from-purple-100 via-pink-100 to-purple-100 rounded-3xl opacity-30 animate-pulse"></div>
          
          <div className="relative z-10">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4 animate-bounce">
              {roundResults[roundResults.length - 1].winner === 'red' ? '🔴' : '🔵'} 
              </div>
              <h3 className="font-black text-3xl bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
                Round {roundResults[roundResults.length - 1].roundNumber} Results
              </h3>
            </div>
            
            <div className="bg-white/90 rounded-2xl p-6 shadow-inner">
              <div className="text-center mb-6">
                <div className="text-4xl font-black mb-2">
              {roundResults[roundResults.length - 1].winner === 'red' ? 'Red Team' : 'Blue Team'} Wins!
            </div>
                <div className="text-2xl mb-4">
                  {roundResults[roundResults.length - 1].winner === 'red' ? '🔴' : '🔵'}
            </div>
              </div>
              
              <div className="bg-gradient-to-r from-red-50 to-green-50 rounded-xl p-4 mb-4">
                <div className="text-center font-bold text-gray-800 mb-2">Eliminated Players</div>
                <div className="text-sm text-gray-700">
                  {roundResults[roundResults.length - 1].eliminatedPlayers.map(p => 
                    `${p.team === 'red' ? '🔴' : '🔵'} ${p.team === 'red' ? 'Red' : 'Blue'} P${p.playerNumber}`
                  ).join(', ')}
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-lg font-bold text-purple-700 mb-2">Next Round Starting...</div>
                <div className="flex justify-center items-center">
                  <div className="animate-spin text-2xl mr-2">⏳</div>
                  <div className="text-sm text-gray-600">3 seconds</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tournament Winner Modal */}
      {phase === 'tournament-winner' && tournamentWinner && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
        {/* Money Rain Background - Optimized for performance */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {Array.from({ length: 15 }, (_, i) => (
            <div
              key={i}
              className="absolute text-4xl opacity-90 money-rain"
              style={{
                left: `${Math.random() * 100}%`,
                top: '-10%',
                animationDuration: `${3 + Math.random() * 2}s`,
                animationDelay: `${Math.random() * 5}s`,
                transform: `rotate(${Math.random() * 360}deg)`,
              }}
            >
              💵
            </div>
          ))}
          {Array.from({ length: 10 }, (_, i) => (
            <div
              key={`coin-${i}`}
              className="absolute text-3xl opacity-80 money-rain"
              style={{
                left: `${Math.random() * 100}%`,
                top: '-10%',
                animationDuration: `${2.5 + Math.random() * 1.5}s`,
                animationDelay: `${Math.random() * 4}s`,
                transform: `rotate(${Math.random() * 360}deg)`,
              }}
            >
              🪙
            </div>
          ))}
          {Array.from({ length: 8 }, (_, i) => (
            <div
              key={`bill-${i}`}
              className="absolute text-2xl opacity-70 money-rain"
              style={{
                left: `${Math.random() * 100}%`,
                top: '-10%',
                animationDuration: `${4 + Math.random() * 2}s`,
                animationDelay: `${Math.random() * 6}s`,
                transform: `rotate(${Math.random() * 360}deg)`,
              }}
            >
              💴
            </div>
          ))}
        </div>
          
          {/* Main Modal */}
          <div className="relative bg-gradient-to-br from-yellow-400 via-yellow-300 to-yellow-500 rounded-3xl p-8 max-w-lg mx-4 text-center shadow-2xl border-4 border-yellow-600 animate-pulse">
            {/* Confetti Effect */}
            <div className="absolute -top-4 -left-4 -right-4 -bottom-4 bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 to-blue-500 rounded-3xl opacity-20 animate-spin"></div>
            
            <div className="relative z-10">
              {/* Trophy with animation */}
              <div className="text-8xl mb-6 animate-bounce">
                🏆
              </div>
              
              {/* Winner announcement with glow effect */}
              <h2 className="text-4xl font-black text-gray-900 mb-4 drop-shadow-lg">
                <span className="bg-gradient-to-r from-red-600 via-purple-600 to-blue-600 bg-clip-text text-transparent">
                  {tournamentWinner === 'red' ? 'RED TEAM' : 'BLUE TEAM'}
                </span>
                <br />
                <span className="text-2xl text-gray-800">WINS TOURNAMENT!</span>
            </h2>
              
              {/* Celebration text */}
              <div className="text-2xl mb-6 text-gray-800 font-bold">
                🎉 CONGRATULATIONS! 🎉
              </div>
              
              {/* Prize money display */}
              <div className="bg-gradient-to-r from-green-400 to-green-600 text-white rounded-2xl p-4 mb-6 shadow-lg">
                <div className="text-3xl font-black">💰 $45,600,000,000 💰</div>
                <div className="text-lg font-semibold">Prize Money Won!</div>
              </div>
              
              {/* Action buttons with enhanced styling */}
            <div className="flex gap-4 justify-center">
              <button
                  onClick={handleNewTournament}
                  className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-bold py-4 px-8 rounded-2xl transition-all duration-300 transform hover:scale-110 shadow-xl border-2 border-purple-800"
              >
                🏆 New Tournament
              </button>
              <button
                  onClick={handleGoToLobby}
                  className="bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-bold py-4 px-8 rounded-2xl transition-all duration-300 transform hover:scale-110 shadow-xl border-2 border-gray-800"
                >
                  🏠 Go to Lobby
              </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Win Modal */}
      {showWinModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          {/* Money Rain Background */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {Array.from({ length: 9 }, (_, i) => (
              <div
                key={i}
                className="absolute text-3xl opacity-80 money-rain"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: '-10%',
                  animationDuration: `${2.5 + Math.random() * 1.5}s`,
                  animationDelay: `${Math.random() * 3}s`,
                  transform: `rotate(${Math.random() * 360}deg)`,
                }}
              >
                💵
              </div>
            ))}
            {Array.from({ length: 6 }, (_, i) => (
              <div
                key={`coin-${i}`}
                className="absolute text-2xl opacity-70 money-rain"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: '-10%',
                  animationDuration: `${2 + Math.random() * 1}s`,
                  animationDelay: `${Math.random() * 2.5}s`,
                  transform: `rotate(${Math.random() * 360}deg)`,
                }}
              >
                🪙
              </div>
            ))}
            {Array.from({ length: 4 }, (_, i) => (
              <div
                key={`bill-${i}`}
                className="absolute text-xl opacity-60 money-rain"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: '-10%',
                  animationDuration: `${3 + Math.random() * 1.5}s`,
                  animationDelay: `${Math.random() * 4}s`,
                  transform: `rotate(${Math.random() * 360}deg)`,
                }}
              >
                💴
              </div>
            ))}
          </div>
          
          <div className="relative bg-gradient-to-br from-green-400 via-green-300 to-green-500 rounded-3xl p-6 max-w-md mx-4 text-center shadow-2xl border-4 border-green-600 animate-pulse">
            {/* Confetti Effect */}
            <div className="absolute -top-2 -left-2 -right-2 -bottom-2 bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 to-blue-500 rounded-3xl opacity-15 animate-spin"></div>
            
            <div className="relative z-10">
            <div className="animate-bounce">
                <div className="text-7xl mb-4">🎉</div>
                <h2 className="text-3xl font-black text-gray-900 mb-2 drop-shadow-lg">
                  <span className="bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                    {selectedTeam === 'blue' ? 'BLUE TEAM' : 'RED TEAM'}
                  </span>
                  <br />
                  <span className="text-xl text-gray-800">WINS!</span>
              </h2>
                <p className="text-lg text-gray-800 font-bold mb-4">🎊 Congratulations! 🎊</p>
            </div>
              
              {/* Prize money display */}
              <div className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-gray-900 rounded-xl p-3 mb-4 shadow-lg">
                <div className="text-xl font-black">💰 $1,000,000 💰</div>
                <div className="text-sm font-semibold">Round Prize!</div>
              </div>
              
              <div className="flex gap-3 justify-center">
              <button
                onClick={() => {
                  setShowWinModal(false);
                }}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-110 shadow-lg border-2 border-blue-800"
              >
                🎮 Play Again
              </button>
                <button
                  onClick={handleGoToLobby}
                  className="bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-110 shadow-lg border-2 border-gray-800"
                >
                  🏠 Go to Lobby
              </button>
              </div>
            </div>
          </div>
        </div>
      )}

<<<<<<< HEAD
      {/* Elimination Modal */}
      {showEliminationModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-8 max-w-md mx-4 text-center shadow-2xl">
            <div className="animate-pulse">
              <div className="text-6xl mb-4">💀</div>
              <h2 className="text-3xl font-bold text-red-800 mb-2">
                {selectedTeam === 'blue' ? 'Blue Team' : 'Red Team'} Eliminated!
              </h2>
              <p className="text-red-600 mb-6">Better luck next time!</p>
            </div>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => {
                  setShowEliminationModal(false);
                }}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105"
              >
                🔄 Try Again
              </button>
              <button
                onClick={handleGoToLobby}
                className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105"
              >
                🏠 Go to Lobby
              </button>
=======
      {/* Enhanced Elimination Modal for Losing Teams */}
      {showEliminationModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          {/* Dramatic Background Effects */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {/* Falling debris effect */}
            {Array.from({ length: 12 }, (_, i) => (
              <div
                key={i}
                className="absolute text-2xl opacity-60 falling-debris"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: '-10%',
                  animationDuration: `${3 + Math.random() * 2}s`,
                  animationDelay: `${Math.random() * 2}s`,
                  transform: `rotate(${Math.random() * 360}deg)`,
                }}
              >
                {['💥', '🔥', '💀', '⚡', '💔', '❌'][Math.floor(Math.random() * 6)]}
              </div>
            ))}
            {/* Dark smoke effect */}
            {Array.from({ length: 8 }, (_, i) => (
              <div
                key={`smoke-${i}`}
                className="absolute text-3xl opacity-30 smoke-effect"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDuration: `${4 + Math.random() * 2}s`,
                  animationDelay: `${Math.random() * 3}s`,
                }}
              >
                ☁️
              </div>
            ))}
          </div>
          
          {/* Main Modal */}
          <div className="relative bg-gradient-to-br from-red-900 via-red-800 to-red-900 rounded-3xl p-8 max-w-lg mx-4 text-center shadow-2xl border-4 border-red-600 animate-pulse">
            {/* Dramatic border effect */}
            <div className="absolute -top-4 -left-4 -right-4 -bottom-4 bg-gradient-to-r from-red-600 via-red-700 to-red-600 rounded-3xl opacity-20 animate-pulse"></div>
            
            <div className="relative z-10">
              {/* Animated elimination icon */}
              <div className="text-8xl mb-6 animate-bounce">
                💀
              </div>
              
              {/* Team elimination announcement */}
              <h2 className="text-4xl font-black text-white mb-4 drop-shadow-lg">
                <span className="bg-gradient-to-r from-red-300 to-red-100 bg-clip-text text-transparent">
                  {selectedTeam === 'blue' ? 'BLUE TEAM' : 'RED TEAM'}
                </span>
                <br />
                <span className="text-3xl text-red-200">ELIMINATED!</span>
              </h2>
              
              {/* Dramatic message */}
              <div className="bg-red-900/50 rounded-2xl p-6 mb-6 border-2 border-red-700">
                <p className="text-2xl text-red-100 font-bold mb-2">💔 GAME OVER 💔</p>
                <p className="text-lg text-red-200 mb-4">
                  After 3 rounds of intense competition, your team has been eliminated from the tournament.
                </p>
                <div className="text-sm text-red-300">
                  The Squid Game is unforgiving. Only the strongest survive.
                </div>
              </div>
              
              {/* Elimination statistics */}
              <div className="bg-black/30 rounded-xl p-4 mb-6 border border-red-600">
                <div className="text-red-200 font-semibold mb-2">Tournament Statistics</div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="text-red-300">
                    <div className="font-bold">Rounds Played:</div>
                    <div className="text-red-100">3</div>
                  </div>
                  <div className="text-red-300">
                    <div className="font-bold">Final Status:</div>
                    <div className="text-red-100">Eliminated</div>
                  </div>
                </div>
              </div>
              
              {/* Action buttons with enhanced styling */}
              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => {
                    setShowEliminationModal(false);
                  }}
                  className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold py-4 px-8 rounded-2xl transition-all duration-300 transform hover:scale-110 shadow-xl border-2 border-red-800"
                >
                  🔄 Try Again
                </button>
                <button
                  onClick={handleGoToLobby}
                  className="bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-bold py-4 px-8 rounded-2xl transition-all duration-300 transform hover:scale-110 shadow-xl border-2 border-gray-800"
                >
                  🏠 Return to Lobby
                </button>
              </div>
>>>>>>> 3a81eb1 (Implemented tugging sound with fade out effect.  Added win_game.wav for winning teams. Added buzzer.wav for losing teams. Enhanced elimination modal for losing teams. Updated player models to use Supabase models with standing animations. Added audio mute/unmute functionality. Improved tug of war game experience with proper sound effects)
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


