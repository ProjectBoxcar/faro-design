"use client";

import { useParams } from "next/navigation";
import { useEffect } from "react";

type RecoveryProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

const paper = "#F5F1E8";
const ink = "#111111";

export default function ProjectError({ error, reset }: RecoveryProps) {
  const params = useParams();
  const rawId = params.id;
  const id = typeof rawId === "string" && rawId.length > 0 ? rawId : null;

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: paper,
        color: ink,
        display: "grid",
        placeItems: "center",
        padding: "2rem 1.25rem",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}
    >
      <div style={{ maxWidth: "26rem" }}>
        <h1
          style={{
            margin: "0 0 0.6rem",
            fontSize: "1.6rem",
            fontWeight: 500,
            letterSpacing: "-0.02em",
            lineHeight: 1.15,
          }}
        >
          Something went wrong
        </h1>
        <p style={{ margin: "0 0 1.25rem", lineHeight: 1.45 }}>
          This page could not be shown. Try again, or return home.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.85rem", alignItems: "center" }}>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              background: ink,
              color: paper,
              border: `1px solid ${ink}`,
              borderRadius: "6px",
              padding: "0.5rem 0.95rem",
              font: "inherit",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
          {id ? (
            <a href={`/projects/${id}`} style={{ color: ink }}>
              Back to project
            </a>
          ) : null}
          <a href="/" style={{ color: ink }}>
            Home
          </a>
        </div>
      </div>
    </main>
  );
}
