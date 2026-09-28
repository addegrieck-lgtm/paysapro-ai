import type { Quote, QuoteTemplate } from '../../types';
import { getState, persist, setState, upsert, without } from '../../lib/store';
import { storage } from '../../services/storage';
import { uid } from '../../utils/id';
import { templateLinesFrom } from '../quotes/lines';

/** Enregistre les prestations d'un devis comme modèle réutilisable. */
export function saveQuoteAsTemplate(quote: Quote, name: string, categories: QuoteTemplate['categories']): QuoteTemplate {
  const template: QuoteTemplate = {
    id: uid(),
    name: name.trim() || 'Mon modèle',
    description: quote.description,
    categories,
    items: [],
    lines: templateLinesFrom(quote.lines),
    builtIn: false,
    createdAt: new Date().toISOString(),
  };
  setState({ templates: upsert(getState().templates, template) });
  void persist(() => storage.saveTemplate(template));
  return template;
}

export function deleteTemplate(id: string): void {
  setState({ templates: without(getState().templates, id) });
  void persist(() => storage.deleteTemplate(id));
}
