# Envoi d'e-mails — mise en route

> Statut : **préparé, jamais exécuté**. La fonction serveur est écrite ; elle n'a pas encore tourné.

Deux e-mails sont prévus : le lien du devis envoyé au client, et l'invitation d'un collègue.
Le texte et le destinataire sont déterminés par le serveur à partir de la base, jamais par le navigateur.
Limite : 100 envois par entreprise et par jour.

## 1. Resend

1. Créez un compte sur resend.com (offre gratuite suffisante pour démarrer).
2. *Domains* → ajoutez `paysapro-ai.fr`, puis créez chez OVH les enregistrements DNS indiqués (SPF, DKIM).
   Ne modifiez pas les entrées existantes de `www`, `app` ni du domaine nu.
3. *API Keys* → créez une clé « Sending access ». Elle ne doit être copiée que dans Supabase (étape 2).

## 2. Fonction Supabase

1. Supabase → **Edge Functions** → créez une fonction nommée `send-email` et collez-y le contenu de
   `supabase/functions/send-email/index.ts` (fichier autonome). Laissez « Verify JWT » activé.
2. **Secrets** (Edge Functions → Secrets) :

   | Nom | Valeur |
   |---|---|
   | `RESEND_API_KEY` | la clé créée à l'étape 1 |
   | `EMAIL_FROM` | `Paysapro AI <devis@paysapro-ai.fr>` (adresse du domaine vérifié) |
   | `APP_URL` | `https://app.paysapro-ai.fr` |

## 3. Activer dans l'application

Rien à faire : les boutons d’envoi sont actifs par défaut en mode cloud (`VITE_EMAIL_ENABLED=false` pour les masquer).

## 4. Essai

1. Ouvrez un devis dont le client a une adresse e-mail → Envoyer → « Envoyer par e-mail ».
2. Paramètres → Équipe → invitez une adresse : l'e-mail d'invitation doit arriver.

## E-mails de connexion (confirmation, mot de passe oublié)

Ils sont envoyés par Supabase, dont le service intégré est limité à quelques messages par heure.
Pour de vrais utilisateurs : Supabase → Authentication → Emails → **SMTP Settings**, avec les
identifiants SMTP fournis par Resend (même domaine vérifié).
