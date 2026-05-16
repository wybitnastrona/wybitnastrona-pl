import { ImageResponse } from "next/og";

export const alt = "wybitnastrona.pl - AI builder stron internetowych";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 30%, rgba(232,220,196,0.15), #0a0a0a)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "#e8dcc4",
          fontFamily: "sans-serif",
          padding: "80px",
        }}
      >
        <div
          style={{
            fontSize: 96,
            fontWeight: 600,
            letterSpacing: "-0.04em",
            display: "flex",
          }}
        >
          wybitnastrona<span style={{ opacity: 0.5 }}>.pl</span>
        </div>
        <div
          style={{
            fontSize: 36,
            color: "rgba(232,220,196,0.7)",
            marginTop: 24,
            textAlign: "center",
            maxWidth: 800,
          }}
        >
          Buduj wybitne strony internetowe - AI tworzy kod za Ciebie
        </div>
        <div
          style={{
            marginTop: 60,
            display: "flex",
            gap: 24,
            fontSize: 22,
            color: "rgba(232,220,196,0.5)",
          }}
        >
          <span>Po polsku</span>
          <span>•</span>
          <span>BLIK & karta</span>
          <span>•</span>
          <span>Hosting w cenie</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
