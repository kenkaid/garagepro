// src/utils/dtcDatabase.ts
import {DTCCode} from '../types';

export const dtcDatabase: Record<string, DTCCode> = {
  // === SYSTÈME MOTEUR / ADMISSION / ÉCHAPPEMENT (P01xx - P04xx) ===
  P0101: {
    code: 'P0101',
    description: "Performance débitmètre d'air (MAF) hors limites",
    category: 'P',
    severity: 'medium',
    possibleCauses: [
      'Capteur sale',
      "Fuite d'air après le filtre",
      'Filtre à air très encrassé',
    ],
    suggestedFixes: [
      'Nettoyer le capteur MAF',
      "Vérifier l'étanchéité du conduit d'admission",
    ],
  },
  P0113: {
    code: 'P0113',
    description: "Température d'air admission trop haute",
    category: 'P',
    severity: 'low',
    possibleCauses: ['Capteur IAT défectueux', 'Câblage endommagé'],
    suggestedFixes: [
      "Vérifier le connecteur du capteur d'air",
      'Remplacer le capteur IAT',
    ],
  },
  P0115: {
    code: 'P0115',
    description: 'Sonde température liquide refroidissement (ECT) défectueuse',
    category: 'P',
    severity: 'high',
    possibleCauses: [
      'Sonde HS',
      'Faisceau corrodé',
      'Niveau de liquide trop bas',
    ],
    suggestedFixes: [
      'Remplacer la sonde ECT',
      'Vérifier le niveau et purger le circuit',
    ],
  },
  P0121: {
    code: 'P0121',
    description: 'Problème de position du papillon (TPS)',
    category: 'P',
    severity: 'medium',
    possibleCauses: ['Boîtier papillon encrassé', 'Capteur TPS défectueux'],
    suggestedFixes: [
      'Nettoyer le boîtier papillon',
      "Réinitialiser l'apprentissage du papillon",
    ],
  },
  P0130: {
    code: 'P0130',
    description: 'Sonde Lambda (O2) - Panne du circuit (Banque 1, Sonde 1)',
    category: 'P',
    severity: 'medium',
    possibleCauses: ['Sonde O2 usée', "Fils brûlés par l'échappement"],
    suggestedFixes: ['Remplacer la sonde Lambda amont'],
    // @ts-ignore
    partImageUrl: 'https://images.clothes.com/b0/711223/1.jpg',
    partLocation: "Sur le collecteur d'échappement, avant le catalyseur.",
    estimatedLaborCost: 15000,
    localPartPrice: 45000,
    importPartPrice: 85000,
  },
  P0171: {
    code: 'P0171',
    description: "Mélange trop pauvre (Trop d'air / Pas assez d'essence)",
    category: 'P',
    severity: 'high',
    possibleCauses: [
      "Prise d'air",
      'Injecteurs bouchés',
      'Pompe à essence faible',
    ],
    suggestedFixes: [
      "Chercher une fuite d'air (sifflement)",
      'Tester la pression de carburant',
    ],
    // @ts-ignore
    partImageUrl: 'https://images.clothes.com/b0/767890/1.jpg',
    partLocation:
      'Sous le véhicule, près du réservoir ou dans le compartiment moteur.',
    estimatedLaborCost: 10000,
    localPartPrice: 12000,
    importPartPrice: 25000,
  },
  P0172: {
    code: 'P0172',
    description: "Mélange trop riche (Trop d'essence)",
    category: 'P',
    severity: 'high',
    possibleCauses: [
      'Injecteur qui fuit',
      "Régulateur de pression d'essence HS",
      'Filtre à air colmaté',
    ],
    suggestedFixes: ['Vérifier les injecteurs', 'Remplacer le filtre à air'],
  },
  P0201: {
    code: 'P0201',
    description: 'Panne circuit injecteur cylindre 1',
    category: 'P',
    severity: 'critical',
    possibleCauses: ['Injecteur HS', 'Câblage coupé'],
    suggestedFixes: [
      "Tester la résistance de l'injecteur",
      'Vérifier le faisceau injecteur',
    ],
  },
  P0234: {
    code: 'P0234',
    description: 'Condition de suralimentation turbo (Overboost)',
    category: 'P',
    severity: 'high',
    possibleCauses: ['Wastegate bloquée', 'Capteur de pression turbo (MAP) HS'],
    suggestedFixes: [
      "Vérifier l'électrovanne de turbo",
      'Nettoyer le capteur MAP',
    ],
  },
  P0299: {
    code: 'P0299',
    description: 'Sous-alimentation turbo (Underboost / Perte de puissance)',
    category: 'P',
    severity: 'high',
    possibleCauses: [
      'Fuite sur une durite de turbo',
      'Turbo fatigué',
      'Vanne EGR bloquée ouverte',
    ],
    suggestedFixes: [
      "Inspecter les grosses durites d'air",
      'Vérifier la commande du turbo',
    ],
  },

  // === ALLUMAGE ET RATÉS (P03xx) ===
  P0300: {
    code: 'P0300',
    description: "Ratés d'allumage aléatoires (Multi-cylindres)",
    category: 'P',
    severity: 'high',
    possibleCauses: ['Bougies mortes', 'Bobines fatiguées', 'Mauvaise essence'],
    suggestedFixes: ['Changer les bougies', 'Vérifier les bobines'],
  },
  P0301: {
    code: 'P0301',
    description: "Ratés d'allumage cylindre 1",
    category: 'P',
    severity: 'high',
    possibleCauses: ['Bougie/Bobine cylindre 1'],
    suggestedFixes: ['Inverser la bobine 1 avec la 2 pour tester'],
  },
  P0302: {
    code: 'P0302',
    description: "Ratés d'allumage cylindre 2",
    category: 'P',
    severity: 'high',
    possibleCauses: ['Bougie/Bobine cylindre 2'],
    suggestedFixes: ['Vérifier bougie 2'],
  },
  P0303: {
    code: 'P0303',
    description: "Ratés d'allumage cylindre 3",
    category: 'P',
    severity: 'high',
    possibleCauses: ['Bougie/Bobine cylindre 3'],
    suggestedFixes: ['Vérifier bougie 3'],
  },
  P0304: {
    code: 'P0304',
    description: "Ratés d'allumage cylindre 4",
    category: 'P',
    severity: 'high',
    possibleCauses: ['Bougie/Bobine cylindre 4'],
    suggestedFixes: ['Vérifier bougie 4'],
  },
  P0335: {
    code: 'P0335',
    description: 'Capteur vilebrequin (PMH) - Signal absent',
    category: 'P',
    severity: 'critical',
    possibleCauses: ['Capteur HS', "Connecteur plein d'huile", 'Câblage'],
    suggestedFixes: [
      'Nettoyer le capteur PMH',
      'Remplacer le capteur si le moteur ne démarre plus',
    ],
  },
  P0340: {
    code: 'P0340',
    description: 'Capteur arbre à cames - Panne circuit',
    category: 'P',
    severity: 'high',
    possibleCauses: ['Capteur défectueux', 'Décalage distribution'],
    suggestedFixes: ['Tester le capteur', 'Vérifier le calage de la courroie'],
  },

  // === ANTIPOLLUTION (P04xx) ===
  P0401: {
    code: 'P0401',
    description: 'Flux EGR insuffisant (Vanne bouchée)',
    category: 'P',
    severity: 'medium',
    possibleCauses: ['Vanne EGR encrassée par la calamine', 'Tuyaux bouchés'],
    suggestedFixes: ['Nettoyer la vanne EGR', 'Vérifier les conduits'],
  },
  P0403: {
    code: 'P0403',
    description: 'Circuit de commande vanne EGR - Panne',
    category: 'P',
    severity: 'medium',
    possibleCauses: ['Vanne EGR grillée', 'Fils coupés'],
    suggestedFixes: ['Remplacer la vanne EGR'],
  },
  P0420: {
    code: 'P0420',
    description: 'Efficacité catalyseur trop faible',
    category: 'P',
    severity: 'medium',
    possibleCauses: ['Catalyseur HS', 'Fuite échappement', 'Sonde Lambda HS'],
    suggestedFixes: [
      'Vérifier fuite échappement amont',
      'Remplacer catalyseur',
    ],
  },

  // === SYSTÈMES AUXILIAIRES (P05xx - P06xx) ===
  P0500: {
    code: 'P0500',
    description: 'Capteur de vitesse véhicule - Panne',
    category: 'P',
    severity: 'medium',
    possibleCauses: ['Capteur boîte HS', 'Câblage'],
    suggestedFixes: ['Vérifier le capteur sur la boîte de vitesse'],
  },
  P0562: {
    code: 'P0562',
    description: 'Tension système trop basse (Batterie/Alternateur)',
    category: 'P',
    severity: 'high',
    possibleCauses: [
      'Alternateur fatigué',
      'Batterie déchargée',
      'Mauvaise masse',
    ],
    suggestedFixes: [
      'Mesurer la tension (doit être > 13.5V moteur tournant)',
      "Vérifier l'alternateur",
    ],
    // @ts-ignore
    partImageUrl: 'https://images.clothes.com/b0/711224/1.jpg',
    partLocation:
      "À l'avant du moteur, entraîné par la courroie d'accessoires.",
    estimatedLaborCost: 25000,
    localPartPrice: 95000,
    importPartPrice: 180000,
  },
  P0606: {
    code: 'P0606',
    description: 'Erreur processeur ECU/PCM',
    category: 'P',
    severity: 'critical',
    possibleCauses: [
      'Calculateur défectueux',
      'Mauvaise alimentation électrique',
    ],
    suggestedFixes: [
      'Vérifier les masses du calculateur',
      'Mise à jour logiciel ou remplacement',
    ],
  },

  // === FREINAGE / CHASSIS (Cxxxx) ===
  C0035: {
    code: 'C0035',
    description: 'Capteur vitesse roue AV Gauche (ABS)',
    category: 'C',
    severity: 'medium',
    possibleCauses: ['Capteur sale', 'Câble sectionné'],
    suggestedFixes: ['Nettoyer le capteur ABS'],
  },
  C0040: {
    code: 'C0040',
    description: 'Capteur vitesse roue AV Droit (ABS)',
    category: 'C',
    severity: 'medium',
    possibleCauses: ['Capteur sale', 'Câble sectionné'],
    suggestedFixes: ['Nettoyer le capteur ABS'],
  },

  // === RÉSEAU (Uxxxx) ===
  U0001: {
    code: 'U0001',
    description: 'Bus de communication CAN Haute Vitesse',
    category: 'U',
    severity: 'critical',
    possibleCauses: ['Court-circuit réseau', 'Batterie faible'],
    suggestedFixes: ["Vérifier l'état de la batterie"],
  },
  U0100: {
    code: 'U0100',
    description: 'Perte de communication avec le calculateur moteur (ECM)',
    category: 'U',
    severity: 'critical',
    possibleCauses: ['Câblage', 'Relais calculateur'],
    suggestedFixes: ['Vérifier les fusibles et relais moteur'],
  },
  B0001: {
    code: 'B0001',
    description: 'Commande de déploiement de l\'airbag conducteur - Phase 1',
    category: 'B',
    severity: 'critical',
    possibleCauses: ['Collision détectée', 'Module SRS défectueux', 'Câblage'],
    suggestedFixes: ['Remplacer l\'airbag et le module SRS après choc'],
    meaning: 'Ce code indique que le système de sécurité a activé ou détecté une anomalie sur l\'airbag conducteur. Très fréquent après un accident.',
  },
  B0020: {
    code: 'B0020',
    description: 'Commande de déploiement de l\'airbag passager - Phase 1',
    category: 'B',
    severity: 'critical',
    possibleCauses: ['Collision détectée', 'Capteur d\'impact latéral'],
    suggestedFixes: ['Vérifier l\'intégrité du tableau de bord et du module SRS'],
    meaning: 'Indique une tentative de déploiement de l\'airbag passager. Signe majeur d\'un accident passé.',
  },
  C1234: {
    code: 'C1234',
    description: 'Signal de vitesse de roue non plausible ou absent',
    category: 'C',
    severity: 'high',
    possibleCauses: ['Capteur de roue HS', 'Bague ABS encrassée'],
    suggestedFixes: ['Nettoyer la bague ABS', 'Remplacer le capteur de vitesse'],
    meaning: 'Le calculateur ne comprend pas la vitesse d\'une roue. Peut affecter le contrôle de trajectoire et l\'ABS.',
  },
};

// Fonction de recherche
export const getDTCInfo = async (code: string): Promise<DTCCode> => {
  const normalizedCode = code.toUpperCase().trim();

  // 1. Chercher dans ta base locale (réponse instantanée)
  if (dtcDatabase[normalizedCode]) {
    return dtcDatabase[normalizedCode];
  }

  // 2. Si pas trouvé, on simule une recherche en ligne ou on donne une définition générique
  return {
    code: normalizedCode,
    description:
      'Code constructeur ou spécifique détecté. Veuillez consulter la base de données technique.',
    category: normalizedCode[0] as any,
    severity: 'medium',
    possibleCauses: ['Cause spécifique au constructeur'],
    suggestedFixes: ['Vérifier le manuel technique du véhicule'],
  };
};

// Fonction pour ajouter un code personnalisé (pour extension)
export const addCustomDTC = (code: string, info: DTCCode): void => {
  dtcDatabase[code.toUpperCase()] = info;
};

// Liste tous les codes
export const getAllDTCCodes = (): string[] => Object.keys(dtcDatabase);
