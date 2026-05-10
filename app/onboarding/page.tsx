"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, Sun, Moon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Step = "style" | "name" | "role" | "company";

const ROLES = [
  { value: "founder", label: "Founder", icon: "🚀" },
  { value: "product", label: "Product", icon: "📦" },
  { value: "designer", label: "Designer", icon: "🎨" },
  { value: "developer", label: "Developer", icon: "💻" },
  { value: "marketing", label: "Marketing / Sprzedaż", icon: "📣" },
  { value: "operations", label: "Operacje", icon: "⚙️" },
  { value: "consultant", label: "Konsultant", icon: "📊" },
  { value: "other", label: "Inne", icon: "✨" },
];

const COMPANY_SIZES = [
  { value: "solo", label: "Solo", icon: "🙋" },
  { value: "2-20", label: "2 – 20", icon: "👥" },
  { value: "21-200", label: "21 – 200", icon: "🏢" },
  { value: "200+", label: "200+", icon: "🏙️" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("style");
  const [style, setStyle] = useState<"light" | "dark">("dark");
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [saving, setSaving] = useState(false);

  const steps: Step[] = ["style", "name", "role", "company"];
  const stepIndex = steps.indexOf(step);

  async function finish() {
    setSaving(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      await supabase
        .from("profiles")
        .update({
          display_name: name.trim() || null,
          role: role || null,
          company_size: companySize || null,
          onboarding_completed: true,
        })
        .eq("id", user.id);
    }

    router.push("/");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a09] px-4">
      {/* Background gradient */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(120,100,80,0.15),transparent)]" />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-1">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-beige text-beige-foreground text-lg font-bold">
            W
          </div>
        </div>

        {/* Progress dots */}
        <div className="mb-8 flex items-center justify-center gap-2">
          {steps.map((s, i) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i <= stepIndex ? "w-8 bg-beige" : "w-2 bg-white/15"
              }`}
            />
          ))}
        </div>

        {/* Step: Style */}
        {step === "style" && (
          <OnboardingCard
            title="Wybierz swój styl"
            onNext={() => setStep("name")}
            nextDisabled={false}
          >
            <div className="grid grid-cols-2 gap-3">
              <StyleOption
                label="Jasny"
                icon={<Sun className="h-6 w-6" />}
                selected={style === "light"}
                onSelect={() => setStyle("light")}
              />
              <StyleOption
                label="Ciemny"
                icon={<Moon className="h-6 w-6" />}
                selected={style === "dark"}
                onSelect={() => setStyle("dark")}
              />
            </div>
          </OnboardingCard>
        )}

        {/* Step: Name */}
        {step === "name" && (
          <OnboardingCard
            title="Jak masz na imię?"
            onNext={() => setStep("role")}
            nextDisabled={false}
          >
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") setStep("role");
              }}
              placeholder="Twoje imię"
              autoFocus
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-foreground placeholder:text-muted-foreground focus:border-beige/40 focus:outline-none"
            />
          </OnboardingCard>
        )}

        {/* Step: Role */}
        {step === "role" && (
          <OnboardingCard
            title="Jaka jest Twoja rola?"
            onNext={() => setStep("company")}
            nextDisabled={!role}
          >
            <div className="grid grid-cols-2 gap-2">
              {ROLES.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRole(r.value)}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left text-sm transition ${
                    role === r.value
                      ? "border-beige/50 bg-beige/10 text-foreground"
                      : "border-white/10 bg-white/5 text-muted-foreground hover:border-white/20 hover:text-foreground"
                  }`}
                >
                  <span className="text-base">{r.icon}</span>
                  {r.label}
                </button>
              ))}
            </div>
          </OnboardingCard>
        )}

        {/* Step: Company size */}
        {step === "company" && (
          <OnboardingCard
            title="Ile osób w Twojej firmie?"
            onNext={finish}
            nextDisabled={!companySize}
            nextLabel={saving ? undefined : "Zacznij budować"}
            saving={saving}
          >
            <div className="grid grid-cols-2 gap-3">
              {COMPANY_SIZES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setCompanySize(s.value)}
                  className={`flex cursor-pointer flex-col items-center gap-1 rounded-lg border py-4 text-sm transition ${
                    companySize === s.value
                      ? "border-beige/50 bg-beige/10 text-foreground"
                      : "border-white/10 bg-white/5 text-muted-foreground hover:border-white/20 hover:text-foreground"
                  }`}
                >
                  <span className="text-2xl">{s.icon}</span>
                  {s.label}
                </button>
              ))}
            </div>
          </OnboardingCard>
        )}
      </div>
    </div>
  );
}

function OnboardingCard({
  title,
  children,
  onNext,
  nextDisabled,
  nextLabel,
  saving,
}: {
  title: string;
  children: React.ReactNode;
  onNext: () => void;
  nextDisabled: boolean;
  nextLabel?: string;
  saving?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#111110] p-8 shadow-2xl">
      <h2 className="mb-6 text-center text-xl font-semibold text-foreground">
        {title}
      </h2>
      <div className="mb-6">{children}</div>
      <button
        type="button"
        onClick={onNext}
        disabled={nextDisabled || saving}
        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-beige py-2.5 text-sm font-medium text-beige-foreground transition hover:bg-beige/90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {saving ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            {nextLabel ?? "Dalej"}
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>
    </div>
  );
}

function StyleOption({
  label,
  icon,
  selected,
  onSelect,
}: {
  label: string;
  icon: React.ReactNode;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border py-6 text-sm transition ${
        selected
          ? "border-beige/50 bg-beige/10 text-foreground"
          : "border-white/10 bg-white/5 text-muted-foreground hover:border-white/20 hover:text-foreground"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
