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
    const code = randomCode();
    navigate(`/room/${code}/multiplayer?name=${encodeURIComponent(name || 'Player')}&id=${encodeURIComponent(playerId)}&creator=true&gameType=${gameType}`);
  };

  const joinMultiplayerRoom = () => {
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    navigate(`/room/${code}/multiplayer?name=${encodeURIComponent(name || 'Player')}&id=${encodeURIComponent(playerId)}&gameType=${gameType}`);
  };

  return (
    <div className="p-6 max-w-md mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Multiplayer Lobby</h1>
      
      <div className="space-y-2">
        <label className="block text-sm">Name</label>
        <input 
          className="w-full border rounded px-3 py-2" 
          value={name} 
          onChange={(e) => setName(e.target.value)} 
          placeholder="Your name" 
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm">Game Type</label>
        <div className="flex gap-2">
          <button
            className={`flex-1 px-3 py-2 rounded text-white ${
              gameType === 'red-light-green-light' ? 'bg-blue-600' : 'bg-gray-500'
            }`}
            onClick={() => setGameType('red-light-green-light')}
          >
            🚦 Red Light Green Light
          </button>
          <button
            className={`flex-1 px-3 py-2 rounded text-white ${
              gameType === 'tug-of-war' ? 'bg-orange-600' : 'bg-gray-500'
            }`}
            onClick={() => setGameType('tug-of-war')}
          >
            🪢 Tug of War
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Classic Multiplayer</h3>
        <button 
          className="w-full bg-blue-600 text-white rounded px-3 py-2" 
          onClick={createRoom}
        >
          Create Room
        </button>
      </div>

      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Enhanced Multiplayer</h3>
        <p className="text-sm text-gray-600">With level switching and mute controls</p>
        <button 
          className="w-full bg-green-600 text-white rounded px-3 py-2" 
          onClick={createMultiplayerRoom}
        >
          Create Enhanced Room
        </button>
      </div>

      <div className="space-y-2">
        <label className="block text-sm">Join with code</label>
        <input 
          className="w-full border rounded px-3 py-2" 
          value={joinCode} 
          onChange={(e) => setJoinCode(e.target.value)} 
          placeholder="ABCDE" 
        />
        <div className="flex gap-2">
          <button 
            className="flex-1 bg-blue-600 text-white rounded px-3 py-2" 
            onClick={joinRoom}
          >
            Join Classic
          </button>
          <button 
            className="flex-1 bg-green-600 text-white rounded px-3 py-2" 
            onClick={joinMultiplayerRoom}
          >
            Join Enhanced
          </button>
        </div>
      </div>

      <div className="pt-4 text-sm text-gray-500">
        <div>Single-player: <a href="/" className="text-blue-500 underline">Go to game</a></div>
        <div>Classic: Red Light Green Light only</div>
        <div>Enhanced: Both games + level switching</div>
      </div>
    </div>
  );
};

export default Lobby;