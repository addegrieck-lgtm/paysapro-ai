// Où vivent les données de l'espace courant ?
//  • compte en ligne (mode cloud, hors démonstration) : dans la base de l'entreprise ;
//  • mode local ou espace de démonstration : sur l'appareil.
// Sert à afficher des textes exacts (« sur cet appareil » n'est vrai que dans le second cas).
import { CLOUD_ENABLED } from '../services/cloud/client';
import { isDemoSpace } from '../services/storage';
import { APP_CONFIG } from '../config/app';

export function isOnlineSpace(): boolean {
  return CLOUD_ENABLED && !isDemoSpace();
}

export const IS_CLOUD_APP = CLOUD_ENABLED;
export const IS_BETA = APP_CONFIG.betaMode;
