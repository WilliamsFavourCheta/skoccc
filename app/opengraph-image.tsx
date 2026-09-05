import { ImageResponse } from "next/og";

export const alt = "SKOCCC - Asset Composition Engine";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "stretch",
          background: "#080A0C",
          color: "#F1F1EA",
          display: "flex",
          flexDirection: "column",
          fontFamily: "sans-serif",
          height: "100%",
          justifyContent: "space-between",
          padding: "58px 68px",
          position: "relative",
          width: "100%",
        }}
      >
        <div
          style={{
            border: "1px solid #20252C",
            bottom: "58px",
            display: "flex",
            left: "68px",
            opacity: 0.9,
            position: "absolute",
            right: "68px",
            top: "58px",
          }}
        />
        <div
          style={{
            background: "#397BFF",
            height: "5px",
            left: 0,
            position: "absolute",
            right: 0,
            top: 0,
          }}
        />
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div style={{ display: "flex", fontSize: 36, fontWeight: 800 }}>
            SKO<span style={{ color: "#397BFF" }}>CCC</span>
          </div>
          <div
            style={{
              color: "#7B828C",
              display: "flex",
              fontFamily: "monospace",
              fontSize: 16,
              letterSpacing: "2px",
            }}
          >
            ROBINHOOD CHAIN / ON-CHAIN
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              color: "#397BFF",
              display: "flex",
              fontFamily: "monospace",
              fontSize: 20,
              letterSpacing: "3px",
              marginBottom: "20px",
            }}
          >
            ASSET COMPOSITION ENGINE
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 92,
              fontWeight: 900,
              letterSpacing: "-5px",
              lineHeight: 0.88,
            }}
          >
            BUILD THE BASKET.
          </div>
          <div
            style={{
              color: "#397BFF",
              display: "flex",
              fontSize: 92,
              fontWeight: 900,
              letterSpacing: "-5px",
              lineHeight: 0.88,
              marginTop: "8px",
            }}
          >
            OWN THE THESIS.
          </div>
        </div>
        <div
          style={{
            borderTop: "1px solid #20252C",
            color: "#7B828C",
            display: "flex",
            fontFamily: "monospace",
            fontSize: 17,
            justifyContent: "space-between",
            letterSpacing: "2px",
            paddingTop: "22px",
          }}
        >
          <span>CREATE / MINT / TRANSFER / REDEEM</span>
          <span>SKOCCC</span>
        </div>
      </div>
    ),
    size,
  );
}
