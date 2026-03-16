import { format, isToday, isYesterday, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import type { Conversation } from "@workspace/api-client-react";
import { Hash } from "lucide-react";

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  onClick: () => void;
}

export function ConversationItem({ conversation, isActive, onClick }: ConversationItemProps) {
  const formatTime = (isoString?: string | null) => {
    if (!isoString) return "";
    try {
      const date = parseISO(isoString);
      if (isToday(date)) return format(date, "HH:mm");
      if (isYesterday(date)) return "Wczoraj";
      return format(date, "d MMM");
    } catch {
      return "";
    }
  };

  const hasUnread = conversation.unreadCount > 0;
  const isChannel = conversation.type === "channel";

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-5 py-3 transition-all duration-150 text-left relative focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/50 focus-visible:ring-inset min-h-[64px]",
        isActive 
          ? "bg-primary/15 border-l-[3px] border-primary" 
          : "bg-transparent border-l-[3px] border-transparent hover:bg-white/5 active:bg-white/8"
      )}
    >
      <div className="relative flex-shrink-0">
        <div className={cn(
          "w-[44px] h-[44px] rounded-lg flex items-center justify-center",
          isActive ? "bg-primary/20" : "bg-secondary/60"
        )}>
          {conversation.imageUrl ? (
            <img 
              src={conversation.imageUrl} 
              alt={conversation.name} 
              className="w-full h-full rounded-lg object-cover"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          ) : isChannel ? (
            <Hash className={cn("w-5 h-5", isActive ? "text-primary" : "text-muted-foreground")} />
          ) : (
            <span className={cn(
              "text-lg font-semibold",
              isActive ? "text-primary" : "text-muted-foreground"
            )}>
              {conversation.name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        {hasUnread && (
          <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-primary border-2 border-sidebar shadow-sm" />
        )}
      </div>

      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <div className="flex justify-between items-baseline mb-0.5">
          <h3 className={cn(
            "text-lg truncate pr-2",
            hasUnread ? "text-foreground font-bold" : "text-foreground/80 font-medium"
          )}>
            {isChannel ? "# " : "@ "}{conversation.name}
          </h3>
          <span className={cn(
            "text-xs whitespace-nowrap flex-shrink-0 font-medium",
            hasUnread ? "text-primary" : "text-muted-foreground/70"
          )}>
            {formatTime(conversation.timestamp)}
          </span>
        </div>
        
        <div className="flex justify-between items-center gap-2">
          <p className={cn(
            "text-base truncate",
            hasUnread ? "text-foreground/80 font-medium" : "text-muted-foreground/60"
          )}>
            {conversation.snippet || (isChannel ? "Kanał" : "Wiadomość")}
          </p>
          {hasUnread && (
            <div className="flex items-center justify-center min-w-[24px] h-[22px] rounded-full bg-primary text-primary-foreground text-xs font-bold px-1.5">
              {conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
