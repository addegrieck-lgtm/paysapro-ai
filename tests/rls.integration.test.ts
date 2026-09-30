// Test d'ISOLATION MULTI-ENTREPRISES contre un vrai projet Supabase.
//
// Ignoré par défaut. Pour le lancer :
//   1. exécuter supabase/migrations/0001_init.sql dans le projet ;
//   2. créer deux comptes de test (A et B) dans l'application, avec chacun son entreprise ;
//   3. définir dans le terminal (jamais dans un fichier suivi par Git) :
//        RLS_TEST_URL, RLS_TEST_ANON_KEY,
//        RLS_TEST_A_EMAIL, RLS_TEST_A_PASSWORD, RLS_TEST_B_EMAIL, RLS_TEST_B_PASSWORD
//   4. npm test
//
// Le test n'utilise que la clé publique « anon » : il se comporte comme un navigateur.
import { describe, expect, it } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const env = process.env;
const configured = !!(env.RLS_TEST_URL && env.RLS_TEST_ANON_KEY && env.RLS_TEST_A_EMAIL && env.RLS_TEST_A_PASSWORD && env.RLS_TEST_B_EMAIL && env.RLS_TEST_B_PASSWORD);

async function login(email: string, password: string): Promise<{ db: SupabaseClient; companyId: string }> {
  const db = createClient(env.RLS_TEST_URL!, env.RLS_TEST_ANON_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await db.auth.signInWithPassword({ email, password });
  if (error || !data.user) throw new Error(`Connexion du compte de test impossible (${email}).`);
  const member = await db.from('company_members').select('company_id').eq('user_id', data.user.id).limit(1).single();
  if (member.error) throw new Error(`Le compte de test ${email} n'a pas d'entreprise.`);
  return { db, companyId: member.data.company_id as string };
}

describe.skipIf(!configured)('RLS — une entreprise ne voit jamais les données d’une autre', () => {
  it('isole clients, chantiers, devis, catalogue, entreprise, membres, abonnement et photos', async () => {
    const a = await login(env.RLS_TEST_A_EMAIL!, env.RLS_TEST_A_PASSWORD!);
    const b = await login(env.RLS_TEST_B_EMAIL!, env.RLS_TEST_B_PASSWORD!);
    expect(a.companyId).not.toBe(b.companyId);

    const id = crypto.randomUUID();
    const projectId = crypto.randomUUID();
    const quoteId = crypto.randomUUID();
    const token = crypto.randomUUID();
    try {
      // A crée un client, un chantier et un devis
      expect((await a.db.from('clients').insert({ id, company_id: a.companyId, data: { id, lastName: 'Client A' } })).error).toBeNull();
      expect((await a.db.from('projects').insert({ id: projectId, company_id: a.companyId, client_id: id, data: { id: projectId } })).error).toBeNull();
      expect((await a.db.from('quotes').insert({ id: quoteId, company_id: a.companyId, project_id: projectId, client_id: id, public_token: token, data: { id: quoteId } })).error).toBeNull();

      // B ne lit rien de A, même en visant les identifiants exacts
      for (const [table, rowId] of [['clients', id], ['projects', projectId], ['quotes', quoteId]] as const) {
        const read = await b.db.from(table).select('id').eq('id', rowId);
        expect(read.error).toBeNull();
        expect(read.data).toEqual([]);
      }
      expect((await b.db.from('quotes').select('id').eq('public_token', token)).data).toEqual([]);
      for (const table of ['clients', 'projects', 'quotes', 'catalog_items', 'quote_templates', 'project_photos', 'activity_events', 'subscriptions', 'company_members']) {
        const rows = await b.db.from(table).select('company_id');
        expect(rows.error).toBeNull();
        expect((rows.data ?? []).every((r) => r.company_id === b.companyId)).toBe(true);
      }
      expect((await b.db.from('companies').select('id').eq('id', a.companyId)).data).toEqual([]);

      // B ne peut ni modifier, ni supprimer, ni écrire dans l'entreprise de A
      await b.db.from('clients').update({ data: { hacked: true } }).eq('id', id);
      await b.db.from('clients').delete().eq('id', id);
      const still = await a.db.from('clients').select('data').eq('id', id).single();
      expect(still.data?.data).toEqual({ id, lastName: 'Client A' });
      expect((await b.db.from('clients').insert({ id: crypto.randomUUID(), company_id: a.companyId, data: {} })).error).not.toBeNull();
      expect((await b.db.from('company_members').insert({ company_id: a.companyId, user_id: (await b.db.auth.getUser()).data.user!.id, role: 'admin' })).error).not.toBeNull();

      // B ne peut pas déplacer une de ses lignes vers l'entreprise de A, ni s'offrir un abonnement
      const own = crypto.randomUUID();
      await b.db.from('clients').insert({ id: own, company_id: b.companyId, data: { id: own } });
      expect((await b.db.from('clients').update({ company_id: a.companyId }).eq('id', own)).error).not.toBeNull();
      await b.db.from('clients').delete().eq('id', own);
      await b.db.from('subscriptions').update({ plan_id: 'business', status: 'active' }).eq('company_id', b.companyId);
      expect((await b.db.from('subscriptions').select('plan_id').eq('company_id', b.companyId).single()).data?.plan_id).toBe('beta');

      // Photos : bucket privé, dossier de l'entreprise uniquement
      const path = `${a.companyId}/${id}/thumb`;
      expect((await a.db.storage.from('photos').upload(path, new Blob(['x'], { type: 'image/jpeg' }), { contentType: 'image/jpeg', upsert: true })).error).toBeNull();
      expect((await b.db.storage.from('photos').download(path)).error).not.toBeNull();
      expect((await b.db.storage.from('photos').upload(`${a.companyId}/intrus/thumb`, new Blob(['x'], { type: 'image/jpeg' }), { contentType: 'image/jpeg' })).error).not.toBeNull();
      expect((await a.db.storage.from('photos').upload(`${a.companyId}/${id}/x`, new Blob(['<script>'], { type: 'text/html' }), { contentType: 'text/html' })).error).not.toBeNull();
      const anon = createClient(env.RLS_TEST_URL!, env.RLS_TEST_ANON_KEY!, { auth: { persistSession: false } });
      expect((await anon.storage.from('photos').download(path)).error).not.toBeNull();
      expect((await anon.from('clients').select('id')).data ?? []).toEqual([]);
      await a.db.storage.from('photos').remove([path]);
    } finally {
      await a.db.from('quotes').delete().eq('id', quoteId);
      await a.db.from('projects').delete().eq('id', projectId);
      await a.db.from('clients').delete().eq('id', id);
    }
  }, 60_000);
});
