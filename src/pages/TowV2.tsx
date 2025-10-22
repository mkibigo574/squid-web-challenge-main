import { useEffect, useState } from 'react';
import { MultiplayerTugOfWarV2 } from '../game/towv2/MultiplayerTugOfWarV2';
import { multiplayerManager } from '@/lib/multiplayer';
import { useTowV2 } from '../game/towv2/useTowV2';

export default function TowV2() {
  const [joined, setJoined] = useState(false);
  const [roomCode, setRoomCode] = useState('TOWV2');
  const [name, setName] = useState('Player');

  useEffect(() => {
    return () => {
      multiplayerManager.leaveRoom();
    };
  }, []);

  if (!joined) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-orange-900 to-red-900 text-white p-4">
        <div className="bg-black/50 backdrop-blur-lg p-4 sm:p-6 rounded-xl space-y-4 w-full max-w-sm border border-white/20">
          <div className="text-lg sm:text-xl font-semibold text-center">Tug of War V2 (Lobby)</div>
          <label className="block text-sm text-gray-300">Display name</label>
          <input
            className="w-full px-3 py-2 rounded-lg bg-gray-800/50 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500 text-white placeholder-gray-400"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
          />
          <label className="block text-sm text-gray-300">Room code</label>
          <input
            className="w-full px-3 py-2 rounded-lg bg-gray-800/50 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500 text-white placeholder-gray-400"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            placeholder="Enter room code"
          />
          <button
            className="w-full mt-2 bg-orange-600 hover:bg-orange-700 py-2 rounded-lg transition-all text-sm sm:text-base"
            onClick={async () => {
              await multiplayerManager.joinRoom(roomCode, { id: crypto.randomUUID(), name }, true);
              setJoined(true);
            }}
          >
            Join Room
          </button>
          <div className="text-xs text-gray-400 text-center">After joining, use the Start button to begin. Click or press keys rapidly to pull.</div>
        </div>
      </div>
    );
  }

  return <MultiplayerTugOfWarV2 />;
}


