import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "wybitnastrona.pl - AI Website Builder";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#0a0a0a",
          padding: "80px",
          position: "relative",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(232,220,196,0.18), transparent)",
          }}
        />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            color: "#e8dcc4",
            fontSize: 28,
            letterSpacing: -0.5,
          }}
        >
          <span style={{ fontWeight: 500 }}>wybitnastrona</span>
          <span style={{ opacity: 0.6 }}>.pl</span>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            flex: 1,
            gap: 24,
          }}
        >
          <h1
            style={{
              color: "#fafafa",
              fontSize: 96,
              lineHeight: 1.05,
              letterSpacing: -3,
              margin: 0,
              fontWeight: 500,
              maxWidth: 1000,
            }}
          >
            Co dzisiaj zbudujemy?
          </h1>
          <p
            style={{
              color: "#a1a1aa",
              fontSize: 32,
              margin: 0,
              maxWidth: 900,
            }}
          >
            AI Website Builder. Opisz pomysl, AI wygeneruje wybitna strone w
            kilka sekund.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            color: "#a1a1aa",
            fontSize: 22,
          }}
        >
          <span>Sandboxed by Sandpack</span>
          <span>Powered by Anthropic Claude</span>
        </div>
      </div>
    ),
    size,
  );
}
