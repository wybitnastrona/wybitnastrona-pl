/**
 * Lista narzędzi/integracji/zasobów które użytkownik może załączyć do wiadomości
 * z bota przez rozwijane menu "+" w chacie. Każda pozycja staje się chipem nad
 * polem wpisywania (jak na screenie Bolt). AI widzi tytuł chipu w prompt jako
 * podpowiedź "Narzędzia do uwzględnienia: ...".
 *
 * Pełna ekspozycja modułów Expo / React Native dla AI.
 */

import {
  Activity,
  AlignLeft,
  ArrowDownToLine,
  Asterisk,
  AudioLines,
  BarChart3,
  Battery,
  Bluetooth,
  BookOpen,
  Bot,
  Brain,
  Camera,
  Clipboard,
  Cloud,
  Compass,
  Contact,
  CreditCard,
  Database,
  FileImage,
  FileSearch,
  FileText,
  Film,
  Fingerprint,
  Gauge,
  HardDrive,
  Image as ImageIcon,
  Languages,
  Layers,
  LinkIcon,
  Map,
  MessageSquare,
  Mic,
  Monitor,
  Network,
  Phone,
  PieChart,
  PlayCircle,
  Printer,
  ScanLine,
  Server,
  Share2,
  ShoppingBag,
  Smartphone,
  Speaker,
  SquareTerminal,
  Star,
  Sun,
  Sunrise,
  Type,
  Vibrate,
  Volume2,
  Wifi,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type AttachmentToolCategory =
  | "attachment"
  | "integrations"
  | "device"
  | "ai";

export type AttachmentTool = {
  id: string;
  category: AttachmentToolCategory;
  /** Sub-section inside the category (e.g. "Media", "Sensory"). */
  section?: string;
  label: string;
  icon: LucideIcon;
  /** Optional hint for AI in system prompt. */
  hint?: string;
};

export const ATTACHMENT_TOOLS: AttachmentTool[] = [
  // ── ZAŁĄCZNIK ─────────────────────────────────────────────────────────────
  {
    id: "attach-image",
    category: "attachment",
    label: "Załącz zdjęcie",
    icon: FileImage,
  },

  // ── INTEGRACJE ────────────────────────────────────────────────────────────
  {
    id: "stripe",
    category: "integrations",
    label: "Płatności (Stripe)",
    icon: CreditCard,
    hint:
      "Użyj Stripe Checkout / Payment Element. Webhook konfiguracji projektu robi nasz panel.",
  },

  // ── URZĄDZENIE — Media ────────────────────────────────────────────────────
  { id: "camera", category: "device", section: "Media", label: "Aparat", icon: Camera },
  { id: "image-picker", category: "device", section: "Media", label: "Galeria zdjęć", icon: ImageIcon },
  { id: "image-manipulator", category: "device", section: "Media", label: "Edycja obrazu", icon: ImageIcon },
  { id: "audio", category: "device", section: "Media", label: "Audio", icon: AudioLines },
  { id: "video", category: "device", section: "Media", label: "Wideo", icon: Film },
  { id: "video-thumbnails", category: "device", section: "Media", label: "Miniatury wideo", icon: PlayCircle },
  { id: "media-library", category: "device", section: "Media", label: "Biblioteka mediów", icon: Layers },
  { id: "live-photo", category: "device", section: "Media", label: "Live Photo", icon: Camera },
  { id: "screen-capture", category: "device", section: "Media", label: "Zrzut ekranu", icon: Monitor },
  { id: "view-shot", category: "device", section: "Media", label: "Zrzut widoku", icon: Monitor },

  // ── URZĄDZENIE — Grafika ──────────────────────────────────────────────────
  { id: "blur-view", category: "device", section: "Grafika", label: "Rozmycie (Blur)", icon: Asterisk },
  { id: "linear-gradient", category: "device", section: "Grafika", label: "Gradient liniowy", icon: AlignLeft },

  // ── URZĄDZENIE — Sensory ──────────────────────────────────────────────────
  { id: "accelerometer", category: "device", section: "Sensory", label: "Akcelerometr", icon: Activity },
  { id: "gyroscope", category: "device", section: "Sensory", label: "Żyroskop", icon: Compass },
  { id: "device-motion", category: "device", section: "Sensory", label: "Ruch urządzenia", icon: Activity },
  { id: "barometer", category: "device", section: "Sensory", label: "Barometr", icon: Gauge },
  { id: "magnetometer", category: "device", section: "Sensory", label: "Magnetometr", icon: Compass },
  { id: "pedometer", category: "device", section: "Sensory", label: "Krokomierz", icon: BarChart3 },
  { id: "light-sensor", category: "device", section: "Sensory", label: "Czujnik światła", icon: Sun },

  // ── URZĄDZENIE — Lokalizacja ──────────────────────────────────────────────
  { id: "location", category: "device", section: "Lokalizacja", label: "Lokalizacja (GPS)", icon: Compass },
  { id: "maps", category: "device", section: "Lokalizacja", label: "Mapy", icon: Map },

  // ── URZĄDZENIE — Urządzenie ───────────────────────────────────────────────
  { id: "battery", category: "device", section: "Urządzenie", label: "Bateria", icon: Battery },
  { id: "brightness", category: "device", section: "Urządzenie", label: "Jasność ekranu", icon: Sunrise },
  { id: "network", category: "device", section: "Urządzenie", label: "Sieć", icon: Network },
  { id: "haptics", category: "device", section: "Urządzenie", label: "Wibracje (Haptics)", icon: Vibrate },
  { id: "bluetooth", category: "device", section: "Urządzenie", label: "Bluetooth", icon: Bluetooth },
  { id: "keep-awake", category: "device", section: "Urządzenie", label: "Trzymaj ekran włączony", icon: Sun },
  { id: "screen-orientation", category: "device", section: "Urządzenie", label: "Orientacja ekranu", icon: Smartphone },
  { id: "status-bar", category: "device", section: "Urządzenie", label: "Pasek statusu", icon: Wifi },
  { id: "navigation-bar", category: "device", section: "Urządzenie", label: "Pasek nawigacji", icon: Phone },

  // ── URZĄDZENIE — Komunikacja ──────────────────────────────────────────────
  { id: "notifications", category: "device", section: "Komunikacja", label: "Powiadomienia", icon: MessageSquare },
  { id: "sms", category: "device", section: "Komunikacja", label: "SMS", icon: MessageSquare },
  { id: "mail-composer", category: "device", section: "Komunikacja", label: "Wysyłanie e-maili", icon: FileText },
  { id: "sharing", category: "device", section: "Komunikacja", label: "Udostępnianie", icon: Share2 },
  { id: "contacts", category: "device", section: "Komunikacja", label: "Kontakty", icon: Contact },
  { id: "calendar", category: "device", section: "Komunikacja", label: "Kalendarz", icon: BookOpen },

  // ── URZĄDZENIE — Pamięć ───────────────────────────────────────────────────
  { id: "file-system", category: "device", section: "Pamięć", label: "System plików", icon: HardDrive },
  { id: "secure-store", category: "device", section: "Pamięć", label: "Bezpieczny magazyn", icon: Server },
  { id: "sqlite", category: "device", section: "Pamięć", label: "SQLite", icon: Database },
  { id: "async-storage", category: "device", section: "Pamięć", label: "AsyncStorage", icon: ArrowDownToLine },

  // ── URZĄDZENIE — Autoryzacja ──────────────────────────────────────────────
  { id: "biometric-auth", category: "device", section: "Autoryzacja", label: "Biometria", icon: Fingerprint },
  { id: "apple-sign-in", category: "device", section: "Autoryzacja", label: "Apple Sign In", icon: ShoppingBag },
  { id: "tracking-transparency", category: "device", section: "Autoryzacja", label: "Tracking Transparency", icon: Asterisk },

  // ── URZĄDZENIE — Utilities ────────────────────────────────────────────────
  { id: "clipboard", category: "device", section: "Utility", label: "Schowek", icon: Clipboard },
  { id: "deep-linking", category: "device", section: "Utility", label: "Deep Linking", icon: LinkIcon },
  { id: "in-app-browser", category: "device", section: "Utility", label: "Wbudowana przeglądarka", icon: Cloud },
  { id: "barcode-scanner", category: "device", section: "Utility", label: "Skaner kodów", icon: ScanLine },
  { id: "document-picker", category: "device", section: "Utility", label: "Wybór dokumentu", icon: FileSearch },
  { id: "print", category: "device", section: "Utility", label: "Drukowanie", icon: Printer },
  { id: "in-app-purchases", category: "device", section: "Utility", label: "Zakupy w aplikacji", icon: ShoppingBag },
  { id: "store-review", category: "device", section: "Utility", label: "Ocena w sklepie", icon: Star },
  { id: "speech", category: "device", section: "Utility", label: "Synteza mowy", icon: Volume2 },

  // ── AI — Image ────────────────────────────────────────────────────────────
  {
    id: "ai-analyze-image",
    category: "ai",
    section: "Obrazy",
    label: "Analiza obrazu (Sonnet 4.6)",
    icon: ImageIcon,
    hint: "Użyj Claude Sonnet 4.6 vision do analizy obrazu (anthropic SDK).",
  },
  {
    id: "ai-generate-image",
    category: "ai",
    section: "Obrazy",
    label: "Generowanie obrazu (OpenAI gpt-image-1)",
    icon: ImageIcon,
    hint:
      "Generowanie obrazów: użyj OpenAI gpt-image-1 (https://api.openai.com/v1/images/generations) lub naszego endpointu /api/generate-image.",
  },

  // ── AI — Text ─────────────────────────────────────────────────────────────
  {
    id: "ai-generate-text",
    category: "ai",
    section: "Tekst",
    label: "Generowanie tekstu (Sonnet 4.6)",
    icon: Type,
    hint:
      "Generowanie tekstu z Anthropic Sonnet 4.6 (model: claude-sonnet-4-5). Użyj fetch do /api/ai/generate-text z prompt.",
  },
  {
    id: "ai-structure-data",
    category: "ai",
    section: "Tekst",
    label: "Strukturyzacja danych (Sonnet 4.6)",
    icon: PieChart,
    hint:
      "Strukturyzacja danych przez Sonnet 4.6 z user-supplied schemą JSON.",
  },

  // ── AI — Chat ─────────────────────────────────────────────────────────────
  {
    id: "ai-chat-agent",
    category: "ai",
    section: "Czat i agenci",
    label: "Czat i agenci (Sonnet 4.6 / Opus 4.7)",
    icon: Bot,
    hint:
      "Zbuduj endpoint /api/chat z Claude Sonnet/Opus i streaming response (Vercel AI SDK).",
  },
  {
    id: "ai-custom-tools",
    category: "ai",
    section: "Czat i agenci",
    label: "Własne narzędzia (Sonnet 4.6)",
    icon: SquareTerminal,
    hint: "Tool-calling przez Claude — definicja schematu narzędzi w JSON.",
  },
  {
    id: "ai-speech",
    category: "ai",
    section: "Audio",
    label: "Rozpoznawanie mowy (Whisper)",
    icon: Mic,
    hint: "Użyj OpenAI Whisper przez nasz endpoint /api/transcribe.",
  },
  {
    id: "ai-translate",
    category: "ai",
    section: "Tekst",
    label: "Tłumaczenie tekstu (Sonnet 4.6)",
    icon: Languages,
  },
  {
    id: "ai-summarize",
    category: "ai",
    section: "Tekst",
    label: "Streszczanie (Sonnet 4.6)",
    icon: Brain,
  },
  {
    id: "ai-tts",
    category: "ai",
    section: "Audio",
    label: "Synteza mowy (TTS)",
    icon: Speaker,
  },
];

export function getToolById(id: string): AttachmentTool | undefined {
  return ATTACHMENT_TOOLS.find((t) => t.id === id);
}

/** Group tools by category, then optionally by section. */
export function groupAttachmentTools(): Record<
  AttachmentToolCategory,
  Array<{ section?: string; items: AttachmentTool[] }>
> {
  const out: Record<
    AttachmentToolCategory,
    Array<{ section?: string; items: AttachmentTool[] }>
  > = {
    attachment: [],
    integrations: [],
    device: [],
    ai: [],
  };
  for (const tool of ATTACHMENT_TOOLS) {
    const buckets = out[tool.category];
    let bucket = buckets.find((b) => b.section === tool.section);
    if (!bucket) {
      bucket = { section: tool.section, items: [] };
      buckets.push(bucket);
    }
    bucket.items.push(tool);
  }
  return out;
}

export const CATEGORY_LABELS: Record<AttachmentToolCategory, string> = {
  attachment: "ZAŁĄCZNIK",
  integrations: "INTEGRACJE",
  device: "URZĄDZENIE",
  ai: "AI",
};
