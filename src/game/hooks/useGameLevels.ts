import { useState, useCallback } from 'react';

export type GameLevel = 'red-light-green-light' | 'tug-of-war';
export type LevelState = 'locked' | 'unlocked' | 'completed';

export interface GameLevelInfo {
  id: GameLevel;
  name: string;
  description: string;
  state: LevelState;
  order: number;
}

const GAME_LEVELS: GameLevelInfo[] = [
  {
    id: 'red-light-green-light',
    name: 'Red Light, Green Light',
    description: 'Move when the light is green, stop when it\'s red!',
    state: 'unlocked',
    order: 1
  },
  {
    id: 'tug-of-war',
    name: 'Tug of War',
    description: 'Pull the rope to your side to win!',
    state: 'locked',
    order: 2
  }
];

export const useGameLevels = () => {
  const [levels, setLevels] = useState<GameLevelInfo[]>(GAME_LEVELS);
  const [currentLevel, setCurrentLevel] = useState<GameLevel>('red-light-green-light');

  const unlockLevel = useCallback((levelId: GameLevel) => {
    setLevels(prev => prev.map(level => 
      level.id === levelId 
        ? { ...level, state: 'unlocked' as LevelState }
        : level
    ));
  }, []);

  const completeLevel = useCallback((levelId: GameLevel) => {
    setLevels(prev => prev.map(level => 
      level.id === levelId 
        ? { ...level, state: 'completed' as LevelState }
        : level
    ));

    // Unlock next level
    const currentLevelInfo = levels.find(l => l.id === levelId);
    if (currentLevelInfo) {
      const nextLevel = levels.find(l => l.order === currentLevelInfo.order + 1);
      if (nextLevel) {
        unlockLevel(nextLevel.id);
      }
    }
  }, [levels, unlockLevel]);

  const setCurrentLevelById = useCallback((levelId: GameLevel) => {
    const level = levels.find(l => l.id === levelId);
    if (level && level.state !== 'locked') {
      setCurrentLevel(levelId);
    }
  }, [levels]);

  const getNextLevel = useCallback(() => {
    const currentLevelInfo = levels.find(l => l.id === currentLevel);
    if (currentLevelInfo) {
      return levels.find(l => l.order === currentLevelInfo.order + 1);
    }
    return null;
  }, [levels, currentLevel]);

  const canProceedToNextLevel = useCallback(() => {
    const nextLevel = getNextLevel();
    return nextLevel && nextLevel.state !== 'locked';
  }, [getNextLevel]);

  return {
    levels,
    currentLevel,
    setCurrentLevelById,
    unlockLevel,
    completeLevel,
    getNextLevel,
    canProceedToNextLevel
  };
};


