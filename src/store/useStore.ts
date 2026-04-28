// src/store/useStore.ts
import {create} from 'zustand';
import {Device} from 'react-native-ble-plx';
import {OBDData, DTCCode, ScanSession, VehicleInfo, User} from '../types';

interface AppState {
  // Auth
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;

  // OBD Connection
  connectedDevice: Device | null;
  vehicleInfo: VehicleInfo;
  isScanning: boolean;
  setConnectedDevice: (device: Device | null) => void;
  setVehicleInfo: (info: Partial<VehicleInfo>) => void;
  setIsScanning: (scanning: boolean) => void;

  // Data
  currentDTCs: DTCCode[];
  currentOBDData: OBDData[];
  scanHistory: ScanSession[];
  unreadScansCount: number;
  addDTC: (dtc: DTCCode) => void;
  clearDTCs: () => void;
  setOBDData: (data: OBDData[]) => void;
  addScanToHistory: (scan: ScanSession) => void;
  setScanHistory: (scans: ScanSession[]) => void;
  resetUnreadScans: () => void;

  // UI
  currentScreen: string;
  setCurrentScreen: (screen: string) => void;
  updateSingleOBDData: (pid: string, value: number | string) => void;
  setLivePIDData: (pid: string, value: number | string) => void;

  // Config
  isTestMode: boolean;
  setIsTestMode: (value: boolean) => void;
}

export const useStore = create<AppState>(set => ({
  // Auth
  user: null,
  isAuthenticated: false,
  setUser: user => set({user, isAuthenticated: !!user}),

  // OBD
  connectedDevice: null,
  vehicleInfo: {
    connected: false,
    protocol: 'Non détecté',
    deviceName: '',
    deviceId: '',
    vin: 'Non scanné',
  },
  isScanning: false,
  setConnectedDevice: device => set({connectedDevice: device}),
  setVehicleInfo: info =>
    set(state => ({
      vehicleInfo: {...state.vehicleInfo, ...info},
    })),
  setIsScanning: scanning => set({isScanning: scanning}),

  // Data
  currentDTCs: [],
  currentOBDData: [],
  scanHistory: [],
  unreadScansCount: 0,
  addDTC: dtc =>
    set(state => ({
      currentDTCs: [...state.currentDTCs, dtc],
    })),
  clearDTCs: () => set({currentDTCs: []}),
  setOBDData: data => set({currentOBDData: data}),
  addScanToHistory: scan =>
    set(state => ({
      scanHistory: [scan, ...state.scanHistory],
      unreadScansCount: state.unreadScansCount + 1,
    })),
  setScanHistory: scans => set({scanHistory: scans}),

  // UI
  currentScreen: 'home',
  setCurrentScreen: screen => set({currentScreen: screen}),
  resetUnreadScans: () => set({unreadScansCount: 0}),

  // Config
  isTestMode: false,
  setIsTestMode: value => set({isTestMode: value}),
  updateSingleOBDData: (pid, value) =>
    set(state => ({
      currentOBDData: state.currentOBDData.map(d =>
        d.pid === pid ? {...d, value, timestamp: Date.now()} : d,
      ),
    })),
  setLivePIDData: (pid, value) =>
    set(state => ({
      currentOBDData: state.currentOBDData.map(item =>
        item.pid === pid ? {...item, value, timestamp: Date.now()} : item,
      ),
    })),
}));
