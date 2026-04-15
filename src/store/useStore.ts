// src/store/useStore.ts
import {create} from 'zustand';
import {Device} from 'react-native-ble-plx';
import {OBDData, DTCCode, ScanSession, Mechanic, VehicleInfo} from '../types';

interface AppState {
  // Auth
  mechanic: Mechanic | null;
  isAuthenticated: boolean;
  setMechanic: (mechanic: Mechanic | null) => void;

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
  addDTC: (dtc: DTCCode) => void;
  clearDTCs: () => void;
  setOBDData: (data: OBDData[]) => void;
  addScanToHistory: (scan: ScanSession) => void;

  // UI
  currentScreen: string;
  setCurrentScreen: (screen: string) => void;
}

export const useStore = create<AppState>(set => ({
  // Auth
  mechanic: null,
  isAuthenticated: false,
  setMechanic: mechanic => set({mechanic, isAuthenticated: !!mechanic}),

  // OBD
  connectedDevice: null,
  vehicleInfo: {
    connected: false,
    protocol: '',
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
  addDTC: dtc =>
    set(state => ({
      currentDTCs: [...state.currentDTCs, dtc],
    })),
  clearDTCs: () => set({currentDTCs: []}),
  setOBDData: data => set({currentOBDData: data}),
  addScanToHistory: scan =>
    set(state => ({
      scanHistory: [scan, ...state.scanHistory],
    })),

  // UI
  currentScreen: 'home',
  setCurrentScreen: screen => set({currentScreen: screen}),
}));
