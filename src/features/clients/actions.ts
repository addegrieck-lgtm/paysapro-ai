import type { Client } from '../../types';
import { getState, persist, setState, upsert, without } from '../../lib/store';
import { storage } from '../../services/storage';
import { uid } from '../../utils/id';
import { deleteProject } from '../projects/actions';

export type ClientInput = Omit<Client, 'id' | 'createdAt' | 'updatedAt'>;

export function emptyClient(): ClientInput {
  return {
    firstName: '',
    lastName: '',
    companyName: '',
    phone: '',
    email: '',
    address: '',
    postalCode: '',
    city: '',
    notes: '',
  };
}

export { clientAddress, clientDisplayName } from './format';

export function createClient(input: ClientInput): Client {
  const now = new Date().toISOString();
  const client: Client = { ...input, id: uid(), createdAt: now, updatedAt: now };
  setState({ clients: upsert(getState().clients, client) });
  void persist(() => storage.saveClient(client));
  return client;
}

export function updateClient(id: string, patch: Partial<ClientInput>): void {
  const current = getState().clients.find((c) => c.id === id);
  if (!current) return;
  const client = { ...current, ...patch, updatedAt: new Date().toISOString() };
  setState({ clients: upsert(getState().clients, client) });
  void persist(() => storage.saveClient(client));
}

/** Supprime le client ET ses chantiers, devis et photos. */
export async function deleteClient(id: string): Promise<void> {
  const projects = getState().projects.filter((p) => p.clientId === id);
  for (const p of projects) await deleteProject(p.id);
  setState({ clients: without(getState().clients, id) });
  await persist(() => storage.deleteClient(id));
}
