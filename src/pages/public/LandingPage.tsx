import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import {
  ArrowRight,
  BadgeCheck,
  Bot,
  Calculator,
  Camera,
  Check,
  ChevronDown,
  Clock,
  FileText,
  FlaskConical,
  PenLine,
  PiggyBank,
  Ruler,
  Send,
  Smartphone,
  Sparkles,
} from 'lucide-react';
import { ButtonLink, Button } from '../../components/ui/Button';
import { useStartLink } from '../../layouts/PublicLayout';
import { openDemo } from '../../features/settings/dataActions';
import { FAQ } from '../../data/faq';
import { IS_CLOUD_APP } from '../../lib/space';
import { APP_CONFIG } from '../../config/app';

const FLOW = [
  { icon: Camera, label: 'Photo', emoji: '📸' },
  { icon: Ruler, label: 'Chiffrage', emoji: '📐' },
  { icon: FileText, label: 'Devis', emoji: '🧾' },
  { icon: Smartphone, label: 'Client', emoji: '📱' },
  { icon: PenLine, label: 'Signature', emoji: '✍️' },
];

const STEPS = [
  { n: '01', title: 'Photographiez', text: 'Ajoutez les photos du chantier directement depuis votre téléphone.', icon: Camera },
  { n: '02', title: 'Chiffrez', text: 'Ajoutez vos mesures, prestations, matériaux et main-d’œuvre. Les calculs sont automatiques.', icon: Calculator },
  { n: '03', title: 'Envoyez', text: 'Générez un devis professionnel avec vos couleurs et votre logo, en PDF ou à l’écran.', icon: Send },
  { n: '04', title: 'Faites signer', text: 'Votre client consulte le devis et le signe directement sur le téléphone.', icon: PenLine },
];

const WHY = [
  { icon: Clock, title: 'Gagnez du temps', text: 'Le devis est prêt avant de quitter le chantier, au lieu d’y passer vos soirées.' },
  { icon: Smartphone, title: 'Travaillez depuis votre téléphone', text: IS_CLOUD_APP ? 'Pensé pour une main, sur le terrain : téléphone, tablette ou ordinateur.' : 'Pensé pour une main, sur le terrain, même sans réseau.' },
  { icon: FileText, title: 'Des devis professionnels', text: 'Logo, couleurs, photos, conditions : un document qui inspire confiance.' },
  { icon: PenLine, title: 'Faites signer plus simplement', text: 'Le client accepte et signe sur place, vous savez où en est chaque devis.' },
  { icon: PiggyBank, title: 'Gardez le contrôle de vos marges', text: 'Coût, prix de vente et marge visibles par vous seul, ligne par ligne.' },
  { icon: Bot, title: 'Une IA pensée pour votre métier', text: 'Des suggestions de prestations et de descriptions, toujours validées par vous.' },
];

const AI_FEATURES = [
  { title: 'Analyse des photos', text: 'Préparée : l’analyse automatique arrivera avec la version en ligne.', soon: true },
  { title: 'Suggestions de prestations', text: 'À partir du type de travaux, de vos notes et de vos mesures.', soon: false },
  { title: 'Aide à la description', text: 'Une description claire des travaux, rédigée en un geste, modifiable.', soon: false },
  { title: 'Assistance au chiffrage', text: 'Quantités calculées depuis vos mesures, pertes et épaisseurs incluses.', soon: false },
  { title: 'Visualisation du projet', text: 'Génération d’un rendu « après travaux » : prévue pour une prochaine version.', soon: true },
];

function FlowDemo() {
  return (
    <div aria-label="Parcours : photo, chiffrage, devis, client, signature" className="grid grid-cols-5 gap-2 sm:gap-4">
      {FLOW.map(({ icon: Icon, label, emoji }, i) => (
        <div key={label} className="relative flex flex-col items-center gap-2">
          <div className="flow-step flex h-14 w-14 items-center justify-center rounded-2xl border border-line bg-surface text-brand sm:h-20 sm:w-20" style={{ animationDelay: `${i * 1.5}s` }}>
            <Icon className="h-6 w-6 sm:h-8 sm:w-8" aria-hidden />
          </div>
          <span className="text-xs font-semibold text-ink sm:text-sm">
            <span aria-hidden>{emoji} </span>
            {label}
          </span>
          {i < FLOW.length - 1 && <ArrowRight className="absolute -right-2.5 top-5 hidden h-4 w-4 text-muted sm:top-8 sm:block" aria-hidden />}
        </div>
      ))}
    </div>
  );
}

