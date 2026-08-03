"use client";

/* Last-resort boundary: catches failures in the root layout itself, where the
   app shell (and its fonts and tokens) may not have rendered. It must therefore
   ship its own <html>/<body> and lean on nothing. Deliberately plain. */

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#F4F6F5",
          color: "#17201C",
          fontFamily: "system-ui, sans-serif",
          padding: "2rem",
        }}
      >
        <div style={{ maxWidth: "34rem" }}>
          <h1 style={{ fontSize: "1.375rem", margin: "0 0 0.75rem" }}>
            Relay failed to start
          </h1>
          <p style={{ fontSize: "0.875rem", color: "#5A665F", margin: "0 0 1rem" }}>
            The error happened before the app could render, so this page is
            deliberately bare. Reload to retry; if it persists, the message below
            is what a developer needs.
          </p>
          <pre
            style={{
              background: "#FFFFFF",
              border: "1px solid #E3E7E4",
              borderRadius: 10,
              padding: "0.75rem",
              fontSize: "0.75rem",
              color: "#5A665F",
              whiteSpace: "pre-wrap",
              overflowX: "auto",
            }}
          >
            {error.message}
            {error.digest ? `\n\nref: ${error.digest}` : ""}
          </pre>
          <button
            onClick={reset}
            style={{
              marginTop: "1rem",
              background: "#146B54",
              color: "#FFFFFF",
              border: "none",
              borderRadius: 8,
              padding: "0.5rem 1rem",
              fontSize: "0.875rem",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
