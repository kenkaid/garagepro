// @ts-ignore
import {apiInstance as api} from '../apiService';

const apiIndividualService = {
  /**
   * Récupère les données du tableau de bord pour un particulier
   */
  getDashboardData: async (lat?: number, lng?: number) => {
    try {
      let url = '/personal-dashboard/';
      if (lat && lng) {
        url += `?lat=${lat}&lng=${lng}`;
      }
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      console.error(
        'Erreur lors de la récupération du dashboard personnel:',
        error,
      );
      throw error;
    }
  },

  /**
   * Récupère l'historique de télémétrie pour le véhicule
   */
  getVehicleHistory: async () => {
    try {
      const response = await api.get('/telemetry/');
      return response.data;
    } catch (error) {
      console.error("Erreur lors de la récupération de l'historique:", error);
      throw error;
    }
  },

  /**
   * Récupère les alertes prédictives actives
   */
  getActiveAlerts: async () => {
    try {
      const response = await api.get('/alerts/');
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des alertes:', error);
      throw error;
    }
  },

  /**
   * Souscription à un plan personnel
   */
  subscribeToPlan: async (planId: number, paymentMethod: string) => {
    try {
      const response = await api.post('/subscriptions/', {
        plan: planId,
        payment_method: paymentMethod,
      });
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la souscription:', error);
      throw error;
    }
  },

  /**
   * Ajoute un véhicule pour le particulier connecté
   */
  addVehicle: async (vehicleData: any) => {
    try {
      const response = await api.post('/vehicles/', {
        ...vehicleData,
        owner_type: 'INDIVIDUAL', // Indication pour le backend si nécessaire
      });
      return response.data;
    } catch (error) {
      console.error("Erreur lors de l'ajout du véhicule:", error);
      throw error;
    }
  },

  /**
   * Met à jour un véhicule existant
   */
  updateVehicle: async (id: number | string, vehicleData: any) => {
    try {
      const response = await api.patch(`/vehicles/${id}/`, vehicleData);
      return response.data;
    } catch (error) {
      console.error("Erreur lors de la mise à jour du véhicule:", error);
      throw error;
    }
  },

  /**
   * Créer un rendez-vous chez un mécanicien
   */
  createAppointment: async (appointmentData: {
    mechanic: number;
    appointment_date: string;
    reason?: string;
    vehicle?: number;
  }) => {
    try {
      const response = await api.post('/appointments/', appointmentData);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la création du rendez-vous:', error);
      throw error;
    }
  },

  /**
   * Liste les rendez-vous du particulier
   */
  getAppointments: async () => {
    try {
      const response = await api.get('/appointments/');
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des rendez-vous:', error);
      throw error;
    }
  },

  /**
   * Récupère la liste des garages experts à proximité
   */
  getNearbyGarages: async (lat?: number, lng?: number) => {
    try {
      let url = '/users/nearby/';
      if (lat && lng) {
        url += `?lat=${lat}&lng=${lng}`;
      } else {
        // Coordonnées par défaut (Abidjan) si non fournies
        url += `?lat=5.3484&lng=-4.0305`;
      }
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des garages:', error);
      throw error;
    }
  },

  /**
   * Récupère tous les rappels d'entretien
   */
  getReminders: async () => {
    try {
      const response = await api.get('/reminders/');
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des rappels:', error);
      throw error;
    }
  },

  /**
   * Marque un rappel comme effectué
   */
  markReminderCompleted: async (reminderId: number) => {
    try {
      const response = await api.post(`/reminders/${reminderId}/mark_completed/`);
      return response.data;
    } catch (error) {
      console.error('Erreur lors du marquage du rappel:', error);
      throw error;
    }
  },

  /**
   * Soumet une note pour un mécanicien
   */
  submitReview: async (reviewData: {
    mechanic: number;
    rating: number;
    comment?: string;
    scan_session?: number;
    appointment?: number;
  }) => {
    try {
      const response = await api.post('/reviews/', reviewData);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la soumission de la note:', error);
      throw error;
    }
  },

  /**
   * Récupère les magasins de pièces détachées à proximité
   */
  getNearbySparePartStores: async (lat?: number, lng?: number) => {
    try {
      let url = '/spare-part-stores/nearby/';
      if (lat && lng) {
        url += `?lat=${lat}&lng=${lng}`;
      }
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des magasins de pièces:', error);
      throw error;
    }
  },
};

export default apiIndividualService;
