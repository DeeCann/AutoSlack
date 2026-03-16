import { useGetConversations, useLogout, useGetAuthStatus } from "@workspace/api-client-react";
import type { Conversation } from "@workspace/api-client-react";
import { ConversationItem } from "./ConversationItem";
import { LogOut, Search, Loader2, Hash, ChevronDown, ChevronRight } from "lucide-react";
import { Input } from "./ui/input";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

interface SidebarProps {
  activeThreadId: string | null;
  onSelectThread: (id: string) => void;
}

export function Sidebar({ activeThreadId, onSelectThread }: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [channelsExpanded, setChannelsExpanded] = useState(true);
  const [dmsExpanded, setDmsExpanded] = useState(true);
  const { data: auth } = useGetAuthStatus();
  const { data: conversations, isLoading } = useGetConversations({ limit: 50 }, { query: { refetchInterval: 30000 } });
  
  const queryClient = useQueryClient();
  const { mutate: logout, isPending: isLoggingOut } = useLogout({
    mutation: {
      onSuccess: () => {
        queryClient.clear();
        window.location.reload();
      }
    }
  });

  const filtered = conversations?.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const channels = filtered?.filter((c: Conversation) => c.type === "channel") || [];
  const dms = filtered?.filter((c: Conversation) => c.type === "dm" || c.type === "group") || [];

  return (
    <div className="w-[420px] h-full bg-sidebar border-r border-border flex flex-col flex-shrink-0 shadow-2xl z-10 relative">
      <div className="h-[96px] px-6 flex items-center justify-between border-b border-border/50 sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <div className="w-[48px] h-[48px] rounded-xl bg-primary/20 flex items-center justify-center overflow-hidden">
            {auth?.profilePicture ? (
              <img src={auth.profilePicture} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <Hash className="w-6 h-6 text-primary" />
            )}
          </div>
          <div>
            <h2 className="font-display font-bold text-xl text-foreground leading-none mb-1">
              {auth?.workspaceName || "Slack"}
            </h2>
            <p className="text-muted-foreground text-sm font-medium">{auth?.displayName || "Połączono"}</p>
          </div>
        </div>
        
        <button 
          onClick={() => logout()}
          disabled={isLoggingOut}
          className="touch-target rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive flex items-center justify-center transition-colors disabled:opacity-50 active:scale-95"
          aria-label="Wyloguj"
        >
          {isLoggingOut ? <Loader2 className="w-7 h-7 animate-spin" /> : <LogOut className="w-7 h-7" />}
        </button>
      </div>

      <div className="p-4 border-b border-border/30">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input 
            type="text" 
            placeholder="Szukaj konwersacji..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-[56px] text-lg rounded-xl bg-background/30 border-transparent focus:bg-background/50 focus:border-primary focus:ring-primary/30 transition-all placeholder:text-muted-foreground/50"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden pb-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="text-xl">Ładowanie kanałów...</p>
          </div>
        ) : (
          <>
            <div className="mt-2">
              <button
                onClick={() => setChannelsExpanded(!channelsExpanded)}
                className="w-full flex items-center gap-2 px-5 py-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
              >
                {channelsExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                Kanały
                {channels.length > 0 && (
                  <span className="ml-auto text-xs bg-secondary/50 px-2 py-0.5 rounded-full">{channels.length}</span>
                )}
              </button>
              {channelsExpanded && (
                <div className="flex flex-col">
                  {channels.length === 0 ? (
                    <p className="px-5 py-3 text-muted-foreground/60 text-base">Brak kanałów</p>
                  ) : (
                    channels.map((c: Conversation) => (
                      <ConversationItem
                        key={c.id}
                        conversation={c}
                        isActive={activeThreadId === c.id}
                        onClick={() => onSelectThread(c.id)}
                      />
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="mt-1">
              <button
                onClick={() => setDmsExpanded(!dmsExpanded)}
                className="w-full flex items-center gap-2 px-5 py-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
              >
                {dmsExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                Wiadomości
                {dms.length > 0 && (
                  <span className="ml-auto text-xs bg-secondary/50 px-2 py-0.5 rounded-full">{dms.length}</span>
                )}
              </button>
              {dmsExpanded && (
                <div className="flex flex-col">
                  {dms.length === 0 ? (
                    <p className="px-5 py-3 text-muted-foreground/60 text-base">Brak wiadomości</p>
                  ) : (
                    dms.map((c: Conversation) => (
                      <ConversationItem
                        key={c.id}
                        conversation={c}
                        isActive={activeThreadId === c.id}
                        onClick={() => onSelectThread(c.id)}
                      />
                    ))
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
