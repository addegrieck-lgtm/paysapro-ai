// Pages juridiques : MODÈLES À ADAPTER avant toute commercialisation (à faire valider par un professionnel du droit).
// Aucune conformité n'est affirmée ici.
import type { ReactNode } from 'react';
import { TriangleAlert } from 'lucide-react';
import { CLOUD_ENABLED } from '../../services/cloud/client';

// Identité juridique : jamais inventée. Elle vient de la configuration (variables VITE_LEGAL_*).
const env = import.meta.env ?? {};
const LEGAL = {
  name: (env.VITE_LEGAL_NAME ?? '').trim(),
  form: (env.VITE_LEGAL_FORM ?? '').trim(),
  address: (env.VITE_LEGAL_ADDRESS ?? '').trim(),
  siret: (env.VITE_LEGAL_SIRET ?? '').trim(),
  director: (env.VITE_LEGAL_DIRECTOR ?? '').trim(),
  email: (env.VITE_LEGAL_EMAIL ?? '').trim(),
  dataRegion: (env.VITE_DATA_REGION ?? '').trim(),
};

function Missing({ value, label }: { value: string; label: string }) {
  return value ? <>{value}</> : <strong className="text-warning">[{label} : information à compléter]</strong>;
}

function LegalLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-4xl font-bold tracking-tight">{title}</h1>
      <div className="mt-5 flex gap-3 rounded-2xl bg-warning-soft p-4 text-warning">
        <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
        <p className="text-sm font-medium">
          Modèle à adapter avant la commercialisation. Ce texte décrit le fonctionnement actuel de la bêta et ne constitue pas un avis juridique ; il doit être complété et validé.
        </p>
      </div>
      <div className="mt-8 space-y-6 leading-relaxed [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-ink [&_p]:text-muted [&_li]:text-muted [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
        {children}
      </div>
    </article>
  );
}

export function PrivacyPage() {
  return (
    <LegalLayout title="Politique de confidentialité">
      <section>
        <h2>Où sont vos données ?</h2>
        {CLOUD_ENABLED ? (
          <>
            <p>
              Les données de votre espace (compte, entreprise, clients, chantiers, devis, photos, réglages) sont enregistrées dans une base de données en ligne hébergée par Supabase
              {LEGAL.dataRegion ? ` (${LEGAL.dataRegion})` : ''}, et l’application est servie par Vercel. Ces prestataires agissent comme sous-traitants techniques.
            </p>
            <p>
              Chaque entreprise est isolée : seuls ses membres connectés accèdent à ses données. Votre mot de passe n’est jamais stocké en clair. L’espace de démonstration, lui, reste sur votre
              appareil.
            </p>
          </>
        ) : (
          <p>
            Les données de votre espace (entreprise, clients, chantiers, devis, photos, réglages) sont enregistrées dans le navigateur de votre appareil (IndexedDB). Elles ne sont pas envoyées sur un
            serveur Paysapro AI : il n’y a pas de compte en ligne dans cette version.
          </p>
        )}
      </section>
      <section>
        <h2>Photos</h2>
        <p>
          Les photos sont compressées sur votre appareil
          {CLOUD_ENABLED
            ? ', puis enregistrées dans un espace de stockage privé : elles ne sont pas publiques. Seules les photos que vous choisissez d’inclure dans un devis envoyé sont visibles par le client, via le lien de ce devis'
            : ' et y restent'}
          . Elles ne sont jamais envoyées à un service d’intelligence artificielle externe. Si un tel service est proposé plus tard, votre accord explicite sera demandé au préalable.
        </p>
      </section>
      <section>
        <h2>Lien de devis et signature</h2>
        <p>
          Le lien d’un devis donne accès uniquement à ce devis, sans compte. Lorsque votre client signe, son nom, la date, l’heure, l’image de sa signature, une empreinte du devis et le type de
          navigateur utilisé sont enregistrés comme preuve de son accord.
        </p>
      </section>
      <section>
        <h2>Données de vos clients</h2>
        <p>
          En tant que professionnel, vous êtes responsable des données de vos clients que vous saisissez (nom, coordonnées, adresse). Ne collectez que ce qui est utile au devis et au chantier, et
          supprimez les fiches devenues inutiles.
        </p>
      </section>
      <section>
        <h2>Formulaires (bêta, contact, avis)</h2>
        <p>
          Les informations saisies dans ces formulaires servent uniquement à vous recontacter. Dans l’application, elles sont enregistrées sur l’appareil utilisé, et
          transmises à l’équipe uniquement si vous choisissez de les envoyer par e-mail.
        </p>
      </section>
      <section>
        <h2>Mesure d’audience</h2>
        <p>
          Aucun outil de mesure d’audience tiers et aucun cookie publicitaire. Des statistiques d’usage (ex. « devis créé ») sont enregistrées uniquement sur votre appareil pour afficher votre
          propre progression.
        </p>
      </section>
      <section>
        <h2>Durée de conservation</h2>
        <p>
          Vos données sont conservées tant que votre compte existe. La suppression du compte (Paramètres → Compte) efface le compte ; si vous êtes le seul utilisateur de votre entreprise, elle efface
          aussi toutes ses données et ses photos. Des copies de sauvegarde techniques de l’hébergeur peuvent subsister quelques jours.
        </p>
      </section>
      <section>
        <h2>Vos droits</h2>
        <p>
          Vous pouvez exporter l’intégralité de vos données (Paramètres → Données) et supprimer votre compte (Paramètres → Compte). Pour exercer vos droits d’accès, de rectification ou
          d’effacement : <Missing value={LEGAL.email} label="adresse de contact" />. Vous pouvez aussi saisir la CNIL (cnil.fr).
        </p>
      </section>
      <section>
        <h2>Responsable de traitement</h2>
        <p>
          <Missing value={LEGAL.name} label="nom ou raison sociale" /> — <Missing value={LEGAL.address} label="adresse" />.
        </p>
        <p>Pour les données de vos propres clients, vous êtes responsable de traitement et Paysapro AI agit comme sous-traitant.</p>
      </section>
      <section>
        <h2>À compléter avant commercialisation</h2>
        <ul>
          <li>Bases légales de chaque traitement et durées de conservation détaillées.</li>
          <li>Liste précise des sous-traitants, lieux d’hébergement et garanties en cas de transfert hors Union européenne.</li>
          <li>Contrat de sous-traitance (article 28 du RGPD) proposé aux entreprises clientes.</li>
        </ul>
      </section>
    </LegalLayout>
  );
}

