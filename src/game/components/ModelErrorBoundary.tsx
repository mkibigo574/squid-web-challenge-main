import React, { Component, ReactNode } from 'react';
import * as THREE from 'three';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: any) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ModelErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.warn('Model loading error caught by boundary:', error);
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <group>
          {/* Fallback primitive model */}
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.8, 1.8, 0.4]} />
            <meshStandardMaterial color="#4a90e2" />
          </mesh>
          <mesh position={[0, 1.1, 0]} castShadow receiveShadow>
            <sphereGeometry args={[0.3]} />
            <meshStandardMaterial color="#ffdbac" />
          </mesh>
          <mesh position={[-0.3, 0.5, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.2, 0.8, 0.2]} />
            <meshStandardMaterial color="#4a90e2" />
          </mesh>
          <mesh position={[0.3, 0.5, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.2, 0.8, 0.2]} />
            <meshStandardMaterial color="#4a90e2" />
          </mesh>
          <mesh position={[-0.2, -0.4, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.2, 0.6, 0.2]} />
            <meshStandardMaterial color="#2c3e50" />
          </mesh>
          <mesh position={[0.2, -0.4, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.2, 0.6, 0.2]} />
            <meshStandardMaterial color="#2c3e50" />
          </mesh>
        </group>
      );
    }

    return this.props.children;
  }
}
