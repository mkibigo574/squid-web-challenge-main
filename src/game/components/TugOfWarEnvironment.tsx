import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { materialManager } from '../utils/materials';
import { lightingManager } from '../utils/lighting';
import { environmentManager } from '../utils/environment';

export const TugOfWarEnvironment = () => {
  const groundRef = useRef<THREE.Mesh>(null);
  const pulseRef = useRef<THREE.Mesh>(null);
  const markerGroupRef = useRef<THREE.Group>(null);
  const chainsawRef = useRef<THREE.Group>(null);
  const { scene } = useThree();
  
  // Setup environment and lighting on mount
  useEffect(() => {
    // Setup lighting
    lightingManager.setupSceneLighting(scene);
    
    // Debug: Log lights to console
    console.log('🔍 TugOfWarEnvironment: Setting up lights...');
    console.log('Scene children count:', scene.children.length);
    
    // Check if spotlights were added
    const spotlights = scene.children.filter(child => child.type === 'SpotLight');
    console.log('Spotlights found:', spotlights.length);
    spotlights.forEach((light, index) => {
      console.log(`Spotlight ${index}:`, {
        position: { x: light.position.x, y: light.position.y, z: light.position.z },
        color: light.color.getHexString(),
        intensity: light.intensity,
        target: light.target ? { x: light.target.position.x, y: light.target.position.y, z: light.target.position.z } : 'No target',
        angle: light.angle,
        penumbra: light.penumbra,
        visible: light.visible
      });
    });
    
    // Setup environment
    environmentManager.setupEnvironment(scene);
    
    return () => {
      // Cleanup if needed
    };
  }, [scene]);
  
  // Pulsing emissive for the hanging midpoint marker
  useFrame((state) => {
    // Update lighting animation
    lightingManager.updateLights(state.clock.elapsedTime);
    
    // Update environment animation
    environmentManager.animateEnvironment(state.clock.elapsedTime);
    
    if (pulseRef.current) {
      const t = state.clock.elapsedTime;
      const intensity = Math.sin(t * 4) * 0.35 + 0.65;
      (pulseRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = intensity;
    }
    if (markerGroupRef.current) {
      const t = state.clock.elapsedTime;
      // Gentle pendulum sway and bob
      markerGroupRef.current.rotation.z = Math.sin(t * 1.2) * 0.08;
      markerGroupRef.current.position.y = 3 + Math.sin(t * 2.0) * 0.06;
    }
    // Rotate the chainsaw chain - fast and dangerous
    if (chainsawRef.current) {
      const t = state.clock.elapsedTime;
      chainsawRef.current.rotation.y = t * 20; // Fast, dangerous rotation
    }
  });

  return (
    <group>
      {/* Background floor to catch stylized lighting */}
      <mesh ref={groundRef} position={[0, -8, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[80, 60]} />
        <primitive object={materialManager.getMaterial('grittySand')} />
      </mesh>

      {/* Central brown stage with gold trim (widened to fit extended teams) */}
      <group position={[0, -6, 0]}>
        {/* Brown deck */}
        <mesh position={[0, 0, 0]} receiveShadow castShadow>
          <boxGeometry args={[48, 0.8, 12]} />
          <primitive object={materialManager.getMaterial('wornWood')} />
        </mesh>
        {/* Gold border */}
        <mesh position={[0, -0.45, 0]} castShadow>
          <boxGeometry args={[49.2, 0.2, 13.2]} />
          <meshStandardMaterial color="#d4a017" metalness={0.8} roughness={0.2} />
        </mesh>
      </group>

      {/* Side platforms - elevated left/right pads with simple scaffold accents (span to platform ends) */}
      <group position={[0, 8, 0]}>
        <mesh position={[-13.5, -1.4, 0]} castShadow receiveShadow>
          <boxGeometry args={[20, 1.2, 6]} />
          <primitive object={materialManager.getMaterial('wornWood')} />
        </mesh>
        <mesh position={[13.5, -1.4, 0]} castShadow receiveShadow>
          <boxGeometry args={[20, 1.2, 6]} />
          <primitive object={materialManager.getMaterial('wornWood')} />
        </mesh>
        {[-13.5, 13.5].map((x) => (
          <group key={x} position={[x, 0, 0]}>
            <mesh position={[0, -1.2, 2.8]}>
              <boxGeometry args={[20, 0.2, 0.2]} />
              <meshStandardMaterial color="#6f5a24" />
        </mesh>
            <mesh position={[0, -1.2, -2.8]}>
              <boxGeometry args={[20, 0.2, 0.2]} />
              <meshStandardMaterial color="#6f5a24" />
        </mesh>
            <mesh position={[9.8, -8.2, 0]}>
              <boxGeometry args={[0.2, 14, 0.2]} />
              <meshStandardMaterial color="#8B4513" />
        </mesh>
            <mesh position={[-9.8, -8.2, 0]}>
              <boxGeometry args={[0.2, 14, 0.2]} />
              <meshStandardMaterial color="#8B4513" />
        </mesh>
            
            {/* Optimized brick wall - simplified for performance */}
            {Array.from({ length: 15 }, (_, layer) => {
              // Reduced layers for better performance
              const layerHeight = -16 + (layer * 1.0); // 15 layers with 1.0 unit spacing
              const isOffsetLayer = layer % 2 === 1; // Offset every other layer
              
              return Array.from({ length: 20 }, (_, i) => {
                const brickX = -9.8 + (i * 1.0); // 20 bricks with 1.0 unit spacing
                const brickY = layerHeight;
                const brickZ = 0;
                const finalX = isOffsetLayer ? brickX + 0.5 : brickX; // Half-brick offset
                
                // Only place brick if it's within the pole gap
                if (finalX >= -9.8 && finalX <= 9.8) {
                  return (
                    <mesh key={`brick-${layer}-${i}`} position={[finalX, brickY, brickZ]} castShadow receiveShadow>
                      <boxGeometry args={[0.8, 0.8, 0.2]} />
                      <primitive object={materialManager.getMaterial('weatheredStone')} />
                    </mesh>
                  );
                }
                return null;
              }).filter(Boolean);
            }).flat()}
          </group>
        ))}
      </group>

      {/* Rope anchors near widened stage edges */}
      <mesh position={[-22, 9.4, 0]}>
        <cylinderGeometry args={[0.18, 0.18, 0.6]} />
        <meshStandardMaterial color="#404040" />
      </mesh>
      <mesh position={[22, 9.4, 0]}>
        <cylinderGeometry args={[0.18, 0.18, 0.6]} />
        <meshStandardMaterial color="#404040" />
      </mesh>

      {/* Central rope anchor - positioned above the rope */}
      <mesh position={[0, 10.0, 0]}>
        <cylinderGeometry args={[0.18, 0.18, 0.6]} />
        <meshStandardMaterial color="#404040" />
      </mesh>

      {/* Optimized rotating chainsaw chain in the center gap */}
      <group ref={chainsawRef} position={[0, -5, 0]}>
        {/* Main cylinder - simplified */}
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.3, 0.3, 7]} />
          <primitive object={materialManager.getMaterial('polishedMetal')} />
        </mesh>
        
        {/* Ultra-simplified blade structure for maximum performance */}
        {Array.from({ length: 2 }, (_, i) => {
          const angle = (i / 2) * Math.PI * 2;
          return (
            <group key={`blade-${i}`} rotation={[0, angle, 0]}>
              {/* Main blade cylinder */}
              <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.3, 0.3, 7]} />
                <meshStandardMaterial color="#ff0000" metalness={0.9} roughness={0.1} />
              </mesh>
              {/* Minimal chain links for performance */}
              {Array.from({ length: 4 }, (_, j) => {
                const linkAngle = (j / 4) * Math.PI * 2;
                const x = Math.cos(linkAngle) * 0.4;
                const z = Math.sin(linkAngle) * 0.4;
                return (
                  <mesh key={`blade-link-${j}`} position={[x, 0, z]} rotation={[0, linkAngle, 0]}>
                    <boxGeometry args={[0.12, 0.2, 0.08]} />
                    <meshStandardMaterial color="#ff0000" metalness={0.9} roughness={0.1} />
                  </mesh>
                );
              })}
              {/* Minimal teeth for performance */}
              {Array.from({ length: 6 }, (_, j) => {
                const toothAngle = (j / 6) * Math.PI * 2;
                const x = Math.cos(toothAngle) * 0.5;
                const z = Math.sin(toothAngle) * 0.5;
                return (
                  <mesh key={`blade-tooth-${j}`} position={[x, 0, z]} rotation={[0, toothAngle, 0]}>
                    <coneGeometry args={[0.06, 0.25, 4]} />
                    <meshStandardMaterial color="#ff0000" metalness={0.9} roughness={0.1} />
                  </mesh>
                );
              })}
            </group>
          );
        })}
        
        {/* Minimal central chain links */}
        {Array.from({ length: 4 }, (_, i) => {
          const angle = (i / 4) * Math.PI * 2;
          const x = Math.cos(angle) * 0.4;
          const z = Math.sin(angle) * 0.4;
          return (
            <mesh key={i} position={[x, 0, z]} rotation={[0, angle, 0]}>
              <boxGeometry args={[0.12, 0.2, 0.08]} />
              <meshStandardMaterial color="#cc0000" metalness={0.9} roughness={0.1} />
            </mesh>
          );
        })}
        {/* Minimal teeth for performance */}
        {Array.from({ length: 6 }, (_, i) => {
          const angle = (i / 6) * Math.PI * 2;
          const x = Math.cos(angle) * 0.5;
          const z = Math.sin(angle) * 0.5;
          return (
            <mesh key={`tooth-${i}`} position={[x, 0, z]} rotation={[0, angle, 0]}>
              <coneGeometry args={[0.06, 0.25, 4]} />
              <meshStandardMaterial color="#ff0000" metalness={0.9} roughness={0.1} />
            </mesh>
          );
        })}
      </group>

      {/* Removed midpoint guillotine/marker for cleaner stage */}

      {/* Skybox system - immersive 3D environment */}
      {/* The skybox is handled by the environmentManager.setupEnvironment() */}
      
      {/* Debug: Very bright test lights that should definitely be visible */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 10, 5]} intensity={2} castShadow />
      
      {/* Super bright center light */}
      <spotLight 
        position={[0, 30, 0]} 
        target-position={[0, 0, 0]}
        color="#ffffff" 
        intensity={10} 
        angle={Math.PI / 4}
        penumbra={0.1}
        castShadow
      />
      
      {/* Very bright red light */}
      <spotLight 
        position={[-20, 25, 15]} 
        target-position={[-10, 0, 0]}
        color="#ff0000" 
        intensity={8} 
        angle={Math.PI / 3}
        penumbra={0.1}
        castShadow
      />
      
      {/* Very bright blue light */}
      <spotLight 
        position={[20, 25, 15]} 
        target-position={[10, 0, 0]}
        color="#0000ff" 
        intensity={8} 
        angle={Math.PI / 3}
        penumbra={0.1}
        castShadow
      />
      
      {/* Additional bright lights for visibility */}
      <pointLight position={[0, 20, 0]} color="#ffff00" intensity={5} />
      <pointLight position={[-10, 15, 0]} color="#ff00ff" intensity={5} />
      <pointLight position={[10, 15, 0]} color="#00ffff" intensity={5} />
    </group>
  );
};


