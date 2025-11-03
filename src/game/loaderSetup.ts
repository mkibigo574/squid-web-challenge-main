import { useGLTF } from '@react-three/drei';

let loadersConfigured = false;

export function setupModelLoaders(): void {
  if (loadersConfigured) return;
  try {
    // Draco decoder for compressed GLB/GLTF
    useGLTF.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
    // KTX2 BasisU transcoder for modern textures (if used by models)
    // @ts-ignore - optional in some drei versions
    if (typeof useGLTF.setKTX2TranscoderPath === 'function') {
      // @ts-ignore
      useGLTF.setKTX2TranscoderPath('https://unpkg.com/three@0.158.0/examples/jsm/libs/basis/');
    }
    loadersConfigured = true;
  } catch {
    // Safe no-op on SSR or if drei version lacks these helpers
  }
}


