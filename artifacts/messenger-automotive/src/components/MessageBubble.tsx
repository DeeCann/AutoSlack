import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import type { Message } from "@workspace/api-client-react";

interface MessageBubbleProps {
  message: Message;
  showSenderName: boolean;
  showTimestamp: boolean;
}

const AVATAR_COLORS = [
  "bg-blue-600", "bg-green-600", "bg-orange-500", "bg-pink-600",
  "bg-purple-600", "bg-teal-600", "bg-red-600", "bg-indigo-600",
];

function getAvatarColor(senderId: string): string {
  let hash = 0;
  for (let i = 0; i < senderId.length; i++) {
    hash = senderId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function MessageBubble({ message, showSenderName, showTimestamp }: MessageBubbleProps) {
  const formatTime = (isoString: string) => {
    try {
      return format(parseISO(isoString), "HH:mm");
    } catch {
      return "";
    }
  };

  return (
    <div className={cn(
      "flex w-full px-2 animate-in-message",
      showSenderName ? "mt-3" : "mt-0.5"
    )}>
      <div className="w-[40px] flex-shrink-0 mr-3">
        {showSenderName && (
          <div className={cn(
            "w-[40px] h-[40px] rounded-lg flex items-center justify-center text-white font-bold text-base",
            getAvatarColor(message.senderId)
          )}>
            {message.senderName.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        {showSenderName && (
          <div className="flex items-baseline gap-3 mb-1">
            <span className="font-bold text-foreground text-base">
              {message.senderName}
            </span>
            <span className="text-xs text-muted-foreground/60">
              {formatTime(message.timestamp)}
            </span>
          </div>
        )}
        
        <div className={cn(
          "text-lg leading-relaxed break-words",
          message.isOwn ? "text-primary" : "text-foreground/90"
        )}>
          {message.body}
        </div>

        {message.attachments?.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {message.attachments.map((att) => (
              <div key={att.id} className="rounded-lg overflow-hidden bg-secondary/40 border border-border/30">
                {att.type.includes('image') && att.url ? (
                  <img 
                    src={att.url} 
                    alt={att.name || 'Załącznik'} 
                    className="max-h-[200px] max-w-full object-contain"
                  />
                ) : (
                  <div className="p-3 flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded flex items-center justify-center">
                      <span className="text-xs font-bold uppercase text-primary">{att.type.substring(0,3)}</span>
                    </div>
                    <span className="text-sm truncate max-w-[150px] text-foreground/70">{att.name || 'Plik'}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {showTimestamp && !showSenderName && (
          <span className="text-xs text-muted-foreground/40 mt-1 inline-block">
            {formatTime(message.timestamp)}
          </span>
        )}
      </div>
    </div>
  );
}
