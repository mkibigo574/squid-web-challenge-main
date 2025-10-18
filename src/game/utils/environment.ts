import * as THREE from 'three';
import { materialManager } from './materials';

export class EnvironmentManager {
  private static instance: EnvironmentManager;
  private skybox: THREE.Mesh | null = null;
  private fog: THREE.Fog | null = null;

  constructor() {}

  static getInstance(): EnvironmentManager {
    if (!EnvironmentManager.instance) {
      EnvironmentManager.instance = new EnvironmentManager();
    }
    return EnvironmentManager.instance;
  }

  // Create a procedural skybox with dramatic arena atmosphere
  createSkybox(): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(800, 32, 32);
    const material = this.createArenaSkyboxMaterial();
    
    const skybox = new THREE.Mesh(geometry, material);
    skybox.name = 'skybox';
    
    this.skybox = skybox;
    return skybox;
  }

  // Create custom skybox material for tug of war arena
  private createArenaSkyboxMaterial(): THREE.ShaderMaterial {
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
      uniform vec3 horizonColor;
      uniform vec3 bottomColor;
      uniform float offset;
      uniform float exponent;
      uniform float time;
      varying vec3 vWorldPosition;
      
      void main() {
        vec3 direction = normalize(vWorldPosition);
        float h = direction.y;
        
        // Create dramatic gradient from top to bottom
        vec3 color;
        if (h > 0.1) {
          // Sky area - dramatic blue to purple gradient
          color = mix(horizonColor, topColor, pow(h, 0.3));
        } else if (h > -0.1) {
          // Horizon area - orange/red dramatic colors
          color = mix(bottomColor, horizonColor, (h + 0.1) / 0.2);
        } else {
          // Ground area - dark atmospheric colors
          color = bottomColor;
        }
        
        // Add some atmospheric noise for realism
        float noise = sin(direction.x * 10.0 + time) * sin(direction.z * 10.0 + time) * 0.1;
        color += noise;
        
        gl_FragColor = vec4(color, 1.0);
      }
    `;

    return new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(0.1, 0.2, 0.4) }, // Dark blue-purple
        horizonColor: { value: new THREE.Color(0.8, 0.3, 0.1) }, // Dramatic orange-red
        bottomColor: { value: new THREE.Color(0.2, 0.1, 0.05) }, // Dark brown
        offset: { value: 0.0 },
        exponent: { value: 0.6 },
        time: { value: 0.0 }
      },
      vertexShader,
      fragmentShader,
      side: THREE.BackSide
    });
  }

  // Create atmospheric fog with dramatic arena colors
  createFog(): THREE.Fog {
    const fog = new THREE.Fog(0x2C1810, 30, 150); // Dark atmospheric fog
    this.fog = fog;
    return fog;
  }

  // Create distant mountains
  createMountains(): THREE.Group {
    const mountainGroup = new THREE.Group();
    
    // Create multiple mountain ranges at different distances
    for (let i = 0; i < 5; i++) {
      const mountain = this.createMountain(i);
      mountain.position.z = -200 - (i * 100);
      mountain.position.x = (Math.random() - 0.5) * 400;
      mountain.position.y = -50;
      mountainGroup.add(mountain);
    }
    
    return mountainGroup;
  }

  private createMountain(index: number): THREE.Mesh {
    const geometry = new THREE.ConeGeometry(30 + Math.random() * 20, 40 + Math.random() * 30, 8);
    const material = new THREE.MeshLambertMaterial({
      color: new THREE.Color(0.2 + Math.random() * 0.1, 0.15 + Math.random() * 0.1, 0.1 + Math.random() * 0.05),
      transparent: true,
      opacity: 0.6 - (index * 0.08)
    });
    
    const mountain = new THREE.Mesh(geometry, material);
    mountain.rotation.y = Math.random() * Math.PI * 2;
    mountain.scale.setScalar(0.5 + Math.random() * 0.5);
    
    return mountain;
  }

  // Create clouds
  createClouds(): THREE.Group {
    const cloudGroup = new THREE.Group();
    
    for (let i = 0; i < 20; i++) {
      const cloud = this.createCloud();
      cloud.position.set(
        (Math.random() - 0.5) * 400,
        20 + Math.random() * 30,
        (Math.random() - 0.5) * 400
      );
      cloudGroup.add(cloud);
    }
    
    return cloudGroup;
  }

  private createCloud(): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(5 + Math.random() * 10, 8, 6);
    const material = new THREE.MeshLambertMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.6
    });
    
    const cloud = new THREE.Mesh(geometry, material);
    cloud.scale.setScalar(0.5 + Math.random() * 0.5);
    
    return cloud;
  }

  // Create ground details (pebbles, dust, footprints)
  createGroundDetails(): THREE.Group {
    const detailsGroup = new THREE.Group();
    
    // Add pebbles
    for (let i = 0; i < 100; i++) {
      const pebble = this.createPebble();
      pebble.position.set(
        (Math.random() - 0.5) * 100,
        -8.3, // Positioned just above the ground floor
        (Math.random() - 0.5) * 100
      );
      detailsGroup.add(pebble);
    }
    
    // Add dust particles
    for (let i = 0; i < 50; i++) {
      const dust = this.createDustParticle();
      dust.position.set(
        (Math.random() - 0.5) * 100,
        -8.4, // Positioned just above the ground floor
        (Math.random() - 0.5) * 100
      );
      detailsGroup.add(dust);
    }
    
    return detailsGroup;
  }

  private createPebble(): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(0.1 + Math.random() * 0.2, 6, 4);
    const material = new THREE.MeshLambertMaterial({
      color: new THREE.Color(0.4 + Math.random() * 0.3, 0.3 + Math.random() * 0.2, 0.2 + Math.random() * 0.1)
    });
    
    const pebble = new THREE.Mesh(geometry, material);
    pebble.rotation.set(
      Math.random() * Math.PI,
      Math.random() * Math.PI,
      Math.random() * Math.PI
    );
    
    return pebble;
  }

  private createDustParticle(): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(0.05, 4, 3);
    const material = new THREE.MeshLambertMaterial({
      color: 0xcccccc,
      transparent: true,
      opacity: 0.3
    });
    
    return new THREE.Mesh(geometry, material);
  }

  // Setup complete environment
  setupEnvironment(scene: THREE.Scene): void {
    // Add skybox
    const skybox = this.createSkybox();
    scene.add(skybox);
    
    // Add fog
    const fog = this.createFog();
    scene.fog = fog;
    
    // Add mountains
    const mountains = this.createMountains();
    scene.add(mountains);
    
    // Add clouds
    const clouds = this.createClouds();
    scene.add(clouds);
    
    // Add ground details
    const groundDetails = this.createGroundDetails();
    scene.add(groundDetails);
  }

  // Animate environment elements
  animateEnvironment(time: number): void {
    // Animate skybox
    if (this.skybox && this.skybox.material instanceof THREE.ShaderMaterial) {
      const material = this.skybox.material as THREE.ShaderMaterial;
      if (material.uniforms.time) {
        material.uniforms.time.value = time;
      }
    }

    // Animate clouds
    const clouds = this.skybox?.parent?.getObjectByName('clouds');
    if (clouds) {
      clouds.children.forEach((cloud, index) => {
        cloud.position.x += Math.sin(time * 0.001 + index) * 0.01;
        cloud.position.z += Math.cos(time * 0.001 + index) * 0.01;
      });
    }
  }
}

export const environmentManager = EnvironmentManager.getInstance();
