import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

function randomCode(len = 5) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

const Lobby = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [joinCode, setJoinCode] = useState('');

  const playerId = useMemo(() => crypto.randomUUID(), []);

  const createRoom = () => {
    const code = randomCode();
    navigate(`/room/${code}?name=${encodeURIComponent(name || 'Player')}&id=${encodeURIComponent(playerId)}&creator=true`);
  };

  const joinRoom = () => {
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    navigate(`/room/${code}?name=${encodeURIComponent(name || 'Player')}&id=${encodeURIComponent(playerId)}`);
  };

  return (
    <div className="p-6 max-w-md mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Multiplayer Lobby</h1>
      <div className="space-y-2">
        <label className="block text-sm">Name</label>
        <input className="w-full border rounded px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
      </div>
      <div className="space-y-2">
        <button className="w-full bg-blue-600 text-white rounded px-3 py-2" onClick={createRoom}>Create Room</button>
      </div>
      <div className="space-y-2">
        <label className="block text-sm">Join with code</label>
        <input className="w-full border rounded px-3 py-2" value={joinCode} onChange={(e) => setJoinCode(e.target.value)} placeholder="ABCDE" />
        <button className="w-full bg-green-600 text-white rounded px-3 py-2" onClick={joinRoom}>Join Room</button>
      </div>
      <div className="pt-4 text-sm text-gray-500">
        Single-player remains at /. Multiplayer is optional at /lobby → /room/:code.
      </div>
    </div>
  );
};

export default Lobby;
