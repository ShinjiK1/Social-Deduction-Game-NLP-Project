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
const devFallbackFile = `${fallbackDir}games.dev.jsonl`;

if (!supabase) {
  console.warn(`Supabase not configured; finished games will be written to ${fallbackFile}`);
}

/**
 * Saves a finished game. Writes to Supabase via the log_game RPC (one transaction),
 * falling back to a local JSONL file so no game is lost if Supabase is down or unset.
 * Dev games go to the dev_* tables through log_dev_game, and to their own fallback file.
 */
export async function logGame(record, { dev = false } = {}) {
  const rpc = dev ? 'log_dev_game' : 'log_game';
  if (supabase) {
    const { error } = await supabase.rpc(rpc, { payload: record });
    if (!error) return;
    console.error(`Supabase ${rpc} failed, writing to fallback file:`, error.message);
  }
  await mkdir(fallbackDir, { recursive: true });
  await appendFile(dev ? devFallbackFile : fallbackFile, `${JSON.stringify(record)}\n`);
}
