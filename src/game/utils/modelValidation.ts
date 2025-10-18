// Utility functions for model path validation and error handling

export const isValidModelPath = (path: string | undefined | null): boolean => {
  if (!path) return false;
  if (path.includes('undefined')) return false;
  if (path.includes('your-supabase-url')) return false;
  if (path.trim() === '') return false;
  return true;
};

export const isSupabaseUrl = (path: string): boolean => {
  return isValidModelPath(path) && path.startsWith('http');
};

export const isLocalPath = (path: string): boolean => {
  return isValidModelPath(path) && path.startsWith('/');
};

export const getModelSource = (path: string): 'supabase' | 'local' | 'invalid' => {
  if (!isValidModelPath(path)) return 'invalid';
  if (isSupabaseUrl(path)) return 'supabase';
  if (isLocalPath(path)) return 'local';
  return 'invalid';
};

export const createModelFallback = (color: string = '#4a90e2') => {
  return {
    body: { geometry: 'boxGeometry', args: [0.8, 1.8, 0.4], color },
    head: { geometry: 'sphereGeometry', args: [0.3], color: '#ffdbac', position: [0, 1.1, 0] },
    leftArm: { geometry: 'boxGeometry', args: [0.2, 0.8, 0.2], color, position: [-0.3, 0.5, 0] },
    rightArm: { geometry: 'boxGeometry', args: [0.2, 0.8, 0.2], color, position: [0.3, 0.5, 0] },
    leftLeg: { geometry: 'boxGeometry', args: [0.2, 0.6, 0.2], color: '#2c3e50', position: [-0.2, -0.4, 0] },
    rightLeg: { geometry: 'boxGeometry', args: [0.2, 0.6, 0.2], color: '#2c3e50', position: [0.2, -0.4, 0] }
  };
};
