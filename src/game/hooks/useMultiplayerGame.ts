import { useState, useEffect, useCallback } from 'react';
import { GameRoom, Player } from '../types/multiplayer';
import { multiplayerManager } from '@/lib/multiplayer';

export const useMultiplayerGame = (room: GameRoom, currentPlayer: Player) => {
  const [gameState, setGameState] = useState(room.gameState);
  const [lightState, setLightState] = useState(room.lightState);
  const [timeLeft, setTimeLeft] = useState(room.timeLeft);
  const [players, setPlayers] = useState(room.players);
  const [eliminatedPlayers, setEliminatedPlayers] = useState<Set<string>>(new Set());

  // Listen for real-time updates
  useEffect(() => {
    const handleRoomUpdate = (updatedRoom: GameRoom) => {
      setGameState(updatedRoom.gameState);
      setLightState(updatedRoom.lightState);
      setTimeLeft(updatedRoom.timeLeft);
      setPlayers(updatedRoom.players);
    };

    const handleGameStateChange = (data: any) => {
      setGameState(data.gameState);
      setLightState(data.lightState);
      setTimeLeft(data.timeLeft);
    };

    const handlePlayersUpdate = (updatedPlayers: Player[]) => {
      setPlayers(updatedPlayers);
      
      // Track eliminated players
      const newEliminated = new Set<string>();
      updatedPlayers.forEach(player => {
        if (player.isEliminated) {
          newEliminated.add(player.id);
        }
      });
      setEliminatedPlayers(newEliminated);
    };

    multiplayerManager.onEvent('ROOM_UPDATED', handleRoomUpdate);
    multiplayerManager.onEvent('GAME_STATE_CHANGED', handleGameStateChange);
    multiplayerManager.onEvent('PLAYERS_UPDATED', handlePlayersUpdate);

    return () => {
      multiplayerManager.offEvent('ROOM_UPDATED', handleRoomUpdate);
      multiplayerManager.offEvent('GAME_STATE_CHANGED', handleGameStateChange);
      multiplayerManager.offEvent('PLAYERS_UPDATED', handlePlayersUpdate);
    };
  }, []);

  // Update player position
  const updatePlayerPosition = useCallback(async (position: { x: number; y: number; z: number }, isMoving: boolean) => {
    await multiplayerManager.updatePlayerPosition(position, isMoving);
  }, []);

  // Eliminate player
  const eliminatePlayer = useCallback(async (playerId: string) => {
    await multiplayerManager.eliminatePlayer(playerId);
  }, []);

  // Check if player is eliminated
  const isPlayerEliminated = useCallback((playerId: string) => {
    return eliminatedPlayers.has(playerId);
  }, [eliminatedPlayers]);

  // Get other players (excluding current player)
  const otherPlayers = players.filter(p => p.id !== currentPlayer.id);

  return {
    gameState,
    lightState,
    timeLeft,
    players,
    eliminatedPlayers,
    otherPlayers,
    updatePlayerPosition,
    eliminatePlayer,
    isPlayerEliminated
  };
};
