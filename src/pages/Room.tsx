import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom';
import { multiplayerManager } from '@/lib/multiplayer';

type PresencePlayer = { id: string; name?: string; isEliminated?: boolean; x?: number; z?: number; isMoving?: boolean };

const Room = () => {
  const { code } = useParams();
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const [players, setPlayers] = useState<PresencePlayer[]>([]);
  const [status, setStatus] = useState('Connecting…');
  const [isHost, setIsHost] = useState(false);
  const [roomMetadata, setRoomMetadata] = useState<any>(null);

  const player = useMemo(() => ({
    id: sp.get('id') || crypto.randomUUID(),
    name: sp.get('name') || 'Player'
  }), [sp]);

  const isCreator = sp.get('creator') === 'true';

  useEffect(() => {
    if (!code) return;

    const onPlayers = (p: PresencePlayer[]) => setPlayers(p);
    const onRoomUpdate = (metadata: any) => {
      setRoomMetadata(metadata);
      setIsHost(metadata?.hostId === player.id);
    };
    const onHostChange = (payload: any) => {
      setIsHost(payload.hostId === player.id);
    };

    multiplayerManager.onEvent('PLAYERS_UPDATED', onPlayers);
    multiplayerManager.onEvent('ROOM_UPDATED', onRoomUpdate);
    multiplayerManager.onEvent('HOST_CHANGED', onHostChange);

    (async () => {
      try {
        await multiplayerManager.joinRoom(code, { id: player.id!, name: player.name! }, isCreator);
        setStatus(`Joined room ${code}`);
      } catch {
        setStatus('Failed to join room');
      }
    })();

    return () => {
      multiplayerManager.offEvent('PLAYERS_UPDATED', onPlayers);
      multiplayerManager.offEvent('ROOM_UPDATED', onRoomUpdate);
      multiplayerManager.offEvent('HOST_CHANGED', onHostChange);
      // Don't call leaveRoom() here - let RoomGame.tsx handle the connection
    };
  }, [code, player.id, player.name, isCreator]);

  const handleBackToLobby = async () => {
    await multiplayerManager.leaveRoom();
    navigate('/lobby');
  };

  const handleEnterGame = () => {
    // Don't leave room, just navigate
    navigate(`/room/${code}/game?name=${encodeURIComponent(player.name!)}&id=${encodeURIComponent(player.id!)}${isCreator ? '&creator=true' : ''}`);
  };

  return (
    <div className="p-6 max-w-xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Room {code}</h1>
        <button onClick={handleBackToLobby} className="text-blue-600 underline">Back to Lobby</button>
      </div>
      <div className="text-sm text-gray-600">{status}</div>
      
      {isHost && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
          <strong>You are the host!</strong> You can control the game.
        </div>
      )}

      <div className="border rounded p-4">
        <h2 className="font-semibold mb-2">Players</h2>
        <ul className="space-y-1">
          {players.map((p) => (
            <li key={p.id} className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                {p.name || p.id}
                {roomMetadata?.hostId === p.id && (
                  <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded">HOST</span>
                )}
              </span>
              <span className="text-xs text-gray-500">
                {p.isEliminated ? 'eliminated' : 'active'}
                {typeof p.x === 'number' && typeof p.z === 'number' ? ` • x:${p.x.toFixed(2)} z:${p.z.toFixed(2)} ${p.isMoving ? '(moving)' : ''}` : ''}
              </span>
            </li>
          ))}
        </ul>
        {players.length === 0 && <div className="text-sm text-gray-500">Waiting for players…</div>}
      </div>

      <div className="text-sm text-gray-500">
        This page only verifies presence. We'll integrate game sync next.
      </div>
      <div className="space-y-2">
        <button
          onClick={handleEnterGame}
          className="inline-block bg-purple-600 text-white rounded px-3 py-2"
        >
          Enter Game
        </button>
      </div>
    </div>
  );
};

export default Room;

