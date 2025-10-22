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
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 sm:p-6 max-w-xl w-full space-y-4 border border-white/20">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <h1 className="text-xl sm:text-2xl font-bold text-white">Room {code}</h1>
          <button onClick={handleBackToLobby} className="text-blue-300 underline hover:text-blue-200 text-sm sm:text-base">Back to Lobby</button>
        </div>
        <div className="text-xs sm:text-sm text-white/70">{status}</div>
        
        {isHost && (
          <div className="bg-yellow-500/20 border border-yellow-400/50 text-yellow-200 px-3 py-2 rounded-lg">
            <strong className="text-sm">You are the host!</strong> <span className="text-xs">You can control the game.</span>
          </div>
        )}

        <div className="border border-white/20 rounded-lg p-3 sm:p-4 bg-white/5">
          <h2 className="font-semibold mb-2 text-white text-sm sm:text-base">Players</h2>
          <ul className="space-y-1">
            {players.map((p) => (
              <li key={p.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2">
                <span className="flex items-center gap-2">
                  <span className="text-white text-sm">{p.name || p.id}</span>
                  {roomMetadata?.hostId === p.id && (
                    <span className="text-xs bg-yellow-500/30 text-yellow-200 px-2 py-0.5 rounded">HOST</span>
                  )}
                </span>
                <span className="text-xs text-white/60">
                  {p.isEliminated ? 'eliminated' : 'active'}
                  {typeof p.x === 'number' && typeof p.z === 'number' ? ` • x:${p.x.toFixed(2)} z:${p.z.toFixed(2)} ${p.isMoving ? '(moving)' : ''}` : ''}
                </span>
              </li>
            ))}
          </ul>
          {players.length === 0 && <div className="text-xs sm:text-sm text-white/60">Waiting for players…</div>}
        </div>

        <div className="text-xs sm:text-sm text-white/60">
          This page only verifies presence. We'll integrate game sync next.
        </div>
        <div className="space-y-2">
          <button
            onClick={handleEnterGame}
            className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white rounded-lg px-4 py-2 text-sm sm:text-base transition-all"
          >
            Enter Game
          </button>
        </div>
      </div>
    </div>
  );
};

export default Room;

