import * as THREE from 'three';

export interface CameraAngle {
  name: string;
  position: THREE.Vector3;
  target: THREE.Vector3;
  fov: number;
  description: string;
}

export class CinematicCameraManager {
  private static instance: CinematicCameraManager;
  private camera: THREE.PerspectiveCamera | null = null;
  private currentAngle: CameraAngle | null = null;
  private isTransitioning = false;
  private transitionStartTime = 0;
  private transitionDuration = 2000; // 2 seconds
  private startPosition = new THREE.Vector3();
  private startTarget = new THREE.Vector3();
  private targetPosition = new THREE.Vector3();
  private targetTarget = new THREE.Vector3();
  
  // Auto cinematic mode
  private isAutoCinematic = false;
  private autoCinematicInterval: NodeJS.Timeout | null = null;
  private autoCinematicDuration = 4000; // 4 seconds per angle
  private currentGameState = 'lobby';
  private angleChangeSubscribers: ((angleName: string) => void)[] = [];

  constructor() {}

  static getInstance(): CinematicCameraManager {
    if (!CinematicCameraManager.instance) {
      CinematicCameraManager.instance = new CinematicCameraManager();
    }
    return CinematicCameraManager.instance;
  }

  init(camera: THREE.PerspectiveCamera): void {
    this.camera = camera;
  }

  // Define all cinematic camera angles
  getCameraAngles(): CameraAngle[] {
    return [
      // I. Gameplay Camera (Standard View)
      {
        name: 'Low 3rd-Person Wide',
        position: new THREE.Vector3(-8, 12, 15),
        target: new THREE.Vector3(0, 2, 0),
        fov: 60,
        description: 'High-angle shot showing all players, rope, and central mechanism'
      },
      {
        name: 'Low 3rd-Person Wide (Right)',
        position: new THREE.Vector3(8, 12, 15),
        target: new THREE.Vector3(0, 2, 0),
        fov: 60,
        description: 'Alternative wide angle from the right side'
      },

      // II. Dramatic and Cinematic Angles
      {
        name: 'Low-Angle Power Shot',
        position: new THREE.Vector3(-8, 3, 12),
        target: new THREE.Vector3(-6, 6, 0),
        fov: 45,
        description: 'Low angle looking up at players, emphasizing power and struggle'
      },
      {
        name: 'Low-Angle Power Shot (Right)',
        position: new THREE.Vector3(8, 3, 12),
        target: new THREE.Vector3(6, 6, 0),
        fov: 45,
        description: 'Low angle from the right side'
      },
      {
        name: 'Close-Up Struggle',
        position: new THREE.Vector3(-15, 8, 4),
        target: new THREE.Vector3(-12, 8, 0),
        fov: 60,
        description: 'Close-up on player face and hands gripping rope'
      },
      {
        name: 'Close-Up Struggle (Right)',
        position: new THREE.Vector3(15, 8, 4),
        target: new THREE.Vector3(12, 8, 0),
        fov: 60,
        description: 'Close-up from the right side'
      },
      {
        name: 'Vertigo Abyss Shot',
        position: new THREE.Vector3(0, 25, 0),
        target: new THREE.Vector3(0, -10, 0),
        fov: 45,
        description: 'Overhead shot looking down at the terrifying void'
      },
      {
        name: 'Over-the-Shoulder Rope Tension',
        position: new THREE.Vector3(-15, 8.5, 2),
        target: new THREE.Vector3(0, 8.2, 0),
        fov: 50,
        description: 'Over-the-shoulder view across the rope to opposing team'
      },
      {
        name: 'Over-the-Shoulder Rope Tension (Reverse)',
        position: new THREE.Vector3(15, 8.5, 2),
        target: new THREE.Vector3(0, 8.2, 0),
        fov: 50,
        description: 'Reverse over-the-shoulder view'
      },
      {
        name: 'Rope Close-Up',
        position: new THREE.Vector3(0, 8.5, 3),
        target: new THREE.Vector3(0, 8.2, 0),
        fov: 70,
        description: 'Close-up view of the rope and players gripping it'
      },
      {
        name: 'Side Dramatic',
        position: new THREE.Vector3(-25, 8, 0),
        target: new THREE.Vector3(0, 7, 0),
        fov: 45,
        description: 'Side view showing the full struggle'
      },
      {
        name: 'Side Dramatic (Right)',
        position: new THREE.Vector3(25, 8, 0),
        target: new THREE.Vector3(0, 7, 0),
        fov: 45,
        description: 'Right side view showing the full struggle'
      },
      {
        name: 'Front Dramatic',
        position: new THREE.Vector3(0, 6, 20),
        target: new THREE.Vector3(0, 2, 0),
        fov: 55,
        description: 'Front view of the entire arena'
      },
      {
        name: 'Chainsaw Focus',
        position: new THREE.Vector3(0, 3, 5),
        target: new THREE.Vector3(0, -5, 0),
        fov: 60,
        description: 'Focus on the central chainsaw mechanism'
      }
    ];
  }

