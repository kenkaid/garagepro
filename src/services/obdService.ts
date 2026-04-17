// src/services/obdService.ts
import {BleManager, Device} from 'react-native-ble-plx';
import {PermissionsAndroid, Platform} from 'react-native';
import {getDTCInfo} from '../utils/dtcDatabase';
import {DTCCode, OBDData} from '../types';
import {OBDParser} from '../utils/obdParser';

// MOCK MODE - Simule connexion OBD sans adaptateur physique
const MOCK_MODE = true;
const MOCK_DEVICE: Device = {
  id: 'mock-elm327',
  name: 'ELM327-MOCK',
  rssi: -65,
  localName: 'ELM327',
  manufacturerData: null,
  serviceData: null,
  serviceUUIDs: null,
  solicitedServiceUUIDs: null,
  isConnectable: true,
  overflowServiceUUIDs: null,
  txPowerLevel: null,
  mtu: 23,
  _manager: {} as any,
  requestConnectionPriority: () => Promise.resolve(),
  readRSSI: () => Promise.resolve(-65),
  requestMTU: () => Promise.resolve(23),
  discoverAllServicesAndCharacteristics: () => Promise.resolve({} as Device),
  services: () => Promise.resolve([]),
  characteristicsForService: () => Promise.resolve([]),
  readCharacteristicForService: () => Promise.resolve({} as any),
  writeCharacteristicWithResponseForService: () => Promise.resolve({} as any),
  writeCharacteristicWithoutResponseForService: () =>
    Promise.resolve({} as any),
  monitorCharacteristicForService: () => ({remove: () => {}}),
  readDescriptorForService: () => Promise.resolve({} as any),
  writeDescriptorForService: () => Promise.resolve({} as any),
  connect: () => Promise.resolve({} as Device),
  connectToDevice: () => Promise.resolve({} as Device),
  cancelConnection: () => Promise.resolve({} as Device),
  isConnected: () => Promise.resolve(true),
  onDisconnected: () => ({remove: () => {}}),
  toString: () => 'MOCK-DEVICE',
} as unknown as Device;

// 1. Placement des UUIDs (Constantes globales du service)
const SERVICE_UUID = '0000fff0-0000-1000-8000-00805f9b34fb';
const READ_CHAR_UUID = '0000fff1-0000-1000-8000-00805f9b34fb';
const WRITE_CHAR_UUID = '0000fff2-0000-1000-8000-00805f9b34fb';

class OBDService {
  private manager: BleManager;
  private device: Device | null = null;
  private mockConnected = false;
  private _timeout: number | undefined;
  private connectedDevice: Device | null = null;
  private isProcessing: boolean = false;

  constructor(device: Device | null = null) {
    this.manager = new BleManager();
    this.connectedDevice = device;
  }

  // Cette méthode permet de "donner" l'appareil connecté au service
  public setConnectedDevice(device: Device | null) {
    this.connectedDevice = device;
  }

