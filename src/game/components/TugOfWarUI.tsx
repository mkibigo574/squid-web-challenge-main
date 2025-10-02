import { useState, useEffect } from 'react';

interface TugOfWarUIProps {
  gameState: 'waiting' | 'countdown' | 'playing' | 'won' | 'eliminated';
  timeLeft: number;
  countdown: number;
  ropePosition: 'left' | 'center' | 'right';
  isPulling: boolean;
  pullStrength: number;
  players: any[];
  isHost: boolean;
  winners: string[];
  ended: boolean;
  currentPlayerId: string;
  onStartGame: () => void;
  onResetGame: () => void;
  onPullRope: () => void;
  onReleaseRope: () => void;
  onNextLevel?: () => void;
}

export const TugOfWarUI = ({
  gameState,
  timeLeft,
  countdown,
  ropePosition,
  isPulling,
  pullStrength,
  players,
  isHost,
  winners,
  ended,
  currentPlayerId,
  onStartGame,
  onResetGame,
  onPullRope,
  onReleaseRope,
  onNextLevel
}: TugOfWarUIProps) => {
  const [showNextLevel, setShowNextLevel] = useState(false);
  
  // Debug logging for victory screen conditions
  useEffect(() => {
    const shouldShowVictory = gameState === 'won' || ended;
    console.log('🎉 TugOfWarUI Victory Screen Check:', {
      gameState,
      ended,
      winners,
      winnersLength: winners.length,
      shouldShowVictory,
      victoryCondition: gameState === 'won' || ended
    });
  }, [gameState, ended, winners]);

  // Show next level button when player wins
  useEffect(() => {
    if (gameState === 'won' && !showNextLevel) {
      setShowNextLevel(true);
    }
  }, [gameState, showNextLevel]);

  const getRopePositionText = () => {
    switch (ropePosition) {
      case 'left': return 'Red Team Pulling!';
      case 'right': return 'Green Team Pulling!';
      case 'center': return 'Balanced';
      default: return 'Balanced';
    }
  };

  const getRopePositionColor = () => {
    switch (ropePosition) {
      case 'left': return 'text-green-500';
      case 'right': return 'text-red-500';
      case 'center': return 'text-yellow-500';
      default: return 'text-yellow-500';
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Game Status */}
      <div className="absolute top-4 left-4 bg-black/80 rounded-lg p-4 text-white">
        <div className="text-lg font-bold mb-2">Tug of War</div>
        <div className="text-sm space-y-1">
          <div>Status: <span className="font-semibold">{gameState}</span></div>
          <div>Time: <span className="font-semibold">{Math.ceil(timeLeft)}s</span></div>
          <div>Rope: <span className={`font-semibold ${getRopePositionColor()}`}>{getRopePositionText()}</span></div>
        </div>
      </div>

      {/* Controls */}
      <div className="absolute top-4 right-4 bg-black/80 rounded-lg p-4 text-white">
        <div className="text-sm space-y-1">
          <div>Hold <kbd className="px-2 py-1 bg-gray-600 rounded">SPACE</kbd> to pull</div>
          <div>Status: {isPulling ? 'Pulling!' : 'Not pulling'}</div>
          <div>Strength: {(pullStrength * 100).toFixed(0)}%</div>
        </div>
      </div>

      {/* Countdown */}
      {gameState === 'countdown' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="text-8xl font-bold text-white animate-pulse">
            {countdown}
          </div>
        </div>
      )}

      {/* Game Over Screen */}
      {gameState === 'eliminated' && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-900/80">
          <div className="text-center text-white">
            <div className="text-6xl font-bold mb-4">GAME OVER</div>
            <div className="text-2xl mb-6">You lost the tug of war!</div>
            <button
              className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-semibold pointer-events-auto"
              onClick={onResetGame}
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Victory Screen - Simple approach that works */}
      {(gameState === 'won' || ended) && (
        <div className="absolute inset-0 flex items-center justify-center bg-green-900/80">
          <div className="text-center text-white">
            <div className="text-6xl font-bold mb-4">VICTORY!</div>
            <div className="text-2xl mb-6">
              {winners.length > 0 ? `Team Won! (${winners.length} players)` : 'Game Ended!'}
            </div>
            {winners.length > 0 && (
              <div className="text-lg mb-4">
                Winners: {winners.join(', ')}
              </div>
            )}
            <div className="space-x-4">
              <button
                className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-semibold pointer-events-auto"
                onClick={onResetGame}
              >
                Play Again
              </button>
              {onNextLevel && (
                <button
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold pointer-events-auto"
                  onClick={onNextLevel}
                >
                  Next Level
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Start Game Button */}
      {gameState === 'waiting' && isHost && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="text-center text-white">
            <div className="text-4xl font-bold mb-6">Tug of War</div>
            <div className="text-xl mb-8">Pull the rope to your side to win!</div>
            <button
              className="px-8 py-4 bg-green-600 hover:bg-green-700 rounded-lg text-xl font-semibold pointer-events-auto"
              onClick={onStartGame}
            >
              Start Game
            </button>
          </div>
        </div>
      )}

      {/* Waiting for Host */}
      {gameState === 'waiting' && !isHost && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="text-center text-white">
            <div className="text-4xl font-bold mb-6">Tug of War</div>
            <div className="text-xl mb-8">Waiting for host to start the game...</div>
          </div>
        </div>
      )}

      {/* Rope Position Indicator */}
      {gameState === 'playing' && (
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-black/80 rounded-lg p-4 text-white">
          <div className="text-center">
            <div className="text-lg font-semibold mb-2">Rope Position</div>
            <div className="flex items-center justify-center space-x-4">
              <div className="text-center">
                <div className={`w-4 h-4 rounded-full mx-auto mb-1 ${ropePosition === 'left' ? 'bg-red-500' : 'bg-gray-500'}`}></div>
                <div className="text-xs text-red-400">Red Team</div>
              </div>
              <div className="w-32 h-2 bg-gray-600 rounded-full relative">
                <div 
                  className={`absolute top-0 h-2 rounded-full transition-all duration-300 ${
                    ropePosition === 'left' ? 'bg-red-500 w-1/3' : 
                    ropePosition === 'right' ? 'bg-green-500 w-2/3' : 
                    'bg-yellow-500 w-1/2'
                  }`}
                ></div>
              </div>
              <div className="text-center">
                <div className={`w-4 h-4 rounded-full mx-auto mb-1 ${ropePosition === 'right' ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                <div className="text-xs text-green-400">Green Team</div>
              </div>
            </div>
            <div className="text-sm mt-2">{getRopePositionText()}</div>
          </div>
        </div>
      )}

      {/* Progress Bar */}
      {gameState === 'playing' && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-black/80 rounded-lg p-4 text-white">
          <div className="text-center">
            <div className="text-lg font-semibold mb-2">Time Remaining</div>
            <div className="w-64 h-4 bg-gray-600 rounded-full">
              <div 
                className="h-4 bg-blue-500 rounded-full transition-all duration-1000"
                style={{ width: `${(timeLeft / 30) * 100}%` }}
              ></div>
            </div>
            <div className="text-sm mt-2">{Math.ceil(timeLeft)} seconds</div>
          </div>
        </div>
      )}
    </div>
  );
};

