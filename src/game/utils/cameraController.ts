import * as THREE from 'three';

export class CameraController {
  private static instance: CameraController;
  private camera: THREE.PerspectiveCamera | null = null;
  private controls: {
    enabled: boolean;
    mouseButtons: {
      LEFT: THREE.MOUSE.ROTATE;
      MIDDLE: THREE.MOUSE.DOLLY;
      RIGHT: THREE.MOUSE.PAN;
    };
    touches: {
      ONE: THREE.TOUCH.ROTATE;
      TWO: THREE.TOUCH.DOLLY_PAN;
    };
    enableRotate: boolean;
    enableZoom: boolean;
    enablePan: boolean;
    enableDamping: boolean;
    dampingFactor: number;
    rotateSpeed: number;
    zoomSpeed: number;
    panSpeed: number;
    minDistance: number;
    maxDistance: number;
    minPolarAngle: number;
    maxPolarAngle: number;
    minAzimuthAngle: number;
    maxAzimuthAngle: number;
    target: THREE.Vector3;
    position: THREE.Vector3;
  } = {
    enabled: true,
    mouseButtons: {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN,
    },
    touches: {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN,
    },
    enableRotate: true,
    enableZoom: true,
    enablePan: true,
    enableDamping: true,
    dampingFactor: 0.05,
    rotateSpeed: 1.0,
    zoomSpeed: 1.0,
    panSpeed: 1.0,
    minDistance: 5,
    maxDistance: 100,
    minPolarAngle: 0,
    maxPolarAngle: Math.PI,
    minAzimuthAngle: -Infinity,
    maxAzimuthAngle: Infinity,
    target: new THREE.Vector3(0, 0, 0),
    position: new THREE.Vector3(0, 10, 20),
  };

  private spherical = new THREE.Spherical();
  private sphericalDelta = new THREE.Spherical();
  private scale = 1;
  private panOffset = new THREE.Vector3();
  private zoomChanged = false;
  private rotateStart = new THREE.Vector2();
  private rotateEnd = new THREE.Vector2();
  private rotateDelta = new THREE.Vector2();
  private panStart = new THREE.Vector2();
  private panEnd = new THREE.Vector2();
  private panDelta = new THREE.Vector2();
  private dollyStart = new THREE.Vector2();
  private dollyEnd = new THREE.Vector2();
  private dollyDelta = new THREE.Vector2();
  private state = 'NONE'; // NONE, ROTATE, DOLLY, PAN, TOUCH_ROTATE, TOUCH_PAN, TOUCH_DOLLY_PAN
  private domElement: HTMLElement | null = null;
  private listeners: { [key: string]: (event: any) => void } = {};

  constructor() {}

  static getInstance(): CameraController {
    if (!CameraController.instance) {
      CameraController.instance = new CameraController();
    }
    return CameraController.instance;
  }

  // Initialize camera controller
  init(camera: THREE.PerspectiveCamera, domElement: HTMLElement): void {
    this.camera = camera;
    this.domElement = domElement;
    
    // Set initial position
    this.camera.position.copy(this.controls.position);
    this.camera.lookAt(this.controls.target);
    
    // Update spherical coordinates
    this.updateSpherical();
    
    // Add event listeners
    this.addEventListeners();
  }

  private addEventListeners(): void {
    if (!this.domElement) return;

    this.listeners = {
      contextmenu: this.onContextMenu.bind(this),
      pointerdown: this.onPointerDown.bind(this),
      pointercancel: this.onPointerCancel.bind(this),
      wheel: this.onMouseWheel.bind(this),
      pointermove: this.onPointerMove.bind(this),
      pointerup: this.onPointerUp.bind(this),
      touchstart: this.onTouchStart.bind(this),
      touchend: this.onTouchEnd.bind(this),
      touchmove: this.onTouchMove.bind(this),
    };

    Object.entries(this.listeners).forEach(([event, handler]) => {
      this.domElement!.addEventListener(event, handler);
    });
  }

