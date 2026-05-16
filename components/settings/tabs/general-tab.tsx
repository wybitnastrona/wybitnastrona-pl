"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";

export function GeneralTab() {
  const { user } = useAuth();
  const [tokensInChat, setTokensInChat] = useState(false);
  const [sound, setSound] = useState(true);
  const [editorWrap, setEditorWrap] = useState(true);

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-lg font-medium text-foreground">Ustawienia ogolne</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {user?.email
            ? `Zalogowano jako ${user.email}.`
            : "Wybor preferencji wyswietlania i zachowania kreatora."}
        </p>
      </header>

      <Section title="Wyglad i powiadomienia">
        <Row
          label="Motyw"
          description="Aktualnie zawsze ciemny - jasny motyw w przygotowaniu."
        >
          <span className="rounded-md border border-beige/20 px-2 py-1 text-xs text-beige/80">
            Ciemny
          </span>
        </Row>
        <Row
          label="Pokażuj zuzycie tokenow w czacie"
          description="Wyswietla licznik tokenow nad polem wpisu wiadomosci."
        >
          <Toggle checked={tokensInChat} onChange={setTokensInChat} />
        </Row>
        <Row
          label="Powiadomienia dzwiekowe"
          description="Krotki dzwiek po zakonczeniu odpowiedzi asystenta."
        >
          <Toggle checked={sound} onChange={setSound} />
        </Row>
      </Section>

      <Section title="Czat">
        <Row
          label="Domyslny model"
          description="Wybor modelu jezykowego dla nowych projektów."
        >
          <span className="text-sm text-muted-foreground">
            Standard (auto)
          </span>
        </Row>
      </Section>

      <Section title="Edytor kodu">
        <Row
          label="Zawijanie linii"
          description="Dlugie linie sa zawijane w edytorze (bez poziomego scroll)."
        >
          <Toggle checked={editorWrap} onChange={setEditorWrap} />
        </Row>
      </Section>

      <Section title="Konto">
        <Row
          label="Email"
          description="Adres uzywany do logowania i powiadomien."
        >
          <span className="font-mono text-xs text-muted-foreground">
            {user?.email ?? "-"}
          </span>
        </Row>
      </Section>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      <div className="divide-y divide-beige/10 rounded-lg border border-beige/10 bg-background/40">
        {children}
      </div>
    </section>
  );
}

function Row({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 px-3 py-3">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description && (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 cursor-pointer items-center rounded-full transition ${
        checked ? "bg-beige" : "bg-muted"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-background shadow transition ${
          checked ? "translate-x-4" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}
