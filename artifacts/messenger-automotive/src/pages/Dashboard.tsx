import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { ChatArea } from "@/components/ChatArea";
import { useSlackSocket } from "@/hooks/use-socket";

export default function Dashboard() {
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);

  useSlackSocket(activeChannelId);

  return (
    <div className="flex w-full h-screen overflow-hidden bg-background">
      <Sidebar 
        activeThreadId={activeChannelId} 
        onSelectThread={setActiveChannelId} 
      />
      <ChatArea threadId={activeChannelId} />
    </div>
  );
}
