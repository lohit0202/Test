import { Chess } from "chess.js";
import { getOpenAIMove } from "./providers/openai";
import { getGeminiMove } from "./providers/gemini";

export type GameStatus = "running" | "checkmate" | "stalemate" | "draw" | "resigned";
export type GameSide = "w" | "b";

export type GameMove = {
  san: string;
  uci: string;
};

export type GameState = {
  fen: string;
  moves: GameMove[];
  status: GameStatus;
  toMove: GameSide;
  winner: GameSide | null;
  lastError: string | null;
};

const chess = new Chess();

let gameState: GameState = createState();

function createState(): GameState {
  return {
    fen: chess.fen(),
    moves: [],
    status: "running",
    toMove: chess.turn(),
    winner: null,
    lastError: null,
  };
}

export function newGame(): GameState {
  chess.reset();
  gameState = createState();
  return gameState;
}

export function getState(): GameState {
  return { ...gameState, moves: [...gameState.moves] };
}

const uciRegex = /^[a-h][1-8][a-h][1-8][qrbn]?$/;

function buildPrompt(fen: string, side: GameSide, isRetry: boolean, lastMove: string | null) {
  const retryLine = isRetry
    ? `That move was illegal in this position: ${lastMove ?? "(unparseable)"}. Provide a different legal UCI move only.`
    : "";
  return [
    `You are playing chess as ${side === "w" ? "White" : "Black"}.`,
    `Current FEN: ${fen}`,
    "Return one legal UCI move only, matching regex /^[a-h][1-8][a-h][1-8][qrbn]?$/, no other text.",
    retryLine,
  ]
    .filter(Boolean)
    .join("\n");
}

async function requestProviderMove(side: GameSide, prompt: string): Promise<string> {
  if (side === "w") {
    return getOpenAIMove(prompt);
  }
  return getGeminiMove(prompt);
}

function updateStatus(lastMover: GameSide) {
  if (chess.isCheckmate()) {
    gameState.status = "checkmate";
    gameState.winner = lastMover;
    return;
  }
  if (chess.isStalemate()) {
    gameState.status = "stalemate";
    gameState.winner = null;
    return;
  }
  if (chess.isDraw()) {
    gameState.status = "draw";
    gameState.winner = null;
    return;
  }
  gameState.status = "running";
  gameState.winner = null;
}

export async function step(): Promise<GameState> {
  if (gameState.status !== "running") {
    return getState();
  }

  const side = gameState.toMove;
  const fen = chess.fen();
  let lastError: string | null = null;
  let prompt = buildPrompt(fen, side, false, null);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const raw = await requestProviderMove(side, prompt);
    const trimmed = raw.trim();

    if (!uciRegex.test(trimmed)) {
      lastError = `Provider returned invalid move: ${trimmed || "(empty)"}`;
      prompt = buildPrompt(fen, side, true, trimmed || null);
      continue;
    }

    const from = trimmed.slice(0, 2);
    const to = trimmed.slice(2, 4);
    const promotion = trimmed.length === 5 ? (trimmed[4] as "q" | "r" | "b" | "n") : undefined;
    const move = chess.move({
      from,
      to,
      promotion,
    });
    if (!move) {
      lastError = `Illegal move: ${trimmed}`;
      prompt = buildPrompt(fen, side, true, trimmed);
      continue;
    }

    const uci = `${move.from}${move.to}${move.promotion ?? ""}`;
    gameState.moves = [...gameState.moves, { san: move.san, uci }];
    gameState.fen = chess.fen();
    gameState.toMove = chess.turn();
    gameState.lastError = null;
    updateStatus(side);
    return getState();
  }

  gameState.lastError = lastError ?? "Failed to get a legal move.";
  gameState.status = "resigned";
  gameState.winner = side === "w" ? "b" : "w";
  return getState();
}