/** Aperçu stylisé d'un devis dans un téléphone (HTML pur, aucune image). */
function PhoneMockup() {
  return (
    <div className="relative mx-auto w-[260px] rounded-[2.5rem] border-[10px] border-ink bg-ink shadow-2xl sm:w-[290px]" aria-hidden>
      <div className="overflow-hidden rounded-[1.8rem] bg-white text-left text-[11px] text-neutral-800">
        <div className="bg-[#1f5c44] px-4 pb-4 pt-6 text-white">
          <div className="text-[10px] uppercase tracking-widest opacity-80">Votre projet paysager</div>
          <div className="mt-1 text-base font-bold">Bonjour Jean Dupont,</div>
          <div className="mt-3 rounded-xl bg-white/15 p-3">
            <div className="opacity-80">Total</div>
            <div className="text-xl font-bold">5 122,26 € TTC</div>
          </div>
        </div>
        <div className="space-y-2 p-4">
          <div className="grid grid-cols-3 gap-1.5">
            <div className="h-12 rounded-lg bg-gradient-to-b from-sky-200 to-green-600" />
            <div className="h-12 rounded-lg bg-gradient-to-b from-sky-100 to-lime-600" />
            <div className="h-12 rounded-lg bg-gradient-to-b from-sky-200 to-emerald-700" />
          </div>
          {[
            ['Préparation du terrain', '768,00 €'],
            ['Gazon en plaques', '1 244,16 €'],
            ['Pose de gazon', '1 728,00 €'],
            ['Pose de bordures', '350,00 €'],
          ].map(([l, v]) => (
            <div key={l} className="flex justify-between border-b border-neutral-100 pb-1.5">
              <span>{l}</span>
              <span className="font-semibold">{v}</span>
            </div>
          ))}
          <div className="mt-2 rounded-xl bg-[#1f5c44] py-2.5 text-center text-xs font-semibold text-white">Accepter le devis</div>
          <div className="flex items-center justify-center gap-1 text-[10px] text-emerald-700">
            <BadgeCheck className="h-3 w-3" /> Signature sur l’écran
          </div>
        </div>
      </div>
    </div>
  );
}

