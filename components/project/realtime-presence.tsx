"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { emailToColor, emailToInitial } from "@/lib/avatar-color";

export type PresenceUser = {
  user_id: string;
  email?: string;
  cursor?: { x: number; y: number };
  color: string;
};

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

    // Deterministyczny kolor z emaila - ten sam user ma zawsze ten sam
    // odcien u wszystkich peerow.
    const myColor = emailToColor(email ?? userId);

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
      {peers.slice(0, 4).map((p) => {
        // Fallback do deterministic color jezeli peer nie wyslal koloru
        // (np. po deploy zmianie schematu).
        const bg = p.color || emailToColor(p.email ?? p.user_id);
        return (
          <div
            key={p.user_id}
            title={p.email ?? p.user_id}
            className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-background text-xs font-medium uppercase text-white"
            style={{ backgroundColor: bg }}
          >
            {emailToInitial(p.email ?? p.user_id)}
          </div>
        );
      })}
      {peers.length > 4 && (
        <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-card text-[10px] text-muted-foreground">
          +{peers.length - 4}
        </div>
      )}
    </div>
  );
}
