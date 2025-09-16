import { supabase } from '@/lib/supabase';

type Listener = (payload: any) => void;

type EventType =
  | 'ROOM_UPDATED'
  | 'GAME_STATE_CHANGED'
  | 'PLAYERS_UPDATED'
  | 'PLAYER_ELIMINATED'
  | 'HOST_CHANGED'
  | 'GAME_RESET';

type RoomMetadata = {
  hostId?: string;
  createdAt?: number;
  isCreator?: boolean;
};

class MultiplayerManager {
  private channel?: ReturnType<typeof supabase.channel>;
  private listeners = new Map<EventType, Set<Listener>>();
  private roomCode?: string;
  private selfId = crypto.randomUUID();
  private roomMetadata?: RoomMetadata;
  private selfPresence?: {
    id: string;
    name?: string;
    isEliminated: boolean;
    x: number;
    z: number;
    isMoving: boolean;
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

  // Broadcast-based player management
  private broadcastPlayerList() {
    if (!this.channel || this.isUpdating) return;
    
    this.isUpdating = true;
    this.channel.send({
      type: 'broadcast',
      event: 'player_list_update',
      payload: { players: this.playersList, senderId: this.selfId }
    });
    
    // Reset flag after a short delay
    setTimeout(() => {
      this.isUpdating = false;
    }, 100);
  }

  private addPlayer(player: any) {
    const existingIndex = this.playersList.findIndex(p => p.id === player.id);
    if (existingIndex >= 0) {
      this.playersList[existingIndex] = { ...this.playersList[existingIndex], ...player };
    } else {
      this.playersList.push(player);
      console.log('Added player to list:', player.name || player.id, 'Total players:', this.playersList.length);
    }
    this.emit('PLAYERS_UPDATED', [...this.playersList]);
    this.broadcastPlayerList();
  }

  private removePlayer(playerId: string) {
    this.playersList = this.playersList.filter(p => p.id !== playerId);
    console.log('Removed player from list:', playerId, 'Total players:', this.playersList.length);
    this.emit('PLAYERS_UPDATED', [...this.playersList]);
    this.broadcastPlayerList();
  }

  async joinRoom(roomCode: string, player: { id: string; name?: string }, isCreator = false) {
    // If already connected to the same room, just increment connection count
    if (this.channel && this.roomCode === roomCode && this.isSubscribed) {
      this.connectionCount++;
      console.log('Reusing existing connection, count:', this.connectionCount);
      return;
    }

    // If connected to a different room, leave it first
    if (this.channel && this.roomCode !== roomCode) {
      await this.leaveRoom();
    }

    // If channel exists but is closed, clean it up
    if (this.channel && !this.isSubscribed) {
      this.channel = undefined;
      this.roomCode = undefined;
    }

    this.roomCode = roomCode;
    this.selfId = player.id;
    this.connectionCount = 1;

    this.channel = supabase.channel(`room:${roomCode}`, {
      config: {
        broadcast: { self: true },
        presence: { key: this.selfId }
      }
    });

    // Set up event listeners
    this.channel
      .on('broadcast', { event: 'game_state' }, ({ payload }) => {
        this.emit('GAME_STATE_CHANGED', payload);
      })
      .on('broadcast', { event: 'room' }, ({ payload }) => {
        this.roomMetadata = payload;
        this.emit('ROOM_UPDATED', payload);
      })
      .on('broadcast', { event: 'host_change' }, ({ payload }) => {
        this.roomMetadata = { ...this.roomMetadata, hostId: payload.hostId };
        this.emit('HOST_CHANGED', payload);
      })
      .on('broadcast', { event: 'eliminate' }, ({ payload }) => {
        this.emit('PLAYER_ELIMINATED', payload.playerId);
      })
      .on('broadcast', { event: 'player_join' }, ({ payload }) => {
        console.log('Player join broadcast received:', payload);
        // Add player immediately without delay
        this.addPlayer(payload);
      })
      .on('broadcast', { event: 'player_leave' }, ({ payload }) => {
        console.log('Player leave broadcast received:', payload);
        this.removePlayer(payload.playerId);
      })
      .on('broadcast', { event: 'player_list_update' }, ({ payload }) => {
        // Only update if we're not the one who sent it
        if (payload.senderId !== this.selfId) {
          console.log('Player list update received from:', payload.senderId, 'Players:', payload.players.length);
          // Merge the received list with our current list to avoid losing players
          const receivedPlayers = payload.players || [];
          const currentPlayerIds = new Set(this.playersList.map(p => p.id));
          
          // Add any new players from the received list
          receivedPlayers.forEach((player: any) => {
            if (!currentPlayerIds.has(player.id)) {
              this.playersList.push(player);
              console.log('Added missing player from update:', player.name || player.id);
            }
          });
          
          // Update existing players with newer data
          receivedPlayers.forEach((player: any) => {
            const existingIndex = this.playersList.findIndex(p => p.id === player.id);
            if (existingIndex >= 0) {
              this.playersList[existingIndex] = { ...this.playersList[existingIndex], ...player };
            }
          });
          
          console.log('Final player count after merge:', this.playersList.length);
          this.emit('PLAYERS_UPDATED', [...this.playersList]);
        }
      })
      .on('broadcast', { event: 'request_player_list' }, ({ payload }) => {
        // Only respond if we're not the requester
        if (payload.requesterId !== this.selfId) {
          this.broadcastPlayerList();
        }
      })
      .on('broadcast', { event: 'game_reset' }, ({ payload }) => {
        this.emit('GAME_RESET', payload);
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
            isMoving: false
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
          
          // If this is the creator, set them as host immediately
          if (isCreator) {
            console.log('Setting creator as host:', player.id);
            this.roomMetadata = {
              hostId: player.id,
              createdAt: Date.now(),
              isCreator: true
            };
            this.emit('HOST_CHANGED', { hostId: player.id });
            this.emit('ROOM_UPDATED', this.roomMetadata);
            await this.setHost(player.id);
          }
          
          // Set up periodic player list requests as backup
          this.playersUpdateInterval = window.setInterval(() => {
            if (this.channel) {
              this.channel.send({
                type: 'broadcast',
                event: 'request_player_list',
                payload: { requesterId: player.id }
              });
            }
          }, 10000);
          
          resolve();
        } else if (status === 'CLOSED') {
          console.log('Channel closed, cleaning up');
          this.isSubscribed = false;
          this.channel = undefined;
          this.roomCode = undefined;
        }
      });
    });
  }

  async leaveRoom() {
    this.connectionCount--;
    console.log('Leave room called, connection count:', this.connectionCount);
    
    // Only actually leave if no components are using the connection
    if (this.connectionCount > 0) {
      console.log('Other components still using connection, not leaving');
      return;
    }
    
    console.log('Leaving room - no more connections');
    this.isSubscribed = false;
    
    if (this.playersUpdateInterval) {
      clearInterval(this.playersUpdateInterval);
      this.playersUpdateInterval = undefined;
    }
    
    // Broadcast that we're leaving
    if (this.channel && this.selfId) {
      await this.channel.send({
        type: 'broadcast',
        event: 'player_leave',
        payload: { playerId: this.selfId }
      });
    }
    
    await this.channel?.unsubscribe();
    this.channel = undefined;
    this.roomMetadata = undefined;
    this.playersList = [];
  }

  async setHost(hostId: string) {
    if (!this.channel) return;
    
    console.log('Setting host to:', hostId);
    this.roomMetadata = {
      ...this.roomMetadata,
      hostId,
      createdAt: this.roomMetadata?.createdAt || Date.now()
    };
    
    await this.channel.send({
      type: 'broadcast',
      event: 'host_change',
      payload: { hostId }
    });
    
    await this.channel.send({
      type: 'broadcast',
      event: 'room',
      payload: this.roomMetadata
    });
  }

  isHost(): boolean {
    const isHost = this.roomMetadata?.hostId === this.selfId;
    return isHost;
  }

  getRoomMetadata(): RoomMetadata | undefined {
    return this.roomMetadata;
  }

  updatePlayerPosition(position: { x: number; z: number }, isMoving: boolean, immediate = false) {
    if (!this.channel || !this.selfPresence) return;
    this.selfPresence = { ...this.selfPresence, x: position.x, z: position.z, isMoving, ts: Date.now() as any };
    
    // Update our entry in the player list
    this.addPlayer(this.selfPresence);
    
    return this.channel.track(this.selfPresence);
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

  setSelfPresence(fields: Partial<{ isEliminated: boolean; x: number; z: number; isMoving: boolean }>) {
    if (!this.channel || !this.selfPresence) return;
    this.selfPresence = { ...this.selfPresence, ...fields };
    
    // Update our entry in the player list
    this.addPlayer(this.selfPresence);
    
    return this.channel.track(this.selfPresence);
  }

  getPlayersList() {
    return [...this.playersList];
  }

  broadcastFinal(winners: string[]) {
    return this.channel?.send({
      type: 'broadcast',
      event: 'game_state',
      payload: { gameState: 'ended', lightState: 'red', timeLeft: 0, winners }
    });
  }

  broadcastReset(initialTime = 60) {
    return this.channel?.send({
      type: 'broadcast',
      event: 'game_state',
      payload: { gameState: 'countdown', lightState: 'green', timeLeft: initialTime, winners: [] }
    });
  }

  // New comprehensive reset function
  broadcastGameReset(initialTime = 60) {
    // Reset all players to starting position
    if (this.selfPresence) {
      this.selfPresence = {
        ...this.selfPresence,
        isEliminated: false,
        x: 0,
        z: -5, // Starting line position
        isMoving: false
      };
      this.addPlayer(this.selfPresence);
    }

    // Broadcast reset event to all players
    this.channel?.send({
      type: 'broadcast',
      event: 'game_reset',
      payload: { 
        gameState: 'waiting', 
        lightState: 'green', 
        timeLeft: initialTime,
        resetPlayers: true
      }
    });

    // Also broadcast the game state reset
    return this.broadcastReset(initialTime);
  }
}

export const multiplayerManager = new MultiplayerManager();
