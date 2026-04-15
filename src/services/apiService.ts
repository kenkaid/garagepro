// src/services/apiService.ts
import axios from 'axios';
import {ScanSession, Mechanic} from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Remplacez par votre IP VPS ou domaine
const API_BASE_URL = 'https://votre-domaine.com/api'; // ou 'http://IP_VPS:8000/api'

class APIService {
  private token: string | null = null;

  constructor() {
    this.loadToken();
  }

  private async loadToken() {
    this.token = await AsyncStorage.getItem('auth_token');
  }

  private getHeaders() {
    return {
      'Content-Type': 'application/json',
      ...(this.token ? {Authorization: `Bearer ${this.token}`} : {}),
    };
  }

  // Auth
  async login(phone: string, password: string): Promise<boolean> {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login/`, {
        phone,
        password,
      });

      this.token = response.data.token;
      await AsyncStorage.setItem('auth_token', this.token!);
      await AsyncStorage.setItem('mechanic_id', response.data.mechanic.id);

      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  }

  async register(
    mechanicData: Partial<Mechanic>,
    password: string,
  ): Promise<boolean> {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/register/`, {
        ...mechanicData,
        password,
      });

      this.token = response.data.token;
      await AsyncStorage.setItem('auth_token', this.token!);

      return true;
    } catch (error) {
      console.error('Register error:', error);
      return false;
    }
  }

  // Scans
  async saveScan(scan: ScanSession): Promise<boolean> {
    try {
      await axios.post(`${API_BASE_URL}/scans/`, scan, {
        headers: this.getHeaders(),
      });
      return true;
    } catch (error) {
      console.error('Save scan error:', error);
      // Sauvegarde locale en fallback
      await this.saveScanLocally(scan);
      return false;
    }
  }

  async getScanHistory(mechanicId: string): Promise<ScanSession[]> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/scans/?mechanic=${mechanicId}`,
        {
          headers: this.getHeaders(),
        },
      );
      return response.data;
    } catch (error) {
      // Fallback sur stockage local
      return this.getLocalScans();
    }
  }

  // Stockage local (fallback offline)
  private async saveScanLocally(scan: ScanSession): Promise<void> {
    const existing = await this.getLocalScans();
    existing.push(scan);
    await AsyncStorage.setItem('local_scans', JSON.stringify(existing));
  }

  private async getLocalScans(): Promise<ScanSession[]> {
    const data = await AsyncStorage.getItem('local_scans');
    return data ? JSON.parse(data) : [];
  }

  // Sync offline -> online
  async syncLocalScans(): Promise<number> {
    const localScans = await this.getLocalScans();
    let synced = 0;

    for (const scan of localScans) {
      const success = await this.saveScan(scan);
      if (success) {
        synced = synced + 1; // Incrémentation explicite
      }
    }

    if (synced === localScans.length) {
      await AsyncStorage.removeItem('local_scans');
    }

    return synced;
  }
}

export const apiService = new APIService();
