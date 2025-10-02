import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { RedLightGreenLight } from './RedLightGreenLight';
import { TugOfWar } from './TugOfWar';
import { GameLevel } from './hooks/useGameLevels';

export const GameManager = () => {
  const { level } = useParams<{ level?: string }>();
  const navigate = useNavigate();
  const [currentLevel, setCurrentLevel] = useState<GameLevel>('red-light-green-light');

  // Handle URL parameter changes
  useEffect(() => {
    if (level && ['red-light-green-light', 'tug-of-war'].includes(level)) {
      setCurrentLevel(level as GameLevel);
    }
  }, [level]);

  const handleLevelChange = (level: GameLevel) => {
    setCurrentLevel(level);
    navigate(`/game/${level}`);
  };

  const handleNextLevel = () => {
    // This will be called when a level is completed
    // The level progression component will handle the actual level switching
    console.log('Next level requested');
  };

  const renderCurrentLevel = () => {
    switch (currentLevel) {
      case 'red-light-green-light':
        return (
          <RedLightGreenLight 
            onLevelChange={handleLevelChange}
            onNextLevel={handleNextLevel}
          />
        );
      case 'tug-of-war':
        return (
          <TugOfWar 
            onLevelChange={handleLevelChange}
            onNextLevel={handleNextLevel}
          />
        );
      default:
        return (
          <RedLightGreenLight 
            onLevelChange={handleLevelChange}
            onNextLevel={handleNextLevel}
          />
        );
    }
  };

  return (
    <div className="w-full h-screen">
      {renderCurrentLevel()}
    </div>
  );
};
