import React from 'react';
import { Html } from '@react-three/drei';

interface NameTagProps {
  name: string;
  position?: [number, number, number];
  color?: string;
  isEliminated?: boolean;
  isSelf?: boolean;
}

export const NameTag: React.FC<NameTagProps> = ({ 
  name, 
  position = [0, 2.5, 0], 
  color = '#ffffff',
  isEliminated = false,
  isSelf = false
}) => {
  return (
    <Html
      position={position}
      center
      distanceFactor={1.5}
      zIndexRange={[100, 0]}
      style={{
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    >
      <div
        style={{
          background: isEliminated ? 'rgba(255, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.8)',
          color: isEliminated ? '#ffffff' : color,
          padding: '24px 48px',
          borderRadius: '4px',
          fontSize: '80px',
          fontWeight: 'bold',
          textAlign: 'center',
          whiteSpace: 'nowrap',
          border: isEliminated ? '2px solid #ff0000' : '1px solid rgba(255, 255, 255, 0.3)',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.5)',
          textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)',
          opacity: isEliminated ? 0.6 : 1,
          transform: 'translateY(-50%)',
        }}
      >
        {isSelf ? 'YOU' : name}
        {isEliminated && <div style={{ fontSize: '56px', opacity: 0.9, fontWeight: 'bold' }}>ELIMINATED</div>}
      </div>
    </Html>
  );
};
