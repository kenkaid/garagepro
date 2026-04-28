// src/types/index.ts
// src/types/index.ts

/**
 * Code défaut OBD-II (DTC - Diagnostic Trouble Code)
 */
export interface DTCCode {
  /** Code défaut (ex: P0301, B1234, C5678, U9101) */
  code: string;

  /** Description en français */
  description: string;

  /** Catégorie du code */
  category: 'P' | 'B' | 'C' | 'U';
  // P = Powertrain (moteur/transmission)
  // B = Body (carrosserie/confort)
  // C = Chassis (suspension/freins)
  // U = Network (communication)

  /** Statut du code DTC */
  status?: 'confirmed' | 'pending' | 'permanent';

  /** Niveau de gravité */
  severity: 'low' | 'medium' | 'high' | 'critical';

  /** Liste des causes probables */
  possibleCauses: string[];

  /** Solutions suggérées */
  suggestedFixes: string[];

  /** Nouveau : Explications visuelles et aides à la réparation */
  partImageUrl?: string; // URL de l'image de la pièce concernée
  partLocation?: string; // Description textuelle de l'emplacement (ex: "Sous la boîte à air")

  /** Nouveau : Tarification et pièces */
  estimatedLaborCost?: number; // Main d'œuvre estimée en FCFA
  localPartPrice?: number; // Prix moyen pièce locale en FCFA
  importPartPrice?: number; // Prix moyen pièce importée en FCFA
}

/**
 * Donnée OBD-II temps réel (PID - Parameter ID)
 */
export interface OBDData {
  /** Timestamp de la lecture (ms depuis epoch) */
  timestamp: number;

  /** Code PID hexadécimal (ex: 0C, 0D, 05) */
  pid: string;

  /** Nom lisible du paramètre */
  name: string;

  /** Valeur mesurée (nombre ou string) */
  value: number | string;

  /** Unité de mesure */
  unit: string;

  /** Données brutes hexadécimales reçues */
  rawData: string;
}

/**
 * Informations du véhicule connecté
 */
export interface VehicleInfo {
  /** État de la connexion */
  connected: boolean;

  /** Protocole détecté (CAN, KWP2000, etc.) */
  protocol: string;

  /** Nom de l'adaptateur Bluetooth */
  deviceName?: string;

  /** ID de l'appareil Bluetooth */
  deviceId?: string;

  /** Numéro VIN du véhicule (17 caractères) */
  vin?: string;

  /** Plaque d'immatriculation (ex: 1234AB01) */
  licensePlate?: string;

  /** Nouveaux champs pour identification manuelle */
  brand?: string;
  model?: string;
  year?: number;
}

/**
 * Session de diagnostic complète
 */
export interface ScanSession {
  /** ID unique de la session */
  id: string;

  /** Date ISO 8601 de la session */
  date: string;

  /** Informations du véhicule */
  vehicleInfo: VehicleInfo;

  /** Codes défaut trouvés */
  dtcs: DTCCode[];

  /** Données OBD temps réel */
  obdData: OBDData[];

  /** ID du mécanicien */
  userId: string;

  /** Notes optionnelles */
  notes?: string;

  /** Données d'expertise (Anti-fraude & Sécurité) */
  mileage_ecu?: number;
  mileage_abs?: number;
  mileage_dashboard?: number;
  safety_check?: {
    has_crash_data: boolean;
    airbags_deployed: number;
    impact_sensors_count: number;
    notes?: string;
  };
}

/**
 * Profil mécanicien
 */
export interface User {
  /** ID unique */
  id: string;

  /** Nom d'utilisateur */
  username?: string;

  /** Prénom */
  first_name?: string;

  /** Nom de famille */
  last_name?: string;

  /** Email */
  email?: string;

  /** Numéro de téléphone (identifiant) */
  phone: string;

  /** Nom du garage/atelier */
  shop_name: string;

  /** Localisation (quartier/ville) */
  location: string;

  /** Statut actif */
  is_active?: boolean;

  /** Date de création */
  created_at?: string;

  /** Niveau d'abonnement */
  subscription_tier?: string;

  /** Indique si l'utilisateur est en période d'essai */
  is_trial?: boolean;

  /** Nombre de jours d'essai restants */
  trial_days_remaining?: number;

  /** Détails de l'abonnement actif */
  active_subscription?: {
    id: number;
    plan: {
      id: number;
      name: string;
      tier: string;
      price: string;
      duration_days: number;
      description: string;
    };
    start_date: string;
    end_date: string;
    is_active: boolean;
  };

  /** Type d'utilisateur (Nouveau) */
  user_type?: 'MECHANIC' | 'FLEET_OWNER' | 'INDIVIDUAL';

  /** Champs legacy (compatibilité) */
  name?: string;
  shopName?: string;
}

/**
 * Réponse brute du parseur OBD
 */
export interface ParsedResponse {
  /** Mode OBD (01, 03, 04, etc.) */
  mode: string;

  /** PID concerné */
  pid: string;

  /** Bytes de données */
  data: number[];

  /** Réponse brute complète */
  raw: string;
}

/**
 * Appareil Bluetooth détecté
 */
export interface BluetoothDevice {
  id: string;
  name: string | null;
  rssi: number | null;
}

