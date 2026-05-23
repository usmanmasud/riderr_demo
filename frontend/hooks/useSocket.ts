'use client';
import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

let socket: Socket | null = null;

export function useSocket(onDeliveryNew?: (d: any) => void, onDeliveryUpdated?: (d: any) => void) {
  const newRef     = useRef(onDeliveryNew);
  const updatedRef = useRef(onDeliveryUpdated);
  newRef.current     = onDeliveryNew;
  updatedRef.current = onDeliveryUpdated;

  useEffect(() => {
    if (!socket) {
      socket = io(SOCKET_URL, { transports: ['websocket'] });
    }

    function handleNew(d: any)     { newRef.current?.(d); }
    function handleUpdated(d: any) { updatedRef.current?.(d); }

    socket.on('delivery:new',     handleNew);
    socket.on('delivery:updated', handleUpdated);

    return () => {
      socket?.off('delivery:new',     handleNew);
      socket?.off('delivery:updated', handleUpdated);
    };
  }, []);
}
