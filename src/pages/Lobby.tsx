import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

function randomCode(len = 5) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

type GameType = 'red-light-green-light' | 'tug-of-war';

const Lobby = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [gameType, setGameType] = useState<GameType>('red-light-green-light');

  const playerId = useMemo(() => crypto.randomUUID(), []);

  const createRoom = () => {
    const code = randomCode();
    navigate(`/room/${code}?name=${encodeURIComponent(name || 'Player')}&id=${encodeURIComponent(playerId)}&creator=true&gameType=${gameType}`);
  };

  const joinRoom = () => {
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    navigate(`/room/${code}?name=${encodeURIComponent(name || 'Player')}&id=${encodeURIComponent(playerId)}&gameType=${gameType}`);
  };

  const createMultiplayerRoom = () => {
    // If Tug of War is selected, go directly to the Tug of War V2 game page
    if (gameType === 'tug-of-war') {
      const code = randomCode();
      navigate(`/towv2/${code}?name=${encodeURIComponent(name || 'Player')}&id=${encodeURIComponent(playerId)}&creator=true`);
      return;
    }

    const code = randomCode();
    navigate(`/room/${code}/multiplayer?name=${encodeURIComponent(name || 'Player')}&id=${encodeURIComponent(playerId)}&creator=true&gameType=${gameType}`);
  };

  const joinMultiplayerRoom = () => {
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    
    // If Tug of War is selected, go to the Tug of War V2 game page
    if (gameType === 'tug-of-war') {
      navigate(`/towv2/${code}?name=${encodeURIComponent(name || 'Player')}&id=${encodeURIComponent(playerId)}`);
      return;
    }
    
    navigate(`/room/${code}/multiplayer?name=${encodeURIComponent(name || 'Player')}&id=${encodeURIComponent(playerId)}&gameType=${gameType}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 sm:p-6 max-w-md w-full space-y-4 border border-white/20">
        <h1 className="text-xl sm:text-2xl font-bold text-white text-center">Multiplayer Lobby</h1>
        
        <div className="space-y-2">
          <label className="block text-sm text-white/90">Name</label>
          <input 
            className="w-full border border-white/30 rounded-lg px-3 py-2 bg-white/10 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            placeholder="Your name" 
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm text-white/90">Game Type</label>
          <div className="flex gap-2">
            <button
              className={`flex-1 px-2 py-2 rounded-lg text-white text-xs sm:text-sm transition-all ${
                gameType === 'red-light-green-light' ? 'bg-blue-600 shadow-lg' : 'bg-white/20 hover:bg-white/30'
              }`}
              onClick={() => setGameType('red-light-green-light')}
            >
              🚦 Red Light Green Light
            </button>
            <button
              className={`flex-1 px-2 py-2 rounded-lg text-white text-xs sm:text-sm transition-all ${
                gameType === 'tug-of-war' ? 'bg-orange-600 shadow-lg' : 'bg-white/20 hover:bg-white/30'
              }`}
              onClick={() => setGameType('tug-of-war')}
            >
              🪢 Tug of War
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-base sm:text-lg font-semibold text-white">Classic Multiplayer</h3>
          <button 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3 py-2 text-sm sm:text-base transition-all" 
            onClick={createRoom}
          >
            Create Room
          </button>
        </div>

        <div className="space-y-2">
          <h3 className="text-base sm:text-lg font-semibold text-white">Enhanced Multiplayer</h3>
          <p className="text-xs sm:text-sm text-white/70">With level switching and mute controls</p>
          <button 
            className="w-full bg-green-600 hover:bg-green-700 text-white rounded-lg px-3 py-2 text-sm sm:text-base transition-all" 
            onClick={createMultiplayerRoom}
          >
            Create Enhanced Room
          </button>
        </div>

        <div className="space-y-2">
          <label className="block text-sm text-white/90">Join with code</label>
          <input 
            className="w-full border border-white/30 rounded-lg px-3 py-2 bg-white/10 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50" 
            value={joinCode} 
            onChange={(e) => setJoinCode(e.target.value)} 
            placeholder="ABCDE" 
          />
          <div className="flex gap-2">
            <button 
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3 py-2 text-xs sm:text-sm transition-all" 
              onClick={joinRoom}
            >
              Join Classic
            </button>
            <button 
              className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-lg px-3 py-2 text-xs sm:text-sm transition-all" 
              onClick={joinMultiplayerRoom}
            >
              Join Enhanced
            </button>
          </div>
        </div>

        <div className="pt-4 text-xs sm:text-sm text-white/60 space-y-1">
          <div>Single-player: <a href="/" className="text-blue-300 underline hover:text-blue-200">Go to game</a></div>
          <div>Classic: Red Light Green Light only</div>
          <div>Enhanced: Red Light Green Light + Tug of War V2</div>
        </div>
      </div>
    </div>
  );
};

export default Lobby;