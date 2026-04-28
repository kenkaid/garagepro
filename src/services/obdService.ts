// src/services/obdService.ts
import {BleManager, Device} from 'react-native-ble-plx';
import BleManagerRN from 'react-native-ble-manager';
import {PermissionsAndroid, Platform} from 'react-native';
import {Buffer} from 'buffer';
import {getDTCInfo} from '../utils/dtcDatabase';
import {DTCCode, OBDData} from '../types';
import {OBDParser} from '../utils/obdParser';

// MOCK MODE - Simule connexion OBD sans adaptateur physique
// La valeur est contrôlée dynamiquement via setMockMode() selon la config backend (GlobalSettings.is_test_mode)
let MOCK_MODE = false;
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
// Ces UUIDs sont standard pour de nombreux clones ELM327 BLE (ex: V-Link, Carista, etc.)
const SERVICE_UUID = '0000fff0-0000-1000-8000-00805f9b34fb';
const READ_CHAR_UUID = '0000fff1-0000-1000-8000-00805f9b34fb';
const WRITE_CHAR_UUID = '0000fff2-0000-1000-8000-00805f9b34fb';

// Fallback UUIDs pour d'autres modèles (ex: ELM327 BLE iCar Pro)
const ALT_SERVICE_UUID = '000018f0-0000-1000-8000-00805f9b34fb';
const ALT_CHAR_UUID = '00002af1-0000-1000-8000-00805f9b34fb';

class OBDService {
  private manager: BleManager;
  private device: Device | null = null;
  private mockConnected = false;
  private _timeout: number | undefined;
  private connectedDevice: Device | null = null;
  private isProcessing: boolean = false;
  private activeServiceUUID: string = SERVICE_UUID;
  private activeWriteCharUUID: string = WRITE_CHAR_UUID;
  private activeReadCharUUID: string = READ_CHAR_UUID;

  private reconnectTimer: NodeJS.Timeout | null = null;
  private isReconnecting: boolean = false;
  private lastDevice: Device | null = null; // Référence préservée pour la reconnexion

  constructor(device: Device | null = null) {
    this.manager = new BleManager();
    this.connectedDevice = device;
    this.setupDisconnectionHandler();
  }

  private setupDisconnectionHandler() {
    this.manager.onStateChange((state) => {
      if (state === 'PoweredOff') {
        console.log('[OBDService] Bluetooth désactivé. Déclenchement de la demande d\'activation...');
        // Au lieu d'un simple warning, on force le pop-up d'activation système
        this.ensureBluetoothEnabled().then(enabled => {
          if (enabled) {
            console.log('[OBDService] Bluetooth réactivé par l\'utilisateur, reprise de la surveillance...');
            this.handleUnexpectedDisconnection();
          } else {
            console.warn('[OBDService] L\'utilisateur a refusé d\'activer le Bluetooth.');
          }
        });
      }
    }, true);
  }

  private handleUnexpectedDisconnection() {
    if (this.isReconnecting) return;
    // Préserver lastDevice avant de nullifier pour permettre la reconnexion
    if (this.device) this.lastDevice = this.device;
    this.connectedDevice = null;
    this.device = null;
    this.startAutoReconnect();
  }

  private async startAutoReconnect() {
    const targetDevice = this.device || this.lastDevice;
    if (this.isReconnecting || !targetDevice) return;
    this.isReconnecting = true;
    console.log('[OBDService] Lancement de la procédure de reconnexion automatique...');

    let attempts = 0;
    const maxAttempts = 5;
    const delay = 5000; // 5 secondes entre chaque tentative

    const attemptReconnect = async () => {
      if (this.isConnected) {
        this.isReconnecting = false;
        return;
      }

      attempts++;
      console.log(`[OBDService] Tentative de reconnexion ${attempts}/${maxAttempts}...`);

      const success = await this.connectToDevice(targetDevice!);
      if (success) {
        console.log('[OBDService] Reconnexion automatique réussie !');
        this.isReconnecting = false;
      } else if (attempts < maxAttempts) {
        this.reconnectTimer = setTimeout(attemptReconnect, delay);
      } else {
        console.error('[OBDService] Échec de la reconnexion après plusieurs tentatives.');
        this.isReconnecting = false;
        // Ici on pourrait envoyer une notification Push locale à l'utilisateur
      }
    };

    attemptReconnect();
  }

