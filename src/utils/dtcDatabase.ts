// src/utils/dtcDatabase.ts
import {DTCCode} from '../types';

// @ts-ignore
export const dtcDatabase: Record<string, DTCCode> = {
  // Codes Powertrain (P0xxx)
  P0100: {
    code: 'P0100',
    description: "Problème circuit débitmètre d'air massique",
    category: 'P',
    severity: 'medium',
    possibleCauses: [
      'Capteur MAF défectueux',
      'Fuite air admission',
      'Filtre à air bouché',
      'Connecteur oxydé',
    ],
    suggestedFixes: [
      'Nettoyer capteur MAF avec produit spécial',
      'Vérifier durites air',
      'Remplacer filtre à air',
      'Contrôler connectique',
    ],
  },
  P0101: {
    code: 'P0101',
    description: "Performance débitmètre d'air massique hors limites",
    category: 'P',
    severity: 'medium',
    possibleCauses: [
      'Capteur MAF sale ou défectueux',
      'Fuite air après MAF',
      'Problème vanne EGR',
    ],
    suggestedFixes: [
      'Nettoyage capteur MAF',
      'Contrôle étanchéité circuit admission',
      'Test vanne EGR',
    ],
  },
  P0300: {
    code: 'P0300',
    description: "Ratés d'allumage aléatoires/multicylindres",
    category: 'P',
    severity: 'high',
    possibleCauses: [
      'Bougies usées',
      'Faisceau allumage défectueux',
      'Injecteurs encrassés',
      'Compression moteur faible',
      'Mélange air/essence incorrect',
    ],
    suggestedFixes: [
      "Remplacer bougies d'allumage",
      "Tester bobines d'allumage",
      'Nettoyage injecteurs',
      'Test compression cylindres',
      'Vérifier pression carburant',
    ],
  },
  P0301: {
    code: 'P0301',
    description: "Raté d'allumage cylindre 1",
    category: 'P',
    severity: 'high',
    possibleCauses: [
      'Bougie cylindre 1 défectueuse',
      'Injecteur cylindre 1 encrassé',
      'Soupapes cylindre 1 usées',
    ],
    suggestedFixes: [
      'Remplacer bougie cylindre 1',
      'Tester injecteur cylindre 1',
      'Contrôle compression cylindre 1',
    ],
  },
  P0420: {
    code: 'P0420',
    description: 'Efficacité catalyseur sous seuil (Banque 1)',
    category: 'P',
    severity: 'medium',
    possibleCauses: [
      'Catalyseur usé ou défectueux',
      'Sonde lambda avant catalyseur défectueuse',
      'Fuite échappement avant catalyseur',
      'Huile/coolant brûlés (pollution catalyseur)',
    ],
    suggestedFixes: [
      'Remplacer catalyseur (coûteux)',
      'Remplacer sonde lambda avant',
      'Réparer fuite échappement',
      'Vérifier niveau huile/coolant (recherche fuite interne)',
    ],
  },
  P0500: {
    code: 'P0500',
    description: 'Problème circuit capteur vitesse véhicule',
    category: 'P',
    severity: 'medium',
    possibleCauses: [
      'Capteur vitesse défectueux',
      'Câblage coupé',
      'Connecteur oxydé',
      'Problème boîte de vitesses',
    ],
    suggestedFixes: [
      'Remplacer capteur vitesse',
      'Vérifier câblage capteur',
      'Nettoyer connecteur',
      'Contrôle mécanique boîte',
    ],
  },
  P0700: {
    code: 'P0700',
    description: 'Problème système transmission - demande MIL',
    category: 'P',
    severity: 'high',
    possibleCauses: [
      'Problème électronique transmission',
      'Capteur transmission défectueux',
      'Valve corps de valve défectueuse',
    ],
    suggestedFixes: [
      'Scanner codes spécifiques transmission',
      'Vérifier niveau huile boîte',
      'Contrôle capteurs boîte',
    ],
  },

  // Codes réseau (U0xxx)
  U0100: {
    code: 'U0100',
    description: 'Perte communication avec ECM/PCM',
    category: 'U',
    severity: 'critical',
    possibleCauses: [
      'Problème bus CAN',
      'ECM défectueux',
      'Câblage coupé',
      'Batterie faible',
    ],
    suggestedFixes: [
      'Diagnostic électricien spécialisé',
      'Vérifier batterie et alternateur',
      'Contrôle câblage bus CAN',
      'Remplacement ECM (si confirmé)',
    ],
  },
};

// Fonction de recherche
export const getDTCInfo = (code: string): DTCCode | null => {
  const normalizedCode = code.toUpperCase().trim();
  return dtcDatabase[normalizedCode] || null;
};

// Fonction pour ajouter un code personnalisé (pour extension)
export const addCustomDTC = (code: string, info: DTCCode): void => {
  dtcDatabase[code.toUpperCase()] = info;
};

// Liste tous les codes
export const getAllDTCCodes = (): string[] => Object.keys(dtcDatabase);
