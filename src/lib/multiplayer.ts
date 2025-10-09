import { supabase } from '@/lib/supabase';

type Listener = (payload: any) => void;

type EventType =
  | 'ROOM_UPDATED'
  | 'GAME_STATE_CHANGED'
  | 'PLAYERS_UPDATED'
  | 'PLAYER_ELIMINATED'
  | 'HOST_CHANGED'
  | 'GAME_RESET'
  // Tug of War specific events
  | 'ROPE_POSITION_CHANGED'
  | 'PLAYER_PULLING'
  | 'PLAYER_RELEASED'
  | 'TUG_OF_WAR_GAME_STARTED'
  | 'TUG_OF_WAR_GAME_ENDED'
  | 'TUG_OF_WAR_TIME_UPDATE'
  | 'TUG_OF_WAR_COUNTDOWN_UPDATE';

type RoomMetadata = {
  hostId?: string;
  createdAt?: number;
  isCreator?: boolean;
  gameType?: 'red-light-green-light' | 'tug-of-war';
};

class MultiplayerManager {
  private channel?: ReturnType<typeof supabase.channel>;
  private listeners = new Map<EventType, Set<Listener>>();
  private roomCode?: string;
  private selfId: string = crypto.randomUUID();
  private roomMetadata?: RoomMetadata;
  private selfPresence?: {
    id: string;
    name?: string;
    isEliminated: boolean;
    x: number;
    z: number;
    isMoving: boolean;
    // Tug of War specific properties
    isPulling?: boolean;
    pullStrength?: number;
    position?: number;
    ts?: number;
  };
  private playersList: any[] = [];
  private playersUpdateInterval?: number;
  private isSubscribed = false;
  private isUpdating = false;
  private connectionCount = 0;

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

  async joinRoom(roomCode: string, player: { id: string; name?: string }, isCreator = false) {
    // Reuse existing connection if available
    if (this.channel && this.roomCode === roomCode) {
      console.log('Reusing existing connection, count:', this.connectionCount);
      this.connectionCount++;
      return;
    }

    // Clean up existing connection
    if (this.channel) {
      await this.leaveRoom();
    }

    this.roomCode = roomCode;
    this.selfId = player.id;
    this.connectionCount = 1;

    // Check if Supabase is available
    if (!supabase) {
      console.warn('Supabase not configured, running in offline mode');
      this.isSubscribed = false;
      this.selfPresence = {
        id: player.id,
        name: player.name ?? 'Player',
        isEliminated: false,
        x: 0,
        z: 0,
        isMoving: false,
        isPulling: false,
        pullStrength: 0,
        position: 0
      };
      this.addPlayer(this.selfPresence);
      return;
    }

    this.channel = supabase.channel(`room:${roomCode}`, {
      config: {
        broadcast: { self: true },
        presence: { key: this.selfId }
      }
    });

    // Listen for presence changes
    this.channel.on('presence', { event: 'sync' }, () => {
      const state = this.channel!.presenceState();
      const players = Object.values(state).flat() as any[];
      this.playersList = players;
      this.emit('PLAYERS_UPDATED', players);
    });

    // Listen for broadcast events
    this.channel.on('broadcast', { event: 'player_join' }, (payload) => {
      console.log('Player join broadcast received:', payload.payload);
      this.addPlayer(payload.payload);
    });

    this.channel.on('broadcast', { event: 'player_leave' }, (payload) => {
      console.log('Player leave broadcast received:', payload.payload);
      this.removePlayer(payload.payload.id);
    });

    this.channel.on('broadcast', { event: 'request_player_list' }, (payload) => {
      if (payload.payload.requesterId !== this.selfId) {
        // Send current player list to requester
        this.channel!.send({
          type: 'broadcast',
          event: 'player_list_response',
          payload: { players: this.playersList, requesterId: payload.payload.requesterId }
        });
      }
    });

    this.channel.on('broadcast', { event: 'player_list_response' }, (payload) => {
      if (payload.payload.requesterId === this.selfId) {
        console.log('Received player list response:', payload.payload.players);
        this.playersList = payload.payload.players;
        this.emit('PLAYERS_UPDATED', payload.payload.players);
      }
    });

    // Game state events
    this.channel.on('broadcast', { event: 'game_state_changed' }, (payload) => {
      console.log('Game state changed:', payload.payload);
      this.emit('GAME_STATE_CHANGED', payload.payload);
    });

    this.channel.on('broadcast', { event: 'player_eliminated' }, (payload) => {
      console.log('Player eliminated:', payload.payload);
      this.emit('PLAYER_ELIMINATED', payload.payload);
    });

    this.channel.on('broadcast', { event: 'host_changed' }, (payload) => {
      console.log('Host changed:', payload.payload);
      this.emit('HOST_CHANGED', payload.payload.hostId);
    });

    this.channel.on('broadcast', { event: 'game_reset' }, (payload) => {
      console.log('Game reset:', payload.payload);
      this.emit('GAME_RESET', payload.payload);
    });

    // Tug of War specific events
    this.channel.on('broadcast', { event: 'rope_position_changed' }, (payload) => {
      console.log('Rope position changed:', payload.payload);
      this.emit('ROPE_POSITION_CHANGED', payload.payload);
    });

    this.channel.on('broadcast', { event: 'player_pulling' }, (payload) => {
      console.log('Player pulling:', payload.payload);
      this.emit('PLAYER_PULLING', payload.payload);
    });

    this.channel.on('broadcast', { event: 'player_released' }, (payload) => {
      console.log('Player released:', payload.payload);
      this.emit('PLAYER_RELEASED', payload.payload);
    });

    this.channel.on('broadcast', { event: 'tug_of_war_game_started' }, (payload) => {
      console.log('Tug of War game started:', payload.payload);
      this.emit('TUG_OF_WAR_GAME_STARTED', payload.payload);
    });

    this.channel.on('broadcast', { event: 'tug_of_war_game_ended' }, (payload) => {
      console.log('Tug of War game ended:', payload.payload);
      this.emit('TUG_OF_WAR_GAME_ENDED', payload.payload);
    });

    this.channel.on('broadcast', { event: 'tug_of_war_time_update' }, (payload) => {
      this.emit('TUG_OF_WAR_TIME_UPDATE', payload.payload);
    });

    this.channel.on('broadcast', { event: 'tug_of_war_countdown_update' }, (payload) => {
      this.emit('TUG_OF_WAR_COUNTDOWN_UPDATE', payload.payload);
    });

    return new Promise<void>((resolve) => {
      this.channel!.subscribe(async (status) => {
        console.log('Channel subscription status:', status);
        if (status === 'SUBSCRIBED') {
          this.isSubscribed = true;

          this.selfPresence = {
            id: player.id,
            name: player.name ?? 'Player',
            isEliminated: false,
            x: 0,
            z: 0,
            isMoving: false,
            isPulling: false,
            pullStrength: 0,
            position: 0
          };

          if (this.channel) {
            await this.channel.track(this.selfPresence);
            console.log('Self presence tracked:', this.selfPresence);

            // Add self to player list immediately
            this.addPlayer(this.selfPresence);

            // Wait a bit before broadcasting join to ensure we're fully connected
            setTimeout(async () => {
              // Broadcast that we joined
              await this.channel!.send({
                type: 'broadcast',
                event: 'player_join',
                payload: this.selfPresence
              });

              // Request current player list from others
              await this.channel!.send({
                type: 'broadcast',
                event: 'request_player_list',
                payload: { requesterId: player.id }
              });
            }, 200);
          }
          resolve();
        } else if (status === 'CLOSED') {
          console.log('Channel closed, cleaning up');
          this.isSubscribed = false;
          this.channel = undefined;
          this.roomCode = undefined;
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('Supabase connection failed, running in offline mode');
          // Continue in offline mode
          this.isSubscribed = false;
          resolve();
        }
      });
    });
  }

