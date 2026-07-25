/**
 * Minimal ANSI SGR parser for the run transcript.
 *
 * Test runners (vitest / jest / mocha) and the ExpressoTS boot banner emit
 * ANSI escape sequences for colour. The raw stream contains bytes like
 * `\x1b[32m…\x1b[0m`; rendered verbatim they show up as `[32m` garbage.
 *
 * This parser:
 *   - turns SGR colour codes (`\x1b[…m`) into styled spans, and
 *   - strips every other escape (cursor moves, line erases such as
 *     `\x1b[2K`, `\x1b[1G`) so spinner / refresh frames don't leave noise.
 *
 * Only the subset of SGR we actually see in test output is supported: the
 * 16-colour foreground / background palette, bold, dim, and reset.
 */

export interface AnsiSegment {
  text: string;
  /** Inline style derived from the active SGR attributes. */
  style: AnsiStyle;
}

export interface AnsiStyle {
  color?: string;
  background?: string;
  fontWeight?: 'bold';
  opacity?: number;
}

// xterm-ish palette tuned to read well on a near-black panel.
const FG: Record<number, string> = {
  30: '#5b6270', // black (lifted so it stays legible)
  31: '#f87171', // red
  32: '#4ade80', // green
  33: '#fbbf24', // yellow
  34: '#60a5fa', // blue
  35: '#c084fc', // magenta
  36: '#22d3ee', // cyan
  37: '#d4d4d8', // white
  90: '#71717a', // bright black / gray
  91: '#fca5a5',
  92: '#86efac',
  93: '#fde047',
  94: '#93c5fd',
  95: '#d8b4fe',
  96: '#67e8f9',
  97: '#fafafa',
};

const BG: Record<number, string> = {
  40: '#18181b',
  41: '#7f1d1d',
  42: '#14532d',
  43: '#713f12',
  44: '#1e3a8a',
  45: '#581c87',
  46: '#155e75',
  47: '#3f3f46',
  100: '#3f3f46',
  101: '#991b1b',
  102: '#166534',
  103: '#854d0e',
  104: '#1d4ed8',
  105: '#6b21a8',
  106: '#0e7490',
  107: '#52525b',
};

interface State {
  color?: string;
  background?: string;
  bold: boolean;
  dim: boolean;
}

function emptyState(): State {
  return { color: undefined, background: undefined, bold: false, dim: false };
}

function applyCodes(state: State, codes: number[]): void {
  // An empty parameter list (`\x1b[m`) is treated as a reset.
  const list = codes.length === 0 ? [0] : codes;
  for (const code of list) {
    if (code === 0) {
      state.color = undefined;
      state.background = undefined;
      state.bold = false;
      state.dim = false;
    } else if (code === 1) {
      state.bold = true;
    } else if (code === 2) {
      state.dim = true;
    } else if (code === 22) {
      state.bold = false;
      state.dim = false;
    } else if (code === 39) {
      state.color = undefined;
    } else if (code === 49) {
      state.background = undefined;
    } else if (FG[code]) {
      state.color = FG[code];
    } else if (BG[code]) {
      state.background = BG[code];
    }
    // Unsupported codes (e.g. 256-colour / truecolour sequences) are ignored
    // rather than mangled.
  }
}

function styleOf(state: State): AnsiStyle {
  const style: AnsiStyle = {};
  if (state.color) style.color = state.color;
  if (state.background) style.background = state.background;
  if (state.bold) style.fontWeight = 'bold';
  if (state.dim) style.opacity = 0.6;
  return style;
}

// Matches any CSI sequence: ESC [ ... <final-byte>. We split into colour (`m`)
// vs. everything-else (stripped) at the call site. The control character is
// intentional: this module exists to parse raw ANSI escape bytes.
// eslint-disable-next-line no-control-regex
const CSI = /\x1b\[[0-9;?]*[ -/]*[@-~]/g;
// Other escapes (OSC, single-char escapes) we just drop.
// eslint-disable-next-line no-control-regex
const OTHER_ESC = /\x1b[\]P^_].*?(?:\x07|\x1b\\)|\x1b[@-Z\\-_]/g;

/** Remove every ANSI escape (colour + control) to recover plain text. */
export function stripAnsi(input: string): string {
  return input.replace(OTHER_ESC, '').replace(CSI, '');
}

/**
 * Parse a single line of (possibly ANSI-coloured) text into styled segments.
 * State does not persist across lines; each transcript line is self-contained
 * in practice, and resetting avoids one stray code bleeding into the rest of
 * the panel.
 */
export function parseAnsiLine(input: string): AnsiSegment[] {
  const cleaned = input.replace(OTHER_ESC, '');
  const segments: AnsiSegment[] = [];
  const state = emptyState();

  let lastIndex = 0;
  let match: RegExpExecArray | null;
  CSI.lastIndex = 0;

  const push = (text: string) => {
    if (!text) return;
    segments.push({ text, style: styleOf(state) });
  };

  while ((match = CSI.exec(cleaned)) !== null) {
    push(cleaned.slice(lastIndex, match.index));
    lastIndex = match.index + match[0].length;

    const seq = match[0];
    if (seq.endsWith('m')) {
      const body = seq.slice(2, -1); // strip "\x1b[" and trailing "m"
      const codes = body
        .split(';')
        .filter((p) => p !== '')
        .map((p) => Number.parseInt(p, 10))
        .filter((n) => !Number.isNaN(n));
      applyCodes(state, codes);
    }
    // Non-colour CSI (cursor moves, erases) are simply skipped.
  }

  push(cleaned.slice(lastIndex));

  if (segments.length === 0) segments.push({ text: '', style: {} });
  return segments;
}
