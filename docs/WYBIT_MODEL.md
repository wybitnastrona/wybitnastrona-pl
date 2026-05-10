# Wybit - wlasny model AI dla wybitnastrona.pl

Ten dokument tlumaczy w przystepny sposob, **co to znaczy "wlasny model
rozumiejacy programowanie"**, jakie sa realne sciezki jego stworzenia i
co najpierw warto sprobowac.

> TL;DR: "wlasny model" w sensie LLM trenowanego od zera na kod jest
> ekstremalnie kosztowny (miliony PLN, dziesiatki tysiecy GPU-godzin).
> **Praktyczne MVP** to wziac istniejacy open-source model (np. Qwen 2.5
> Coder, DeepSeek Coder) i **dostroic go** (LoRA / fine-tuning) na
> wlasnych danych - to dziala juz dla budzetu rzedu kilku tysiecy zlotych.

## Trzy realne sciezki, w kolejnosci od najtanszej

### Sciezka 1: Tylko system prompt + RAG (brak treningu) - **rekomendowane na start**

**Koszt:** uzycie Anthropic / OpenAI API jak teraz, plus baza wektorowa.
**Czas:** 1-2 tygodnie.

Co robisz:
1. Wybierasz silnik (Anthropic Claude lub OpenAI GPT-4o przez `@ai-sdk/*`).
2. **System prompt** jest "tozsamoscia" Wybita - opisuje styl odpowiedzi,
   jezyk (PL), zakres (strony WWW), narzedzia (Supabase, Tailwind, Shadcn).
3. **Retrieval-Augmented Generation:** trzymasz w bazie (np. Supabase
   `pgvector` lub Pinecone) embeddingi:
   - dokumentacji bibliotek z naszego stacku (Next.js 16, Sandpack, Supabase,
     Tailwind v4),
   - przykladow generowanych projektow z najwyzszymi ocenami uzytkownikow,
   - "playbookow" jak rozwiazac typowe zadania ("dodaj koszyk", "logowanie").
4. Dla kazdego promptu pobierasz top-K embeddingow i doklejasz do wiadomosci.

Efekt: dla uzytkownika to **"Wybit"** - inna marka, inny styl, inna jakosc -
ale pod spodem nadal Claude/GPT. Wystarczy w kodzie:

```ts
// app/api/generate/route.ts
if (model === "wybit") {
  // 1. zbuduj prompt z RAG
  // 2. uzyj fallbackowego silnika (np. claude-sonnet-4-5)
  //    z innym system promptem i extra kontekstem
}
```

To **80% tego, czego uzytkownik oczekuje** za **5% kosztu** prawdziwego
modelu. Polecam zaczac stad.

### Sciezka 2: Fine-tuning gotowego open-source modelu kodu - **MVP "prawdziwego" Wybita**

**Koszt:** 1.000 - 10.000 PLN za pierwsza wersje (jednorazowo). Hosting
inference: 200-2.000 PLN / miesiac w zaleznosci od ruchu.
**Czas:** 4-8 tygodni.

Co robisz:
1. Wybierasz **bazowy model** (open-source z licencja komercyjna):
   - **Qwen 2.5 Coder 7B / 14B / 32B** (Alibaba, licencja Apache 2.0) -
     najlepszy stosunek jakosci do rozmiaru w 2025/2026.
   - **DeepSeek Coder V2** (rozne rozmiary).
   - **CodeLlama 70B** (Meta, dla najwiekszych wymagan).
   - **StarCoder2** (BigCode).
2. Zbierasz **dataset treningowy** (najtrudniejszy etap):
   - 5.000 - 50.000 par (prompt, idealna_odpowiedz);
   - eksportujesz najlepsze projekty wygenerowane na wybitnastrona.pl;
   - dodajesz oznaczone jako "wybitne" (uzytkownicy klikaja kciuk w gore);
   - wzbogacasz danymi z GitHub (filtrujac tylko strony WWW + dobre licencje).
3. **Fine-tuning** technika **LoRA / QLoRA** (nie pelny re-training):
   - na chmurze GPU (RunPod, Lambda Labs, vast.ai);
   - dla 7B-14B: 1x A100 (80GB) wystarczy, ~12-48h treningu, koszt ~500-2.000 PLN;
   - biblioteki: Hugging Face `transformers`, `peft`, `trl`, `axolotl`.
4. **Hosting** (inference):
   - **Najtanszej**: Hugging Face Inference Endpoints albo Replicate (placisz za sekunde
     uzycia, ale czasem cold start);
   - **Dla skali**: wlasny serwer z GPU + `vLLM` lub `TGI` (Text Generation Inference).
5. **Integracja z aplikacja:**
   ```env
   WYBIT_MODEL_API=https://twoj-endpoint.huggingface.cloud/...
   WYBIT_MODEL_KEY=hf_...
   ```
   W kodzie API - wywolujesz endpoint w stylu OpenAI-compatible (vLLM, TGI i HF
   maja takie tryby).

### Sciezka 3: Pretrenowanie wlasnego LLM od zera - **NIE WARTO dla startupu**

**Koszt:** 1-50 mln USD.
**Czas:** 6-24 miesiecy.
**Sens:** zerowy do momentu kiedy bedziesz mial 100k+ aktywnych uzytkownikow
i potrzeby modelu o specyfice ktorej zadne istniejace nie pokrywaja.
**Pomin.**

## Krok po kroku - co byc zrobil teraz

1. **W aplikacji**: zostaw "Wybit" jako wybor w UI (juz dodane), routuj go
   na Sciezke 1 (Anthropic + RAG + inny system prompt). Patrz
   `lib/ai-models.ts` i `app/api/generate/route.ts`.
2. **Zbieraj sygnaly jakosci**: kciuk-w-gore/dol pod kazda odpowiedzia, zapisuj
   w Supabase. To Twoj future dataset.
3. **Po 2-3 miesiacach** pracy aplikacji + 1.000+ projektow -> zacznij Sciezke 2:
   pierwszy fine-tuning Qwen 2.5 Coder 14B na zebranych danych.
4. **Gdy masz juz model**, podmieniasz routing - zostawiajac Anthropic jako
   fallback (gdy Wybit zwroci blad lub timeout).

## Pomocne linki

- [Hugging Face - LLM fine-tuning courses](https://huggingface.co/learn)
- [Axolotl (best LoRA tooling)](https://github.com/axolotl-ai-cloud/axolotl)
- [vLLM (najszybszy inference)](https://github.com/vllm-project/vllm)
- [Qwen 2.5 Coder](https://huggingface.co/Qwen/Qwen2.5-Coder-32B-Instruct)
- [Anthropic API docs (silnik fallback)](https://docs.anthropic.com/)