  private removeEventListeners(): void {
    if (!this.domElement) return;

    Object.entries(this.listeners).forEach(([event, handler]) => {
      this.domElement!.removeEventListener(event, handler);
    });
  }

  private onContextMenu(event: Event): void {
    event.preventDefault();
  }

  private onPointerDown(event: PointerEvent): void {
    if (!this.controls.enabled) return;

    switch (event.pointerType) {
      case 'mouse':
        this.onMouseDown(event);
        break;
      case 'touch':
        this.onTouchStart(event);
        break;
    }
  }

  private onPointerCancel(event: PointerEvent): void {
    this.onPointerUp(event);
  }

  private onPointerMove(event: PointerEvent): void {
    if (!this.controls.enabled) return;

    switch (event.pointerType) {
      case 'mouse':
        this.onMouseMove(event);
        break;
      case 'touch':
        this.onTouchMove(event);
        break;
    }
  }

  private onPointerUp(event: PointerEvent): void {
    if (!this.controls.enabled) return;

    switch (event.pointerType) {
      case 'mouse':
        this.onMouseUp(event);
        break;
      case 'touch':
        this.onTouchEnd(event);
        break;
    }
  }

  private onMouseDown(event: MouseEvent): void {
    if (!this.controls.enabled) return;

    event.preventDefault();

    switch (event.button) {
      case 0: // LEFT
        if (this.controls.enableRotate) {
          this.rotateStart.set(event.clientX, event.clientY);
          this.state = 'ROTATE';
        }
        break;
      case 1: // MIDDLE
        if (this.controls.enableZoom) {
          this.dollyStart.set(event.clientX, event.clientY);
          this.state = 'DOLLY';
        }
        break;
      case 2: // RIGHT
        if (this.controls.enablePan) {
          this.panStart.set(event.clientX, event.clientY);
          this.state = 'PAN';
        }
        break;
    }
  }

  private onMouseMove(event: MouseEvent): void {
    if (!this.controls.enabled) return;

    event.preventDefault();

    switch (this.state) {
      case 'ROTATE':
        if (this.controls.enableRotate) {
          this.rotateEnd.set(event.clientX, event.clientY);
          this.rotateDelta.subVectors(this.rotateEnd, this.rotateStart).multiplyScalar(this.controls.rotateSpeed);
          this.rotateStart.copy(this.rotateEnd);
          this.update();
        }
        break;
      case 'DOLLY':
        if (this.controls.enableZoom) {
          this.dollyEnd.set(event.clientX, event.clientY);
          this.dollyDelta.subVectors(this.dollyEnd, this.dollyStart);
          if (this.dollyDelta.y > 0) {
            this.dollyIn(this.getZoomScale());
          } else if (this.dollyDelta.y < 0) {
            this.dollyOut(this.getZoomScale());
          }
          this.dollyStart.copy(this.dollyEnd);
          this.update();
        }
        break;
      case 'PAN':
        if (this.controls.enablePan) {
          this.panEnd.set(event.clientX, event.clientY);
          this.panDelta.subVectors(this.panEnd, this.panStart).multiplyScalar(this.controls.panSpeed);
          this.panStart.copy(this.panEnd);
          this.update();
        }
        break;
    }
  }

  private onMouseUp(event: MouseEvent): void {
    if (!this.controls.enabled) return;

    this.state = 'NONE';
  }

  private onMouseWheel(event: WheelEvent): void {
    if (!this.controls.enabled || !this.controls.enableZoom || this.state !== 'NONE') return;

    event.preventDefault();

    if (event.deltaY < 0) {
      this.dollyOut(this.getZoomScale());
    } else if (event.deltaY > 0) {
      this.dollyIn(this.getZoomScale());
    }

    this.update();
  }

