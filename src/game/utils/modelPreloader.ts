import { useGLTF } from '@react-three/drei';
import { MODEL_CONFIG } from '../config/models';

// Cache for loaded models to avoid re-downloading
const loadedModels = new Set<string>();
const failedModels = new Set<string>();
const resolvedPaths = new Map<string, string>(); // Maps original path to resolved path

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

  // Check if Supabase URL is valid before trying to load
  const isSupabaseUrlValid = supabaseUrl && 
    !supabaseUrl.includes('undefined') && 
    !supabaseUrl.includes('your-supabase-url') &&
    supabaseUrl.startsWith('http');

  if (isSupabaseUrlValid) {
    try {
      // First, try to preload from Supabase
      await preloadModel(supabaseUrl);
      loadedModels.add(supabaseUrl);
      resolvedPaths.set(localPath, supabaseUrl); // Map local path to Supabase URL
      console.log(`✅ Model loaded from Supabase: ${modelName}`);
      return;
    } catch (error) {
      console.warn(`❌ Failed to load from Supabase: ${modelName}`, error);
    }
  } else {
    console.log(`⚠️ Supabase URL not valid, using local: ${modelName}`);
  }
  
  // Fallback to local file
  try {
    await preloadModel(localPath);
    loadedModels.add(localPath);
    resolvedPaths.set(localPath, localPath); // Map local path to itself
    console.log(`✅ Using local model: ${modelName}`);
  } catch (localError) {
    console.error(`❌ Local model also failed: ${modelName}`, localError);
    failedModels.add(supabaseUrl);
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
  // Check if we have a resolved path for this local path
  if (resolvedPaths.has(localPath)) {
    return resolvedPaths.get(localPath)!;
  }
  
  // If Supabase is loaded, use it
  if (loadedModels.has(supabaseUrl)) {
    return supabaseUrl;
  }
  
  // If local is loaded, use it
  if (loadedModels.has(localPath)) {
    return localPath;
  }
  
  // In production, prefer Supabase URL as default
  // In development, prefer local path
  const isProduction = import.meta.env.PROD;
  return isProduction ? supabaseUrl : localPath;
};

// Get the best model path with fallback to Supabase URL in production
export const getModelPath = (supabaseUrl: string, localPath: string): string => {
  // Always prefer Supabase URL in production
  const isProduction = import.meta.env.PROD;
  if (isProduction) {
    return supabaseUrl;
  }
  
  // In development, check if we have a resolved path
  if (resolvedPaths.has(localPath)) {
    return resolvedPaths.get(localPath)!;
  }
  
  // Default to local path in development
  return localPath;
};
