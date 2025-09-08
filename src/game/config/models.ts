export const MODEL_CONFIG = {
  player: {
    path: "/models/Meshy_Merged_Animations (Walk, Run, Fall & Happy).glb",
    scale: 1.0,
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    fallback: 'primitive'
  },
  doll: {
    path: '/models/Doly_3D__texture.glb',
    scale: 1.0,
    position: [0, 0, 25],
    rotation: [0, 0, 0],
    fallback: 'primitive'
  },
  soldier: {
    path: '/models/Soldier.glb',
    scale: 1.0,
    position: [0, 0, 25],
    rotation: [0, Math.PI, 0],
    fallback: 'primitive'
  },
  // Add more models as needed
  environment: {
    trees: '',
    buildings: '',
    props: '/models/grond_plane_texture.glb',
    ground: '/models/Create_A_simple_flat_ground_texture.glb'
  }
} as const;

export type ModelType = keyof typeof MODEL_CONFIG;
export type ModelConfig = typeof MODEL_CONFIG[ModelType];
