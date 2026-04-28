import {Platform, Vibration} from 'react-native';

/**
 * Service pour gérer les sons de notification.
 *
 * IMPORTANT: Nécessite l'installation de 'react-native-sound' :
 * 1. npm install react-native-sound
 * 2. npx pod-install (pour iOS)
 */

// On utilise require pour éviter les erreurs de compilation si la lib n'est pas encore installée
let Sound: any = null;
try {
  Sound = require('react-native-sound');
  if (Sound && Sound.setCategory) {
    Sound.setCategory('Ambient');
  }
} catch (e) {
  // Silencieux
}

class NotificationSoundService {
  private sound: any = null;
  private isLoaded: boolean = false;

  constructor() {
    this.init();
  }

  private init() {
    if (!Sound) return;

    // Son de notification système par défaut
    // Note: Sur iOS, sans fichier 'default.wav' physique dans le projet, cela peut ne pas sonner.
    // Sur Android, 'notification' est un mot-clé reconnu.
    const soundName = Platform.OS === 'android' ? 'notification' : 'default';

    this.sound = new Sound(soundName, Sound.MAIN_BUNDLE, (error: any) => {
      if (error) {
        this.isLoaded = false;
      } else {
        this.isLoaded = true;
      }
    });
  }

  play() {
    // Vibration systématique protégée par try/catch pour Android
    try {
      Vibration.vibrate([0, 100]);
    } catch (e) {
      console.log('[NotificationSoundService] Vibration non supportée ou permission manquante');
    }

    if (this.sound && this.isLoaded) {
      this.sound.play();
    } else if (Sound) {
      this.init();
    }
  }
}

export const notificationSoundService = new NotificationSoundService();
