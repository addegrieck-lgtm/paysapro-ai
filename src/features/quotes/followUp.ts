// Modèles de messages de relance client (copiés ou partagés : aucun envoi automatique).
import type { Client, CompanySettings } from '../../types';

export interface MessageTemplate {
  id: string;
  label: string;
  build: (ctx: { client: Client | undefined; company: CompanySettings; quoteNumber: string | null; total: string }) => string;
}

function greeting(client: Client | undefined): string {
  if (!client) return 'Bonjour,';
  if (client.companyName.trim() && !client.lastName.trim()) return 'Bonjour,';
  const name = [client.firstName, client.lastName].filter(Boolean).join(' ').trim();
  return name ? `Bonjour ${name},` : 'Bonjour,';
}

function signature(company: CompanySettings): string {
  return [company.name, company.phone].filter((s) => s.trim()).join('\n');
}

export const TEMPLATES: MessageTemplate[] = [
  {
    id: 'send',
    label: 'Envoi du devis',
    build: ({ client, company, quoteNumber, total }) =>
      `${greeting(client)}\n\nSuite à notre rendez-vous, veuillez trouver ci-joint le devis${quoteNumber ? ` n° ${quoteNumber}` : ''} pour votre projet d’aménagement extérieur (${total} TTC).\n\nJe reste à votre disposition pour toute question.\n\nBien cordialement,\n${signature(company)}`,
  },
  {
    id: 'followup',
    label: 'Relance',
    build: ({ client, company }) =>
      `${greeting(client)}\n\nJe me permets de revenir vers vous concernant le devis envoyé pour votre projet d’aménagement extérieur.\n\nN’hésitez pas à me contacter si vous avez des questions.\n\nBonne journée.\n${signature(company)}`,
  },
  {
    id: 'expiring',
    label: 'Devis bientôt expiré',
    build: ({ client, company, quoteNumber }) =>
      `${greeting(client)}\n\nLe devis${quoteNumber ? ` n° ${quoteNumber}` : ''} arrive bientôt à échéance. Si le projet vous intéresse toujours, je peux bloquer une date d’intervention dès votre accord.\n\nBien cordialement,\n${signature(company)}`,
  },
  {
    id: 'start',
    label: 'Début des travaux',
    build: ({ client, company }) =>
      `${greeting(client)}\n\nJe vous confirme le démarrage de votre chantier. Merci de laisser l’accès au jardin dégagé pour l’équipe.\n\nÀ très bientôt,\n${signature(company)}`,
  },
];
