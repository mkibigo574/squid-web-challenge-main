/**
 * Centralized field configuration for Red Light, Green Light game
 * Change FIELD_LENGTH to adjust the entire field and all components
 */

// Field dimensions - change this to adjust the entire field
export const FIELD_LENGTH = 100; // Total field length in units

// Calculated positions based on field length
export const FIELD_CONFIG = {
  // Starting and finishing positions
  START_Z: -5,
  FINISH_Z: -5 + FIELD_LENGTH, // Will be 25 when FIELD_LENGTH = 30
  
  // Field boundaries
  FIELD_LENGTH_UNITS: FIELD_LENGTH,
  FIELD_LENGTH_METERS: 400, // Approximate 400m track
  HUMAN_RUN_MPS: 6, // ~6 m/s (fast jog)
  
  // Calculated speed based on field length
  get UNITS_PER_SEC() {
    return this.HUMAN_RUN_MPS / (this.FIELD_LENGTH_METERS / this.FIELD_LENGTH_UNITS);
  },
  
  // Component positions (automatically calculated)
  get DOLL_POSITION() {
    return [0, 0, this.FINISH_Z] as [number, number, number];
  },
  
  get SOLDIER_POSITIONS() {
    return [
      [-5, 0, this.FINISH_Z] as [number, number, number],
      [5, 0, this.FINISH_Z] as [number, number, number]
    ];
  },
  
  // Environment positions
  get START_LINE_POSITION() {
    return [0, 0.01, this.START_Z] as [number, number, number];
  },
  
  get FINISH_LINE_POSITION() {
    return [0, 0.01, this.FINISH_Z] as [number, number, number];
  },
  
  get SIDE_BARRIER_POSITIONS() {
    const centerZ = (this.START_Z + this.FINISH_Z) / 2;
    return [
      [-11, 1, centerZ] as [number, number, number],
      [11, 1, centerZ] as [number, number, number]
    ];
  },
  
  get BACK_WALL_POSITION() {
    return [0, 1, this.FINISH_Z + 5] as [number, number, number];
  },
  
  get TREE_POSITION() {
    return [-7, 0, this.FINISH_Z + 2] as [number, number, number];
  },
  
  get BACKGROUND_POSITION() {
    return [0, 15, this.FINISH_Z + 10] as [number, number, number];
  },
  
  // Ground plane dimensions
  get GROUND_PLANE_POSITION() {
    const centerZ = (this.START_Z + this.FINISH_Z) / 2;
    return [0, 0, centerZ] as [number, number, number];
  },
  
  get GROUND_PLANE_SIZE() {
    return [40, this.FIELD_LENGTH_UNITS + 10] as [number, number];
  },
  
  // Side barrier dimensions
  get SIDE_BARRIER_SIZE() {
    return [1, 2, this.FIELD_LENGTH_UNITS + 10] as [number, number, number];
  },
  
  // Back wall dimensions
  get BACK_WALL_SIZE() {
    return [22, 2, 1] as [number, number, number];
  },
  
  // Background dimensions
  get BACKGROUND_SIZE() {
    return [100, 30] as [number, number];
  },
  
  // Start/finish line dimensions
  get LINE_SIZE() {
    return [20, 0.1, 0.5] as [number, number, number];
  },
  
  // Player constraints
  get PLAYER_X_BOUNDS() {
    return [-10, 10] as [number, number];
  },
  
  get PLAYER_Z_BOUNDS() {
    return [this.START_Z, this.FINISH_Z] as [number, number];
  },
  
  // Win condition
  get WIN_Z_THRESHOLD() {
    return this.FINISH_Z;
  },
  
  // Progress calculation
  getProgressFromZ(z: number): number {
    return Math.max(0, z - this.START_Z);
  },
  
  // Camera position (relative to field)
  get CAMERA_POSITION() {
    return [0, 5, this.START_Z - 5] as [number, number, number];
  }
};

// Export individual values for easy access
export const {
  START_Z,
  FINISH_Z,
  FIELD_LENGTH_UNITS,
  FIELD_LENGTH_METERS,
  HUMAN_RUN_MPS,
  UNITS_PER_SEC,
  DOLL_POSITION,
  SOLDIER_POSITIONS,
  START_LINE_POSITION,
  FINISH_LINE_POSITION,
  SIDE_BARRIER_POSITIONS,
  BACK_WALL_POSITION,
  TREE_POSITION,
  BACKGROUND_POSITION,
  GROUND_PLANE_POSITION,
  GROUND_PLANE_SIZE,
  SIDE_BARRIER_SIZE,
  BACK_WALL_SIZE,
  BACKGROUND_SIZE,
  LINE_SIZE,
  PLAYER_X_BOUNDS,
  PLAYER_Z_BOUNDS,
  WIN_Z_THRESHOLD,
  getProgressFromZ,
  CAMERA_POSITION
} = FIELD_CONFIG;