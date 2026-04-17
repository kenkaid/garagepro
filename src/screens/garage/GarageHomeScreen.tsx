// src/screens/HomeScreen.tsx
import React, {useEffect} from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Text,
  Modal,
} from 'react-native';
import {Card, Button, Avatar, Badge, List, Divider, IconButton} from 'react-native-paper';
import {useStore} from '../../store/useStore';
import {apiService} from '../../services/apiService';

export const GarageHomeScreen: React.FC<{navigation: any}> = ({navigation}) => {
  const {
    user,
    unreadScansCount,
    vehicleInfo,
    setCurrentScreen,
    setUser,
    setConnectedDevice,
    setVehicleInfo,
  } = useStore();

  useEffect(() => {
    setCurrentScreen('home');

    // Charger le profil réel depuis l'API si on ne l'a pas encore dans le store
    const loadProfile = async () => {
      // On force le rechargement si des infos critiques manquent
      if (!user || !user.first_name || !user.user_type) {
        console.log('GarageHomeScreen: Loading profile...');
        const data = await apiService.getCurrentMechanic();
        if (data) {
          console.log('GarageHomeScreen: Profile loaded', data.user_type, data.shop_name);
          setUser(data);
        }
      }
    };

    loadProfile();
  }, [setCurrentScreen, user, setUser]);

  const handleDisconnect = async () => {
    // Si on a un device connecté, on pourrait tenter de le déconnecter proprement ici
    // Pour l'instant on réinitialise l'état global
    setConnectedDevice(null);
    setVehicleInfo({
      connected: false,
      protocol: 'Non détecté',
      deviceName: '',
      deviceId: '',
      vin: 'Non scanné',
    });
  };

  const renderConnectionStatus = () => (
    <Card style={styles.statusCard}>
      <Card.Content>
        <View style={styles.statusRow}>
          <Avatar.Text
            size={40}
            label={vehicleInfo.connected ? '✓' : '✕'}
            /* eslint-disable-next-line react-native/no-inline-styles */
            style={{
              backgroundColor: vehicleInfo.connected ? '#4CAF50' : '#F44336',
            }}
          />
          <View style={styles.statusText}>
            <Text style={styles.statusTitle}>
              {vehicleInfo.connected ? 'Connecté au véhicule' : 'Non connecté'}
            </Text>
            <Text style={styles.statusSubtitle}>
              {vehicleInfo.connected
                ? `${vehicleInfo.licensePlate || ''} ${vehicleInfo.brand || ''} ${vehicleInfo.model || ''}`.trim() || `Protocole: ${vehicleInfo.protocol || 'Auto'}`
                : 'Appuyez pour scanner les adaptateurs OBD'}
            </Text>
            {vehicleInfo.connected && vehicleInfo.licensePlate && (
              <Text style={styles.statusSubtitle}>
                Protocole: {vehicleInfo.protocol || 'Auto'}
              </Text>
            )}
          </View>
        </View>
      </Card.Content>
      <Card.Actions>
        {vehicleInfo.connected ? (
          <Button
            mode="outlined"
            onPress={handleDisconnect}
            color="#F44336"
            icon="bluetooth-off">
            Déconnecter
          </Button>
        ) : (
          <Button mode="contained" onPress={() => navigation.navigate('Scan')}>
            Connecter OBD
          </Button>
        )}
      </Card.Actions>
    </Card>
  );

  const renderQuickActions = () => {
    return (
      <View style={styles.actionsGrid}>
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('Scan')}>
          <Text style={styles.actionIcon}>🔍</Text>
          <Text style={styles.actionText}>Nouveau Diagnostic</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('History')}>
          <Text style={styles.actionIcon}>📋</Text>
          <Text style={styles.actionText}>Historique</Text>
          {unreadScansCount > 0 && (
            <Badge style={styles.badge}>{unreadScansCount}</Badge>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, styles.expertiseActionCard]}
          onPress={() => navigation.navigate('Expertise')}>
          <Text style={styles.actionIcon}>🛡️</Text>
          <Text style={styles.actionText}>Expertise Occasion</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('LiveMonitor')}>
          <Text style={styles.actionIcon}>📡</Text>
          <Text style={styles.actionText}>Live Monitor</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('Dashboard')}>
          <Text style={styles.actionIcon}>📊</Text>
          <Text style={styles.actionText}>Bilan Financier</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('DTCBase')}>
          <Text style={styles.actionIcon}>📚</Text>
          <Text style={styles.actionText}>Base DTC</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('Profile')}>
          <Text style={styles.actionIcon}>👤</Text>
          <Text style={styles.actionText}>Mon Profil</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, styles.subscriptionActionCard]}
          onPress={() => navigation.navigate('Subscriptions')}>
          <Text style={styles.actionIcon}>⭐</Text>
          <Text style={styles.actionText}>Nos Offres</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, styles.upcomingActionCard]}
          onPress={() => navigation.navigate('UpcomingModules')}>
          <Text style={styles.actionIcon}>🚀</Text>
          <Text style={styles.actionText}>Modules à venir</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.welcome}>
          Bonjour, {user?.first_name || user?.username || 'Mécanicien'}
        </Text>
        <Text style={styles.subtitle}>
          {user?.shop_name || 'Garagiste Pro'}
        </Text>
      </View>

      {renderConnectionStatus()}
      {renderQuickActions()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#f5f5f5'},
  header: {
    padding: 20,
    backgroundColor: '#1976D2',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  welcome: {color: 'white', fontSize: 24, fontWeight: 'bold'},
  subtitle: {color: 'rgba(255,255,255,0.9)', marginTop: 4, fontSize: 16, fontWeight: '500'},
  statusCard: {margin: 16, elevation: 2},
  statusRow: {flexDirection: 'row', alignItems: 'center'},
  statusText: {marginLeft: 12, flex: 1},
  statusTitle: {fontSize: 16, fontWeight: 'bold'},
  statusSubtitle: {color: '#757575', marginTop: 2},
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
    justifyContent: 'space-between',
  },
  actionCard: {
    width: '48%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    elevation: 2,
    position: 'relative',
  },
  actionIcon: {fontSize: 32},
  actionText: {marginTop: 8, textAlign: 'center', fontSize: 12},
  badge: {position: 'absolute', top: 8, right: 8},
  disabledCard: {
    opacity: 0.6,
    backgroundColor: '#e0e0e0',
  },
  subscriptionActionCard: {
    backgroundColor: '#FFF9C4', // Jaune très clair pour attirer l'oeil sans être agressif
    borderColor: '#FFC107',
    borderWidth: 1,
  },
  upcomingActionCard: {
    backgroundColor: '#E3F2FD', // Bleu très clair
    borderColor: '#2196F3',
    borderWidth: 1,
  },
  expertiseActionCard: {
    backgroundColor: '#E8F5E9', // Vert très clair
    borderColor: '#4CAF50',
    borderWidth: 1,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    backgroundColor: '#f5f5f5',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1976D2',
  },
  modalFooter: {
    padding: 20,
    alignItems: 'center',
  },
});
