// Envoi d'e-mails transactionnels (Supabase Edge Function, environnement Deno) via Resend.
//
// Deux messages seulement, dont le contenu est construit ICI à partir de la base — le navigateur
// ne fournit ni le texte, ni le destinataire :
//   { type: 'quote', quoteId }            → lien du devis au client (adresse de la fiche client)
//   { type: 'invitation', invitationId }  → invitation d'un collègue (administrateur uniquement)
//
// Secrets (Supabase → Edge Functions → Secrets) :
//   RESEND_API_KEY   clé d'API Resend
//   EMAIL_FROM       expéditeur vérifié, ex. « Paysapro AI <devis@paysapro-ai.fr> »
//   APP_URL          https://app.paysapro-ai.fr
// Limite : 30 e-mails par entreprise et par jour par défaut (EMAIL_DAILY_LIMIT, table usage_tracking).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const APP_URL = (Deno.env.get('APP_URL') ?? '').replace(/\/+$/, '');
// Envois par entreprise et par jour. 30 par défaut : l'offre gratuite de Resend est limitée à 100 par jour
// pour tout le compte. Modifiable sans redéployer avec le secret EMAIL_DAILY_LIMIT.
const DAILY_LIMIT = Math.max(1, Number(Deno.env.get('EMAIL_DAILY_LIMIT')) || 30);

const cors = {
  'Access-Control-Allow-Origin': APP_URL || 'null',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  Vary: 'Origin',
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const isEmail = (s: unknown): s is string => typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) && s.length <= 254;
const isUuid = (s: unknown): s is string => typeof s === 'string' && /^[0-9a-f-]{36}$/i.test(s);

/** Version texte du message : les messageries l'attendent à côté du HTML (moins de classement en indésirables). */
function plainText(title: string, paragraphs: string[], button: { label: string; url: string }, footer: string): string {
  return [title, '', ...paragraphs.flatMap((p) => [p, '']), `${button.label} : ${button.url}`, '', '--', footer].join('\n');
}