  // Switch to a specific camera angle
  switchToAngle(angleName: string, duration: number = 2000): void {
    if (!this.camera) {
      console.warn('🎬 Camera not initialized, cannot switch angle');
      return;
    }

    const angles = this.getCameraAngles();
    const angle = angles.find(a => a.name === angleName);
    if (!angle) {
      console.warn(`🎬 Camera angle "${angleName}" not found`);
      return;
    }

    console.log('🎬 Switching to camera angle:', angleName);
    this.startTransition(angle, duration);
    this.notifyAngleChange(angleName);
  }

  // Start smooth transition to new angle
  private startTransition(angle: CameraAngle, duration: number): void {
    if (!this.camera) return;

    this.currentAngle = angle;
    this.isTransitioning = true;
    this.transitionStartTime = Date.now();
    this.transitionDuration = duration;

    // Store current position and target
    this.startPosition.copy(this.camera.position);
    this.startTarget.copy(this.camera.target || new THREE.Vector3(0, 0, 0));

    // Set target position and target
    this.targetPosition.copy(angle.position);
    this.targetTarget.copy(angle.target);
  }

  // Update camera during transition
  update(): void {
    if (!this.camera) {
      console.warn('🎬 Camera not available for update');
      return;
    }
    
    if (!this.isTransitioning) return;

    const elapsed = Date.now() - this.transitionStartTime;
    const progress = Math.min(elapsed / this.transitionDuration, 1);

    // Use easing function for smooth transition
    const easedProgress = this.easeInOutCubic(progress);

    // Interpolate position
    this.camera.position.lerpVectors(this.startPosition, this.targetPosition, easedProgress);

    // Interpolate target (look-at point)
    const currentTarget = new THREE.Vector3().lerpVectors(this.startTarget, this.targetTarget, easedProgress);
    this.camera.lookAt(currentTarget);

    // Update FOV
    const startFov = this.camera.fov;
    const targetFov = this.currentAngle?.fov || 60;
    this.camera.fov = THREE.MathUtils.lerp(startFov, targetFov, easedProgress);
    this.camera.updateProjectionMatrix();

    // End transition
    if (progress >= 1) {
      this.isTransitioning = false;
      console.log('🎬 Camera transition completed to:', this.currentAngle?.name, 'at position:', this.camera.position);
    }
  }

  // Easing function for smooth transitions
  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  // Get current camera angle
  getCurrentAngle(): CameraAngle | null {
    return this.currentAngle;
  }

  // Check if camera is transitioning
  isCameraTransitioning(): boolean {
    return this.isTransitioning;
  }

