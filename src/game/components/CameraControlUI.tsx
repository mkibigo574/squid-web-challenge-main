import { useState, useEffect } from 'react';
import { cinematicCameraManager } from '../utils/cinematicCamera';

interface CameraControlUIProps {
  gameState: 'waiting' | 'countdown' | 'playing' | 'won' | 'eliminated';
  isPulling?: boolean;
  pullStrength?: number;
}

export const CameraControlUI = ({ gameState, isPulling = false, pullStrength = 0 }: CameraControlUIProps) => {
  const [currentAngle, setCurrentAngle] = useState<string>('Low 3rd-Person Wide');
  const [isAutoCinematic, setIsAutoCinematic] = useState(cinematicCameraManager.isAutoCinematicEnabled());
  const [availableAngles, setAvailableAngles] = useState<string[]>([]);

  // Debug: Log when component renders
  console.log('🎬 CameraControlUI rendering with gameState:', gameState);

  // Sync auto cinematic state on mount
  useEffect(() => {
    setIsAutoCinematic(cinematicCameraManager.isAutoCinematicEnabled());
  }, []);

  useEffect(() => {
    // Get appropriate angles for current game state
    const angles = cinematicCameraManager.getAnglesForGameState(gameState);
    const angleNames = angles.map(angle => angle.name);
    setAvailableAngles(angleNames);
    
    // Only auto-switch if current angle is not available for this game state
    if (angleNames.length > 0 && !angleNames.includes(currentAngle)) {
      const defaultAngle = angleNames[0];
      console.log('🎬 Switching to default angle for game state:', defaultAngle);
      setCurrentAngle(defaultAngle);
      cinematicCameraManager.switchToAngle(defaultAngle, 1000);
    }
  }, [gameState, currentAngle]);

  // Handle camera shake during intense pulling
  useEffect(() => {
    if (isPulling && pullStrength > 0.7) {
      cinematicCameraManager.setCameraShake(pullStrength * 0.02, 200);
    }
  }, [isPulling, pullStrength]);

  const handleAngleChange = (angleName: string) => {
    setCurrentAngle(angleName);
    cinematicCameraManager.switchToAngle(angleName, 1500);
  };

  const handleAutoCinematicToggle = () => {
    const newState = !isAutoCinematic;
    setIsAutoCinematic(newState);
    
    if (newState) {
      console.log('🎬 Enabling auto cinematic mode');
      cinematicCameraManager.startAutoCinematic(gameState, 4000);
    } else {
      console.log('🎬 Disabling auto cinematic mode');
      cinematicCameraManager.stopAutoCinematic();
    }
  };

  const handleResetCamera = () => {
    cinematicCameraManager.resetToGameplay();
    setCurrentAngle('Low 3rd-Person Wide');
    setIsAutoCinematic(false);
  };

  const [isExpanded, setIsExpanded] = useState(false);

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded border-2 border-orange-400 transition-all duration-200 transform hover:scale-105"
        title="Open Camera Controls"
      >
        🎬 Camera
      </button>
    );
  }

  return (
    <div className="fixed top-4 right-4 z-50 bg-purple-600/90 backdrop-blur-sm rounded-lg p-4 text-white border-2 border-orange-400">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-bold">🎬 Camera Control</h3>
        <button
          onClick={() => setIsExpanded(false)}
          className="text-orange-300 hover:text-orange-100 text-xl font-bold"
          title="Close Camera Controls"
        >
          ×
        </button>
      </div>
      
      {/* Debug info */}
      <div className="mb-2 text-xs text-orange-200">
        GameState: {gameState} | Available: {availableAngles.length}
      </div>
      
      {/* Current Angle Display */}
      <div className="mb-3">
        <span className="text-sm text-gray-300">Current: </span>
        <span className="text-sm font-medium">{currentAngle}</span>
      </div>

      {/* Camera Angle Selector */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Camera Angles:</label>
        <select
          value={currentAngle}
          onChange={(e) => handleAngleChange(e.target.value)}
          className="w-full bg-gray-800 text-white rounded px-3 py-2 text-sm border border-gray-600 focus:border-blue-500 focus:outline-none"
        >
          {availableAngles.map(angle => (
            <option key={angle} value={angle}>
              {angle}
            </option>
          ))}
        </select>
      </div>

      {/* Auto Cinematic Toggle */}
      <div className="mb-4">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={isAutoCinematic}
            onChange={handleAutoCinematicToggle}
            className="rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500"
          />
          <span className="text-sm">Auto Cinematic Mode</span>
        </label>
      </div>

      {/* Control Buttons */}
      <div className="space-y-2">
        <button
          onClick={handleResetCamera}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm transition-colors"
        >
          Reset to Gameplay
        </button>
        
        {/* Quick Angle Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => handleAngleChange('Low 3rd-Person Wide')}
            className="bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded text-xs transition-colors"
          >
            Wide View
          </button>
          <button
            onClick={() => handleAngleChange('Vertigo Abyss Shot')}
            className="bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded text-xs transition-colors"
          >
            Abyss View
          </button>
          <button
            onClick={() => handleAngleChange('Close-Up Struggle')}
            className="bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded text-xs transition-colors"
          >
            Close-Up
          </button>
          <button
            onClick={() => handleAngleChange('Over-the-Shoulder Rope Tension')}
            className="bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded text-xs transition-colors"
          >
            Rope View
          </button>
        </div>
      </div>

      {/* Game State Indicator */}
      <div className="mt-3 pt-3 border-t border-gray-600">
        <div className="text-xs text-gray-400">
          Game State: <span className="text-yellow-400 font-medium">{gameState}</span>
        </div>
        {isPulling && (
          <div className="text-xs text-red-400">
            Pulling: <span className="font-medium">{(pullStrength * 100).toFixed(0)}%</span>
          </div>
        )}
      </div>
    </div>
  );
};
