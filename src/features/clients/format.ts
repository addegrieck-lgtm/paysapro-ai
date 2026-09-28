import type { Client } from '../../types';

export function clientDisplayName(c: Pick<Client, 'firstName' | 'lastName' | 'companyName'> | undefined): string {
  if (!c) return 'Client inconnu';
  const person = [c.firstName, c.lastName].filter(Boolean).join(' ').trim();
  return c.companyName.trim() || person || 'Client sans nom';
}

export function clientAddress(c: Pick<Client, 'address' | 'postalCode' | 'city'> | undefined): string {
  if (!c) return '';
  return [c.address, [c.postalCode, c.city].filter(Boolean).join(' ')].filter((s) => s.trim()).join(', ');
}
