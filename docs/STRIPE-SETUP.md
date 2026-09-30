# Abonnements Stripe — mise en route

> Statut : **préparé, jamais exécuté**. Le code des fonctions serveur est écrit et la vérification
> de signature est testée, mais rien n'a tourné contre un vrai compte Stripe.
> Tant que `VITE_BETA_MODE=true`, aucun paiement n'est proposé : Premium Max est offert.

## Fonctionnement

```
Application ──(jeton de session)──▶ fonction stripe-checkout ──▶ Stripe Checkout
                                                                      │
Application ◀── lit `subscriptions` ◀── fonction stripe-webhook ◀─────┘
```

- Le navigateur ne connaît aucune clé Stripe.
- La table `subscriptions` n'est écrite que par le webhook (signature vérifiée, événements dédoublonnés).
- L'application lit cette table : c'est elle qui décide de l'accès, pas le navigateur.

## 1. Stripe (mode test)

1. Créez un compte sur stripe.com et restez en **mode test**.
2. *Catalogue de produits* → créez trois produits. Sur chacun, ajoutez **deux tarifs récurrents** en euros,
   un mensuel et un annuel (25 % de réduction) :

   | Produit | Mensuel | Annuel |
   |---|---|---|
   | `Paysapro AI Starter` | 19 € | 171 € |
   | `Paysapro AI Pro` | 39 € | 351 € |
   | `Paysapro AI Business` | 69 € | 621 € |

   Ces montants viennent de `src/features/plans/plans.ts` (`YEARLY_DISCOUNT_PERCENT`) : si vous changez la
   réduction ou un prix, modifiez le fichier **et** les tarifs Stripe, sinon l'affichage et le montant débité divergeront.
   Indiquez si le prix s'entend hors taxes selon votre régime de TVA (à valider avec votre comptable).
3. Notez les six identifiants de tarif (`price_…`).
4. *Paramètres → Portail client* : activez le portail (changement d'offre, résiliation, factures).

## 2. Fonctions Supabase

Dans Supabase → **Edge Functions** :

1. Créez trois fonctions nommées `stripe-checkout`, `stripe-portal`, `stripe-webhook`. Le plus simple : collez dans chacune le
   fichier unique correspondant du dossier `supabase/functions-a-coller/` (généré par `node scripts/bundle-functions.mjs`).
   Sinon, le contenu de
   `supabase/functions/<nom>/index.ts`. Les fichiers de `supabase/functions/_shared/` doivent être joints à chacune
   (ou déployez le tout avec l'outil en ligne de commande : `supabase functions deploy`).
2. Pour `stripe-webhook` uniquement : désactivez **Verify JWT** (Stripe n'envoie pas de jeton Supabase ;
   la fonction vérifie la signature Stripe à la place).
3. **Secrets** (Edge Functions → Secrets) :

   | Nom | Valeur |
   |---|---|
   | `STRIPE_SECRET_KEY` | clé secrète Stripe (`sk_test_…`) |
   | `STRIPE_WEBHOOK_SECRET` | secret du webhook (`whsec_…`, étape 3) |
   | `STRIPE_STARTER_PRICE_ID` | `price_…` |
   | `STRIPE_PRO_PRICE_ID` | `price_…` |
   | `STRIPE_BUSINESS_PRICE_ID` | `price_…` (mensuel) |
   | `STRIPE_STARTER_YEARLY_PRICE_ID` | `price_…` (annuel) |
   | `STRIPE_PRO_YEARLY_PRICE_ID` | `price_…` (annuel) |
   | `STRIPE_BUSINESS_YEARLY_PRICE_ID` | `price_…` (annuel) |
   | `APP_URL` | `https://app.paysapro-ai.fr` |

   Ces valeurs ne doivent jamais être copiées dans le code, dans `.env.local`, dans Vercel ni dans une conversation.

## 3. Webhook

Stripe → *Développeurs → Webhooks* → *Ajouter un point de terminaison* :

- URL : `https://<projet>.supabase.co/functions/v1/stripe-webhook`
- Événements : `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`,
  `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`
- Copiez le *secret de signature* dans le secret `STRIPE_WEBHOOK_SECRET`.

## 4. Activer dans l'application

Dans Vercel → Environment Variables : `VITE_BETA_MODE=false` et `VITE_STRIPE_ENABLED=true`, puis redéployez.
À faire d'abord sur un déploiement de prévisualisation, pas en production.

## 5. Essai complet (mode test)

1. Paramètres → Abonnement → « Choisir Pro » → carte de test Stripe `4242 4242 4242 4242`.
2. Au retour, la page doit afficher « Pro — Actif » (la ligne `subscriptions` a été mise à jour par le webhook).
3. « Gérer l'abonnement » → résilier → le statut passe à « Résilié » à la fin de la période.
4. Dans Stripe → Webhooks, chaque événement doit être en succès (code 200).

## Limites connues

- Hors bêta, l'application bloque par offre les écrans Modèles, Planning, Statistiques et Équipe, et la base limite
  le nombre d'utilisateurs. Les autres fonctionnalités ne sont pas encore bloquées par offre.
- Pas de période d'essai.