  // Cette méthode permet de "donner" l'appareil connecté au service
  public setConnectedDevice(device: Device | null) {
    this.connectedDevice = device;
  }

  /**
   * Reconnexion manuelle à l'équipement (utilise le dernier appareil connu).
   * Retourne true si la reconnexion a réussi, false sinon.
   */
  public async reconnect(): Promise<boolean> {
    const targetDevice = this.device || this.lastDevice;
    if (!targetDevice) {
      console.warn('[OBDService] Aucun appareil connu pour la reconnexion.');
      return false;
    }
    if (this.isConnected) return true;
    console.log('[OBDService] Reconnexion manuelle en cours...');
    const success = await this.connectToDevice(targetDevice);
    if (success) {
      console.log('[OBDService] Reconnexion manuelle réussie.');
    } else {
      console.error('[OBDService] Échec de la reconnexion manuelle.');
    }
    return success;
  }

  // Active ou désactive le mode mock (contrôlé par GlobalSettings.is_test_mode du backend)
  public setMockMode(enabled: boolean) {
    MOCK_MODE = enabled;
    console.log(`[OBDService] Mode mock ${enabled ? 'ACTIVÉ' : 'DÉSACTIVÉ'}`);
  }

  public isMockMode(): boolean {
    return MOCK_MODE;
  }

  async ensureBluetoothEnabled(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return true;
    }

    try {
      // Demander les permissions d'abord
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        console.warn('[OBDService] Permissions Bluetooth non accordées');
        return false;
      }

      // Vérifier l'état actuel
      const state = await this.manager.state();
      if (state === 'PoweredOn') {
        return true;
      }