function layout(title: string, paragraphs: string[], button: { label: string; url: string }, footer: string): string {
  return `<!doctype html><html lang="fr"><body style="margin:0;background:#f5f2ea;font-family:Arial,Helvetica,sans-serif;color:#1d2421">
<div style="max-width:560px;margin:0 auto;padding:24px">
<div style="background:#ffffff;border-radius:16px;padding:28px">
<h1 style="font-size:20px;margin:0 0 16px">${escapeHtml(title)}</h1>
${paragraphs.map((p) => `<p style="font-size:15px;line-height:1.55;margin:0 0 14px">${escapeHtml(p)}</p>`).join('')}
<p style="margin:22px 0"><a href="${escapeHtml(button.url)}" style="background:#1f5c44;color:#ffffff;text-decoration:none;font-weight:bold;padding:13px 22px;border-radius:12px;display:inline-block">${escapeHtml(button.label)}</a></p>
<p style="font-size:12px;color:#5b6660;line-height:1.5;margin:0">Si le bouton ne fonctionne pas, copiez cette adresse dans votre navigateur :<br>${escapeHtml(button.url)}</p>
</div>
<p style="font-size:12px;color:#5b6660;text-align:center;margin:16px 0 0">${escapeHtml(footer)}</p>
</div></body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  const apiKey = Deno.env.get('RESEND_API_KEY');
  const from = Deno.env.get('EMAIL_FROM');
  if (!apiKey || !from || !APP_URL) return json({ error: 'not_configured' }, 503);

  try {
    // Qui appelle ? (jeton de session vérifié par Supabase Auth)
    const authorization = req.headers.get('Authorization') ?? '';
    const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false },
    });
    const { data: auth } = await userClient.auth.getUser();
    if (!auth.user) return json({ error: 'forbidden' }, 403);

    const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
    const member = await db.from('company_members').select('company_id, role').eq('user_id', auth.user.id).order('created_at').limit(1).maybeSingle();
    if (!member.data) return json({ error: 'forbidden' }, 403);
    const companyId = member.data.company_id as string;
    const role = member.data.role as string;

    const company = await db.from('companies').select('name, email, phone').eq('id', companyId).single();
    const companyName = ((company.data?.name as string | undefined) ?? '').trim() || 'Votre paysagiste';
    const replyTo = isEmail(company.data?.email) ? (company.data!.email as string) : undefined;

    const body = (await req.json().catch(() => ({}))) as { type?: string; quoteId?: string; invitationId?: string };
    let to: string;
    let subject: string;
    let html: string;
    let text: string;

    if (body.type === 'quote' && isUuid(body.quoteId)) {
      if (role === 'read_only') return json({ error: 'forbidden' }, 403);
      // Le devis doit appartenir à l'entreprise de l'appelant et avoir été publié.
      const quote = await db.from('quotes').select('number, public_token, published_at, public_view, client_id').eq('id', body.quoteId).eq('company_id', companyId).is('deleted_at', null).maybeSingle();
      const q = quote.data;
      if (!q || !q.published_at || !q.public_token || (q.public_token as string).length < 20) return json({ error: 'quote_not_published' }, 400);
      const view = (q.public_view ?? {}) as { client?: { email?: string; firstName?: string; displayName?: string }; totals?: { totalTTC?: number }; project?: { title?: string } };
      if (!isEmail(view.client?.email)) return json({ error: 'client_email_missing' }, 400);
      to = view.client!.email!;
      const total = typeof view.totals?.totalTTC === 'number' ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(view.totals.totalTTC) : null;
      subject = `Votre devis n° ${q.number} — ${companyName}`;
      const parts: [string, string[], { label: string; url: string }, string] = [
        `Votre devis n° ${q.number}`,
        [
          `Bonjour${view.client?.firstName ? ` ${view.client.firstName}` : ''},`,
          `${companyName} vous a préparé un devis${view.project?.title ? ` pour votre projet : ${view.project.title}` : ''}${total ? `, d'un montant de ${total} TTC` : ''}.`,
          'Vous pouvez le consulter, le télécharger et le signer en ligne, sans créer de compte.',
        ],
        { label: 'Consulter le devis', url: `${APP_URL}/#/quote/${q.public_token}` },
        `${companyName}${company.data?.phone ? ` — ${company.data.phone}` : ''}. Message envoyé via Paysapro AI.`,
      ];
      html = layout(...parts);
      text = plainText(...parts);
    } else if (body.type === 'invitation' && isUuid(body.invitationId)) {
      if (role !== 'admin') return json({ error: 'forbidden' }, 403);
      const invitation = await db.from('company_invitations').select('email, accepted_at').eq('id', body.invitationId).eq('company_id', companyId).maybeSingle();
      if (!invitation.data || invitation.data.accepted_at || !isEmail(invitation.data.email)) return json({ error: 'invitation_not_found' }, 400);
      to = invitation.data.email as string;
      subject = `${companyName} vous invite sur Paysapro AI`;
      const parts: [string, string[], { label: string; url: string }, string] = [
        `Rejoignez ${companyName}`,
        [
          `${companyName} vous invite à rejoindre son espace sur Paysapro AI (devis et suivi de chantiers).`,
          `Créez votre compte avec cette adresse e-mail (${to}), ou connectez-vous si vous en avez déjà un : vous rejoindrez l'entreprise automatiquement à votre prochaine connexion.`,
        ],
        { label: 'Créer mon compte', url: `${APP_URL}/#/signup` },
        "Si vous n'attendiez pas cette invitation, ignorez simplement ce message.",
      ];
      html = layout(...parts);
      text = plainText(...parts);
    } else {
      return json({ error: 'invalid_request' }, 400);
    }

    // Limite quotidienne par entreprise.
    const period = new Date().toISOString().slice(0, 10);
    const usage = await db.from('usage_tracking').select('id, count').eq('company_id', companyId).eq('kind', 'email').eq('period', period).maybeSingle();
    const count = (usage.data?.count as number | undefined) ?? 0;
    if (count >= DAILY_LIMIT) return json({ error: 'rate_limited' }, 429);

    const sent = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [to], subject, html, text, ...(replyTo ? { reply_to: replyTo } : {}) }),
    });
    if (!sent.ok) {
      console.error('resend', sent.status);
      return json({ error: 'send_failed' }, 502);
    }
    if (usage.data) await db.from('usage_tracking').update({ count: count + 1, updated_at: new Date().toISOString() }).eq('id', usage.data.id);
    else await db.from('usage_tracking').insert({ company_id: companyId, kind: 'email', period, count: 1 });
    return json({ ok: true });
  } catch (e) {
    console.error(e);
    return json({ error: 'server_error' }, 500);
  }
});
