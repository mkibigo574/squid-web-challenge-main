import { useState } from 'react';
import { useGameLevels, GameLevel } from '../hooks/useGameLevels';

interface LevelProgressionProps {
  onLevelChange: (level: GameLevel) => void;
  onNextLevel: () => void;
  showNextLevelButton?: boolean;
}

export const LevelProgression = ({ 
  onLevelChange, 
  onNextLevel, 
  showNextLevelButton = false 
}: LevelProgressionProps) => {
  const { levels, currentLevel, setCurrentLevelById, completeLevel, getNextLevel, canProceedToNextLevel } = useGameLevels();
  const [showLevelSelect, setShowLevelSelect] = useState(false);

  const handleLevelComplete = (levelId: GameLevel) => {
    completeLevel(levelId);
    const nextLevel = getNextLevel();
    if (nextLevel) {
      setCurrentLevelById(nextLevel.id);
      onLevelChange(nextLevel.id);
    }
  };

  const handleNextLevel = () => {
    const nextLevel = getNextLevel();
    if (nextLevel) {
      setCurrentLevelById(nextLevel.id);
      onLevelChange(nextLevel.id);
    }
    onNextLevel();
  };

  const getLevelIcon = (level: any) => {
    switch (level.id) {
      case 'red-light-green-light':
        return '🚦';
      case 'tug-of-war':
        return '🪢';
      default:
        return '🎮';
    }
  };

  const getLevelStateIcon = (state: string) => {
    switch (state) {
      case 'completed':
        return '✅';
      case 'unlocked':
        return '🔓';
      case 'locked':
        return '🔒';
      default:
        return '❓';
    }
  };

  return (
    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20">
      {/* Level Selector Button */}
      <button
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold pointer-events-auto"
        onClick={() => setShowLevelSelect(!showLevelSelect)}
      >
        Levels
      </button>

      {/* Level Selection Modal */}
      {showLevelSelect && (
        <div className="absolute top-12 left-1/2 transform -translate-x-1/2 bg-black/90 rounded-lg p-4 text-white min-w-80 pointer-events-auto">
          <div className="text-lg font-bold mb-4 text-center">Game Levels</div>
          <div className="space-y-2">
            {levels.map((level) => (
              <div
                key={level.id}
                className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                  level.id === currentLevel
                    ? 'border-blue-500 bg-blue-500/20'
                    : level.state === 'locked'
                    ? 'border-gray-500 bg-gray-500/20 cursor-not-allowed opacity-50'
                    : 'border-gray-600 bg-gray-600/20 hover:border-blue-400 hover:bg-blue-400/20'
                }`}
                onClick={() => {
                  if (level.state !== 'locked') {
                    setCurrentLevelById(level.id);
                    onLevelChange(level.id);
                    setShowLevelSelect(false);
                  }
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{getLevelIcon(level)}</span>
                    <div>
                      <div className="font-semibold">{level.name}</div>
                      <div className="text-sm text-gray-300">{level.description}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{getLevelStateIcon(level.state)}</span>
                    {level.id === currentLevel && (
                      <span className="text-blue-400 text-sm">Current</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button
            className="w-full mt-4 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg"
            onClick={() => setShowLevelSelect(false)}
          >
            Close
          </button>
        </div>
      )}

      {/* Next Level Button */}
      {showNextLevelButton && canProceedToNextLevel() && (
        <div className="absolute top-12 left-1/2 transform -translate-x-1/2">
          <button
            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold pointer-events-auto animate-pulse"
            onClick={handleNextLevel}
          >
            Next Level →
          </button>
        </div>
      )}
    </div>
  );
};


