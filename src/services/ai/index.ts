import type { AIMode } from '../../types';
import type { AIProvider } from './AIProvider';
import { LocalAIProvider } from './LocalAIProvider';
import { MockAIProvider } from './MockAIProvider';

const local = new LocalAIProvider();
const demo = new MockAIProvider();

/** Fournisseur actif. L'application fonctionne toujours, même sans aucune IA externe. */
export function getAIProvider(mode: AIMode): AIProvider {
  return mode === 'demo' ? demo : local;
}

export * from './AIProvider';