  // Set camera shake for struggle effects
  setCameraShake(intensity: number, duration: number): void {
    if (!this.camera) return;

    const startTime = Date.now();
    const shake = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed < duration) {
        const shakeIntensity = intensity * (1 - elapsed / duration);
        const shakeX = (Math.random() - 0.5) * shakeIntensity;
        const shakeY = (Math.random() - 0.5) * shakeIntensity;
        const shakeZ = (Math.random() - 0.5) * shakeIntensity;

        this.camera!.position.add(new THREE.Vector3(shakeX, shakeY, shakeZ));
        requestAnimationFrame(shake);
      }
    };
    shake();
  }

  // Reset camera to default gameplay angle
  resetToGameplay(): void {
    this.switchToAngle('Low 3rd-Person Wide', 1500);
  }

  // Get camera angles for specific game states
  getAnglesForGameState(gameState: string): CameraAngle[] {
    const allAngles = this.getCameraAngles();
    console.log('🎬 Getting angles for gameState:', gameState, 'Total angles:', allAngles.length);
    
    switch (gameState) {
      case 'waiting':
        return allAngles.filter(angle => 
          angle.name.includes('Wide') || 
          angle.name.includes('Front') ||
          angle.name.includes('Side')
        );
      
      case 'countdown':
        return allAngles.filter(angle => 
          angle.name.includes('Abyss') || 
          angle.name.includes('Chainsaw') ||
          angle.name.includes('Front')
        );
      
      case 'playing':
        return allAngles.filter(angle => 
          angle.name.includes('Wide') || 
          angle.name.includes('Over-the-Shoulder') ||
          angle.name.includes('Close-Up')
        );
      
      case 'won':
      case 'eliminated':
        return allAngles.filter(angle => 
          angle.name.includes('Abyss') || 
          angle.name.includes('Front') ||
          angle.name.includes('Wide')
        );
      
      default:
        return allAngles;
    }
  }

  // Auto-cycle through appropriate angles for current game state
  startAutoCinematic(gameState: string, interval: number = 5000): void {
    console.log('🎬 Starting auto cinematic mode for gameState:', gameState);
    this.isAutoCinematic = true;
    this.currentGameState = gameState;
    this.autoCinematicDuration = interval;
    
    // Clear any existing interval
    if (this.autoCinematicInterval) {
      clearInterval(this.autoCinematicInterval);
    }
    
    const appropriateAngles = this.getAnglesForGameState(gameState);
    if (appropriateAngles.length === 0) return;

    let currentIndex = 0;
    
    const cycle = () => {
      if (this.isAutoCinematic && appropriateAngles.length > 0) {
        const angle = appropriateAngles[currentIndex % appropriateAngles.length];
        console.log('🎬 Auto cinematic switching to:', angle.name);
        this.switchToAngle(angle.name, 2000);
        this.notifyAngleChange(angle.name);
        currentIndex++;
      }
    };

    // Start cycling
    cycle();
    this.autoCinematicInterval = setInterval(cycle, interval);
  }

  // Stop auto-cinematic
  stopAutoCinematic(): void {
    console.log('🎬 Stopping auto cinematic mode');
    this.isAutoCinematic = false;
    
    if (this.autoCinematicInterval) {
      clearInterval(this.autoCinematicInterval);
      this.autoCinematicInterval = null;
    }
    
    // Reset to default gameplay camera
    this.resetToGameplay();
  }

  // Toggle auto cinematic mode
  toggleAutoCinematic(): void {
    if (this.isAutoCinematic) {
      this.stopAutoCinematic();
    } else {
      this.startAutoCinematic(this.currentGameState);
    }
  }

  // Subscribe to angle changes
  subscribeToAngleChanges(callback: (angleName: string) => void): () => void {
    this.angleChangeSubscribers.push(callback);
    return () => {
      const index = this.angleChangeSubscribers.indexOf(callback);
      if (index > -1) {
        this.angleChangeSubscribers.splice(index, 1);
      }
    };
  }

  private notifyAngleChange(angleName: string): void {
    this.angleChangeSubscribers.forEach(callback => callback(angleName));
  }

  // Reset to default gameplay camera
  resetToGameplay(): void {
    console.log('🎬 Resetting to gameplay camera');
    this.switchToAngle('Low 3rd-Person Wide', 1000);
  }

  // Set camera shake effect
  setCameraShake(intensity: number, duration: number): void {
    // This is a placeholder for camera shake functionality
    // Could be implemented with additional shake logic
    console.log('🎬 Camera shake:', intensity, duration);
  }

  // Check if auto cinematic mode is enabled
  isAutoCinematicEnabled(): boolean {
    return this.isAutoCinematic;
  }

  // Check if camera is currently transitioning
  isTransitioning(): boolean {
    return this.isTransitioning;
  }

  // Reset to default camera and notify subscribers
  resetToDefault(): void {
    console.log('🎬 Resetting to default camera');
    this.switchToAngle('Low 3rd-Person Wide', 1000);
  }

  // Get current camera angle name
  getCurrentAngle(): string | null {
    return this.currentAngle?.name || null;
  }
}

export const cinematicCameraManager = CinematicCameraManager.getInstance();
