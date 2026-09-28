import { IndexedDBProvider } from './IndexedDBProvider';
import type { StorageProvider } from './StorageProvider';

/** Point unique de branchement du stockage. Remplacer ici par un fournisseur cloud plus tard. */
export const storage: StorageProvider = new IndexedDBProvider();

export type { StorageProvider };
