/**
 * Badge "Stwórzone na wybitnastrona.pl" - pokazywany na publikowanych
 * stronach użytkownikow z FREE planem. Znika dla PRO.
 *
 * Server component (zero JS na publikowanej stronie), zawsze pokazany w
 * prawym dolnym rogu. Klikniecie otwiera homepage w nowej karcie.
 */
export function MadeWithBadge() {
  return (
    <a
      href="https://wybitnastrona.pl"
      target="_blank"
      rel="noopener noreferrer"
      style={{
        position: "fixed",
        bottom: 12,
        right: 12,
        zIndex: 9999,
        background: "#111",
        color: "#e8dcc4",
        borderRadius: 9999,
        padding: "6px 12px",
        fontSize: 11,
        fontWeight: 500,
        textDecoration: "none",
        boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
        fontFamily:
          'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
      }}
    >
      Stworzone na wybitnastrona.pl
    </a>
  );
}