export function LandingPage() {
  const start = useStartLink();
  const navigate = useNavigate();
  const { hash } = useLocation();
  const [demoBusy, setDemoBusy] = useState(false);

  useEffect(() => {
    if (!hash) return;
    document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [hash]);

  const startDemo = async () => {
    setDemoBusy(true);
    await openDemo();
    navigate('/app');
  };

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-10 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:pt-16">
          <div className="animate-in">
            <p className="inline-flex items-center gap-2 rounded-full bg-brand-soft px-3 py-1 text-sm font-semibold text-brand">
              <Sparkles className="h-4 w-4" aria-hidden /> Bêta gratuite · accès complet
            </p>
            <h1 className="mt-4 text-4xl font-bold leading-[1.1] tracking-tight text-ink sm:text-5xl lg:text-6xl">
              Le devis paysagiste,
              <br />
              <span className="text-brand">directement depuis votre chantier.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted sm:text-xl">
              Prenez vos photos, chiffrez vos travaux, créez votre devis et faites-le signer directement depuis votre téléphone.
            </p>
            <p className="mt-3 font-semibold text-ink">{APP_CONFIG.punchline}</p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <ButtonLink to={start.to} size="lg" icon={<ArrowRight className="h-5 w-5" />}>
                {start.label}
              </ButtonLink>
              <ButtonLink to="/#comment" size="lg" variant="secondary">
                Voir comment ça fonctionne
              </ButtonLink>
            </div>
            <button type="button" onClick={startDemo} disabled={demoBusy} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-brand hover:underline">
              <FlaskConical className="h-4 w-4" aria-hidden />
              {demoBusy ? 'Préparation de la démo…' : 'Explorer la démo avec des données fictives'}
            </button>
            <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
              {(IS_CLOUD_APP ? ['Sans carte bancaire', 'Vos données sur tous vos appareils', 'Signature du devis en ligne'] : ['Sans carte bancaire', 'Fonctionne hors-ligne', 'Données sur votre appareil']).map((t) => (
                <li key={t} className="flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-brand" aria-hidden /> {t}
                </li>
              ))}
            </ul>
          </div>
          <PhoneMockup />
        </div>
      </section>

      {/* PARCOURS */}
      <section className="border-y border-line bg-surface py-12">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <p className="mb-6 text-center text-sm font-semibold uppercase tracking-widest text-brand">Du jardin à la signature, sans repasser par le bureau</p>
          <FlowDemo />
        </div>
      </section>

      {/* COMMENT ÇA MARCHE */}
      <section id="comment" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6">
        <h2 className="text-3xl font-bold tracking-tight">Comment ça marche</h2>
        <p className="mt-2 text-lg text-muted">Quatre étapes, directement chez votre client.</p>
        <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(({ n, title, text, icon: Icon }) => (
            <li key={n} className="rounded-2xl border border-line bg-surface p-5 shadow-card">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-brand">{n}</span>
                <Icon className="h-6 w-6 text-brand" aria-hidden />
              </div>
              <h3 className="mt-3 text-lg font-semibold">{title}</h3>
              <p className="mt-1 text-muted">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* FONCTIONNALITÉS / POURQUOI */}
      <section id="fonctionnalites" className="scroll-mt-20 bg-surface py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-3xl font-bold tracking-tight">Pourquoi Paysapro AI</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {WHY.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-2xl border border-line bg-bg p-5">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-brand">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <h3 className="mt-3 font-semibold">{title}</h3>
                <p className="mt-1 text-muted">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* IA */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">L’IA vous aide à chiffrer vos chantiers</h2>
            <p className="mt-3 text-lg text-muted">
              Suggestions de prestations, aide à la rédaction, quantités calculées : l’assistant vous fait gagner du temps sans jamais inventer de mesures.
            </p>
            <p className="mt-4 rounded-xl border-l-4 border-brand bg-brand-soft p-4 font-semibold text-brand">
              L’IA vous assiste. Vous gardez toujours le contrôle du devis final.
            </p>
          </div>
          <ul className="space-y-3">
            {AI_FEATURES.map((f) => (
              <li key={f.title} className="flex items-start gap-3 rounded-2xl border border-line bg-surface p-4">
                <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-brand" aria-hidden />
                <div>
                  <div className="flex flex-wrap items-center gap-2 font-semibold">
                    {f.title}
                    {f.soon && <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-semibold text-muted">Bientôt</span>}
                  </div>
                  <p className="text-sm text-muted">{f.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* BÊTA */}
      <section className="px-4 pb-16 sm:px-6">
        <div className="mx-auto max-w-5xl rounded-3xl bg-brand px-6 py-12 text-center text-on-brand sm:px-12">
          <h2 className="text-3xl font-bold tracking-tight">Rejoignez les premiers utilisateurs</h2>
          <p className="mx-auto mt-3 max-w-2xl text-lg opacity-90">
            Paysapro AI est actuellement en phase bêta. Les premiers professionnels peuvent tester gratuitement l’ensemble des fonctionnalités et nous aider à construire l’outil réellement adapté au métier.
          </p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <ButtonLink to={start.to} size="lg" variant="secondary" className="text-brand!">
              Tester gratuitement
            </ButtonLink>
            <ButtonLink to="/beta" size="lg" variant="ghost" className="text-on-brand! hover:bg-white/10!">
              Rejoindre la bêta gratuitement
            </ButtonLink>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-4 pb-20 sm:px-6">
        <h2 className="text-3xl font-bold tracking-tight">Questions fréquentes</h2>
        <div className="mt-6 space-y-2">
          {FAQ.map((f) => (
            <details key={f.q} className="group rounded-2xl border border-line bg-surface p-4 open:shadow-card">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold">
                {f.q}
                <ChevronDown className="h-5 w-5 shrink-0 text-muted transition-transform group-open:rotate-180" aria-hidden />
              </summary>
              <p className="mt-2 text-muted">{f.a}</p>
            </details>
          ))}
        </div>
        <div className="mt-8 text-center">
          <Button variant="secondary" onClick={startDemo} disabled={demoBusy} icon={<FlaskConical className="h-5 w-5" />}>
            Voir la démo
          </Button>
        </div>
      </section>
    </>
  );
}
