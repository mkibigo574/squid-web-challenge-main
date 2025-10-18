import * as THREE from 'three';

// Create realistic materials with textures, normal maps, and specular maps
export class MaterialManager {
  private static instance: MaterialManager;
  private materials: Map<string, THREE.Material> = new Map();
  private textureLoader: THREE.TextureLoader;
  private normalLoader: THREE.TextureLoader;

  constructor() {
    this.textureLoader = new THREE.TextureLoader();
    this.normalLoader = new THREE.TextureLoader();
  }

  static getInstance(): MaterialManager {
    if (!MaterialManager.instance) {
      MaterialManager.instance = new MaterialManager();
    }
    return MaterialManager.instance;
  }

  // Create optimized weathered stone material for bricks - performance focused
  createWeatheredStoneMaterial(): THREE.MeshStandardMaterial {
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0.8, 0.75, 0.65), // Warm stone color
      roughness: 0.85,
      metalness: 0.1,
      normalScale: new THREE.Vector2(0.5, 0.5), // Reduced normal strength for performance
    });

    // Create optimized stone texture - lower resolution for performance
    const canvas = document.createElement('canvas');
    canvas.width = 256; // Reduced from 1024 to 256
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    
    // Create simplified stone-like noise pattern
    const imageData = ctx.createImageData(256, 256);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
      const x = (i / 4) % 256;
      const y = Math.floor((i / 4) / 256);
      
      // Simplified noise for better performance
      const noise1 = Math.random() * 0.3 + 0.7;
      const noise2 = Math.sin(x * 0.05) * Math.sin(y * 0.05) * 0.1;
      const finalNoise = noise1 + noise2;
      
      data[i] = finalNoise * 200;     // R
      data[i + 1] = finalNoise * 190; // G
      data[i + 2] = finalNoise * 170; // B
      data[i + 3] = 255;              // A
    }
    
    ctx.putImageData(imageData, 0, 0);
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4); // Increased repeat for better coverage
    
    // Simple normal map for basic depth - much smaller for performance
    const normalCanvas = document.createElement('canvas');
    normalCanvas.width = 128; // Reduced from 512 to 128
    normalCanvas.height = 128;
    const normalCtx = normalCanvas.getContext('2d')!;
    
    const normalImageData = normalCtx.createImageData(128, 128);
    const normalData = normalImageData.data;
    
    for (let i = 0; i < normalData.length; i += 4) {
      const x = (i / 4) % 128;
      const y = Math.floor((i / 4) / 128);
      
      // Simplified normal map
      const normalX = (Math.random() - 0.5) * 0.2;
      const normalY = (Math.random() - 0.5) * 0.2;
      const normalZ = Math.sqrt(1 - normalX * normalX - normalY * normalY);
      
      normalData[i] = (normalX + 1) * 127.5;     // R
      normalData[i + 1] = (normalY + 1) * 127.5; // G
      normalData[i + 2] = normalZ * 255;         // B
      normalData[i + 3] = 255;                   // A
    }
    
    normalCtx.putImageData(normalImageData, 0, 0);
    const normalTexture = new THREE.CanvasTexture(normalCanvas);
    normalTexture.wrapS = THREE.RepeatWrapping;
    normalTexture.wrapT = THREE.RepeatWrapping;
    normalTexture.repeat.set(4, 4);
    
    material.map = texture;
    material.normalMap = normalTexture;
    // Removed displacement map for better performance
    material.needsUpdate = true;
    
    return material;
  }

  // Create gritty sand material for ground
  createGrittySandMaterial(): THREE.MeshStandardMaterial {
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0.9, 0.85, 0.7), // Sandy color
      roughness: 0.9,
      metalness: 0.0,
    });

    // Create sand texture
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    
    // Create sandy noise pattern
    const imageData = ctx.createImageData(256, 256);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
      const noise = Math.random() * 0.4 + 0.6;
      data[i] = noise * 230;     // R
      data[i + 1] = noise * 220; // G
      data[i + 2] = noise * 180; // B
      data[i + 3] = 255;         // A
    }
    
    ctx.putImageData(imageData, 0, 0);
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(8, 8);
    
    material.map = texture;
    material.needsUpdate = true;
    
    return material;
  }

  // Create polished metal material for chainsaw
  createPolishedMetalMaterial(): THREE.MeshStandardMaterial {
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0.9, 0.9, 0.95),
      roughness: 0.1,
      metalness: 0.9,
      envMapIntensity: 1.0,
    });

    return material;
  }

  // Create worn wood material for platforms
  createWornWoodMaterial(): THREE.MeshStandardMaterial {
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0.6, 0.4, 0.2), // Wood color
      roughness: 0.8,
      metalness: 0.0,
    });

    // Create wood grain texture
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    
    // Create wood grain pattern
    const imageData = ctx.createImageData(512, 512);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
      const x = (i / 4) % 512;
      const y = Math.floor((i / 4) / 512);
      
      // Create wood grain lines
      const grain = Math.sin(x * 0.02) * 0.1 + Math.sin(x * 0.05) * 0.05;
      const noise = Math.random() * 0.2;
      const intensity = 0.7 + grain + noise;
      
      data[i] = intensity * 120;     // R
      data[i + 1] = intensity * 80;  // G
      data[i + 2] = intensity * 40;  // B
      data[i + 3] = 255;             // A
    }
    
    ctx.putImageData(imageData, 0, 0);
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 2);
    
    material.map = texture;
    material.needsUpdate = true;
    
    return material;
  }

  // Create rope material
  createRopeMaterial(): THREE.MeshStandardMaterial {
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0.6, 0.5, 0.3), // Rope color
      roughness: 0.9,
      metalness: 0.0,
    });

    return material;
  }

  // Create skybox material
  createSkyboxMaterial(): THREE.ShaderMaterial {
    const vertexShader = `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      uniform float offset;
      uniform float exponent;
      varying vec3 vWorldPosition;
      
      void main() {
        float h = normalize(vWorldPosition + offset).y;
        gl_FragColor = vec4(mix(bottomColor, topColor, pow(max(h, 0.0), exponent)), 1.0);
      }
    `;

    return new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(0.5, 0.7, 1.0) },
        bottomColor: { value: new THREE.Color(0.9, 0.9, 0.9) },
        offset: { value: 0.0 },
        exponent: { value: 0.6 }
      },
      vertexShader,
      fragmentShader,
      side: THREE.BackSide
    });
  }

  // Get or create material
  getMaterial(type: string): THREE.Material {
    if (!this.materials.has(type)) {
      let material: THREE.Material;
      
      switch (type) {
        case 'weatheredStone':
          material = this.createWeatheredStoneMaterial();
          break;
        case 'grittySand':
          material = this.createGrittySandMaterial();
          break;
        case 'polishedMetal':
          material = this.createPolishedMetalMaterial();
          break;
        case 'wornWood':
          material = this.createWornWoodMaterial();
          break;
        case 'rope':
          material = this.createRopeMaterial();
          break;
        case 'skybox':
          material = this.createSkyboxMaterial();
          break;
        default:
          material = new THREE.MeshStandardMaterial({ color: 0x888888 });
      }
      
      this.materials.set(type, material);
    }
    
    return this.materials.get(type)!;
  }
}

export const materialManager = MaterialManager.getInstance();
