import React, {useEffect} from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Text,
} from 'react-native';
import {Card, Button, Avatar} from 'react-native-paper';
import {useStore} from '../../store/useStore';
import {apiService} from '../../services/apiService';

export const FleetHomeScreen: React.FC<{navigation: any}> = ({navigation}) => {
  const {
    user,
    vehicleInfo,
    setCurrentScreen,
    setUser,
    setConnectedDevice,
    setVehicleInfo,
  } = useStore();

  useEffect(() => {
    setCurrentScreen('home');

    const loadProfile = async () => {
      if (!user || !user.first_name || user.user_type !== 'FLEET_OWNER') {
        const data = await apiService.getCurrentMechanic();
        if (data) {
          setUser(data);
        }
      }
    };

    loadProfile();
  }, [setCurrentScreen, user, setUser]);

  const handleDisconnect = async () => {
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
            style={{
              backgroundColor: vehicleInfo.connected ? '#4CAF50' : '#F44336',
            }}
          />
          <View style={styles.statusText}>
            <Text style={styles.statusTitle}>
              {vehicleInfo.connected ? 'Connecté au véhicule' : 'Mode Surveillance'}
            </Text>
            <Text style={styles.statusSubtitle}>
              {vehicleInfo.connected
                ? `${vehicleInfo.licensePlate || ''} ${vehicleInfo.brand || ''} ${vehicleInfo.model || ''}`.trim()
                : 'Suivez vos véhicules en temps réel'}
            </Text>
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
          <Button mode="contained" onPress={() => navigation.navigate('FleetDashboard')}>
            Voir ma flotte
          </Button>
        )}
      </Card.Actions>
    </Card>
  );

  const renderQuickActions = () => (
    <View style={styles.actionsGrid}>
      <TouchableOpacity
        style={styles.actionCard}
        onPress={() => navigation.navigate('FleetDashboard')}>
        <Text style={styles.actionIcon}>📊</Text>
        <Text style={styles.actionText}>Ma Flotte</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.actionCard}
        onPress={() => navigation.navigate('FleetHistory')}>
        <Text style={styles.actionIcon}>📋</Text>
        <Text style={styles.actionText}>Journal de bord</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.actionCard, styles.predictionActionCard]}
        onPress={() => navigation.navigate('FleetPrediction')}>
        <Text style={styles.actionIcon}>🔮</Text>
        <Text style={styles.actionText}>Prédictions Pannes</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.actionCard}
        onPress={() => navigation.navigate('UpcomingModules')}>
        <Text style={styles.actionIcon}>🚀</Text>
        <Text style={styles.actionText}>Modules IA</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.actionCard}
        onPress={() => navigation.navigate('Profile')}>
        <Text style={styles.actionIcon}>👤</Text>
        <Text style={styles.actionText}>Mon Compte</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.actionCard, styles.expertiseActionCard]}
        onPress={() => navigation.navigate('Expertise')}>
        <Text style={styles.actionIcon}>🛡️</Text>
        <Text style={styles.actionText}>Expertise Occasion</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.actionCard, styles.subscriptionActionCard]}
        onPress={() => navigation.navigate('FleetSubscriptions')}>
        <Text style={styles.actionIcon}>⭐</Text>
        <Text style={styles.actionText}>Offres Flotte</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.welcome}>
          Bonjour, {user?.first_name || 'Propriétaire'}
        </Text>
        <Text style={styles.subtitle}>
          {user?.shop_name || 'Ma Flotte'}
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
    backgroundColor: '#004BA0',
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
  },
  actionIcon: {fontSize: 32},
  actionText: {marginTop: 8, textAlign: 'center', fontSize: 12},
  subscriptionActionCard: {
    backgroundColor: '#FFF9C4',
    borderColor: '#FFC107',
    borderWidth: 1,
  },
  expertiseActionCard: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
    borderWidth: 1,
  },
  predictionActionCard: {
    backgroundColor: '#E8EAF6',
    borderColor: '#3F51B5',
    borderWidth: 1,
  },
});
