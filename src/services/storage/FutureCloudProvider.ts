// Emplacement prévu pour un stockage cloud (ex. Supabase, gratuit jusqu'à un certain volume).
//
// Non utilisé dans le MVP : GitHub Pages est un hébergement statique, sans serveur ni base de données.
// Pour l'activer plus tard :
//   1. créer un projet Supabase (tables clients, projects, quotes, catalog, photos → Storage) ;
//   2. implémenter chaque méthode de StorageProvider avec le client Supabase ;
//   3. ajouter l'authentification (chaque ligne liée à l'utilisateur, règles RLS) ;
//   4. remplacer `new IndexedDBProvider()` dans services/storage/index.ts.
// Seule la clé publique « anon » peut vivre côté navigateur ; jamais la clé « service_role ».
import type { StorageProvider } from './StorageProvider';

export const FUTURE_CLOUD_PROVIDER_AVAILABLE = false;

export type FutureCloudProvider = StorageProvider & {
  /** Synchronisation bidirectionnelle local ⇄ cloud (à concevoir) */
  sync(): Promise<void>;
};
