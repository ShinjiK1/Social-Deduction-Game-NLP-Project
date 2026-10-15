import { createClient } from '@supabase/supabase-js';
import { appendFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const { SUPABASE_URL, SUPABASE_SECRET_KEY } = process.env;

const supabase =
  SUPABASE_URL && SUPABASE_SECRET_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, { auth: { persistSession: false } })
    : null;

const fallbackDir = fileURLToPath(new URL('../data/', import.meta.url));
const fallbackFile = `${fallbackDir}games.jsonl`;

if (!supabase) {
  console.warn(`Supabase not configured; finished games will be written to ${fallbackFile}`);
}

/**
 * Saves a finished game. Writes to Supabase via the log_game RPC (one transaction),
 * falling back to a local JSONL file so no game is lost if Supabase is down or unset.
 */
export async function logGame(record) {
  if (supabase) {
    const { error } = await supabase.rpc('log_game', { payload: record });
    if (!error) return;
    console.error('Supabase log_game failed, writing to fallback file:', error.message);
  }
  await mkdir(fallbackDir, { recursive: true });
  await appendFile(fallbackFile, `${JSON.stringify(record)}\n`);
}
