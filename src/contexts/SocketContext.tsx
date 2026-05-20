import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io, type Socket } from 'socket.io-client';
import { toast } from 'sonner';
import { API_BASE_URL, getStoredToken } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

type SocketContextValue = {
  socket: Socket | null;
  isConnected: boolean;
};

const SocketContext = createContext<SocketContextValue | undefined>(undefined);

const getSocketUrl = () => API_BASE_URL.replace(/\/api\/?$/, '');

const invalidateKeysByEvent: Record<string, string[]> = {
  'notification:created': ['notifications'],
  'notification:role-broadcast': ['notifications'],
  'message:received': ['messages'],
  'automation:executed': ['automation', 'audit'],
  'grade:updated': ['grades', 'students', 'enrollments'],
  'request:status-changed': ['requests'],
  'appointment:updated': ['appointments'],
};

const titleFromPayload = (payload: unknown, fallback: string) => {
  if (!payload || typeof payload !== 'object') return fallback;
  const record = payload as Record<string, unknown>;
  return String(record.titleThai || record.title || record.name || record.message || fallback);
};

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const queryClient = useQueryClient();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setSocket((current) => {
        current?.disconnect();
        return null;
      });
      setIsConnected(false);
      return;
    }

    const nextSocket = io(getSocketUrl(), {
      auth: { token: getStoredToken() },
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });

    setSocket(nextSocket);
    nextSocket.on('connect', () => setIsConnected(true));
    nextSocket.on('disconnect', () => setIsConnected(false));
    nextSocket.on('connect_error', (error) => {
      setIsConnected(false);
      console.warn('Realtime connection failed', error.message);
    });

    Object.entries(invalidateKeysByEvent).forEach(([eventName, keys]) => {
      nextSocket.on(eventName, (payload) => {
        keys.forEach((key) => {
          void queryClient.invalidateQueries({ queryKey: [key] });
        });

        if (eventName === 'notification:created' || eventName === 'message:received') {
          toast.info(titleFromPayload(payload, eventName === 'message:received' ? 'New message' : 'New notification'));
        }

        if (eventName === 'automation:executed') {
          toast.success(titleFromPayload(payload, 'Automation rule executed'));
        }
      });
    });

    return () => {
      nextSocket.disconnect();
      setSocket(null);
      setIsConnected(false);
    };
  }, [isAuthenticated, queryClient, user?.id]);

  const value = useMemo(() => ({ socket, isConnected }), [isConnected, socket]);

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}
