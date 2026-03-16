import { useRef, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useGetMessages, useGetConversations, useSendMessage, getGetMessagesQueryKey, getGetConversationsQueryKey } from "@workspace/api-client-react";
import { MessageBubble } from "./MessageBubble";
import { Loader2, Send, Hash } from "lucide-react";
import { Input } from "./ui/input";

interface ChatAreaProps {
  threadId: string | null;
}

export function ChatArea({ threadId }: ChatAreaProps) {
  const [messageText, setMessageText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data: conversations } = useGetConversations({ limit: 50 });
  const currentConversation = conversations?.find(t => t.id === threadId);

  const { data: messages, isLoading } = useGetMessages(
    threadId!, 
    { limit: 50 }, 
    { query: { enabled: !!threadId, refetchInterval: 5000 } }
  );

  const { mutate: sendMessage, isPending: isSending } = useSendMessage({
    mutation: {
      onSuccess: (_newMsg, variables) => {
        setMessageText("");
        queryClient.invalidateQueries({
          queryKey: getGetMessagesQueryKey(variables.channelId, { limit: 50 }),
        });
        queryClient.invalidateQueries({
          queryKey: getGetConversationsQueryKey({ limit: 50 }),
        });
      },
      onError: (err) => {
        console.error("[Chat] Send failed:", err);
      },
    }
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!threadId || !messageText.trim() || isSending) return;
    
    sendMessage({
      channelId: threadId,
      data: { body: messageText.trim() }
    });
    
    setTimeout(() => {
      inputRef.current?.focus();
    }, 10);
  };

  if (!threadId) {
    return (
      <div className="flex-1 bg-background flex flex-col items-center justify-center text-muted-foreground">
        <div className="w-32 h-32 rounded-2xl bg-secondary/30 flex items-center justify-center mb-6 border border-border/50">
          <Hash className="w-16 h-16 opacity-20" />
        </div>
        <h2 className="text-3xl font-display font-semibold text-foreground mb-3">Slack Automotive</h2>
        <p className="text-xl max-w-md text-center opacity-80">Wybierz kanał lub wiadomość z listy po lewej.</p>
      </div>
    );
  }

  const isChannel = currentConversation?.type === "channel";

  return (
    <div className="flex-1 bg-background flex flex-col h-full relative overflow-hidden">
      <div className="h-[80px] px-8 border-b border-border/50 bg-card/60 backdrop-blur-md flex items-center justify-between z-10 flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-secondary/60 flex items-center justify-center">
            {isChannel ? (
              <Hash className="w-5 h-5 text-muted-foreground" />
            ) : (
              <span className="text-lg font-bold text-muted-foreground">
                {currentConversation?.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <h2 className="text-xl font-display font-bold text-foreground">
              {isChannel ? "# " : ""}{currentConversation?.name || "Ładowanie..."}
            </h2>
            {currentConversation?.participants && currentConversation.participants.length > 0 && (
              <p className="text-muted-foreground text-sm">
                {currentConversation.participants.length} {currentConversation.participants.length === 1 ? "osoba" : "osób"}
              </p>
            )}
          </div>
        </div>
      </div>

      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-0.5 scroll-smooth"
      >
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-12 h-12 animate-spin text-primary opacity-50" />
          </div>
        ) : (
          <>
            <div className="text-center my-6 text-muted-foreground/40 font-medium text-base uppercase tracking-wider">
              Początek konwersacji
            </div>
            {messages?.map((msg, index, arr) => {
              const prevMsg = arr[index - 1];
              const showSenderName = !prevMsg || prevMsg.senderId !== msg.senderId;
              
              let showTimestamp = false;
              if (index === arr.length - 1) showTimestamp = true;
              else {
                const currentT = new Date(msg.timestamp).getTime();
                const nextT = new Date(arr[index+1].timestamp).getTime();
                if (nextT - currentT > 5 * 60 * 1000) showTimestamp = true;
              }

              return (
                <MessageBubble 
                  key={msg.id} 
                  message={msg} 
                  showSenderName={showSenderName}
                  showTimestamp={showTimestamp}
                />
              );
            })}
          </>
        )}
      </div>

      <div className="px-6 py-4 bg-card/40 border-t border-border/30 z-10 flex-shrink-0">
        <form 
          onSubmit={handleSend}
          className="flex items-center gap-3 bg-background border border-border/60 px-4 py-2 rounded-xl focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary/40 transition-all duration-200"
        >
          <Input
            ref={inputRef}
            type="text"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder={`Wiadomość do ${isChannel ? "#" : ""}${currentConversation?.name || "..."}` }
            className="flex-1 h-[60px] bg-transparent border-none shadow-none text-xl px-2 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/40"
            disabled={isSending}
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={!messageText.trim() || isSending}
            className="w-[56px] h-[56px] rounded-lg bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 shadow-sm hover:bg-primary/90 active:scale-95 transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {isSending ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <Send className="w-6 h-6" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
