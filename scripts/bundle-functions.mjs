// Regroupe chaque fonction Stripe et son code partagé en UN seul fichier, à coller tel quel
// dans l'éditeur Supabase (Edge Functions). Usage : node scripts/bundle-functions.mjs
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const root = 'supabase/functions';
const read = (p) => readFileSync(`${root}/${p}`, 'utf8');
const stripShared = (code) => code.replace(/^import [^;]*from '\.\.?\/(_shared\/)?[^']+';\n/gm, '').replace(/^export /gm, '');

const stripe = stripShared(read('_shared/stripe.ts'));
const signature = stripShared(read('_shared/signature.ts'));
const targets = { 'stripe-checkout': [stripe], 'stripe-portal': [stripe], 'stripe-webhook': [stripe, signature] };

mkdirSync('supabase/functions-a-coller', { recursive: true });
for (const [name, shared] of Object.entries(targets)) {
  const body = stripShared(read(`${name}/index.ts`));
  const out = `// FICHIER GÉNÉRÉ (node scripts/bundle-functions.mjs) — ne pas modifier à la main.\n// À coller dans Supabase → Edge Functions → ${name}.\n${shared.join('\n')}\n${body}`;
  if (/from '\.\.?\//.test(out)) throw new Error(`import relatif restant dans ${name}`);
  writeFileSync(`supabase/functions-a-coller/${name}.ts`, out);
  console.log(name, out.split('\n').length, 'lignes');
}
