import PushNotification from 'react-native-push-notification';
import {Platform} from 'react-native';

// Configuration initiale de PushNotification (une seule fois)
PushNotification.configure({
  onNotification: function (notification) {
    // Callback quand une notification est reçue/cliquée
  },
  requestPermissions: Platform.OS === 'ios',
});

// Créer le canal de notification Android (obligatoire pour Android 8+)
// On supprime d'abord l'ancien canal pour forcer la recréation avec la bonne importance
if (Platform.OS === 'android') {
  PushNotification.deleteChannel('garagiste-messages');
  PushNotification.createChannel(
    {
      channelId: 'garagiste-messages',
      channelName: 'Messages GaragistrePro',
      channelDescription: 'Notifications pour les nouveaux messages',
      soundName: 'default',
      importance: 5, // MAX (nécessaire pour MIUI/Xiaomi)
      vibrate: true,
    },
    (created) => {
      console.log(`[NotificationSoundService] Canal créé: ${created}`);
    },
  );
}

class NotificationSoundService {
  play() {
    PushNotification.localNotification({
      channelId: 'garagiste-messages',
      title: 'Nouveau message',
      message: 'Vous avez reçu un nouveau message',
      soundName: 'default', // utilise la sonnerie de notification du téléphone
      vibrate: true,
      vibration: 300,
      playSound: true,
      importance: 'high',
      priority: 'high',
      smallIcon: 'ic_notification',
    });
  }
}

export const notificationSoundService = new NotificationSoundService();
