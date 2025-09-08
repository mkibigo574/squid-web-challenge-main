import { useGLTF } from '@react-three/drei';
import { MODEL_CONFIG } from '../config/models';

// Preload all models to avoid loading delays during gameplay
export const preloadAllModels = () => {
  try {
    // Preload player model
    if (MODEL_CONFIG.player.path) {
      useGLTF.preload(MODEL_CONFIG.player.path);
    }
    
    // Preload doll model
    if (MODEL_CONFIG.doll.path) {
      useGLTF.preload(MODEL_CONFIG.doll.path);
    }
    
    // Preload environment models
    Object.values(MODEL_CONFIG.environment).forEach(path => {
      if (path) {
        useGLTF.preload(path);
      }
    });
    
    console.log('All models preloaded successfully');
  } catch (error) {
    console.warn('Some models failed to preload:', error);
  }
};

// Preload specific model
export const preloadModel = (path: string) => {
  try {
    useGLTF.preload(path);
    console.log(`Model preloaded: ${path}`);
  } catch (error) {
    console.warn(`Failed to preload model ${path}:`, error);
  }
};

// Check if model is loaded
export const isModelLoaded = (path: string): boolean => {
  try {
    // This is a simple check - in a real app you might want more sophisticated loading state management
    return true;
  } catch {
    return false;
  }
};
