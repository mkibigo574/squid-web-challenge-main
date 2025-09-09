import { useGLTF } from '@react-three/drei';
import { MODEL_CONFIG } from '../config/models';

// Cache for loaded models to avoid re-downloading
const loadedModels = new Set<string>();
const failedModels = new Set<string>();

// Preload all models with error handling and fallback
export const preloadAllModels = async () => {
  const preloadPromises = [];
  
  // Preload player model
  if (MODEL_CONFIG.player.supabasePath && MODEL_CONFIG.player.localPath) {
    preloadPromises.push(preloadModelWithFallback(
      MODEL_CONFIG.player.supabasePath, 
      MODEL_CONFIG.player.localPath, 
      'player'
    ));
  }
  
  // Preload doll model
  if (MODEL_CONFIG.doll.supabasePath && MODEL_CONFIG.doll.localPath) {
    preloadPromises.push(preloadModelWithFallback(
      MODEL_CONFIG.doll.supabasePath, 
      MODEL_CONFIG.doll.localPath, 
      'doll'
    ));
  }
  
  // Preload soldier model
  if (MODEL_CONFIG.soldier.supabasePath && MODEL_CONFIG.soldier.localPath) {
    preloadPromises.push(preloadModelWithFallback(
      MODEL_CONFIG.soldier.supabasePath, 
      MODEL_CONFIG.soldier.localPath, 
      'soldier'
    ));
  }
  
  // Preload environment models
  Object.entries(MODEL_CONFIG.environment).forEach(([key, config]) => {
    if (config && typeof config === 'object' && 'supabasePath' in config && 'localPath' in config) {
      preloadPromises.push(preloadModelWithFallback(
        config.supabasePath, 
        config.localPath, 
        key
      ));
    }
  });
  
  try {
    await Promise.allSettled(preloadPromises);
    console.log('Model preloading completed');
  } catch (error) {
    console.warn('Some models failed to preload:', error);
  }
};

// Enhanced model preloader with fallback to local files
export const preloadModelWithFallback = async (supabaseUrl: string, localPath: string, modelName: string) => {
  // Skip if already loaded or failed
  if (loadedModels.has(supabaseUrl) || failedModels.has(supabaseUrl)) {
    return;
  }

  try {
    // First, try to preload from Supabase
    await preloadModel(supabaseUrl);
    loadedModels.add(supabaseUrl);
    console.log(`✅ Model loaded from Supabase: ${modelName}`);
  } catch (error) {
    console.warn(`❌ Failed to load from Supabase: ${modelName}`, error);
    
    // Fallback to local file
    try {
      await preloadModel(localPath);
      loadedModels.add(localPath);
      console.log(`✅ Fallback to local: ${modelName}`);
    } catch (localError) {
      console.error(`❌ Both Supabase and local failed: ${modelName}`, localError);
      failedModels.add(supabaseUrl);
    }
  }
};

// Preload specific model
export const preloadModel = (path: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      useGLTF.preload(path);
      resolve();
    } catch (error) {
      reject(error);
    }
  });
};

// Check if model is loaded
export const isModelLoaded = (path: string): boolean => {
  return loadedModels.has(path);
};

// Get the best available model path (Supabase first, then local fallback)
export const getBestModelPath = (supabaseUrl: string, localPath: string): string => {
  if (loadedModels.has(supabaseUrl)) {
    return supabaseUrl;
  }
  
  if (loadedModels.has(localPath)) {
    return localPath;
  }
  
  // Return local path as default (will fallback in component if needed)
  return localPath;
};
