import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// L'URL de base sera configurée via les paramètres globaux ou une variable d'env
const BASE_URL = 'http://votre-ip-serveur/api'; 

const apiIndividualService = {
    /**
     * Récupère les données du tableau de bord pour un particulier
     */
    getDashboardData: async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            const response = await axios.get(`${BASE_URL}/personal-dashboard/`, {
                headers: { Authorization: `Token ${token}` }
            });
            return response.data;
        } catch (error) {
            console.error('Erreur lors de la récupération du dashboard personnel:', error);
            throw error;
        }
    },

    /**
     * Récupère l'historique de télémétrie pour le véhicule
     */
    getVehicleHistory: async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            const response = await axios.get(`${BASE_URL}/telemetry/`, {
                headers: { Authorization: `Token ${token}` }
            });
            return response.data;
        } catch (error) {
            console.error('Erreur lors de la récupération de l\'historique:', error);
            throw error;
        }
    },

    /**
     * Récupère les alertes prédictives actives
     */
    getActiveAlerts: async () => {
        try {
            const token = await AsyncStorage.getItem('userToken');
            const response = await axios.get(`${BASE_URL}/alerts/`, {
                headers: { Authorization: `Token ${token}` }
            });
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
            const token = await AsyncStorage.getItem('userToken');
            const response = await axios.post(`${BASE_URL}/subscriptions/`, {
                plan: planId,
                payment_method: paymentMethod
            }, {
                headers: { Authorization: `Token ${token}` }
            });
            return response.data;
        } catch (error) {
            console.error('Erreur lors de la souscription:', error);
            throw error;
        }
    }
};

export default apiIndividualService;