  private onTouchStart(event: TouchEvent): void {
    if (!this.controls.enabled) return;

    event.preventDefault();

    switch (event.touches.length) {
      case 1:
        if (this.controls.enableRotate) {
          this.rotateStart.set(event.touches[0].pageX, event.touches[0].pageY);
          this.state = 'TOUCH_ROTATE';
        }
        break;
      case 2:
        if (this.controls.enableZoom) {
          const dx = event.touches[0].pageX - event.touches[1].pageX;
          const dy = event.touches[0].pageY - event.touches[1].pageY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          this.dollyStart.set(0, distance);
          this.state = 'TOUCH_DOLLY_PAN';
        }
        break;
      case 3:
        if (this.controls.enablePan) {
          this.panStart.set(event.touches[0].pageX, event.touches[0].pageY);
          this.state = 'TOUCH_PAN';
        }
        break;
    }
  }

  private onTouchMove(event: TouchEvent): void {
    if (!this.controls.enabled) return;

    event.preventDefault();

    switch (this.state) {
      case 'TOUCH_ROTATE':
        if (this.controls.enableRotate) {
          this.rotateEnd.set(event.touches[0].pageX, event.touches[0].pageY);
          this.rotateDelta.subVectors(this.rotateEnd, this.rotateStart).multiplyScalar(this.controls.rotateSpeed);
          this.rotateStart.copy(this.rotateEnd);
          this.update();
        }
        break;
      case 'TOUCH_DOLLY_PAN':
        if (this.controls.enableZoom) {
          const dx = event.touches[0].pageX - event.touches[1].pageX;
          const dy = event.touches[0].pageY - event.touches[1].pageY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          this.dollyEnd.set(0, distance);
          this.dollyDelta.set(0, Math.pow(this.dollyEnd.y / this.dollyStart.y, this.controls.zoomSpeed));
          this.dollyIn(this.dollyDelta.y);
          this.dollyStart.copy(this.dollyEnd);
          this.update();
        }
        break;
      case 'TOUCH_PAN':
        if (this.controls.enablePan) {
          this.panEnd.set(event.touches[0].pageX, event.touches[0].pageY);
          this.panDelta.subVectors(this.panEnd, this.panStart).multiplyScalar(this.controls.panSpeed);
          this.panStart.copy(this.panEnd);
          this.update();
        }
        break;
    }
  }

  private onTouchEnd(event: TouchEvent): void {
    if (!this.controls.enabled) return;

    this.state = 'NONE';
  }

  private dollyIn(dollyScale: number): void {
    if (this.controls.enableZoom) {
      this.scale /= dollyScale;
    }
  }

  private dollyOut(dollyScale: number): void {
    if (this.controls.enableZoom) {
      this.scale *= dollyScale;
    }
  }

  private getZoomScale(): number {
    return Math.pow(0.95, this.controls.zoomSpeed);
  }

  private updateSpherical(): void {
    if (!this.camera) return;

    const offset = new THREE.Vector3();
    offset.copy(this.camera.position).sub(this.controls.target);
    this.spherical.setFromVector3(offset);
  }

