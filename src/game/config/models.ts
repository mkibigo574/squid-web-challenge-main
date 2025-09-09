import { getSupabaseUrl } from '@/lib/supabase';

// Helper function to create model config with Supabase URL and local fallback
const createModelConfig = (supabasePath: string, localPath: string, config: any) => ({
  ...config,
  supabasePath: getSupabaseUrl(supabasePath),
  localPath,
  path: localPath, // Default to local path, will be overridden by preloader
  fallback: 'primitive'
});

export const MODEL_CONFIG = {
  player: createModelConfig(
    "Meshy_Merged_Animations (Walk, Run, Fall & Happy).glb",
    "/models/Meshy_Merged_Animations (Walk, Run, Fall & Happy).glb",
    {
      scale: 1.0,
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      walking: "Player_Running_withSkin.glb",
      falling: "Animation_falling_down_withSkin.glb"
    }
  ),
  doll: createModelConfig(
    "Doly_3D__texture.glb",
    "/models/Doly_3D__texture.glb",
    {
      scale: 1.0,
      position: [0, 0, 25],
      rotation: [0, 0, 0]
    }
  ),
  soldier: createModelConfig(
    "Soldier.glb",
    "/models/Soldier.glb",
    {
      scale: 1.0,
      position: [0, 0, 25],
      rotation: [0, Math.PI, 0]
    }
  ),
  environment: {
    trees: '',
    buildings: '',
    props: createModelConfig(
      "grond_plane_texture.glb",
      "/models/grond_plane_texture.glb",
      { scale: 1.0, position: [0, 0, 0], rotation: [0, 0, 0] }
    ),
    ground: createModelConfig(
      "Create_A_simple_flat_ground_texture.glb",
      "/models/Create_A_simple_flat_ground_texture.glb",
      { scale: 1.0, position: [0, 0, 0], rotation: [0, 0, 0] }
    )
  }
} as const;

export type ModelType = keyof typeof MODEL_CONFIG;
export type ModelConfig = typeof MODEL_CONFIG[ModelType];
