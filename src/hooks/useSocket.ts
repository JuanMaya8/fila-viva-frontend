'use client';

import { useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { api } from '../lib/api';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3000';

/**
 * One Socket.io connection per screen, with automatic reconnection.
 * Authenticated screens (admin/advisor) fetch a short-lived socket token
 * before every connection attempt, because the session cookie is httpOnly.
 * Listeners are removed and the socket is closed on unmount.
 */
export function useSocket(authenticated = false): { socket: Socket | null; connected: boolean } {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const instance = io(WS_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10_000,
      auth: authenticated
        ? (callback) => {
            api
              .socketToken()
              .then(({ token }) => callback({ token }))
              .catch(() => callback({}));
          }
        : undefined,
    });
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    instance.on('connect', onConnect);
    instance.on('disconnect', onDisconnect);
    setSocket(instance);

    return () => {
      instance.removeAllListeners();
      instance.disconnect();
      setSocket(null);
      setConnected(false);
    };
  }, [authenticated]);

  return { socket, connected };
}

/**
 * Subscribes to one server event while joined to a room. Re-joins after
 * every reconnection and calls `onResync` so the screen can refetch what it
 * may have missed while offline.
 */
export function useRoom<T>(
  socket: Socket | null,
  join: { event: string; id: string | null } | null,
  serverEvent: string,
  onMessage: (payload: T) => void,
  onResync?: () => void,
): void {
  const joinEvent = join?.event ?? null;
  const joinId = join?.id ?? null;
  const messageRef = useRef(onMessage);
  const resyncRef = useRef(onResync);
  messageRef.current = onMessage;
  resyncRef.current = onResync;

  useEffect(() => {
    if (!socket) {
      return;
    }
    const handleMessage = (payload: T) => messageRef.current(payload);
    const handleConnect = () => {
      if (joinEvent && joinId) {
        socket.emit(joinEvent, joinId);
      }
      resyncRef.current?.();
    };
    socket.on(serverEvent, handleMessage);
    socket.on('connect', handleConnect);
    if (socket.connected) {
      handleConnect();
    }
    return () => {
      socket.off(serverEvent, handleMessage);
      socket.off('connect', handleConnect);
      if (joinEvent && joinId && socket.connected) {
        socket.emit(joinEvent.replace('join', 'leave'), joinId);
      }
    };
  }, [socket, joinEvent, joinId, serverEvent]);
}
