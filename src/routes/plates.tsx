import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback } from "react";

export const Route = createFileRoute("/plates")({
  head: () => ({
    meta: [
      { title: "NZ Number Plate Sticker Maker | Looters Computas" },
      {
        name: "description",
        content:
          "Generate and print realistic New Zealand number plate stickers at correct 360×124 mm dimensions.",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: "https://fonts.cdnfonts.com/css/licenz",
      },
    ],
  }),
  component: PlatesPage,
});

function PlatesPage() {
  const [value, setValue] = useState("");

  const clean = value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  const display = clean || "ABC123";

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleClear = useCallback(() => {
    setValue("");
  }, []);

  return (
    <>
      <style>{`
        @page {
          size: A4 landscape;
          margin: 0;
        }

        .plates-page {
          margin: 0;
          min-height: 100vh;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
          background: #0f172a;
          color: #e2e8f0;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .plates-header {
          width: 100%;
          padding: 1.25rem 1.5rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: rgba(15, 23, 42, 0.9);
          border-bottom: 1px solid #1e293b;
          position: sticky;
          top: 0;
          z-index: 20;
          backdrop-filter: blur(8px);
        }

        .plates-header a {
          color: #94a3b8;
          text-decoration: none;
          font-size: 0.9rem;
          font-weight: 500;
        }

        .plates-header a:hover {
          color: #e2e8f0;
        }

        .plates-logo {
          font-weight: 700;
          font-size: 1.1rem;
          color: #f8fafc;
          letter-spacing: -0.02em;
        }

        .plates-main {
          flex: 1;
          width: 100%;
          max-width: 920px;
          padding: 2rem 1.25rem 4rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1.75rem;
        }

        .plates-main h1 {
          margin: 0;
          font-size: 1.85rem;
          font-weight: 700;
          letter-spacing: -0.03em;
          text-align: center;
          color: #f8fafc;
        }

        .plates-subtitle {
          margin: -0.75rem 0 0;
          color: #94a3b8;
          font-size: 1rem;
          text-align: center;
        }

        .plates-controls {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
          justify-content: center;
          align-items: center;
          width: 100%;
        }

        .plates-controls input[type="text"] {
          font-size: 1.35rem;
          padding: 0.85rem 1.25rem;
          width: min(320px, 100%);
          text-align: center;
          text-transform: uppercase;
          letter-spacing: 0.2em;
          font-weight: 700;
          border: 2px solid #334155;
          border-radius: 10px;
          background: #1e293b;
          color: #f8fafc;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }

        .plates-controls input[type="text"]:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.25);
        }

        .plates-controls input[type="text"]::placeholder {
          text-transform: none;
          letter-spacing: normal;
          color: #64748b;
          font-weight: 500;
        }

        .plates-controls button {
          padding: 0.85rem 1.5rem;
          font-size: 1.05rem;
          font-weight: 600;
          background: #2563eb;
          color: white;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          transition: background 0.15s, transform 0.1s;
        }

        .plates-controls button:hover {
          background: #1d4ed8;
        }

        .plates-controls button:active {
          transform: scale(0.98);
        }

        .plates-controls .secondary {
          background: #334155;
        }

        .plates-controls .secondary:hover {
          background: #475569;
        }

        .plate-container {
          margin: 0.5rem 0 1rem;
          width: 100%;
          display: flex;
          justify-content: center;
          overflow-x: auto;
          padding: 0.5rem;
        }

        /* Physical plate: 360mm × 124mm (standard NZ size) */
        .nz-plate {
          width: 360mm;
          height: 124mm;
          background: #ffffff;
          border: 2.5px solid #111;
          border-radius: 4px;
          box-shadow:
            0 8px 24px rgba(0, 0, 0, 0.45),
            inset 0 0 0 1px rgba(0, 0, 0, 0.08);
          position: relative;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #000;
          flex-shrink: 0;
        }

        .nz-plate-content {
          font-size: 78mm;
          line-height: 0.8;
          text-align: center;
          width: 100%;
          padding: 0 10mm;
          font-family: "Licenz", "Arial Black", "Impact", "Helvetica Black", sans-serif;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 1mm;
          color: #000;
          user-select: none;
        }

        .nz-badge {
          position: absolute;
          bottom: 5mm;
          right: 9mm;
          font-size: 16mm;
          font-weight: 800;
          letter-spacing: 0.5px;
          color: #000;
          font-family: Arial, Helvetica, sans-serif;
          opacity: 0.92;
        }

        .plates-hint {
          max-width: 560px;
          text-align: center;
          color: #94a3b8;
          font-size: 0.95rem;
          line-height: 1.55;
        }

        .plates-hint strong {
          color: #cbd5e1;
        }

        .plates-hint a {
          color: #60a5fa;
        }

        .plates-footer {
          width: 100%;
          padding: 1.25rem;
          text-align: center;
          color: #64748b;
          font-size: 0.85rem;
          border-top: 1px solid #1e293b;
        }

        /* Print: only the plate */
        @media print {
          body * {
            visibility: hidden !important;
          }
          .plate-container,
          .plate-container * {
            visibility: visible !important;
          }
          .plate-container {
            position: absolute !important;
            left: 0 !important;
            top: 12mm !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            display: flex !important;
            justify-content: center !important;
          }
          .nz-plate {
            box-shadow: none !important;
            border: 1.5px solid #000 !important;
            border-radius: 0 !important;
          }
          html, body {
            background: white !important;
          }
        }

        @media (max-width: 900px) {
          .nz-plate {
            transform: scale(0.55);
            transform-origin: top center;
            margin-bottom: -55mm;
          }
        }

        @media (max-width: 520px) {
          .nz-plate {
            transform: scale(0.38);
            margin-bottom: -75mm;
          }
          .plates-main h1 {
            font-size: 1.45rem;
          }
        }
      `}</style>

      <div className="plates-page">
        <header className="plates-header">
          <a href="/" className="plates-logo">
            LootersComputas
          </a>
          <a href="/">← Back to site</a>
        </header>

        <main className="plates-main">
          <h1>NZ Number Plate Sticker Maker</h1>
          <p className="plates-subtitle">
            Type a plate → print at real 360 × 124 mm size
          </p>

          <div className="plates-controls">
            <input
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handlePrint();
              }}
              placeholder="e.g. ABC123"
              maxLength={7}
              autoFocus
              autoComplete="off"
              spellCheck={false}
            />
            <button type="button" onClick={handlePrint}>
              Print Sticker
            </button>
            <button type="button" className="secondary" onClick={handleClear}>
              Clear
            </button>
          </div>

          <div className="plate-container">
            <div className="nz-plate">
              <div className="nz-plate-content">{display}</div>
              <div className="nz-badge">NZ</div>
            </div>
          </div>

          <p className="plates-hint">
            <strong>Print tip:</strong> Use Ctrl/Cmd + P → set scale to{" "}
            <strong>100%</strong> (no “fit to page”) → landscape A4 or Letter →
            best on white sticker / photo paper.
            <br />
            <br />
            For the closest font match, install the free personal-use font{" "}
            <a
              href="https://www.sparkytype.com/licenz.php"
              target="_blank"
              rel="noopener noreferrer"
            >
              Licenz
            </a>
            .
            <br />
            <br />
            This tool is for novelty, mock-ups and fun stickers only — not for
            road-legal plates.
          </p>
        </main>

        <footer className="plates-footer">
          LootersComputas · Not affiliated with NZTA or any official plate issuer
        </footer>
      </div>
    </>
  );
}
