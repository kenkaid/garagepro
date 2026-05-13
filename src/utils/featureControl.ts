// src/utils/featureControl.ts
import {User} from '../types';

/**
 * Vérifie si un utilisateur a accès à une fonctionnalité donnée.
 * @param user L'objet utilisateur issu du store.
 * @param featureCode Le code unique de la fonctionnalité (slug).
 * @returns boolean True si l'accès est autorisé.
 */
export const hasFeature = (user: User | null, featureCode: string): boolean => {
  if (!user) return false;

  // Si l'utilisateur est en période d'essai, il a accès à tout (par défaut)
  if (user.is_trial) return true;

  // Vérifier dans la liste des fonctionnalités injectées par le backend
  if (user.features && Array.isArray(user.features)) {
    return user.features.includes(featureCode);
  }

  // Fallback : si la liste n'est pas encore chargée, on peut soit bloquer soit autoriser 
  // selon la politique de l'app. Ici on bloque par sécurité.
  return false;
};
