import { ImageResponse } from "next/og";
import { BRAND_COLOR, DESCRIPTION, SITE_NAME, TAGLINE } from "@/lib/site";

// The preview shown when the link is shared (also used for Twitter/X cards).
export const alt = `${SITE_NAME}: ${TAGLINE}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

function PlaneMark() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 96,
        height: 96,
        borderRadius: 22,
        background: "#fff",
      }}
    >
      <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke={BRAND_COLOR} strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z" />
        <path d="m21.854 2.147-10.94 10.939" />
      </svg>
    </div>
  );
}

export default function OpengraphImage() {
  const steps = ["Import recruiters", "Tailor per role", "Track every application"];
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "100%",
          height: "100%",
          padding: 80,
          color: "#fff",
          background: `linear-gradient(135deg, ${BRAND_COLOR} 0%, #312e81 100%)`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <PlaneMark />
          <div style={{ fontSize: 64, fontWeight: 700, letterSpacing: -1 }}>{SITE_NAME}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 60, fontWeight: 700, lineHeight: 1.1, letterSpacing: -1 }}>{TAGLINE}</div>
          <div style={{ fontSize: 30, lineHeight: 1.4, color: "#e0e7ff", maxWidth: 980 }}>{DESCRIPTION}</div>
        </div>
        <div style={{ display: "flex", gap: 16 }}>
          {steps.map((step) => (
            <div
              key={step}
              style={{
                display: "flex",
                padding: "12px 24px",
                borderRadius: 999,
                fontSize: 26,
                background: "rgba(255,255,255,0.14)",
                border: "1px solid rgba(255,255,255,0.3)",
              }}
            >
              {step}
            </div>
          ))}
        </div>
      </div>
    ),
    size
  );
}
