import * as THREE from 'three';

export class LightingManager {
  private static instance: LightingManager;
  private lights: Map<string, THREE.Light> = new Map();

  constructor() {}

  static getInstance(): LightingManager {
    if (!LightingManager.instance) {
      LightingManager.instance = new LightingManager();
    }
    return LightingManager.instance;
  }

  // Create dynamic sun light
  createSunLight(): THREE.DirectionalLight {
    const sunLight = new THREE.DirectionalLight(0xffffff, 1.5);
    sunLight.position.set(50, 100, 50);
    sunLight.target.position.set(0, 0, 0);
    
    // Configure shadows
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 4096;
    sunLight.shadow.mapSize.height = 4096;
    sunLight.shadow.camera.near = 0.1;
    sunLight.shadow.camera.far = 500;
    sunLight.shadow.camera.left = -100;
    sunLight.shadow.camera.right = 100;
    sunLight.shadow.camera.top = 100;
    sunLight.shadow.camera.bottom = -100;
    sunLight.shadow.bias = -0.0001;
    
    return sunLight;
  }

  // Create ambient light for overall illumination
  createAmbientLight(): THREE.AmbientLight {
    return new THREE.AmbientLight(0x404040, 0.3);
  }

  // Create rim light for dramatic effect
  createRimLight(): THREE.DirectionalLight {
    const rimLight = new THREE.DirectionalLight(0x87CEEB, 0.4);
    rimLight.position.set(-30, 20, -30);
    rimLight.target.position.set(0, 0, 0);
    return rimLight;
  }

  // Create point lights for specific areas
  createChainsawLight(): THREE.PointLight {
    const chainsawLight = new THREE.PointLight(0xff4444, 2, 20);
    chainsawLight.position.set(0, -5, 0);
    chainsawLight.castShadow = true;
    chainsawLight.shadow.mapSize.width = 1024;
    chainsawLight.shadow.mapSize.height = 1024;
    return chainsawLight;
  }

  // Create dramatic arena spotlights for the tugging ground
  createArenaSpotlights(): THREE.SpotLight[] {
    const spotlights: THREE.SpotLight[] = [];

    // Main center spotlight - dramatic overhead
    const centerSpotlight = new THREE.SpotLight(0xffffff, 3, 50, Math.PI / 6, 0.3, 1);
    centerSpotlight.position.set(0, 25, 0);
    centerSpotlight.target.position.set(0, 0, 0);
    centerSpotlight.castShadow = true;
    centerSpotlight.shadow.mapSize.width = 2048;
    centerSpotlight.shadow.mapSize.height = 2048;
    centerSpotlight.shadow.camera.near = 0.1;
    centerSpotlight.shadow.camera.far = 50;
    centerSpotlight.shadow.camera.fov = 30;
    spotlights.push(centerSpotlight);

    // Red team spotlight
    const redSpotlight = new THREE.SpotLight(0xff4444, 2.5, 40, Math.PI / 8, 0.4, 1);
    redSpotlight.position.set(-15, 20, 10);
    redSpotlight.target.position.set(-6, 0, 0);
    redSpotlight.castShadow = true;
    redSpotlight.shadow.mapSize.width = 1024;
    redSpotlight.shadow.mapSize.height = 1024;
    spotlights.push(redSpotlight);

    // Blue team spotlight
    const blueSpotlight = new THREE.SpotLight(0x4444ff, 2.5, 40, Math.PI / 8, 0.4, 1);
    blueSpotlight.position.set(15, 20, 10);
    blueSpotlight.target.position.set(6, 0, 0);
    blueSpotlight.castShadow = true;
    blueSpotlight.shadow.mapSize.width = 1024;
    blueSpotlight.shadow.mapSize.height = 1024;
    spotlights.push(blueSpotlight);

    // Side dramatic spotlights
    const leftSideSpotlight = new THREE.SpotLight(0xffaa00, 2, 35, Math.PI / 10, 0.5, 1);
    leftSideSpotlight.position.set(-25, 15, 5);
    leftSideSpotlight.target.position.set(-3, 0, 0);
    spotlights.push(leftSideSpotlight);

    const rightSideSpotlight = new THREE.SpotLight(0x00ffaa, 2, 35, Math.PI / 10, 0.5, 1);
    rightSideSpotlight.position.set(25, 15, 5);
    rightSideSpotlight.target.position.set(3, 0, 0);
    spotlights.push(rightSideSpotlight);

    return spotlights;
  }

