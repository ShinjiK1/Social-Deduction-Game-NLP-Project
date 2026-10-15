// Text cleanup and word matching for names, hints and larper guesses.

const collapse = (raw) => String(raw ?? '').normalize('NFKC').replace(/\s+/g, ' ').trim();

export function cleanName(raw, maxLength) {
  return collapse(raw).replace(/[^\p{L}\p{N} _.'-]/gu, '').slice(0, maxLength).trim();
}

export function cleanHint(raw) {
  return collapse(raw).replace(/\p{C}/gu, '');
}

/** Lowercase ASCII-ish tokens with accents stripped: "Hot-Dog Café" -> ["hot", "dog", "cafe"]. */
function tokens(text) {
  return String(text)
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}

/** Whether two strings name the same word, ignoring case, spacing, punctuation and simple plurals. */
export function sameWord(a, b) {
  const x = tokens(a).join('');
  const y = tokens(b).join('');
  if (!x || !y) return false;
  return x === y || x === `${y}s` || y === `${x}s` || x === `${y}es` || y === `${x}es`;
}

/**
 * Whether a hint gives away the secret word. Matches whole tokens (so "giant" doesn't
 * reveal "ant") and runs of tokens (so "hot dog" reveals "hotdog" and vice versa).
 */
export function revealsWord(hint, word) {
  const hintTokens = tokens(hint);
  const target = tokens(word).join('');
  for (let i = 0; i < hintTokens.length; i++) {
    let run = '';
    for (let j = i; j < hintTokens.length; j++) {
      run += hintTokens[j];
      if (sameWord(run, target)) return true;
      if (run.length > target.length + 2) break;
    }
  }
  return false;
}
