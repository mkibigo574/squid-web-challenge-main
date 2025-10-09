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
      <div className="w-full h-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="bg-black/50 p-6 rounded-xl space-y-4 w-[380px]">
          <div className="text-xl font-semibold">Tug of War V2 (Lobby)</div>
          <label className="block text-sm text-gray-300">Display name</label>
          <input
            className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-700 focus:outline-none"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <label className="block text-sm text-gray-300">Room code</label>
          <input
            className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-700 focus:outline-none"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
          />
          <button
            className="w-full mt-2 bg-orange-600 hover:bg-orange-700 py-2 rounded"
            onClick={async () => {
              await multiplayerManager.joinRoom(roomCode, { id: crypto.randomUUID(), name }, true);
              setJoined(true);
            }}
          >
            Join Room
          </button>
          <div className="text-xs text-gray-400">After joining, use the Start button to begin. Click or press keys rapidly to pull.</div>
        </div>
      </div>
    );
  }

  return <MultiplayerTugOfWarV2 />;
}


