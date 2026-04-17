// @ts-ignore
import {apiInstance as api} from '../apiService';

const apiIndividualService = {
  /**
   * Récupère les données du tableau de bord pour un particulier
   */
  getDashboardData: async () => {
    try {
      const response = await api.get('/personal-dashboard/');
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
};

export default apiIndividualService;