export function LegalNoticePage() {
  return (
    <LegalLayout title="Mentions légales">
      <section>
        <h2>Éditeur</h2>
        <p>
          <Missing value={LEGAL.name} label="nom ou raison sociale" /> — <Missing value={LEGAL.form} label="forme juridique" /> — <Missing value={LEGAL.address} label="adresse" /> — SIRET{' '}
          <Missing value={LEGAL.siret} label="SIRET" /> — Directeur de la publication : <Missing value={LEGAL.director} label="nom" />.
        </p>
      </section>
      <section>
        <h2>Hébergement</h2>
        <p>
          {CLOUD_ENABLED
            ? 'Application hébergée par Vercel Inc. (États-Unis) ; base de données, comptes et fichiers hébergés par Supabase.'
            : 'Site statique hébergé par GitHub Pages (GitHub, Inc., États-Unis).'}{' '}
          Les hébergeurs peuvent enregistrer des journaux techniques (adresse IP) lors du chargement des pages.
        </p>
      </section>
      <section>
        <h2>Contact</h2>
        <p>Voir la page Contact.</p>
      </section>
    </LegalLayout>
  );
}

export function TermsPage() {
  return (
    <LegalLayout title="Conditions générales d’utilisation">
      <section>
        <h2>Objet</h2>
        <p>Paysapro AI est une application d’aide à la réalisation de devis et au suivi de chantiers, proposée gratuitement pendant la version bêta.</p>
      </section>
      <section>
        <h2>Version bêta</h2>
        <p>
          L’application est en cours de développement : des fonctionnalités peuvent évoluer ou être corrigées. Vous êtes invité à télécharger
          régulièrement une sauvegarde de vos données (Paramètres → Données).
        </p>
      </section>
      <section>
        <h2>Responsabilité</h2>
        <p>
          Les calculs (surfaces, quantités, prix, TVA) et suggestions de l’assistant sont des aides : le professionnel reste seul responsable du contenu, des prix, des mentions et de la
          conformité de ses devis et documents (dont ceux du mode SAP). La signature proposée est une signature électronique simple du devis ; ce n’est pas une signature électronique qualifiée.
        </p>
      </section>
      <section>
        <h2>Tarifs</h2>
        <p>Gratuit pendant la bêta, sans carte bancaire. Les offres payantes prévues ensuite figurent sur la page Tarifs ; rien n’est facturé sans votre accord.</p>
      </section>
    </LegalLayout>
  );
}

export function CookiesPage() {
  return (
    <LegalLayout title="Politique cookies">
      <section>
        <h2>Cookies</h2>
        <p>
          L’application n’utilise pas de cookies publicitaires ni de traceurs tiers. Elle utilise le stockage local du navigateur (IndexedDB, localStorage) uniquement pour faire fonctionner
          l’application : garder votre session ouverte, enregistrer vos préférences et l’espace de démonstration.
        </p>
      </section>
    </LegalLayout>
  );
}
