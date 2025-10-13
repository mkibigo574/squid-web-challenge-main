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
  
  // Compute winning team label and winner display names
  const getWinningTeamName = () => {
    if (!winners || winners.length === 0) return undefined;
    const firstWinnerId = winners[0];
    const firstWinner = players.find(p => p.id === firstWinnerId);
    if (firstWinner && typeof firstWinner.position === 'number') {
      return firstWinner.position < 0 ? 'Red Team' : 'Blue Team';
    }
    // Fallback to rope position if player not found
    if (ropePosition === 'left') return 'Red Team';
    if (ropePosition === 'right') return 'Blue Team';
    return 'Balanced';
  };

  const winnerNames = Array.isArray(winners)
    ? winners
        .map(id => players.find(p => p.id === id))
        .filter(Boolean)
        .map((p: any) => p.name || `Player ${String(p.id).slice(0, 4)}`)
    : [];
  
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

  // Dynamic rope status based on who is currently pulling
  const getRopeStatus = () => {
    const leftPull = players
      .filter((p) => (p.position ?? 0) < 0 && p.isPulling)
      .reduce((sum, p) => sum + (p.pullStrength ?? 0), 0);
    const rightPull = players
      .filter((p) => (p.position ?? 0) >= 0 && p.isPulling)
      .reduce((sum, p) => sum + (p.pullStrength ?? 0), 0);

    if (leftPull === 0 && rightPull === 0) {
      return { text: 'Balanced', color: 'text-yellow-500' };
    }
    if (leftPull > rightPull) {
      return { text: 'Red Team is winning', color: 'text-red-500' };
    }
    if (rightPull > leftPull) {
      return { text: 'Blue Team is winning', color: 'text-blue-500' };
    }
    // Tie while pulling → fall back to rope position
    if (ropePosition === 'left') return { text: 'Red Team Pulling!', color: 'text-red-500' };
    if (ropePosition === 'right') return { text: 'Blue Team Pulling!', color: 'text-blue-500' };
    return { text: 'Balanced', color: 'text-yellow-500' };
  };

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Game Status - Squid Game Style */}
      <div className="absolute top-4 left-4 bg-red-900/90 rounded-lg p-4 text-white border-2 border-red-600">
        <div className="text-xl font-bold mb-2 text-red-200">🔴 SQUID GAME: TUG OF WAR</div>
        <div className="text-sm space-y-1">
          <div>Status: <span className="font-semibold text-yellow-300">{gameState.toUpperCase()}</span></div>
          <div>Time: <span className="font-semibold text-red-300">{Math.ceil(timeLeft)}s</span></div>
          {(() => { const s = getRopeStatus(); return (
            <div>Rope: <span className={`font-semibold ${s.color}`}>{s.text}</span></div>
          ); })()}
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

      {/* Game Over Screen - Squid Game Style */}
      {gameState === 'eliminated' && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-900/95">
          <div className="text-center text-white">
            <div className="text-8xl font-bold mb-4 text-red-300 animate-pulse">💀 ELIMINATED</div>
            <div className="text-3xl mb-6 text-red-200">You fell through the gap!</div>
            <div className="text-xl mb-8 text-yellow-300">You were pulled too close to the center... Game Over</div>
            <button
              className="px-8 py-4 bg-red-700 hover:bg-red-800 rounded-lg text-xl font-bold pointer-events-auto border-2 border-red-500"
              onClick={onResetGame}
            >
              🔄 Try Again
            </button>
          </div>
        </div>
      )}

      {/* Victory Screen - Squid Game Style */}
      {(gameState === 'won' || ended) && (
        <div className="absolute inset-0 flex items-center justify-center bg-green-900/95">
          <div className="text-center text-white">
            <div className="text-8xl font-bold mb-4 text-green-300 animate-pulse">🏆 VICTORY!</div>
            <div className="text-3xl mb-6 text-green-200">
              {winners.length > 0
                ? `Team '${getWinningTeamName()}' Survived!`
                : (ropePosition === 'center' ? 'You Survived the Guillotine!' : 'Game Ended!')}
            </div>
            <div className="text-xl mb-8 text-yellow-300">You pulled the other team into the gap!</div>
            {winners.length > 0 && (
              <div className="text-lg mb-4 text-green-300">
                Survivors: {winnerNames.join(', ')}
              </div>
            )}
            <div className="space-x-4">
              <button
                className="px-8 py-4 bg-green-700 hover:bg-green-800 rounded-lg text-xl font-bold pointer-events-auto border-2 border-green-500"
                onClick={onResetGame}
              >
                🔄 Play Again
              </button>
              {onNextLevel && (
                <button
                  className="px-8 py-4 bg-blue-700 hover:bg-blue-800 rounded-lg text-xl font-bold pointer-events-auto border-2 border-blue-500"
                  onClick={onNextLevel}
                >
                  ➡️ Next Level
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Start Game Button - Squid Game Style */}
      {gameState === 'waiting' && isHost && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-900/80">
          <div className="text-center text-white">
            <div className="text-6xl font-bold mb-6 text-red-300">🔴 SQUID GAME</div>
            <div className="text-3xl font-bold mb-4 text-yellow-300">TUG OF WAR</div>
            <div className="text-xl mb-8 text-red-200">Pull the rope to your side to survive!</div>
            <div className="text-lg mb-8 text-yellow-300">⚠️ Warning: Gap in center - don't fall through! ⚠️</div>
            <button
              className="px-12 py-6 bg-red-700 hover:bg-red-800 rounded-lg text-2xl font-bold pointer-events-auto border-4 border-red-500 animate-pulse"
              onClick={onStartGame}
            >
              🎮 START GAME
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
                <div className={`w-4 h-4 rounded-full mx-auto mb-1 ${ropePosition === 'right' ? 'bg-blue-500' : 'bg-gray-500'}`}></div>
                <div className="text-xs text-blue-400">Blue Team</div>
              </div>
            </div>
            {(() => { const s = getRopeStatus(); return (
              <div className="text-sm mt-2">{s.text}</div>
            ); })()}
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
                style={{ width: `${(timeLeft / 20) * 100}%` }}
              ></div>
            </div>
            <div className="text-sm mt-2">{Math.ceil(timeLeft)} seconds</div>
          </div>
        </div>
      )}
    </div>
  );
};