  private update(): void {
    if (!this.camera) return;

    const offset = new THREE.Vector3();
    const quat = new THREE.Quaternion().setFromUnitVectors(this.camera.up, new THREE.Vector3(0, 1, 0));
    const quatInverse = quat.clone().invert();

    const lastPosition = new THREE.Vector3();
    const lastQuaternion = new THREE.Quaternion();

    return () => {
      const position = this.camera!.position;

      offset.copy(position).sub(this.controls.target);
      offset.applyQuaternion(quat);

      this.spherical.setFromVector3(offset);

      if (this.controls.enableRotate) {
        this.spherical.theta += this.rotateDelta.x;
        this.spherical.phi += this.rotateDelta.y;
      }

      if (this.controls.enableZoom) {
        this.spherical.radius *= this.scale;
      }

      if (this.controls.enablePan) {
        offset.copy(this.controls.target).sub(position);
        offset.applyQuaternion(quat);
        offset.applyQuaternion(quatInverse);
        this.controls.target.copy(position).add(offset);
      }

      this.spherical.theta = Math.max(this.controls.minAzimuthAngle, Math.min(this.controls.maxAzimuthAngle, this.spherical.theta));
      this.spherical.phi = Math.max(this.controls.minPolarAngle, Math.min(this.controls.maxPolarAngle, this.spherical.phi));
      this.spherical.radius = Math.max(this.controls.minDistance, Math.min(this.controls.maxDistance, this.spherical.radius));

      this.spherical.makeSafe();

      offset.setFromSpherical(this.spherical);
      offset.applyQuaternion(quatInverse);

      position.copy(this.controls.target).add(offset);

      this.camera.lookAt(this.controls.target);

      if (this.controls.enableDamping) {
        this.rotateDelta.multiplyScalar(1 - this.controls.dampingFactor);
        this.panDelta.multiplyScalar(1 - this.controls.dampingFactor);
      } else {
        this.rotateDelta.set(0, 0, 0);
        this.panDelta.set(0, 0, 0);
      }

      this.scale = 1;

      if (lastPosition.distanceToSquared(this.camera.position) > 0.0001 || lastQuaternion.distanceToSquared(this.camera.quaternion) > 0.0001) {
        // Camera has moved
      }

      lastPosition.copy(this.camera.position);
      lastQuaternion.copy(this.camera.quaternion);
    };
  }

  // Public methods
  update(): void {
    if (!this.camera) return;

    const offset = new THREE.Vector3();
    const quat = new THREE.Quaternion().setFromUnitVectors(this.camera.up, new THREE.Vector3(0, 1, 0));
    const quatInverse = quat.clone().invert();

    offset.copy(this.camera.position).sub(this.controls.target);
    offset.applyQuaternion(quat);

    this.spherical.setFromVector3(offset);

    if (this.controls.enableRotate) {
      this.spherical.theta += this.rotateDelta.x;
      this.spherical.phi += this.rotateDelta.y;
    }

    if (this.controls.enableZoom) {
      this.spherical.radius *= this.scale;
    }

    if (this.controls.enablePan) {
      offset.copy(this.controls.target).sub(this.camera.position);
      offset.applyQuaternion(quat);
      offset.applyQuaternion(quatInverse);
      this.controls.target.copy(this.camera.position).add(offset);
    }

    this.spherical.theta = Math.max(this.controls.minAzimuthAngle, Math.min(this.controls.maxAzimuthAngle, this.spherical.theta));
    this.spherical.phi = Math.max(this.controls.minPolarAngle, Math.min(this.controls.maxPolarAngle, this.spherical.phi));
    this.spherical.radius = Math.max(this.controls.minDistance, Math.min(this.controls.maxDistance, this.spherical.radius));

    this.spherical.makeSafe();

    offset.setFromSpherical(this.spherical);
    offset.applyQuaternion(quatInverse);

    this.camera.position.copy(this.controls.target).add(offset);
    this.camera.lookAt(this.controls.target);

    if (this.controls.enableDamping) {
      this.rotateDelta.multiplyScalar(1 - this.controls.dampingFactor);
      this.panDelta.multiplyScalar(1 - this.controls.dampingFactor);
    } else {
      this.rotateDelta.set(0, 0, 0);
      this.panDelta.set(0, 0, 0);
    }

    this.scale = 1;
  }

  dispose(): void {
    this.removeEventListeners();
  }

  // Getters and setters
  get enabled(): boolean {
    return this.controls.enabled;
  }

  set enabled(value: boolean) {
    this.controls.enabled = value;
  }

  get target(): THREE.Vector3 {
    return this.controls.target;
  }

  set target(value: THREE.Vector3) {
    this.controls.target.copy(value);
    this.updateSpherical();
  }
}

export const cameraController = CameraController.getInstance();
