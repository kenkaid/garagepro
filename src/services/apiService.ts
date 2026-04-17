// src/services/apiService.ts
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// CONFIGURATION DE L'ADRESSE DU BACKEND
// Utiliser 'http://10.0.2.2:8000/api' pour l'émulateur Android
// Utiliser l'IP locale (ex: http://192.168.1.15:8000/api) pour un vrai téléphone
// LORS DU PASSAGE EN PROD : Modifier l'IP ci-dessous par l'adresse du VPS
const SERVER_IP = '192.168.1.5';
const BASE_URL = `http://${SERVER_IP}:8000/api`;

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Ajouter le token à chaque requête si présent
api.interceptors.request.use(async config => {
  const token = await AsyncStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Token ${token}`;
  }
  return config;
});

// Intercepteur pour gérer les erreurs globales (401, etc.)
api.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401) {
      const token = await AsyncStorage.getItem('auth_token');
      if (token) {
        console.warn('Session expirée (401). Déconnexion...');
        await AsyncStorage.removeItem('auth_token');
        // On pourrait ici ajouter une redirection globale via un EventEmitter ou le Store
      }
    }
    return Promise.reject(error);
  },
);

class APIService {
  private token: string | null = null;

  constructor() {
    this.loadToken();
  }

  private async loadToken() {
    this.token = await AsyncStorage.getItem('auth_token');
  }

  // Auth
  async login(username: string, password: string): Promise<any | null> {
    try {
      const response = await axios.post(
        `${BASE_URL.replace('/api', '')}/api-token-auth/`,
        {
          username,
          password,
        },
      );

      const {token} = response.data;
      await AsyncStorage.setItem('auth_token', token);
      this.token = token;

      // Après login, on récupère le profil complet (utilisant le nouveau format MechanicSerializer)
      return await this.getCurrentMechanic();
    } catch (error) {
      return null;
    }
  }

  async register(mechanicData: any, password: string): Promise<any | null> {
    try {
      const response = await api.post('/register/', {
        ...mechanicData,
        password,
      });

      const {token, user} = response.data;
      await AsyncStorage.setItem('auth_token', token);
      this.token = token;

      return user;
    } catch (error: any) {
      if (error.response) {
        console.error('Registration error response:', error.response.data);
      } else {
        console.error('Registration error:', error.message);
      }
      return null;
    }
  }

  // Scans
  async saveScan(scanData: any): Promise<null> {
    const token = await AsyncStorage.getItem('auth_token');
    if (!token) {
      return false;
    }

    try {
      // Formater les données pour Django
      let payload: any = {
        vehicle: scanData.vehicle || {
          license_plate: scanData.vehicleInfo?.licensePlate || 'INCONNU',
          brand: scanData.vehicleInfo?.brand || 'Inconnue',
          model: scanData.vehicleInfo?.model || 'Inconnu',
          year: scanData.vehicleInfo?.year || 2020,
          vin: scanData.vehicleInfo?.vin || '',
        },
        dtc_codes:
          scanData.dtc_codes ||
          (scanData.dtcs
            ? scanData.dtcs.map((d: any) =>
                typeof d === 'string' ? d : d.code,
              )
            : []),
        notes: scanData.notes || 'Scan effectué.',
        actual_labor_cost: scanData.actual_labor_cost || 0,
        actual_parts_cost: scanData.actual_parts_cost || 0,
        is_completed: scanData.is_completed || false,
      };

      // Si on a un ID (scan existant en historique), on l'envoie pour mise à jour
      if (scanData.id) {
        payload.id = scanData.id;
      }

      const response = await api.post('/scans/', payload);
      return response.data;
    } catch (error: any) {
      return null;
    }
  }

  async getScanHistory(): Promise<any[]> {
    const token = await AsyncStorage.getItem('auth_token');
    if (!token) {
      return [];
    }

    try {
      const response = await api.get('/scans/');
      return response.data;
    } catch (error) {
      return this.getLocalScans();
    }
  }

  async getMyReport(): Promise<any | null> {
    const token = await AsyncStorage.getItem('auth_token');
    if (!token) return null;

    try {
      const response = await api.get('/mechanics/my_report/');
      return response.data;
    } catch (error) {
      return null;
    }
  }

  // Stockage local (Offline mode)
  private async saveScanLocally(scan: any): Promise<void> {
    const existing = await this.getLocalScans();
    existing.push(scan);
    await AsyncStorage.setItem('local_scans', JSON.stringify(existing));
  }

  private async getLocalScans(): Promise<any[]> {
    const data = await AsyncStorage.getItem('local_scans');
    return data ? JSON.parse(data) : [];
  }

  async syncLocalScans(): Promise<number> {
    const localScans = await this.getLocalScans();
    if (localScans.length === 0) return 0;

    let syncedCount = 0;
    const remainingScans = [];

    for (const scan of localScans) {
      const result = await this.saveScan(scan);
      if (result) {
        syncedCount++;
      } else {
        // @ts-ignore
        remainingScans.push(scan);
      }
    }

    // Mettre à jour le stockage local avec seulement ceux qui n'ont pas pu être synchronisés
    if (remainingScans.length > 0) {
      await AsyncStorage.setItem('local_scans', JSON.stringify(remainingScans));
    } else {
      await AsyncStorage.removeItem('local_scans');
    }

    return syncedCount;
  }

  async getCurrentMechanic(): Promise<any | null> {
    const token = await AsyncStorage.getItem('auth_token');
    if (!token) return null;

    try {
      const response = await api.get('/mechanics/current/');
      return response.data;
    } catch (error) {
      // Fallback: essayer de récupérer le premier de la liste si /current/ échoue
      try {
        const fallback = await api.get('/mechanics/');
        return fallback.data[0] || null;
      } catch (e) {
        return null;
      }
    }
  }

  async updateMechanicProfile(data: any): Promise<any | null> {
    const token = await AsyncStorage.getItem('auth_token');
    if (!token) return null;

    try {
      const response = await api.patch('/mechanics/current/', data);
      return response.data;
    } catch (error) {
      return null;
    }
  }

  async changePassword(
    passwordData: any,
  ): Promise<{success: boolean; message?: string; errors?: any}> {
    const token = await AsyncStorage.getItem('auth_token');
    if (!token) {
      return {success: false, message: 'Non authentifié'};
    }

    try {
      const response = await api.post(
        '/mechanics/change_password/',
        passwordData,
      );
      return {success: true, message: response.data.message};
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.detail || 'Une erreur est survenue',
        errors: error.response?.data,
      };
    }
  }

  async getSubscriptionPlans(): Promise<any[]> {
    const token = await AsyncStorage.getItem('auth_token');
    if (!token) return [];

    try {
      const response = await api.get('/plans/');
      return response.data;
    } catch (error) {
      return [];
    }
  }

  async getSubscriptionQuotation(
    planId: number,
    months: number,
  ): Promise<any | null> {
    const token = await AsyncStorage.getItem('auth_token');
    if (!token) return null;

    try {
      const response = await api.get(
        `/plans/${planId}/get_quotation/?months=${months}`,
      );
      return response.data;
    } catch (error) {
      return null;
    }
  }

  async changeSubscriptionPlan(
    planId: number,
    transactionId: string,
    durationMonths: number = 1,
    paymentMethod: string = 'WAVE',
  ): Promise<any | null> {
    const token = await AsyncStorage.getItem('auth_token');
    if (!token) return null;

    try {
      const response = await api.post('/mechanics/change_plan/', {
        plan_id: planId,
        transaction_id: transactionId,
        duration_months: durationMonths,
        payment_method: paymentMethod,
      });
      return response.data;
    } catch (error) {
      return null;
    }
  }

  async logout(): Promise<void> {
    await AsyncStorage.removeItem('auth_token');
    this.token = null;
  }

  // Modèles de véhicules
  getAbsoluteUrl(url: string | null): string | null {
    if (!url) return null;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;

    // Si c'est une URL relative (/media/...), on ajoute la base
    const base = BASE_URL.replace('/api', '');
    return `${base}${url.startsWith('/') ? '' : '/'}${url}`;
  }

  async getVehicleModels(brand?: string): Promise<any[]> {
    const token = await AsyncStorage.getItem('auth_token');
    if (!token) {
      return [];
    }

    try {
      const url = brand
        ? `/vehicle-models/?brand=${brand}`
        : '/vehicle-models/';
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      return [];
    }
  }

  // Base de données DTC
  async getDTCReferences(query?: string, brand?: string): Promise<any[]> {
    const token = await AsyncStorage.getItem('auth_token');
    if (!token) return [];

    try {
      let url = '/dtcs/';
      const params = [];
      if (query) {
        // @ts-ignore
        params.push(`code=${query}`);
      }
      if (brand) {
        // @ts-ignore
        params.push(`brand=${brand}`);
      }

      if (params.length > 0) {
        url += '?' + params.join('&');
      }

      const response = await api.get(url);
      return response.data;
    } catch (error) {
      return [];
    }
  }

  // Recherche véhicule par plaque
  async getVehicleByPlate(plate: string): Promise<any | null> {
    const token = await AsyncStorage.getItem('auth_token');
    if (!token) {
      return null;
    }

    try {
      const response = await api.get(`/vehicles/by_plate/${plate}/`);
      return response.data;
    } catch (error) {
      return null;
    }
  }

  async getAppNews(): Promise<any[]> {
    try {
      const response = await api.get('/news/');
      return response.data;
    } catch (error) {
      return [];
    }
  }

  async getUpcomingModules(): Promise<any[]> {
    try {
      const response = await api.get('/upcoming-modules/');
      return response.data;
    } catch (error) {
      return [];
    }
  }

  async getWelcomeContent(): Promise<any[]> {
    try {
      const response = await api.get('/welcome-content/');
      // On s'assure que les URLs d'images sont absolues
      return response.data.map((item: any) => ({
        ...item,
        imageUrl: this.getAbsoluteUrl(item.imageUrl || item.image),
      }));
    } catch (error) {
      return [];
    }
  }

  async getFleetDashboard(): Promise<any> {
    try {
      const response = await api.get('/fleet-dashboard/');
      return response.data;
    } catch (error) {
      console.error('Error fetching fleet dashboard:', error);
      return null;
    }
  }

  async getPredictiveAlerts(): Promise<any[]> {
    try {
      const response = await api.get('/alerts/');
      return response.data;
    } catch (error) {
      console.error('Error fetching predictive alerts:', error);
      return [];
    }
  }
}

export const apiService = new APIService();
