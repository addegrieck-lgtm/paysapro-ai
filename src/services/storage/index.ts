// Point unique de branchement du stockage.
//
// Deux espaces de données séparés sur l'appareil :
//  • « paysapro-ai »   : les vraies données du professionnel ;
//  • « paysapro-demo » : l'espace de démonstration (entreprise et clients fictifs).
// Ouvrir ou quitter la démo ne touche jamais aux vraies données.
// Pour passer au cloud plus tard : remplacer la création du fournisseur dans createProvider().
import { IndexedDBProvider } from './IndexedDBProvider';
import type { StorageProvider } from './StorageProvider';

const DEMO_FLAG = 'paysapro-demo-space';

function readDemoFlag(): boolean {
  try {
    return localStorage.getItem(DEMO_FLAG) === '1';
  } catch {
    return false;
  }
}

function createProvider(demo: boolean): StorageProvider {
  return new IndexedDBProvider(demo ? 'paysapro-demo' : 'paysapro-ai');
}

let demoSpace = readDemoFlag();
let current: StorageProvider = createProvider(demoSpace);

/** Stockage actif (délègue au fournisseur courant). */
export const storage: StorageProvider = new Proxy({} as StorageProvider, {
  get(_target, key) {
    const value = Reflect.get(current, key, current);
    return typeof value === 'function' ? value.bind(current) : value;
  },
});

export function isDemoSpace(): boolean {
  return demoSpace;
}

export function setDemoSpace(on: boolean): void {
  demoSpace = on;
  try {
    if (on) localStorage.setItem(DEMO_FLAG, '1');
    else localStorage.removeItem(DEMO_FLAG);
  } catch {
    /* navigation privée : l'espace démo ne sera pas mémorisé */
  }
  current = createProvider(on);
}

export type { StorageProvider };