      // Utiliser react-native-ble-manager qui utilise l'Intent Android natif ACTION_REQUEST_ENABLE
      // C'est la seule méthode qui fonctionne sur Android 12+
      console.log('[DEBUG_LOG] [OBDService] Initialisation BleManagerRN...');
      await BleManagerRN.start({showAlert: true});
      console.log('[DEBUG_LOG] [OBDService] Appel enableBluetooth() via Intent natif Android...');
      await BleManagerRN.enableBluetooth();
      console.log('[DEBUG_LOG] [OBDService] enableBluetooth() réussi ou Intent lancé');
      return true;
    } catch (error: any) {
      console.error('[OBDService] Erreur activation Bluetooth:', error);
      return false;
    }
  }

  async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'android') {
      console.log('[OBDService] requestPermissions: Demande de permissions...');

      const permissions = [
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ];

      // Bluetooth permissions for Android 12+
      if (Platform.Version >= 31) {
        permissions.push(
          // @ts-ignore
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          // @ts-ignore
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        );
      } else {
        // @ts-ignore
        permissions.push(PermissionsAndroid.PERMISSIONS.BLUETOOTH);
      }

      const granted = await PermissionsAndroid.requestMultiple(permissions);

      console.log('[OBDService] requestPermissions: Résultats =', granted);

      const allGranted = Object.values(granted).every(
        p => p === PermissionsAndroid.RESULTS.GRANTED,
      );

      if (!allGranted) {
        console.warn(
          '[OBDService] requestPermissions: Certaines permissions ont été refusées',
        );
      }

      return allGranted;
    }
    return true;
  }

  async scanForDevices(timeout: number = 15000): Promise<Device[]> {
    this._timeout = timeout;

    // S'assurer que le Bluetooth est activé avant de scanner
    const enabled = await this.ensureBluetoothEnabled();
    if (!enabled && !MOCK_MODE) {
      console.warn(
        '[OBDService] scanForDevices: Scan annulé car le Bluetooth n\'est pas actif',
      );
      return [];
    }

    if (MOCK_MODE) {
      // Simule un délai de scan puis retourne le mock
      await new Promise(resolve => setTimeout(resolve, 2000));
      return [MOCK_DEVICE];
    }

    return new Promise((resolve, reject) => {
      const devices: Map<string, Device> = new Map();

      console.log('[OBDService] Début du scan réel...');

      this.manager.startDeviceScan(
        null, // Scanner tous les services
        {allowDuplicates: false},
        (error, device) => {
          if (error) {
            console.error('[OBDService] Erreur pendant le scan:', error);
            this.manager.stopDeviceScan();
            resolve(Array.from(devices.values()));
            return;
          }

          if (device) {
            // On filtre souvent par nom pour trouver l'ELM327
            // ou on affiche tout pour laisser l'utilisateur choisir
            if (device.name) {
              devices.set(device.id, device);
              console.log(
                `[OBDService] Appareil trouvé: ${device.name} (${device.id})`,
              );
            }
          }
        },
      );

      // Arrêter le scan après le timeout
      setTimeout(() => {
        console.log('[OBDService] Fin du scan (timeout)');
        this.manager.stopDeviceScan();
        resolve(Array.from(devices.values()));
      }, timeout);
    });
  }

  async connectToDevice(device: Device): Promise<boolean> {
    this.device = device;
    this.lastDevice = device; // Toujours mémoriser le dernier appareil tenté

    // S'assurer que le Bluetooth est activé avant de se connecter
    await this.ensureBluetoothEnabled();

    if (MOCK_MODE) {
      this.device = MOCK_DEVICE;
      this.mockConnected = true;
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simule connexion
      return true;
    }

    try {
      console.log(`[OBDService] Connexion à ${device.name || device.id}...`);
      const connectedDevice = await this.manager.connectToDevice(device.id);

      // S'abonner à la déconnexion inattendue
      connectedDevice.onDisconnected((error, disconnectedDevice) => {
        console.warn(`[OBDService] Appareil déconnecté: ${disconnectedDevice.id}`);
        this.handleUnexpectedDisconnection();
      });

      console.log('[OBDService] Connecté, découverte des services...');
      await connectedDevice.discoverAllServicesAndCharacteristics();

      // Détection automatique des UUIDs si possible
      const services = await connectedDevice.services();
      console.log(
        '[OBDService] Services trouvés:',
        services.map(s => s.uuid),
      );

      // Log détaillé de TOUS les services et caractéristiques pour diagnostic
      for (const service of services) {
        const chars = await connectedDevice.characteristicsForService(service.uuid);
        console.log(`[OBDService] SERVICE: ${service.uuid}`);
        for (const c of chars) {
          console.log(`[OBDService]   CHAR: ${c.uuid} | isWritable: ${c.isWritableWithResponse} | isWritableNoResp: ${c.isWritableWithoutResponse} | isReadable: ${c.isReadable} | isNotifiable: ${c.isNotifiable}`);
        }
      }

      // Logique simple pour basculer sur ALT si le service FFF0 n'est pas présent
      const hasFFF0 = services.some(s => s.uuid.toLowerCase().includes('fff0'));
      if (!hasFFF0) {
        const has18F0 = services.some(s =>
          s.uuid.toLowerCase().includes('18f0'),
        );
        if (has18F0) {
          console.log('[OBDService] Utilisation des UUIDs alternatifs (18F0)');
          this.activeServiceUUID = ALT_SERVICE_UUID;
          this.activeWriteCharUUID = ALT_CHAR_UUID;
          this.activeReadCharUUID = ALT_CHAR_UUID;
        }
      } else {
        this.activeServiceUUID = SERVICE_UUID;
        this.activeWriteCharUUID = WRITE_CHAR_UUID;
        this.activeReadCharUUID = READ_CHAR_UUID;
      }

      this.connectedDevice = connectedDevice;
      this.device = connectedDevice;
      console.log('[OBDService] Services découverts et configurés');
      return true;
    } catch (error) {
      console.error('[OBDService] Erreur de connexion:', error);
      return false;
    }
  }

  async detectProtocol(): Promise<string> {
    return MOCK_MODE ? 'ISO 15765-4 CAN (11 bit ID, 500 kbaud)' : 'UNKNOWN';
  }

  async readDTCs(scanType: string = 'standard'): Promise<DTCCode[]> {
    if (MOCK_MODE) {
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Génération aléatoire de codes erreurs pour les tests
      const standardCodes = [
        { code: 'P0300', status: 'confirmed' },
        { code: 'P0171', status: 'confirmed' },
        { code: 'P0562', status: 'pending' },
        { code: 'P0301', status: 'confirmed' },
        { code: 'P0101', status: 'confirmed' },
        { code: 'P0420', status: 'permanent' },
        { code: 'P0500', status: 'confirmed' },
        { code: 'P0606', status: 'confirmed' },
        { code: 'U0001', status: 'pending' },
        { code: 'U0100', status: 'confirmed' }
      ];

      const expertCodes = [
        { code: 'C0035', status: 'confirmed' },
        { code: 'C0040', status: 'confirmed' },
        { code: 'B0001', status: 'confirmed' },
        { code: 'B0020', status: 'confirmed' },
        { code: 'B1234', status: 'pending' },
        { code: 'C1234', status: 'confirmed' }
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
        const selected = expertCodes[Math.floor(Math.random() * expertCodes.length)];
        const info = await getDTCInfo(selected.code);
        return [{ ...info, status: selected.status as any }];
      }

      if (count === 0) return [];

      // Mélanger et prendre les 'count' premiers
      const shuffled = [...allAvailableCodes].sort(() => 0.5 - Math.random());
      const selectedItems = shuffled.slice(0, count);

      const codes = await Promise.all(selectedItems.map(async item => {
        const info = await getDTCInfo(item.code);
        return { ...info, status: item.status as any };
      }));
      return codes;
    }

    try {
      if (!this.isConnected) {
        throw new Error('Non connecté à un appareil OBD');
      }

      // Utilisation d'un Map pour dédupliquer par code tout en gardant le statut le plus "grave"
      // Priorité : permanent > confirmed > pending
      const dtcMap = new Map<string, DTCCode>();
      const addCode = async (code: string, status: 'confirmed' | 'pending' | 'permanent') => {
        if (!code) return;
        
        const existing = dtcMap.get(code);
        if (existing) {
          // Si déjà présent, on met à jour le statut selon la priorité
          if (status === 'permanent') existing.status = 'permanent';
          else if (status === 'confirmed' && existing.status === 'pending') existing.status = 'confirmed';
          return;
        }

        const info = await getDTCInfo(code);
        dtcMap.set(code, { ...info, status });
      };

      // --- Mode 03 : codes confirmés ---
      try {
        const resp03 = await this.sendCommand('03');
        console.log('[OBDService] Réponse Mode 03 (confirmés):', resp03);
        const parsed = OBDParser.parseDTCs(resp03);
        for (const c of parsed) await addCode(c, 'confirmed');
      } catch (e) {
        console.warn('[OBDService] Mode 03 non supporté:', e);
      }

      // --- Mode 07 : codes en attente (pending) ---
      try {
        const resp07 = await this.sendCommand('07');
        console.log('[OBDService] Réponse Mode 07 (pending):', resp07);
        if (!resp07.includes('NO DATA') && !resp07.includes('ERROR')) {
          const parsed = OBDParser.parseDTCs(resp07.replace(/^47/, '43'));
          for (const c of parsed) await addCode(c, 'pending');
        }
      } catch (e) {
        console.warn('[OBDService] Mode 07 non supporté:', e);
      }

      // --- Mode 0A : codes permanents ---
      try {
        const resp0A = await this.sendCommand('0A');
        console.log('[OBDService] Réponse Mode 0A (permanents):', resp0A);
        if (!resp0A.includes('NO DATA') && !resp0A.includes('ERROR')) {
          const parsed = OBDParser.parseDTCs(resp0A.replace(/^4A/, '43'));
          for (const c of parsed) await addCode(c, 'permanent');
        }
      } catch (e) {
        console.warn('[OBDService] Mode 0A non supporté:', e);
      }

      // --- Mode étendu UDS 19 02 09 ---
      try {
        const resp19 = await this.sendCommand('19 02 09');
        console.log('[OBDService] Réponse Mode 19 (tous systèmes):', resp19);
        if (!resp19.includes('NO DATA') && !resp19.includes('ERROR') && !resp19.includes('?')) {
          const parsed = OBDParser.parseDTCsExtended(resp19);
          for (const c of parsed) await addCode(c, 'confirmed');
        }
      } catch (e) {
        console.warn('[OBDService] Mode 19 non supporté:', e);
      }

      // --- SRS Airbag ---
      try {
        await this.sendCommand('AT SH 7DF');
        const respSRS = await this.sendCommand('19 02 AF');
        console.log('[OBDService] Réponse SRS Airbag:', respSRS);
        if (!respSRS.includes('NO DATA') && !respSRS.includes('ERROR') && !respSRS.includes('?')) {
          const parsed = OBDParser.parseDTCsExtended(respSRS);
          for (const c of parsed) await addCode(c, 'confirmed');
        }
      } catch (e) {
        console.warn('[OBDService] Lecture SRS non supportée:', e);
      }

      // --- ABS ECU ---
      try {
        await this.sendCommand('AT SH 7B0');
        const respABS = await this.sendCommand('03');
        console.log('[OBDService] Réponse ABS ECU:', respABS);
        if (!respABS.includes('NO DATA') && !respABS.includes('ERROR') && !respABS.includes('?')) {
          const parsed = OBDParser.parseDTCs(respABS);
          for (const c of parsed) await addCode(c, 'confirmed');
        }
      } catch (e) {
        console.warn('[OBDService] Lecture ABS non supportée:', e);
      }

      // Remettre le header par défaut
      try { await this.sendCommand('AT SH 7DF'); } catch (_) {}

      return Array.from(dtcMap.values());
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

    // Lecture réelle via ELM327
    if (!this.isConnected) {
      return null;
    }

    // Métadonnées des PIDs connus
    const pidMeta: Record<string, {name: string; unit: string; parse: (bytes: number[]) => number}> = {
      '0C': {
        name: 'Régime moteur',
        unit: 'tr/min',
        parse: (b) => ((b[0] * 256 + b[1]) / 4),
      },
      '0D': {
        name: 'Vitesse véhicule',
        unit: 'km/h',
        parse: (b) => b[0],
      },
      '05': {
        name: 'Température liquide',
        unit: '°C',
        parse: (b) => b[0] - 40,
      },
      '0F': {
        name: 'Température air admission',
        unit: '°C',
        parse: (b) => b[0] - 40,
      },
      '11': {
        name: 'Position papillon',
        unit: '%',
        parse: (b) => (b[0] * 100) / 255,
      },
      '2F': {
        name: 'Niveau carburant',
        unit: '%',
        parse: (b) => (b[0] * 100) / 255,
      },
    };

    const meta = pidMeta[pid.toUpperCase()];
    if (!meta) {
      return null;
    }

    try {
      const command = `01 ${pid.toUpperCase()}`;
      const response = await this.sendCommand(command, 3000);

      // La réponse ELM327 pour Mode 01 est de la forme "41 0C XX YY"
      // On cherche la ligne qui commence par "41 XX" (41 = 0x40 + 0x01)
      const pidHex = pid.toUpperCase();
      const lines = response.split(' ').join('').toUpperCase();
      const marker = `41${pidHex}`;
      const idx = lines.indexOf(marker);
      if (idx === -1) {
        return null;
      }

      // Extraire les octets de données après "41 XX"
      const dataHex = lines.substring(idx + marker.length);
      const bytes: number[] = [];
      for (let i = 0; i + 1 < dataHex.length; i += 2) {
        bytes.push(parseInt(dataHex.substring(i, i + 2), 16));
      }

      if (bytes.length === 0) {
        return null;
      }

      const value = meta.parse(bytes);

      return {
        timestamp: Date.now(),
        pid: pid.toUpperCase(),
        name: meta.name,
        value,
        unit: meta.unit,
        rawData: response,
      };
    } catch (e) {
      console.warn(`[OBDService] Erreur lecture PID ${pid}:`, e);
      return null;
    }
  }

  async readCommonPIDs(): Promise<OBDData[]> {
    const pids = ['0C', '0D', '05', '0F', '11', '2F'];
    const results: OBDData[] = [];

    for (const pid of pids) {
      const data = await this.readPID(pid);
      if (data) {
        results.push(data);
      }
      // Délai entre chaque commande pour ne pas saturer l'ELM327 (mock ou réel)
      await new Promise(resolve => setTimeout(resolve, MOCK_MODE ? 200 : 150));
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
    if (this.device && !MOCK_MODE) {
      try {
        await this.manager.cancelDeviceConnection(this.device.id);
      } catch (error) {
        console.error('[OBDService] Erreur lors de la déconnexion:', error);
      }
    }
    this.mockConnected = false;
    this.device = null;
    this.connectedDevice = null;
  }

  get isConnected(): boolean {
    return MOCK_MODE ? this.mockConnected : (this.device !== null && this.connectedDevice !== null);
  }

  async clearAllDTCs(): Promise<boolean> {
    if (MOCK_MODE) {
      // Simule un délai de traitement par le calculateur
      await new Promise(resolve => setTimeout(resolve, 1500));
      console.log('Mode Test : Codes défauts effacés avec succès.');
      return true;
    }

    if (!this.isConnected) {
      throw new Error('Non connecté à un périphérique OBD');
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

  sendCommand = async (command: string, timeoutMs: number = 3000): Promise<string> => {
    if (!this.isConnected || !this.connectedDevice) {
      throw new Error('Non connecté à un périphérique OBD');
    }

    // 1. Ajouter le retour chariot (\r) requis par l'ELM327
    const fullCommand = command + '\r';

    // 2. Convertir la chaîne en Base64 (requis par ble-plx pour l'envoi)
    const base64Command = Buffer.from(fullCommand).toString('base64');

    console.log(`[OBDService] Envoi commande: ${command}`);

    return new Promise(async (resolve, reject) => {
      let responseBuffer = '';
      let subscription: any = null;
      let timer: any = null;
      let settled = false;

      const cleanup = () => {
        if (subscription) {
          subscription.remove();
          subscription = null;
        }
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
      };

      // 3. S'abonner aux notifications AVANT d'envoyer la commande
      // FFF1 est notifiable (isNotifiable: true) — c'est ainsi que l'ELM327 répond
      try {
        subscription = this.connectedDevice!.monitorCharacteristicForService(
          this.activeServiceUUID,
          this.activeReadCharUUID,
          (error, characteristic) => {
            if (error) {
              if (settled) {
                // Erreur attendue après subscription.remove() — on l'ignore
                return;
              }
              console.error('[OBDService] Erreur notification:', error);
              cleanup();
              settled = true;
              reject(error);
              return;
            }
            if (characteristic?.value) {
              const chunk = Buffer.from(characteristic.value, 'base64').toString();
              console.log(`[OBDService] Chunk reçu: ${JSON.stringify(chunk)}`);
              responseBuffer += chunk;

              // L'ELM327 termine toujours sa réponse par '>'
              if (responseBuffer.includes('>')) {
                cleanup();
                // Supprimer le '>' et filtrer l'écho de la commande envoyée
                const lines = responseBuffer
                  .replace(/>/g, '')
                  .split(/\r|\n/)
                  .map(l => l.trim())
                  .filter(l => l.length > 0 && l !== command.trim());
                const response = lines.join(' ');
                console.log(`[OBDService] Réponse complète: ${response}`);
                settled = true;
                resolve(response);
              }
            }
          },
        );
      } catch (e) {
        cleanup();
        reject(e);
        return;
      }

      // 4. Timeout de sécurité
      timer = setTimeout(() => {
        console.warn(`[OBDService] Timeout commande ${command}, buffer: ${responseBuffer}`);
        cleanup();
        settled = true;
        if (responseBuffer.length > 0) {
          resolve(responseBuffer.trim());
        } else {
          reject(new Error(`Timeout: pas de réponse pour la commande ${command}`));
        }
      }, timeoutMs);

      // 5. Envoyer la commande (écriture sans réponse, FFF2 supporte isWritableNoResp)
      try {
        await this.connectedDevice!.writeCharacteristicWithoutResponseForService(
          this.activeServiceUUID,
          this.activeWriteCharUUID,
          base64Command,
        );
      } catch (e) {
        cleanup();
        reject(e);
      }
    });
  };
}

export const obdService = new OBDService();
