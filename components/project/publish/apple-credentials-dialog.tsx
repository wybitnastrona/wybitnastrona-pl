"use client";

/**
 * Apple Credentials Dialog.
 *
 * Pozwala uzytkownikowi wprowadzic dane App Store Connect:
 *  - Key ID (10 znakow)
 *  - Issuer ID (UUID)
 *  - Team ID (10 znakow)
 *  - Private key (.p8 — uzytkownik wkleja pelna zawartosc lub uploaduje plik)
 *
 * Zapisuje do public.user_integration_credentials (RLS owner-only).
 * Klucz jest przechowywany w bazie (TODO: migracja do Supabase Vault dla pelnego szyfrowania).
 */

import { useState } from "react";
import { Loader2, Shield, Upload } from "lucide-react";
import { AppleIcon as Apple } from "@/components/brand-icons";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: (credentialsId: string) => void;
};

export function AppleCredentialsDialog({ open, onOpenChange, onSaved }: Props) {
  const [displayName, setDisplayName] = useState("My ASC Key");
  const [keyId, setKeyId] = useState("");
  const [issuerId, setIssuerId] = useState("");
  const [teamId, setTeamId] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePaste(file: File) {
    const text = await file.text();
    setPrivateKey(text.trim());
  }

  async function handleSave() {
    setError(null);
    if (!keyId || !issuerId || !teamId || !privateKey) {
      setError("Wszystkie pola sa wymagane.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/integrations/app-store-connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName,
          keyId,
          issuerId,
          teamId,
          privateKey,
        }),
      });
      const data = (await res.json()) as { id?: string; error?: string };
      if (!res.ok || !data.id) {
        setError(data.error ?? "Zapis nieudany");
      } else {
        onSaved?.(data.id);
        onOpenChange(false);
      }
    } catch (err) {
      console.error(err);
      setError("Blad sieci");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Apple className="h-4 w-4 text-beige" />
            App Store Connect — klucze API
          </DialogTitle>
          <DialogDescription className="text-xs">
            Wygeneruj klucz API w{" "}
            <a
              href="https://appstoreconnect.apple.com/access/api"
              target="_blank"
              rel="noopener"
              className="underline hover:text-beige"
            >
              App Store Connect → Users and Access → Keys
            </a>
            . Wymagane Admin / App Manager role.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cred-name">Nazwa wyswietlana</Label>
            <Input
              id="cred-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="My ASC Key"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cred-keyid">Key ID</Label>
              <Input
                id="cred-keyid"
                value={keyId}
                onChange={(e) => setKeyId(e.target.value.trim())}
                placeholder="ABC123XYZ4"
                maxLength={10}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cred-team">Team ID</Label>
              <Input
                id="cred-team"
                value={teamId}
                onChange={(e) => setTeamId(e.target.value.trim())}
                placeholder="ABCDEF1234"
                maxLength={10}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cred-issuer">Issuer ID</Label>
            <Input
              id="cred-issuer"
              value={issuerId}
              onChange={(e) => setIssuerId(e.target.value.trim())}
              placeholder="12345678-1234-1234-1234-123456789abc"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cred-key">Private key (.p8)</Label>
            <div className="flex items-center gap-2">
              <input
                type="file"
                accept=".p8"
                onChange={(e) =>
                  e.target.files?.[0] && handlePaste(e.target.files[0])
                }
                className="text-xs text-muted-foreground file:mr-3 file:cursor-pointer file:rounded file:border-0 file:bg-beige/15 file:px-3 file:py-1.5 file:text-foreground/90"
              />
              <span className="text-[10px] text-muted-foreground">
                lub wklej ponizej
              </span>
            </div>
            <textarea
              id="cred-key"
              value={privateKey}
              onChange={(e) => setPrivateKey(e.target.value)}
              placeholder={
                "-----BEGIN PRIVATE KEY-----\nMIGHAgEAMBMGByqG...\n-----END PRIVATE KEY-----"
              }
              rows={5}
              className="rounded-md border border-beige/15 bg-background/60 px-3 py-2 font-mono text-[11px] text-foreground"
            />
          </div>

          <div className="flex items-start gap-2 rounded-md border border-beige/15 bg-card/40 p-3 text-[11px] text-muted-foreground">
            <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0 text-beige/70" />
            <div>
              <p className="text-foreground">Bezpieczenstwo:</p>
              <p>
                Twoj klucz jest dostepny tylko dla Twojego konta (RLS owner-only).
                Mozesz go usunac w Settings → Integrations w dowolnym momencie.
                Klucz uzywany jest tylko do podpisywania zadan do API App Store Connect.
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-md border border-rose-500/30 bg-rose-950/30 px-3 py-2 text-sm text-rose-200">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Anuluj
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-beige text-beige-foreground hover:bg-beige/90"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Zapisz klucz
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
