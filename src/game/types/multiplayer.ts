import { supabase } from '@/lib/supabase';

type Listener = (payload: any) => void;

type EventType =
  | 'ROOM_UPDATED'
  | 'GAME_STATE_CHANGED'
  | 'PLAYERS_UPDATED'
  | 'PLAYER_ELIMINATED';

class MultiplayerManager {
  private channel?: ReturnType<typeof supabase.channel>;
  private listeners = new Map<EventType, Set<Listener>>();
  private roomCode?: string;
  private selfId = crypto.randomUUID();

  onEvent<T = any>(type: EventType, cb: (payload: T) => void) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)!.add(cb as Listener);
  }

  offEvent<T = any>(type: EventType, cb: (payload: T) => void) {
    this.listeners.get(type)?.delete(cb as Listener);
  }

  private emit(type: EventType, payload: any) {
    this.listeners.get(type)?.forEach((cb) => cb(payload));
  }

  async joinRoom(roomCode: string, player: { id: string; name?: string }) {
    this.roomCode = roomCode;

    this.channel = supabase.channel(`room:${roomCode}`, {
      config: {
        broadcast: { self: false },
        presence: { key: this.selfId }
      }
    });

    this.channel
      .on('presence', { event: 'sync' }, () => {
        const state = this.channel!.presenceState();
        const players = Object.values(state).flat() as any[];
        this.emit('PLAYERS_UPDATED', players);
      })
      .on('broadcast', { event: 'game_state' }, ({ payload }) => {
        this.emit('GAME_STATE_CHANGED', payload);
      })
      .on('broadcast', { event: 'room' }, ({ payload }) => {
        this.emit('ROOM_UPDATED', payload);
      })
      .on('broadcast', { event: 'eliminate' }, ({ payload }) => {
        this.emit('PLAYER_ELIMINATED', payload.playerId);
      });

    await this.channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await this.channel!.track({
          id: player.id,
          name: player.name ?? 'Player',
          isEliminated: false,
          x: 0,
          z: 0,
          isMoving: false
        });
      }
    });
  }

  async leaveRoom() {
    await this.channel?.unsubscribe();
    this.channel = undefined;
  }

  updatePlayerPosition(position: { x: number; z: number }, isMoving: boolean) {
    return this.channel?.send({
      type: 'broadcast',
      event: 'position',
      payload: { id: this.selfId, position, isMoving }
    });
  }

  broadcastGameState(gameState: string, lightState: 'green' | 'red', timeLeft: number) {
    return this.channel?.send({
      type: 'broadcast',
      event: 'game_state',
      payload: { gameState, lightState, timeLeft }
    });
  }

  eliminatePlayer(playerId: string) {
    return this.channel?.send({
      type: 'broadcast',
      event: 'eliminate',
      payload: { playerId }
    });
  }
}

export const multiplayerManager = new MultiplayerManager();

export type Player = {
  id: string;
  name?: string;
  x: number;
  z: number;
  isMoving: boolean;
  isEliminated?: boolean;
};

export type GameRoom = {
  code: string;
  gameState: 'waiting' | 'countdown' | 'playing' | 'eliminated' | 'won';
  lightState: 'green' | 'red';
  timeLeft: number;
  players: Player[];
  hostId?: string;
};
