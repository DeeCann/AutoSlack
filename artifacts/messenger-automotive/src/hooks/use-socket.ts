import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";
import { getGetMessagesQueryKey, getGetConversationsQueryKey } from "@workspace/api-client-react";
import type { Message } from "@workspace/api-client-react";

export function useSlackSocket(activeChannelId: string | null) {
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io("/", {
      path: "/api/socket.io",
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
    
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[Socket] Connected");
    });

    socket.on("disconnect", () => {
      console.log("[Socket] Disconnected");
    });

    socket.on("new-message", (payload: { channelId: string; message: Message }) => {
      console.log("[Socket] New message received on channel:", payload.channelId);
      
      if (payload.channelId) {
        queryClient.invalidateQueries({
          queryKey: getGetMessagesQueryKey(payload.channelId, { limit: 50 }),
        });
      }

      queryClient.invalidateQueries({
        queryKey: getGetConversationsQueryKey({ limit: 50 }),
      });
    });

    socket.on("conversation-updated", () => {
      console.log("[Socket] Conversations updated");
      queryClient.invalidateQueries({
        queryKey: getGetConversationsQueryKey({ limit: 50 }),
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [queryClient]);

  return {
    socket: socketRef.current,
    isConnected: socketRef.current?.connected ?? false
  };
}
