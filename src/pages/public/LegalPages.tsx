// Pages juridiques : MODÈLES À ADAPTER avant toute commercialisation (à faire valider par un professionnel du droit).
// Aucune conformité n'est affirmée ici.
import type { ReactNode } from 'react';
import { TriangleAlert } from 'lucide-react';

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
        <p>
          Pendant la bêta, les données de votre espace (entreprise, clients, chantiers, devis, photos, réglages) sont enregistrées dans le navigateur de votre appareil (IndexedDB). Elles ne sont pas
          envoyées sur un serveur Paysapro AI : il n’y a pas encore de compte en ligne.
        </p>
      </section>
      <section>
        <h2>Photos</h2>
        <p>
          Les photos sont compressées sur votre appareil et y restent. Elles ne sont jamais envoyées à un service d’intelligence artificielle externe. Si un tel service est proposé plus tard, votre
          accord explicite sera demandé au préalable.
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
          Les informations saisies dans ces formulaires servent uniquement à vous recontacter au sujet de la bêta. Dans la version actuelle, elles sont enregistrées sur l’appareil utilisé, et
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
        <h2>Vos droits</h2>
        <p>
          Vous pouvez exporter l’intégralité de vos données ou les supprimer définitivement depuis Paramètres → Données. Pour toute question : page Contact.
        </p>
      </section>
      <section>
        <h2>À compléter avant commercialisation</h2>
        <ul>
          <li>Identité et coordonnées du responsable de traitement.</li>
          <li>Bases légales, durées de conservation, sous-traitants (hébergement, base de données en ligne).</li>
          <li>Coordonnées pour l’exercice des droits et mention de la CNIL.</li>
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
        <p>[Nom ou raison sociale] — [forme juridique, capital] — [adresse] — SIRET [à compléter] — Directeur de la publication : [nom].</p>
      </section>
      <section>
        <h2>Hébergement</h2>
        <p>
          Site statique hébergé par GitHub Pages (GitHub, Inc., 88 Colin P. Kelly Jr. Street, San Francisco, CA 94107, États-Unis). L’hébergeur peut enregistrer des journaux techniques (adresse
          IP) lors du chargement des pages.
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
        <p>Paysapro AI est une application d’aide à la réalisation de devis et au suivi de chantiers, proposée gratuitement en version bêta.</p>
      </section>
      <section>
        <h2>Version bêta</h2>
        <p>
          L’application est en cours de développement : des fonctionnalités peuvent évoluer ou être corrigées. Les données étant stockées sur votre appareil, vous êtes invité à effectuer des
          sauvegardes régulières.
        </p>
      </section>
      <section>
        <h2>Responsabilité</h2>
        <p>
          Les calculs (surfaces, quantités, prix, TVA) et suggestions de l’assistant sont des aides : le professionnel reste seul responsable du contenu, des prix, des mentions et de la
          conformité de ses devis. La signature proposée est une validation simple du devis et n’est pas une signature électronique qualifiée.
        </p>
      </section>
      <section>
        <h2>Tarifs</h2>
        <p>Gratuit pendant la bêta. Toute évolution tarifaire sera annoncée à l’avance.</p>
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
          l’application : enregistrer vos données, vos préférences et permettre l’usage hors-ligne.
        </p>
      </section>
    </LegalLayout>
  );
}
