import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const name = searchParams.get("name") ?? "Restaurant";
  const parallax = searchParams.get("parallax") ?? "4.0";
  const google = searchParams.get("google") ?? "4.0";
  const delta = (parseFloat(parallax) - parseFloat(google)).toFixed(1);
  const deltaNum = parseFloat(delta);
  const deltaSign = deltaNum > 0 ? "+" : "";
  const deltaColor = Math.abs(deltaNum) < 0.3 ? "#a1a1aa" : deltaNum > 0 ? "#34d399" : "#f87171";

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#09090b",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "40px 60px",
          }}
        >
          <div
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: "#d97706",
              marginBottom: 8,
              letterSpacing: "-0.02em",
            }}
          >
            PARALLAX
          </div>
          <div
            style={{
              fontSize: 20,
              color: "#a1a1aa",
              marginBottom: 40,
            }}
          >
            Same reviews, your viewpoint
          </div>

          <div
            style={{
              fontSize: 32,
              fontWeight: 600,
              color: "#f4f4f5",
              marginBottom: 32,
              textAlign: "center",
              maxWidth: 600,
            }}
          >
            {name}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 40,
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <div style={{ fontSize: 14, color: "#71717a", marginBottom: 4 }}>
                GOOGLE
              </div>
              <div style={{ fontSize: 48, fontWeight: 700, color: "#a1a1aa" }}>
                {parseFloat(google).toFixed(1)}
              </div>
            </div>

            <div
              style={{
                fontSize: 28,
                fontWeight: 700,
                color: deltaColor,
              }}
            >
              {deltaSign}{delta}
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <div style={{ fontSize: 14, color: "#d97706", marginBottom: 4 }}>
                PARALLAX
              </div>
              <div style={{ fontSize: 48, fontWeight: 700, color: "#f4f4f5" }}>
                {parseFloat(parallax).toFixed(1)}
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 800,
      height: 418,
    }
  );
}
