/**
 * Parses a math answer: whole number, decimal ("0,5" or "0.5"), fraction ("3/4")
 * or mixed number ("1 1/2"). Returns null when the text is not a number.
 */
export function parseNumber(text: string): number | null {
  const s = text.trim().replace(/\s+/g, ' ').replace(',', '.');
  let m = s.match(/^(-?\d+(?:\.\d+)?)$/);
  if (m) return Number(m[1]);
  m = s.match(/^(-?\d+) ?\/ ?(\d+)$/);
  if (m) return Number(m[2]) === 0 ? null : Number(m[1]) / Number(m[2]);
  m = s.match(/^(-?)(\d+) (\d+) ?\/ ?(\d+)$/);
  if (m) {
    if (Number(m[4]) === 0) return null;
    const value = Number(m[2]) + Number(m[3]) / Number(m[4]);
    return m[1] ? -value : value;
  }
  return null;
}

export function isMathAnswer(answer: string): boolean {
  return parseNumber(answer) !== null;
}

/** Whole numbers get the digits-only keyboard. Fractions need "/", so they get the full keyboard. */
export function keyboardFor(answer: string): 'numeric' | 'decimal' | 'text' {
  const s = answer.trim();
  if (/^\d+$/.test(s)) return 'numeric';
  if (/^-?\d+([.,]\d+)?$/.test(s)) return 'decimal';
  return 'text';
}

function normalizeText(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/\s*([=+\-×*:/])\s*/g, '$1')
    .replace(/[.!]+$/, '');
}

export function isCorrect(typed: string, answer: string): boolean {
  const expected = parseNumber(answer);
  if (expected !== null) {
    const given = parseNumber(typed);
    return given !== null && Math.abs(given - expected) < 1e-9;
  }
  return normalizeText(typed) === normalizeText(answer);
}