  async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ]);
      return Object.values(granted).every(
        p => p === PermissionsAndroid.RESULTS.GRANTED,
      );
    }
    return true;
  }

  async scanForDevices(timeout: number = 5000): Promise<Device[]> {
    this._timeout = timeout;
    if (MOCK_MODE) {
      // Simule un délai de scan puis retourne le mock
      await new Promise(resolve => setTimeout(resolve, 2000));
      return [MOCK_DEVICE];
    }

    // Code réel (commenté pour l'instant)
    return [];
  }

  async connectToDevice(device: Device): Promise<boolean> {
    this.device = device;
    if (MOCK_MODE) {
      this.device = MOCK_DEVICE;
      this.mockConnected = true;
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simule connexion
      return true;
    }
    return false;
  }

  async detectProtocol(): Promise<string> {
    return MOCK_MODE ? 'ISO 15765-4 CAN (11 bit ID, 500 kbaud)' : 'UNKNOWN';
  }

  async readDTCs(scanType: string = 'standard'): Promise<DTCCode[]> {
    if (MOCK_MODE) {
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Génération aléatoire de codes erreurs pour les tests
      const standardCodes = [
        'P0300', 'P0171', 'P0562', 'P0301', 'P0101', 'P0420', 'P0500', 'P0606', 'U0001', 'U0100'
      ];

      const expertCodes = [
        'C0035', 'C0040', 'B0001', 'B0020', 'B1234', 'C1234'
      ];

      let allAvailableCodes = [...standardCodes];

      // Si scan expert, on ajoute obligatoirement des codes ABS/SRS
      if (scanType === 'expert' || scanType === 'security') {
        allAvailableCodes = [...standardCodes, ...expertCodes];
      }

      // Nombre aléatoire de codes entre 0 et 4
      const count = Math.floor(Math.random() * 5);

      if (count === 0 && (scanType === 'expert' || scanType === 'security')) {
        // Pour les tests experts, on veut au moins un code
        const selectedCodes = [expertCodes[Math.floor(Math.random() * expertCodes.length)]];
        return await Promise.all(selectedCodes.map(code => getDTCInfo(code)));
      }

      if (count === 0) return [];

      // Mélanger et prendre les 'count' premiers
      const shuffled = [...allAvailableCodes].sort(() => 0.5 - Math.random());
      const selectedCodes = shuffled.slice(0, count);

      const codes = await Promise.all(selectedCodes.map(code => getDTCInfo(code)));
      return codes;
    }

    try {
      // 2. Lecture réelle sur le boîtier ELM327 (Mode 03)
      const response = await this.sendCommand('03');

      // Utilisation de ton OBDParser pour transformer les octets en codes (ex: P0101)
      const rawCodes = OBDParser.parseDTCs(response);

      // 3. C'est ici qu'on fait la correspondance magique
      const codes = await Promise.all(
        rawCodes.map(async code => {
          return await getDTCInfo(code);
        }),
      );
      return codes;
    } catch (error) {
      console.error('Erreur lors de la lecture des DTC:', error);
      return [];
    }
  }

  async readPID(pid: string): Promise<OBDData | null> {
    if (MOCK_MODE) {
      // Simule des valeurs réalistes
      const mockValues: Record<string, OBDData> = {
        '0C': {
          timestamp: Date.now(),
          pid: '0C',
          name: 'Régime moteur',
          value: 750 + Math.random() * 500, // 750-1250 RPM
          unit: 'tr/min',
          rawData: '41 0C 0D 54',
        },
        '0D': {
          timestamp: Date.now(),
          pid: '0D',
          name: 'Vitesse véhicule',
          value: 0,
          unit: 'km/h',
          rawData: '41 0D 00',
        },
        '05': {
          timestamp: Date.now(),
          pid: '05',
          name: 'Température liquide',
          value: 85 + Math.random() * 15, // 85-100°C
          unit: '°C',
          rawData: '41 05 7D',
        },
        '0F': {
          timestamp: Date.now(),
          pid: '0F',
          name: 'Température air admission',
          value: 35,
          unit: '°C',
          rawData: '41 0F 47',
        },
        '11': {
          timestamp: Date.now(),
          pid: '11',
          name: 'Position papillon',
          value: 12 + Math.random() * 5, // 12-17%
          unit: '%',
          rawData: '41 11 1F',
        },
        '2F': {
          timestamp: Date.now(),
          pid: '2F',
          name: 'Niveau carburant',
          value: 65,
          unit: '%',
          rawData: '41 2F A6',
        },
      };

      return mockValues[pid.toUpperCase()] || null;
    }
    return null;
  }

  async readCommonPIDs(): Promise<OBDData[]> {
    const pids = ['0C', '0D', '05', '0F', '11', '2F'];
    const results: OBDData[] = [];

    for (const pid of pids) {
      const data = await this.readPID(pid);
      if (data) {
        results.push(data);
      }
      if (MOCK_MODE) {
        await new Promise(resolve => setTimeout(resolve, 200));
      } // Simule délai
    }

    return results;
  }

  /**
   * Lit le kilométrage depuis différents modules (Expert Scan)
   */
  async readMileageData(): Promise<{ecu: number; abs: number; dashboard: number}> {
    if (MOCK_MODE) {
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Simule un kilométrage de base
      const baseMileage = 125400;

      // Probabilité de 30% d'avoir un écart suspect pour les tests
      const isFraud = Math.random() < 0.3;

      return {
        dashboard: baseMileage,
        ecu: isFraud ? baseMileage + 45000 : baseMileage + Math.floor(Math.random() * 5),
        abs: isFraud ? baseMileage + 45000 : baseMileage + Math.floor(Math.random() * 2),
      };
    }

    // Logique réelle (Requêtes UDS spécifiques constructeurs)
    return {ecu: 0, abs: 0, dashboard: 0};
  }

  /**
   * Audit de sécurité (Module SRS/Airbags)
   */
  async readSafetyData(): Promise<{has_crash_data: boolean; airbags_deployed: number; impact_sensors_count: number}> {
    if (MOCK_MODE) {
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Probabilité de 15% d'avoir des données de crash
      const hasCrash = Math.random() < 0.15;

      return {
        has_crash_data: hasCrash,
        airbags_deployed: hasCrash ? 2 : 0,
        impact_sensors_count: 4,
      };
    }

    return {has_crash_data: false, airbags_deployed: 0, impact_sensors_count: 0};
  }

  async clearDTCs(): Promise<boolean> {
    if (MOCK_MODE) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return true;
    }
    return false;
  }

  async readVIN(): Promise<string | null> {
    return MOCK_MODE ? 'VF1LM1A0H12345678' : null;
  }

  async disconnect(): Promise<void> {
    this.mockConnected = false;
    this.device = null;
  }

  get isConnected(): boolean {
    return MOCK_MODE ? this.mockConnected : false;
  }

  async clearAllDTCs(): Promise<boolean> {
    if (MOCK_MODE) {
      // Simule un délai de traitement par le calculateur
      await new Promise(resolve => setTimeout(resolve, 1500));
      console.log('Mode Test : Codes défauts effacés avec succès.');
      return true;
    }

    try {
      // La commande '04' demande à l'ordinateur de bord d'effacer les erreurs
      const response = await this.sendCommand('04');

      // La réponse standard de l'ELM327 pour un succès au Mode 04 est souvent "44" (0x40 + 0x04)
      // On vérifie si la réponse contient "44" ou "OK"
      return response.includes('44') || response.includes('OK');
    } catch (e) {
      console.error("Erreur lors de l'effacement des DTC:", e);
      return false;
    }
  }

  sendCommand = async (command: string): Promise<string> => {
    // 1. Ajouter le retour chariot (\r) requis par l'ELM327
    const fullCommand = command + '\r';

    // 2. Convertir la chaîne en Base64 (requis par ble-plx pour l'envoi)
    const base64Command = Buffer.from(fullCommand).toString('base64');

    try {
      // 3. Écrire sur la caractéristique d'écriture du boîtier
      // On suppose que tu as stocké serviceUUID et characteristicUUID lors de la connexion
      // @ts-ignore
      await this.connectedDevice.writeCharacteristicWithResponseForService(
        SERVICE_UUID,
        WRITE_CHAR_UUID,
        base64Command,
      );

      // 4. Attendre et lire la réponse
      // Note : Dans la vraie vie, l'ELM327 peut être lent, il faut parfois
      // écouter une notification ou faire un read immédiat.
      // @ts-ignore
      const characteristic =
        // @ts-ignore
        await this.connectedDevice.readCharacteristicForService(
          SERVICE_UUID,
          READ_CHAR_UUID,
        );

      // 5. Décoder la réponse Base64 en texte brut
      return Buffer.from(characteristic.value!, 'base64').toString();
    } catch (error) {
      console.error("Erreur d'envoi OBD:", error);
      throw error;
    }
  };
}

export const obdService = new OBDService();
