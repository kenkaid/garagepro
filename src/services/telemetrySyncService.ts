import apiIndividualService from './individual/apiIndividualService';
// @ts-ignore
import {apiInstance as api} from './apiService';

/**
 * Service gérant la collecte et la synchronisation de la télémétrie mobile (ELM327).
 */
class TelemetrySyncService {
  private interval: NodeJS.Timeout | null = null;
  private currentVehicleId: number | null = null;
  private lastData: any = null;

  /**
   * Démarre la synchronisation périodique
   * Intègre désormais une logique de maintien en arrière-plan (simulée via Foreground Service)
   */
  start(vehicleId: number) {
    if (this.interval) return;
    this.currentVehicleId = vehicleId;

    console.log(`[Telemetry] Démarrage du service de surveillance pour le véhicule ${vehicleId}`);

    // Dans une implémentation réelle, on appellerait ici :
    // BackgroundActions.start(options) pour Android Foreground Service

    // Synchro toutes les 60 secondes pour économiser batterie/data
    this.interval = setInterval(() => {
      this.sync();
    }, 60000);
  }

  /**
   * Arrête la synchronisation
   */
  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.currentVehicleId = null;
    this.lastData = null; // Réinitialise le buffer pour éviter des synchros parasites
  }

  /**
   * Met à jour les dernières données lues depuis l'OBD
   */
  updateBuffer(obdData: any, location?: {lat: number, lng: number}) {
    this.lastData = {
      ...obdData,
      latitude: location?.lat,
      longitude: location?.lng,
    };
  }

  /**
   * Envoie les données au serveur
   */
  private async sync() {
    if (!this.currentVehicleId || !this.lastData) return;

    try {
      const payload = {
        vehicle: this.currentVehicleId,
        voltage: this.lastData.voltage ?? null,
        fuel_level: this.lastData.fuelLevel ?? null,
        rpm: this.lastData.rpm ?? null,
        speed: this.lastData.speed ?? null,
        coolant_temp: this.lastData.coolantTemp ?? null,
        throttle: this.lastData.throttle ?? null,
        latitude: this.lastData.latitude ?? null,
        longitude: this.lastData.longitude ?? null,
      };

      await api.post('/telemetry/', payload);
      console.log('[Telemetry] Synchro réussie');
    } catch (error) {
      console.error('[Telemetry] Erreur synchro:', error);
    }
  }
}

export const telemetrySyncService = new TelemetrySyncService();