  // Create spot lights for dramatic lighting
  createSpotLights(): THREE.SpotLight[] {
    const spotLight1 = new THREE.SpotLight(0x6a40d8, 1.2, 100, Math.PI / 6, 0.3);
    spotLight1.position.set(-28, 22, 12);
    spotLight1.target.position.set(0, 0, 0);
    spotLight1.castShadow = true;
    spotLight1.shadow.mapSize.width = 2048;
    spotLight1.shadow.mapSize.height = 2048;

    const spotLight2 = new THREE.SpotLight(0xff8c3a, 1.0, 100, Math.PI / 6, 0.3);
    spotLight2.position.set(28, 22, -12);
    spotLight2.target.position.set(0, 0, 0);
    spotLight2.castShadow = true;
    spotLight2.shadow.mapSize.width = 2048;
    spotLight2.shadow.mapSize.height = 2048;

    return [spotLight1, spotLight2];
  }

  // Create atmospheric lighting
  createAtmosphericLighting(): THREE.HemisphereLight {
    return new THREE.HemisphereLight(0x87CEEB, 0x8B4513, 0.4);
  }

  // Setup all lighting for the scene
  setupSceneLighting(scene: THREE.Scene): void {
    // Clear existing lights
    this.lights.clear();
    
    // Add all lights to scene
    const sunLight = this.createSunLight();
    const ambientLight = this.createAmbientLight();
    const rimLight = this.createRimLight();
    const chainsawLight = this.createChainsawLight();
    const arenaSpotlights = this.createArenaSpotlights();
    const spotLights = this.createSpotLights();
    const hemisphereLight = this.createAtmosphericLighting();

    scene.add(sunLight);
    scene.add(ambientLight);
    scene.add(rimLight);
    scene.add(chainsawLight);
    scene.add(...arenaSpotlights);
    scene.add(...spotLights);
    scene.add(hemisphereLight);

    // Store references
    this.lights.set('sun', sunLight);
    this.lights.set('ambient', ambientLight);
    this.lights.set('rim', rimLight);
    this.lights.set('chainsaw', chainsawLight);
    this.lights.set('centerSpotlight', arenaSpotlights[0]);
    this.lights.set('redSpotlight', arenaSpotlights[1]);
    this.lights.set('blueSpotlight', arenaSpotlights[2]);
    this.lights.set('leftSideSpotlight', arenaSpotlights[3]);
    this.lights.set('rightSideSpotlight', arenaSpotlights[4]);
    this.lights.set('spot1', spotLights[0]);
    this.lights.set('spot2', spotLights[1]);
    this.lights.set('hemisphere', hemisphereLight);
  }

  // Animate sun position for dynamic lighting
  animateSun(time: number): void {
    const sunLight = this.lights.get('sun') as THREE.DirectionalLight;
    if (sunLight) {
      const radius = 80;
      const height = 60;
      sunLight.position.x = Math.cos(time * 0.001) * radius;
      sunLight.position.z = Math.sin(time * 0.001) * radius;
      sunLight.position.y = height + Math.sin(time * 0.002) * 20;
      
      // Update shadow camera
      sunLight.shadow.camera.updateProjectionMatrix();
    }
  }

  // Get light by name
  getLight(name: string): THREE.Light | undefined {
    return this.lights.get(name);
  }

  // Animate arena spotlights
  animateArenaSpotlights(time: number): void {
    // Gentle swaying motion for spotlights
    const redSpotlight = this.lights.get('redSpotlight') as THREE.SpotLight;
    const blueSpotlight = this.lights.get('blueSpotlight') as THREE.SpotLight;
    const leftSideSpotlight = this.lights.get('leftSideSpotlight') as THREE.SpotLight;
    const rightSideSpotlight = this.lights.get('rightSideSpotlight') as THREE.SpotLight;

    if (redSpotlight) {
      const sway = Math.sin(time * 0.5) * 0.1;
      redSpotlight.target.position.x = -6 + sway;
      redSpotlight.target.position.z = Math.cos(time * 0.3) * 0.05;
    }

    if (blueSpotlight) {
      const sway = Math.sin(time * 0.5 + Math.PI) * 0.1;
      blueSpotlight.target.position.x = 6 + sway;
      blueSpotlight.target.position.z = Math.cos(time * 0.3 + Math.PI) * 0.05;
    }

    if (leftSideSpotlight) {
      const sway = Math.sin(time * 0.3) * 0.05;
      leftSideSpotlight.target.position.x = -3 + sway;
    }

    if (rightSideSpotlight) {
      const sway = Math.sin(time * 0.3 + Math.PI) * 0.05;
      rightSideSpotlight.target.position.x = 3 + sway;
    }
  }

  // Update all lights
  updateLights(time: number): void {
    this.animateSun(time);
    this.animateArenaSpotlights(time);
  }
}

export const lightingManager = LightingManager.getInstance();
