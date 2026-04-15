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

  /** Niveau de gravité */
  severity: 'low' | 'medium' | 'high' | 'critical';

  /** Liste des causes probables */
  possibleCauses: string[];

  /** Solutions suggérées */
  suggestedFixes: string[];
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
  mechanicId: string;

  /** Notes optionnelles */
  notes?: string;
}

/**
 * Profil mécanicien
 */
export interface Mechanic {
  /** ID unique */
  id: string;

  /** Nom complet */
  name: string;

  /** Numéro de téléphone (identifiant) */
  phone: string;

  /** Nom du garage/atelier */
  shopName: string;

  /** Localisation (quartier/ville) */
  location: string;

  /** Niveau de certification */
  certificationLevel: 'beginner' | 'intermediate' | 'expert';

  /** Nombre de diagnostics effectués */
  scansCount: number;
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