  async leaveRoom() {
    if (this.channel) {
      this.connectionCount--;
      if (this.connectionCount <= 0) {
        console.log('Leave room called, connection count:', this.connectionCount);
        await this.channel.untrack();
        await this.channel.unsubscribe();
        this.channel = undefined;
        this.roomCode = undefined;
        this.isSubscribed = false;
        this.playersList = [];
        this.selfPresence = undefined;
      } else {
        console.log('Other components still using connection, not leaving');
      }
    }
  }

  private addPlayer(player: any) {
    const existingIndex = this.playersList.findIndex(p => p.id === player.id);
    if (existingIndex >= 0) {
      this.playersList[existingIndex] = { ...this.playersList[existingIndex], ...player };
    } else {
      this.playersList.push(player);
    }
    console.log('Added player to list:', player.name || player.id, 'Total players:', this.playersList.length);
    this.emit('PLAYERS_UPDATED', [...this.playersList]);
  }

  private removePlayer(playerId: string) {
    this.playersList = this.playersList.filter(p => p.id !== playerId);
    console.log('Removed player:', playerId, 'Total players:', this.playersList.length);
    this.emit('PLAYERS_UPDATED', [...this.playersList]);
  }

  updatePresence(presence: Partial<typeof this.selfPresence>) {
    if (this.selfPresence) {
      this.selfPresence = { ...this.selfPresence, ...presence };
      if (this.channel && this.isSubscribed) {
        this.channel.track(this.selfPresence);
      }
    }
  }

  broadcast(event: string, payload: any) {
    if (this.channel && this.isSubscribed) {
      this.channel.send({
        type: 'broadcast',
        event,
        payload
      });
    }
  }

  broadcastGameState(gameState: string, lightState: 'green' | 'red', timeLeft: number) {
    this.broadcast('game_state_changed', {
      gameState,
      lightState,
      timeLeft
    });
  }

  broadcastFinal(winners: string[]) {
    this.broadcast('game_state_changed', {
      gameState: 'ended',
      winners,
      ended: true
    });
  }

  broadcastGameReset(timeLeft: number) {
    this.broadcast('game_reset', {
      timeLeft,
      gameState: 'waiting'
    });
  }

  setSelfPresence(presence: Partial<typeof this.selfPresence>) {
    this.updatePresence(presence);
  }

  getPlayersList() {
    return this.getPlayers();
  }

  getPlayers() {
    return [...this.playersList];
  }

  getSelfId() {
    return this.selfId;
  }

  isConnected() {
    return this.isSubscribed;
  }

  getRoomCode() {
    return this.roomCode;
  }

  setRoomMetadata(metadata: Partial<RoomMetadata>) {
    this.roomMetadata = { ...this.roomMetadata, ...metadata };
  }

  getRoomMetadata() {
    return this.roomMetadata;
  }
}

export const multiplayerManager = new MultiplayerManager();