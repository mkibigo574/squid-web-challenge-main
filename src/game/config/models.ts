import { getSupabaseUrl } from '@/lib/supabase';

// Helper function to create model config with environment-aware path selection
const createModelConfig = (supabasePath: string, localPath: string, config: any) => {
<<<<<<< HEAD
  // Force use of local models to avoid Supabase connection issues
  return {
    ...config,
    supabasePath: localPath, // Use local path as fallback
    localPath,
    path: localPath, // Always use local path
=======
  const supabaseUrl = getSupabaseUrl(supabasePath);
  const isSupabaseConfigured = supabaseUrl && 
    !supabaseUrl.includes('undefined') && 
    !supabaseUrl.includes('your-supabase-url') &&
    supabaseUrl.startsWith('http');
  
  const finalPath = isSupabaseConfigured ? supabaseUrl : localPath;
  
  console.log(`Model config for ${supabasePath}:`, {
    supabaseUrl,
    isSupabaseConfigured,
    localPath,
    finalPath
  });
  
  return {
    ...config,
    supabasePath: supabaseUrl,
    localPath,
    path: finalPath, // Use local path if Supabase not configured
>>>>>>> 3a81eb1 (Implemented tugging sound with fade out effect.  Added win_game.wav for winning teams. Added buzzer.wav for losing teams. Enhanced elimination modal for losing teams. Updated player models to use Supabase models with standing animations. Added audio mute/unmute functionality. Improved tug of war game experience with proper sound effects)
    fallback: 'primitive'
  };
};

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
  tree: createModelConfig(
    "Generate_a_3D_environment_tree_texture.glb",
    "/models/Generate_a_3D_environment_tree_texture.glb",
    {
      scale: 1.0,
      position: [0, 0, 0],
      rotation: [0, 0, 0]
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
