"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import styles from "./page.module.css";

type GameMove = {
  san: string;
  uci: string;
};

type GameState = {
  fen: string;
  moves: GameMove[];
  status: "running" | "checkmate" | "stalemate" | "draw" | "resigned";
  toMove: "w" | "b";
  winner: "w" | "b" | null;
  lastError: string | null;
};

const emptyState: GameState = {
  fen: "",
  moves: [],
  status: "running",
  toMove: "w",
  winner: null,
  lastError: null,
};

const pieceMap: Record<string, string> = {
  p: "♟",
  r: "♜",
  n: "♞",
  b: "♝",
  q: "♛",
  k: "♚",
  P: "♙",
  R: "♖",
  N: "♘",
  B: "♗",
  Q: "♕",
  K: "♔",
};

function parseBoard(fen: string): string[][] {
  if (!fen) {
    return Array.from({ length: 8 }, () => Array.from({ length: 8 }, () => ""));
  }
  const board = fen.split(" ")[0];
  const rows = board.split("/");
  return rows.map((row) => {
    const squares: string[] = [];
    for (const char of row) {
      const emptyCount = Number(char);
      if (Number.isNaN(emptyCount)) {
        squares.push(char);
      } else {
        for (let i = 0; i < emptyCount; i += 1) {
          squares.push("");
        }
      }
    }
    return squares;
  });
}

export default function Home() {
  const [state, setState] = useState<GameState>(emptyState);
  const [loading, setLoading] = useState(false);
  const [autoRun, setAutoRun] = useState(false);

  const fetchState = useCallback(async () => {
    const response = await fetch("/api/state");
    const data = (await response.json()) as GameState;
    setState(data);
  }, []);

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  const handleNewGame = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/new", { method: "POST" });
      const data = (await response.json()) as GameState & { error?: string };
      if (!response.ok) {
        setState((prev) => ({ ...prev, lastError: data.error ?? "Failed to start new game." }));
        return;
      }
      setState(data);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleStep = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/step", { method: "POST" });
      const data = (await response.json()) as GameState & { error?: string };
      if (!response.ok) {
        setState((prev) => ({ ...prev, lastError: data.error ?? "Failed to step game." }));
        return;
      }
      setState(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!autoRun || loading) {
      return;
    }

    const interval = setInterval(() => {
      handleStep();
    }, 12_000);

    return () => clearInterval(interval);
  }, [autoRun, handleStep, loading]);

  const moveRows = useMemo(() => {
    const rows: Array<{ index: number; white?: GameMove; black?: GameMove }> = [];
    for (let i = 0; i < state.moves.length; i += 2) {
      rows.push({
        index: i / 2 + 1,
        white: state.moves[i],
        black: state.moves[i + 1],
      });
    }
    return rows;
  }, [state.moves]);

  const board = useMemo(() => parseBoard(state.fen), [state.fen]);

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <header className={styles.header}>
          <h1>Autonomous Chess Match</h1>
          <p>OpenAI (White) vs Gemini (Black)</p>
        </header>

        <section className={styles.section}>
          <div className={styles.topRow}>
            <div className={styles.controls}>
              <button type="button" onClick={handleNewGame} disabled={loading}>
                New Game
              </button>
              <button type="button" onClick={handleStep} disabled={loading}>
                Step
              </button>
              <label className={styles.toggle}>
                <input
                  type="checkbox"
                  checked={autoRun}
                  onChange={(event) => setAutoRun(event.target.checked)}
                  disabled={loading}
                />
                Auto-Run
              </label>
            </div>

            <div className={styles.status}>
              <div>
                <strong>FEN:</strong> {state.fen || "(loading)"}
              </div>
              <div>
                <strong>To move:</strong> {state.toMove === "w" ? "White" : "Black"}
              </div>
              <div>
                <strong>Status:</strong> {state.status}
              </div>
              <div>
                <strong>Winner:</strong> {state.winner ? (state.winner === "w" ? "White" : "Black") : "None"}
              </div>
              <div>
                <strong>Last error:</strong> {state.lastError || "None"}
              </div>
            </div>
          </div>

          <div className={styles.boardWrapper}>
            <div className={styles.board}>
              {board.map((row, rowIndex) =>
                row.map((square, colIndex) => {
                  const isDark = (rowIndex + colIndex) % 2 === 1;
                  return (
                    <div
                      key={`${rowIndex}-${colIndex}`}
                      className={`${styles.square} ${isDark ? styles.dark : styles.light}`}
                    >
                      <span className={styles.piece}>{square ? pieceMap[square] : ""}</span>
                    </div>
                  );
                }),
              )}
            </div>
            <div className={styles.boardLabel}>Board view (White at bottom)</div>
          </div>
        </section>

        <section className={styles.section}>
          <h2>Moves</h2>
          <table className={styles.movesTable}>
            <thead>
              <tr>
                <th>#</th>
                <th>White (UCI / SAN)</th>
                <th>Black (UCI / SAN)</th>
              </tr>
            </thead>
            <tbody>
              {moveRows.length === 0 ? (
                <tr>
                  <td colSpan={3} className={styles.emptyRow}>
                    No moves yet.
                  </td>
                </tr>
              ) : (
                moveRows.map((row) => (
                  <tr key={row.index}>
                    <td>{row.index}</td>
                    <td>
                      {row.white ? `${row.white.uci} / ${row.white.san}` : "-"}
                    </td>
                    <td>
                      {row.black ? `${row.black.uci} / ${row.black.san}` : "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
      </main>
    </div>
  );
}
