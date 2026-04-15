// src/services/obdService.ts
import {BleManager, Device, Characteristic} from 'react-native-ble-plx';
import {PermissionsAndroid, Platform} from 'react-native';
import {OBDParser} from '../utils/obdParser';
import {getDTCInfo} from '../utils/dtcDatabase';
import {OBDData, DTCCode, VehicleInfo} from '../types';

class OBDService {
  private manager: BleManager;
  private device: Device | null = null;
  private characteristic: Characteristic | null = null;
  private responseBuffer: string = '';
  private pendingResponse: ((value: string) => void) | null = null;

  constructor() {
    this.manager = new BleManager();
  }

  // Demander permissions Bluetooth
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
    return true; // iOS gère via Info.plist
  }

  // Scanner les appareils ELM327
  async scanForDevices(timeout: number = 10000): Promise<Device[]> {
    const devices: Device[] = [];

    return new Promise(resolve => {
      this.manager.startDeviceScan(null, null, (error, device) => {
        if (error) {
          console.error('Scan error:', error);
          return;
        }

        // Filtrer les appareils ELM327 (nom typique: OBDLink, Vgate, ELM327, etc.)
        if (
          device &&
          (device.name?.includes('OBD') ||
            device.name?.includes('ELM') ||
            device.name?.includes('Vgate') ||
            device.name?.includes('Carly') ||
            device.localName?.includes('OBD'))
        ) {
          if (!devices.find(d => d.id === device.id)) {
            devices.push(device);
          }
        }
      });

      setTimeout(() => {
        this.manager.stopDeviceScan();
        resolve(devices);
      }, timeout);
    });
  }

  // Connexion à un appareil
  async connectToDevice(device: Device): Promise<boolean> {
    try {
      this.device = await this.manager.connectToDevice(device.id);
      await this.device.discoverAllServicesAndCharacteristics();

      const services = await this.device.services();
      const service = services.find(s => s.uuid.toLowerCase().includes('fff0'));

      if (!service) {
        throw new Error('Service OBD non trouvé');
      }

      const characteristics = await service.characteristics();
      this.characteristic =
        characteristics.find(
          c =>
            c.uuid.toLowerCase().includes('fff1') && c.isWritableWithResponse,
        ) || null;

      if (!this.characteristic) {
        throw new Error("Caractéristique d'écriture non trouvée");
      }

      // Écouter les notifications
      const notifyChar = characteristics.find(
        c => c.uuid.toLowerCase().includes('fff2') && c.isNotifiable,
      );

      if (notifyChar) {
        notifyChar.monitor((error, char) => {
          if (char?.value) {
            this.handleNotification(char.value);
          }
        });
      }

      // Initialisation ELM327
      await this.sendCommand('ATZ'); // Reset
      await this.delay(2000);
      await this.sendCommand('ATE0'); // Echo off
      await this.sendCommand('ATL1'); // Line feeds on
      await this.sendCommand('ATS0'); // Spaces off

      return true;
    } catch (error) {
      console.error('Connection error:', error);
      return false;
    }
  }

  // Envoyer une commande
  private async sendCommand(command: string): Promise<string> {
    if (!this.characteristic || !this.device) {
      throw new Error('Non connecté');
    }

    return new Promise((resolve, reject) => {
      this.pendingResponse = resolve;

      // Timeout de 5 secondes
      setTimeout(() => {
        if (this.pendingResponse) {
          this.pendingResponse = null;
          reject(new Error('Timeout réponse OBD'));
        }
      }, 5000);

      // Encoder et envoyer
      const data = Buffer.from(command + '\r').toString('base64');
      this.characteristic!.writeWithResponse(data).catch(reject);
    });
  }

  // Gérer les notifications BLE
  private handleNotification(base64Value: string) {
    const value = Buffer.from(base64Value, 'base64').toString('ascii');
    this.responseBuffer += value;

    // Vérifier si la réponse est complète (contient > ou prompt)
    if (
      this.responseBuffer.includes('>') ||
      this.responseBuffer.includes('OK')
    ) {
      const response = this.responseBuffer.trim();
      this.responseBuffer = '';

      if (this.pendingResponse) {
        this.pendingResponse(response);
        this.pendingResponse = null;
      }
    }
  }

  // Détecter le protocole
  async detectProtocol(): Promise<string> {
    const response = await this.sendCommand('ATDP');
    return response.replace('>', '').trim();
  }

  // Lire les codes défaut (Mode 03)
  async readDTCs(): Promise<DTCCode[]> {
    const response = await this.sendCommand('03');
    const parsed = OBDParser.parseResponse(response);

    if (!parsed || parsed.mode !== '03') {
      return [];
    }

    const dtcCodes = OBDParser.parseDTCs(parsed.data);

    return dtcCodes.map(code => {
      const info = getDTCInfo(code);
      return (
        info || {
          code,
          description: 'Code défaut non documenté',
          category: code[0] as 'P' | 'B' | 'C' | 'U',
          severity: 'medium',
          possibleCauses: ['Consulter documentation constructeur'],
          suggestedFixes: ['Diagnostic professionnel recommandé'],
        }
      );
    });
  }

  // Lire un PID spécifique (Mode 01)
  async readPID(pid: string): Promise<OBDData | null> {
    const command = `01${pid}`;
    const response = await this.sendCommand(command);
    const parsed = OBDParser.parseResponse(response);

    if (!parsed || parsed.mode !== '01' || parsed.pid !== pid.toUpperCase()) {
      return null;
    }

    const pidData = OBDParser.parsePID(pid, parsed.data);
    if (!pidData) {
      return null;
    }

    return {
      timestamp: Date.now(),
      pid: pid.toUpperCase(),
      name: pidData.name,
      value: pidData.value,
      unit: pidData.unit,
      rawData: parsed.raw,
    };
  }

  // Lire plusieurs PIDs courants
  async readCommonPIDs(): Promise<OBDData[]> {
    const pids = ['0C', '0D', '05', '0F', '11', '2F']; // RPM, Speed, Temp, etc.
    const results: OBDData[] = [];

    for (const pid of pids) {
      try {
        const data = await this.readPID(pid);
        if (data) results.push(data);
        await this.delay(100); // Petit délai entre requêtes
      } catch (e) {
        console.warn(`Erreur PID ${pid}:`, e);
      }
    }

    return results;
  }

  // Effacer les codes défaut (Mode 04) - ATTENTION
  async clearDTCs(): Promise<boolean> {
    try {
      await this.sendCommand('04');
      return true;
    } catch {
      return false;
    }
  }

  // Déconnexion
  async disconnect(): Promise<void> {
    if (this.device) {
      await this.device.cancelConnection();
      this.device = null;
      this.characteristic = null;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  get isConnected(): boolean {
    return !!this.device && !!this.characteristic;
  }
}

export const obdService = new OBDService();
