// src/services/apiService.ts
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {BASE_URL} from '../config/serverConfig';

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const apiInstance = api;

// Ajouter le token à chaque requête si présent
api.interceptors.request.use(async config => {
  // On utilise apiService.getToken() pour avoir le token le plus à jour (mémoire ou storage)
  const token = await apiService.getToken();
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

  async getToken() {
    if (this.token === null) {
      await this.loadToken();
    }
    // Si le token est une chaîne vide (après logout), on considère qu'il n'y a pas de token
    return this.token || null;
  }

  // Auth
  async login(
    username: string,
    password: string,
    rememberMe: boolean = true,
  ): Promise<any | null> {
    try {
      const response = await axios.post(
        `${BASE_URL.replace('/api', '')}/api-token-auth/`,
        {
          username,
          password,
        },
      );

      const {token} = response.data;
      if (rememberMe) {
        await AsyncStorage.setItem('auth_token', token);
      } else {
        await AsyncStorage.removeItem('auth_token');
      }
      this.token = token;

      // Après login, on récupère le profil complet (utilisant le nouveau format MechanicSerializer)
      return await this.getCurrentUser();
    } catch (error) {
      return null;
    }
  }

  async register(userData: any, password: string): Promise<any | null> {
    try {
      const response = await api.post('/register/', {
        ...userData,
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
  async saveScan(scanData: any): Promise<any | null> {
    const token = await AsyncStorage.getItem('auth_token');
    if (!token) {
      return null;
    }

    try {
      // Formater les données pour Django
      // Normalisation du véhicule : supporte les deux formats (vehicle imbriqué ou vehicleInfo)
      const vehicleInfo = scanData.vehicleInfo || {};
      let payload: any = {
        vehicle: scanData.vehicle || {
          license_plate:
            (vehicleInfo as any).licensePlate ||
            (vehicleInfo as any).license_plate ||
            'INCONNU',
          brand: (vehicleInfo as any).brand || 'Inconnue',
          model: (vehicleInfo as any).model || 'Inconnu',
          year: (vehicleInfo as any).year || 2020,
          vin: (vehicleInfo as any).vin || '',
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
        scan_type: scanData.scan_type || 'DIAGNOSTIC',
        mileage_data: {
          mileage_ecu: scanData.mileage_ecu,
          mileage_abs: scanData.mileage_abs,
          mileage_dashboard: scanData.mileage_dashboard,
        },
        safety_data: scanData.safety_check,
      };

      // Si on a un ID numérique (scan existant en historique), on l'envoie pour mise à jour
      // On ignore les IDs temporaires locaux (générés par Date.now() sous forme de string)
      const scanId = scanData.id;
      if (scanId && typeof scanId === 'number') {
        payload.id = scanId;
      } else if (
        scanId &&
        typeof scanId === 'string' &&
        /^\d{1,10}$/.test(scanId)
      ) {
        // ID numérique court = ID base de données réel (pas un timestamp)
        payload.id = parseInt(scanId, 10);
      }

      const response = await api.post('/scans/', payload);
      return response.data;
    } catch (error: any) {
      if (error?.response) {
        console.error(
          '[saveScan] Erreur serveur:',
          error.response.status,
          JSON.stringify(error.response.data),
        );
      } else {
        console.error('[saveScan] Erreur réseau:', error?.message);
      }
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
    if (!token) {
      return null;
    }

    try {
      const response = await api.get('/users/my_report/');
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

  async getCurrentUser(): Promise<any | null> {
    const token = await this.getToken();
    if (!token) {
      return null;
    }

    try {
      const response = await api.get('/users/current/');
      return response.data;
    } catch (error) {
      // Fallback: essayer de récupérer le premier de la liste si /current/ échoue
      try {
        const fallback = await api.get('/users/');
        return fallback.data[0] || null;
      } catch (e) {
        return null;
      }
    }
  }

  async updateUserProfile(data: any): Promise<any | null> {
    const token = await this.getToken();
    if (!token) {
      return null;
    }

    try {
      const response = await api.patch('/users/current/', data);
      return response.data;
    } catch (error) {
      return null;
    }
  }

  async changePassword(
    passwordData: any,
  ): Promise<{success: boolean; message?: string; errors?: any}> {
    const token = await this.getToken();
    if (!token) {
      return {success: false, message: 'Non authentifié'};
    }

    try {
      const response = await api.post('/users/change_password/', passwordData);
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
    const token = await this.getToken();
    if (!token) {
      return [];
    }

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
    const token = await this.getToken();
    if (!token) {
      return null;
    }

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
      const response = await api.post('/users/change_plan/', {
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

  async initWavePayment(
    planId: number,
    durationMonths: number = 1,
  ): Promise<any | null> {
    const token = await this.getToken();
    if (!token) {
      return null;
    }

    try {
      console.log('[DEBUG_LOG] Requesting /payments/wave/init/ with:', {
        plan_id: planId,
        duration_months: durationMonths,
      });
      const response = await api.post('/payments/wave/init/', {
        plan_id: planId,
        duration_months: durationMonths,
      });
      console.log('[DEBUG_LOG] Wave init response:', response.data);
      return response.data;
    } catch (error: any) {
      if (error.response) {
        console.error(
          '[DEBUG_LOG] Wave init error response:',
          error.response.status,
          error.response.data,
        );
      } else if (error.request) {
        console.error(
          '[DEBUG_LOG] Wave init no response received:',
          error.request,
        );
      } else {
        console.error('[DEBUG_LOG] Wave init error setup:', error.message);
      }
      return null;
    }
  }

  async logout(): Promise<void> {
    // On vide le token en mémoire et en storage immédiatement
    // pour que les polling asynchrones voient qu'il n'y a plus de session.
    this.token = '';
    await AsyncStorage.removeItem('auth_token');
  }

  // Modèles de véhicules
  getAbsoluteUrl(url: string | null): string | null {
    if (!url) {
      return null;
    }
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

  async getAppConfig(): Promise<{is_test_mode: boolean} | null> {
    try {
      const response = await api.get('/app-config/');
      return response.data;
    } catch (error) {
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
  async getNotifications(): Promise<any[]> {
    try {
      const token = await this.getToken();
      if (!token) return [];

      const response = await api.get('/notifications/');
      console.log('[getNotifications] count:', response.data?.length);
      return response.data;
    } catch (error: any) {
      if (error?.response?.status === 401) return []; // Évite les logs d'erreurs lors du logout
      console.error('[getNotifications] ERREUR:', error?.response?.status, error?.message);
      return [];
    }
  }

  async markNotificationsRead(): Promise<boolean> {
    try {
      const token = await this.getToken();
      if (!token) return false;

      await api.post('/notifications/mark_all_read/');
      return true;
    } catch (error) {
      return false;
    }
  }

  async markNotificationRead(id: number): Promise<boolean> {
    try {
      const token = await this.getToken();
      if (!token) return false;

      await api.post(`/notifications/${id}/mark_read/`);
      return true;
    } catch (error) {
      return false;
    }
  }

  async getUnreadNotificationsCount(type?: string): Promise<number> {
    try {
      const token = await this.getToken();
      if (!token) return 0;

      const url = type ? `/notifications/unread_count/?type=${type}` : '/notifications/unread_count/';
      const response = await api.get(url);
      console.log('[unread_count] response:', response.data);
      return response.data.unread_count || 0;
    } catch (error: any) {
      if (error?.response?.status === 401) return 0; // Évite les logs d'erreurs lors du logout
      console.error('[unread_count] ERREUR:', error?.response?.status, error?.message);
      return 0;
    }
  }

  // Messagerie / Chat
  async getMessages(appointmentId?: number, otherUserId?: number): Promise<any[]> {
    try {
      let url = '/messages/';
      const params = [];
      if (appointmentId) params.push(`appointment=${appointmentId}`);
      if (otherUserId) params.push(`other_user=${otherUserId}`);

      if (params.length > 0) {
        url += '?' + params.join('&');
      }

      const response = await api.get(url);
      return response.data;
    } catch (error) {
      return [];
    }
  }

  async getConversations(): Promise<any[]> {
    try {
      const response = await api.get('/messages/conversations/');
      return response.data;
    } catch (error) {
      console.error('[getConversations] Erreur:', error);
      return [];
    }
  }

  async markChatAsRead(params: {appointment_id?: number; other_user_id?: number}): Promise<boolean> {
    try {
      await api.post('/messages/mark_as_read/', params);
      return true;
    } catch (error) {
      console.error('[markChatAsRead] Erreur:', error);
      return false;
    }
  }

  async analyzeDTCs(dtcCodes: string[], vehicleInfo?: {brand?: string; model?: string; year?: number}): Promise<any> {
    try {
      const body: any = {dtc_codes: dtcCodes};
      if (vehicleInfo) body.vehicle_info = vehicleInfo;
      const response = await api.post('/scans/analyze_dtcs/', body);
      return response.data;
    } catch (error: any) {
      console.error('[analyzeDTCs] Erreur:', error?.response?.status, error?.message);
      return null;
    }
  }

  async analyzeLive(pids: {pid: string; value: number; unit?: string}[], vehicleId?: number): Promise<any> {
    try {
      const body: any = {pids};
      if (vehicleId) body.vehicle_id = vehicleId;
      const response = await api.post('/scans/analyze_live/', body);
      return response.data;
    } catch (error: any) {
      console.error('[analyzeLive] Erreur:', error?.response?.status, error?.message);
      return null;
    }
  }

  async searchClients(query: string): Promise<any[]> {
    try {
      const response = await api.get(`/clients/search/?q=${encodeURIComponent(query)}`);
      return response.data;
    } catch (error) {
      console.error('[searchClients] Erreur:', error);
      return [];
    }
  }

  async updateScan(scanId: number, data: any): Promise<any> {
    try {
      const response = await api.patch(`/scans/${scanId}/`, data);
      return response.data;
    } catch (error: any) {
      console.error('[updateScan] Erreur:', error?.response?.status, error?.message);
      return null;
    }
  }

  async sendMessage(receiverId: number, message: string, appointmentId?: number): Promise<any> {
    try {
      if (!receiverId) {
        console.error('[sendMessage] receiverId est undefined ou null !');
        return null;
      }
      const body: any = {
        receiver: receiverId,
        message: message,
      };
      if (appointmentId) {
        body.appointment = appointmentId;
      }
      const response = await api.post('/messages/', body);
      return response.data;
    } catch (error: any) {
      const status = error?.response?.status;
      const data = error?.response?.data;
      console.error('[sendMessage] Erreur API:', status, JSON.stringify(data));
      // Retourner l'erreur pour que le ChatScreen puisse l'afficher
      return {__error: true, status, data};
    }
  }

  // Appointments
  async getAppointments(): Promise<any[]> {
    try {
      const response = await api.get('/appointments/');
      return response.data;
    } catch (error) {
      console.error('[getAppointments] Erreur:', error);
      return [];
    }
  }

  async updateAppointmentStatus(appointmentId: number, status: string): Promise<any> {
    try {
      const response = await api.patch(`/appointments/${appointmentId}/change_status/`, {status});
      return response.data;
    } catch (error) {
      console.error('[updateAppointmentStatus] Erreur:', error);
      return null;
    }
  }

  // Experts / Géolocalisation
  async registerAsExpert(latitude: number, longitude: number, specialties: string, isExpert: boolean = true): Promise<any> {
    try {
      const response = await api.post('/users/register_expert/', {
        latitude,
        longitude,
        specialties,
        is_expert: isExpert,
      });
      return response.data;
    } catch (error: any) {
      console.error('[registerAsExpert] Erreur:', error?.response?.status, error?.message);
      return null;
    }
  }

  async getNearbyMechanics(lat: number, lng: number, radius: number = 20): Promise<any[]> {
    try {
      const response = await api.get(`/users/nearby/?lat=${lat}&lng=${lng}&radius=${radius}`);
      return response.data;
    } catch (error: any) {
      console.error('[getNearbyMechanics] Erreur:', error?.response?.status, error?.message);
      return [];
    }
  }

  async getNearbySparePartStores(lat: number, lng: number, radius: number = 20): Promise<any[]> {
    try {
      const response = await api.get(`/spare-part-stores/nearby/?lat=${lat}&lng=${lng}&radius=${radius}`);
      return response.data;
    } catch (error: any) {
      console.error('[getNearbySparePartStores] Erreur:', error?.response?.status, error?.message);
      return [];
    }
  }

  async getSpareParts(dtcCode?: string): Promise<any[]> {
    try {
      const url = dtcCode ? `/spare-parts/?dtc_code=${dtcCode}` : '/spare-parts/';
      const response = await api.get(url);
      return response.data;
    } catch (error: any) {
      console.error('[getSpareParts] Erreur:', error?.response?.status, error?.message);
      return [];
    }
  }
}

export const apiService = new APIService();
