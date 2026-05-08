"use client";

import { useEffect, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { ArrowUp, Loader2, Sparkles, Wrench } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type ChatPanelProps = {
  projectId: string;
  initialPrompt: string;
  hasFiles: boolean;
};

export function ChatPanel({
  projectId,
  initialPrompt,
  hasFiles,
}: ChatPanelProps) {
  const router = useRouter();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);

  const initialMessages: UIMessage[] = initialPrompt
    ? [
        {
          id: "initial-prompt",
          role: "user",
          parts: [{ type: "text", text: initialPrompt }],
        },
      ]
    : [];

  const { messages, sendMessage, status, error, stop } = useChat({
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: "/api/generate",
      body: { projectId },
    }),
    onFinish: () => {
      router.refresh();
    },
  });

  useEffect(() => {
    if (
      !startedRef.current &&
      initialPrompt &&
      !hasFiles &&
      status === "ready"
    ) {
      startedRef.current = true;
      sendMessage({
        text: initialPrompt,
      });
    }
  }, [initialPrompt, hasFiles, sendMessage, status]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;
    setInput("");
    sendMessage({ text: trimmed });
  }

  const isStreaming = status === "streaming" || status === "submitted";

  return (
    <div className="flex h-full flex-col bg-background">
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
      >
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
            <Sparkles className="h-5 w-5 text-beige/70" />
            <p>Opisz co chcesz zbudowac.</p>
          </div>
        )}

        {messages.map((message) => (
          <Message key={message.id} message={message} />
        ))}

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error.message}
          </div>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="border-t border-beige/10 bg-card/40 p-3"
      >
        <div className="flex items-end gap-2 rounded-xl border border-beige/20 bg-card focus-within:border-beige/50 transition px-3 py-2">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
            placeholder="Co dodac lub zmienic?"
            rows={1}
            className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none min-h-[24px] max-h-32"
            disabled={isStreaming}
          />
          {isStreaming ? (
            <Button
              type="button"
              size="icon-sm"
              onClick={() => stop()}
              className="bg-beige/20 text-beige hover:bg-beige/30"
              aria-label="Zatrzymaj"
            >
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            </Button>
          ) : (
            <Button
              type="submit"
              size="icon-sm"
              disabled={!input.trim()}
              className="bg-beige text-beige-foreground hover:bg-beige/90 disabled:opacity-40"
              aria-label="Wyslij"
            >
              <ArrowUp className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}

function Message({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";

  return (
    <div
      className={`flex flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}
    >
      <span className="px-1 text-xs uppercase tracking-wider text-muted-foreground/70">
        {isUser ? "Ty" : "AI"}
      </span>
      <div
        className={`max-w-[90%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
          isUser
            ? "bg-beige text-beige-foreground"
            : "bg-card border border-beige/15 text-foreground"
        }`}
      >
        {message.parts.map((part, idx) => {
          if (part.type === "text") {
            return (
              <p key={idx} className="whitespace-pre-wrap break-words">
                {part.text}
              </p>
            );
          }
          if (part.type === "reasoning") {
            return null;
          }
          if (part.type.startsWith("tool-")) {
            const toolPart = part as {
              type: string;
              state?: string;
              input?: { path?: string };
            };
            const action = part.type.replace("tool-", "");
            const filePath = toolPart.input?.path;
            return (
              <div
                key={idx}
                className="mt-1 flex items-center gap-2 rounded-md bg-background/60 px-2 py-1.5 text-xs text-muted-foreground"
              >
                <Wrench className="h-3 w-3 text-beige/70" />
                <span className="font-mono">
                  {action === "writeFile" ? "wpisuje" : "usuwa"}
                  {filePath ? `: ${filePath}` : ""}
                </span>
                {toolPart.state === "input-streaming" && (
                  <Loader2 className="h-3 w-3 animate-spin" />
                )}
              </div>
            );
          }
          return null;
        })}
      </div>
    </div>
  );
}
