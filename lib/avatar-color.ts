/**
 * Deterministyczna kolorystyka awatarow.
 *
 * Bierze email, hashuje algorytmem djb2 i mapuje wynik na hue (0..359) w HSL.
 * Saturation i lightness sa stale (60% / 55%) zeby kolory mialy spojny ton z
 * design system-em (ciemny background, beige akcent).
 *
 * To samo email zawsze daje ten sam kolor — uzytkownik widzi swoj awatar
 * stale, niezaleznie od urzadzenia / sesji.
 *
 * Uzycie:
 *   <span style={{ backgroundColor: emailToColor(email) }}>{initial}</span>
 */

function djb2Hash(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function emailToColor(email: string | null | undefined): string {
  const key = (email ?? "").trim().toLowerCase() || "anon";
  const hue = djb2Hash(key) % 360;
  return `hsl(${hue}, 60%, 55%)`;
}

/**
 * Czytelne literki kontrastujace z `emailToColor` — uzywamy ciemnego foregrounda
 * na jasnym tle (lightness 55% jest blisko progresji srodkowej), wiec biel
 * lub bardzo ciemny tekst dziala dobrze. Wybieramy biel dla wszystkich.
 */
export const AVATAR_FOREGROUND = "#ffffff";

/** Pierwsza litera maila wielka liter, fallback "U". */
export function emailToInitial(email: string | null | undefined): string {
  const e = (email ?? "").trim();
  return e[0]?.toUpperCase() ?? "U";
}
