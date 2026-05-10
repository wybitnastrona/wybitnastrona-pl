"use client";

import { useEffect, useState } from "react";
import { FileText, Loader2, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

type KnowledgeDoc = {
  id: string;
  title: string;
  source: string | null;
  created_at: string;
};

export function KnowledgeTab() {
  const [docs, setDocs] = useState<KnowledgeDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const res = await fetch("/api/knowledge");
      const data = (await res.json()) as { docs?: KnowledgeDoc[]; error?: string };
      setDocs(data.docs ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // loading zainicjowany jako true — nie trzeba go ustawiać synchronicznie
    void load();
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), content: content.trim() }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (data.ok) {
        setTitle("");
        setContent("");
        setLoading(true);
        await load();
      } else {
        setError(data.error ?? "Nie udało się zapisać.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Usunąć dokument z bazy wiedzy?")) return;
    await fetch(`/api/knowledge?id=${id}`, { method: "DELETE" });
    setLoading(true);
    await load();
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1_000_000) {
      alert("Plik > 1 MB. Skróć go.");
      return;
    }
    const text = await file.text();
    setTitle((prev) => prev || file.name.replace(/\.\w+$/, ""));
    setContent(text);
  }

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-lg font-medium text-foreground">Baza wiedzy (RAG)</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Dokumenty wgrane tutaj będą automatycznie dołączane do kontekstu AI
          jeśli pasują do Twojego pytania (cosine similarity, top-3).
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Wymaga <code>OPENAI_API_KEY</code> i extension <code>pgvector</code> w
          Supabase.
        </p>
      </header>

      <form
        onSubmit={handleSubmit}
        className="space-y-3 rounded-lg border border-beige/15 bg-background/40 p-4"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Dodaj dokument</h3>
          <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-beige/15 px-2 py-1 text-xs text-muted-foreground hover:border-beige/30 hover:text-foreground">
            <Upload className="h-3 w-3" />
            Wgraj plik (.md, .txt)
            <input
              type="file"
              accept=".md,.txt,.json,.csv"
              onChange={handleFile}
              className="hidden"
            />
          </label>
        </div>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Tytuł (np. 'Brand Guidelines')"
          className="w-full rounded-md border border-beige/15 bg-background/60 px-3 py-2 text-sm focus:border-beige/40 focus:outline-none"
        />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Treść — dłuższe dokumenty są dzielone na chunki po 1000 znaków."
          rows={6}
          className="w-full resize-y rounded-md border border-beige/15 bg-background/60 px-3 py-2 text-sm focus:border-beige/40 focus:outline-none"
        />
        {error && (
          <p className="text-xs text-rose-300">{error}</p>
        )}
        <div className="flex justify-end">
          <Button
            type="submit"
            size="sm"
            disabled={busy || !title.trim() || !content.trim()}
            className="bg-beige text-beige-foreground hover:bg-beige/90"
          >
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Dodaj do bazy
          </Button>
        </div>
      </form>

      <section>
        <h3 className="mb-3 text-sm font-medium">
          Twoje dokumenty {docs.length > 0 && `(${docs.length})`}
        </h3>
        {loading ? (
          <div className="rounded-lg border border-beige/10 bg-card/40 p-6 text-center text-xs text-muted-foreground">
            <Loader2 className="mx-auto h-4 w-4 animate-spin" />
          </div>
        ) : docs.length === 0 ? (
          <div className="rounded-lg border border-beige/10 bg-card/40 p-6 text-center text-xs text-muted-foreground">
            Pusto. Dodaj pierwszy dokument powyżej.
          </div>
        ) : (
          <ul className="divide-y divide-beige/5 rounded-lg border border-beige/10 bg-card/40">
            {docs.map((doc) => (
              <li
                key={doc.id}
                className="flex items-center gap-3 px-3 py-2.5 text-sm"
              >
                <FileText className="h-3.5 w-3.5 shrink-0 text-beige/70" />
                <div className="min-w-0 flex-1">
                  <p className="truncate">{doc.title}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(doc.created_at).toLocaleString("pl-PL")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(doc.id)}
                  className="cursor-pointer rounded-md p-1 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-300"
                  aria-label="Usuń"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
