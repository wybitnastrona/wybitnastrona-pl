"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type PresenceUser = {
  user_id: string;
  email?: string;
  cursor?: { x: number; y: number };
  color: string;
};

const COLORS = ["#e8dcc4", "#a78bfa", "#fb7185", "#34d399", "#60a5fa", "#fbbf24"];

/**
 * Hook montujacy Supabase Realtime channel dla projektu.
 * Wysyla presence + broadcasty cursor-move.
 *
 * Wykorzystywany przez Y.js (lib/yjs/...) dla wspoldzielonych zmian plikow.
 */
export function useRealtimePresence(projectId: string, userId: string, email?: string) {
  const [peers, setPeers] = useState<PresenceUser[]>([]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`project:${projectId}`, {
      config: { presence: { key: userId } },
    });

    const myColor = COLORS[Math.floor(Math.random() * COLORS.length)];

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const list: PresenceUser[] = [];
        for (const [, metas] of Object.entries(state)) {
          for (const m of metas as unknown as PresenceUser[]) list.push(m);
        }
        setPeers(list.filter((p) => p.user_id !== userId));
      })
      .on("broadcast", { event: "cursor" }, () => {
        // Broadcast cursorow obslugujemy w komponencie wyzej.
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            user_id: userId,
            email,
            color: myColor,
          });
        }
      });

    return () => {
      void channel.unsubscribe();
    };
  }, [projectId, userId, email]);

  return peers;
}

/**
 * UI: avatary online w prawym gornym rogu workspace'a.
 */
export function PresenceAvatars({ peers }: { peers: PresenceUser[] }) {
  if (peers.length === 0) return null;
  return (
    <div className="flex -space-x-2">
      {peers.slice(0, 4).map((p) => (
        <div
          key={p.user_id}
          title={p.email ?? p.user_id}
          className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-background text-xs font-medium uppercase"
          style={{ backgroundColor: p.color, color: "#0a0a0a" }}
        >
          {(p.email ?? "?").charAt(0)}
        </div>
      ))}
      {peers.length > 4 && (
        <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-card text-[10px] text-muted-foreground">
          +{peers.length - 4}
        </div>
      )}
    </div>
  );
}
