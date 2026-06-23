"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" data-theme="dark">
      <body
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          backgroundColor: "#0a0a0a",
          color: "#e0e0e0",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: "28rem", padding: "1rem" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>
            Something went wrong
          </h1>
          <p style={{ marginTop: "0.5rem", color: "#999" }}>
            An unexpected error occurred. Try reloading the page.
          </p>
          <button
            onClick={() => reset()}
            style={{
              marginTop: "1.5rem",
              padding: "0.5rem 1.5rem",
              backgroundColor: "#fff",
              color: "#000",
              border: "none",
              borderRadius: "0.375rem",
              cursor: "pointer",
              fontWeight: 500,
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
