import React, { useState, useCallback, useLayoutEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import apiIndividualService from '../../services/individual/apiIndividualService';
import { useStore } from '../../store/useStore';

const PersonalDashboardScreen = ({ navigation }: any) => {
  const { user } = useStore();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const fetchDashboard = async () => {
    try {
      const data = await apiIndividualService.getDashboardData();
      setDashboardData(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchDashboard();
    }, [])
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => navigation.navigate('Settings')}
          style={{ marginRight: 15 }}
        >
          <Icon name="cog" size={24} color="#fff" />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboard();
  };

  const handleConnectOBD = () => {
    setIsConnecting(true);
    // Simulation d'une tentative de connexion Bluetooth
    setTimeout(() => {
      setIsConnecting(false);
      Alert.alert(
        "Connexion OBD",
        "L'équipement n'a pas été détecté à proximité. L'application tentera de se reconnecter automatiquement lors de votre prochain trajet."
      );
    }, 3000);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1976D2" />
        <Text style={{ marginTop: 10 }}>Chargement de vos données...</Text>
      </View>
    );
  }

  if (!dashboardData?.has_vehicle) {
    return (
      <View style={styles.center}>
        <Icon name="car-off" size={80} color="#ccc" />
        <Text style={styles.title}>Bienvenue !</Text>
        <Text style={styles.subtitle}>Vous n'avez pas encore de véhicule associé à votre compte.</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('AddVehicle')}
        >
          <Text style={styles.buttonText}>Ajouter mon véhicule</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.brand}>{dashboardData.vehicle.brand} {dashboardData.vehicle.model}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.plate}>{dashboardData.vehicle.license_plate}</Text>
            {user?.is_trial && (
              <TouchableOpacity
                style={{
                  backgroundColor: '#E3F2FD',
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 10,
                  marginLeft: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: '#1976D2'
                }}
                onPress={() => navigation.navigate('Settings')}
              >
                <Icon name="clock-outline" size={12} color="#1976D2" style={{ marginRight: 2 }} />
                <Text style={{ color: '#1976D2', fontWeight: 'bold', fontSize: 10 }}>ESSAI : {user?.trial_days_remaining || 0}j</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        <TouchableOpacity
          style={[styles.connectBtn, isConnecting && styles.connectingBtn]}
          onPress={handleConnectOBD}
          disabled={isConnecting}
        >
          {isConnecting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Icon name="bluetooth-connect" size={20} color="#fff" />
              <Text style={styles.connectBtnText}>Connecter</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.scoreCard}>
        <Text style={styles.cardTitle}>Score de Santé Global</Text>
        <Text style={[styles.scoreText, { color: dashboardData.health_score > 80 ? '#4CAF50' : '#FF9800' }]}>
          {dashboardData.health_score}%
        </Text>
        <Text style={styles.scoreSub}>{dashboardData.health_score > 80 ? 'Excellent état' : 'Entretien à prévoir'}</Text>
      </View>

      <View style={styles.row}>
        <View style={styles.halfCard}>
          <Icon name="fuel" size={24} color="#1976D2" />
          <Text style={styles.cardTitle}>Carburant</Text>
          <Text style={styles.statText}>{dashboardData.fuel_stats.current_level}%</Text>
          <Text style={styles.subStat}>{dashboardData.fuel_stats.estimated_range} km restants</Text>
        </View>
        <View style={styles.halfCard}>
          <Icon name="chart-bell-curve" size={24} color="#1976D2" />
          <Text style={styles.cardTitle}>Consommation</Text>
          <Text style={styles.statText}>{dashboardData.fuel_stats.avg_consumption}</Text>
          <Text style={styles.subStat}>L/100km (moyenne)</Text>
        </View>
      </View>

      <View style={styles.alertSection}>
        <Text style={styles.sectionTitle}>Alertes de maintenance</Text>
        {dashboardData.active_alerts.length === 0 ? (
          <View style={styles.emptyAlert}>
            <Icon name="check-circle-outline" size={24} color="#4CAF50" />
            <Text style={styles.emptyText}>Aucune anomalie détectée. Bonne route !</Text>
          </View>
        ) : (
          dashboardData.active_alerts.map((alert: any) => (
            <View key={alert.id} style={styles.alertCard}>
              <View style={styles.alertHeader}>
                <Icon name="alert-decagram" size={20} color="#E65100" />
                <Text style={styles.alertType}>{alert.alert_type_display}</Text>
              </View>
              <Text style={styles.alertMsg}>{alert.message}</Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.menuGrid}>
          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Expertise')}>
              <Icon name="file-certificate-outline" size={32} color="#1976D2" />
              <Text style={styles.menuLabel}>Expertise</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem}>
              <Icon name="map-marker-path" size={32} color="#1976D2" />
              <Text style={styles.menuLabel}>Trajets</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Subscriptions')}>
              <Icon name="card-account-details-star-outline" size={32} color="#1976D2" />
              <Text style={styles.menuLabel}>Abonnement</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('UpcomingModules')}>
              <Icon name="dots-grid" size={32} color="#1976D2" />
              <Text style={styles.menuLabel}>Plus</Text>
          </TouchableOpacity>
      </View>

      <View style={styles.infoBox}>
        <Icon name="robot" size={20} color="#1976D2" />
        <Text style={styles.infoText}>
          Le Bluetooth s'activera automatiquement aux heures habituelles de vos trajets pour se connecter à l'OBD.
        </Text>
      </View>
      <View style={{ height: 30 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa', padding: 15 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  header: { marginBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brand: { fontSize: 24, fontWeight: 'bold', color: '#1a1a1a' },
  plate: { fontSize: 16, color: '#6c757d', fontWeight: '500' },
  connectBtn: { backgroundColor: '#1976D2', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, flexDirection: 'row', alignItems: 'center' },
  connectingBtn: { backgroundColor: '#90CAF9' },
  connectBtnText: { color: '#fff', fontWeight: 'bold', marginLeft: 5, fontSize: 13 },
  scoreCard: { backgroundColor: '#fff', padding: 20, borderRadius: 15, alignItems: 'center', marginBottom: 15, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
  cardTitle: { fontSize: 13, color: '#6c757d', marginBottom: 5, fontWeight: '600', textTransform: 'uppercase' },
  scoreText: { fontSize: 42, fontWeight: '800' },
  scoreSub: { fontSize: 14, color: '#6c757d', marginTop: -5 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  halfCard: { backgroundColor: '#fff', padding: 15, borderRadius: 15, width: '48%', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
  statText: { fontSize: 24, fontWeight: 'bold', color: '#1a1a1a', marginTop: 5 },
  subStat: { fontSize: 12, color: '#6c757d' },
  alertSection: { marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12, color: '#1a1a1a' },
  emptyAlert: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E8F5E9', padding: 15, borderRadius: 12 },
  alertCard: { backgroundColor: '#FFF3E0', padding: 15, borderRadius: 12, borderLeftWidth: 5, borderLeftColor: '#FF9800', marginBottom: 10 },
  alertHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  alertType: { fontWeight: 'bold', color: '#E65100', marginLeft: 8 },
  alertMsg: { fontSize: 14, color: '#495057' },
  emptyText: { color: '#2E7D32', marginLeft: 10, fontSize: 14, fontWeight: '500' },
  menuGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 20 },
  menuItem: { backgroundColor: '#fff', width: '23%', paddingVertical: 15, borderRadius: 12, justifyContent: 'center', alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
  menuLabel: { fontSize: 11, color: '#495057', marginTop: 5, fontWeight: '600' },
  infoBox: { flexDirection: 'row', backgroundColor: '#E3F2FD', padding: 15, borderRadius: 12, alignItems: 'center' },
  infoText: { flex: 1, fontSize: 12, color: '#1976D2', marginLeft: 10, lineHeight: 18, fontWeight: '500' },
  button: { backgroundColor: '#1976D2', paddingHorizontal: 30, paddingVertical: 12, borderRadius: 25, marginTop: 20 },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1a1a1a', marginTop: 15 },
  subtitle: { textAlign: 'center', color: '#6c757d', marginTop: 10, fontSize: 15, paddingHorizontal: 20 },
});

export default PersonalDashboardScreen;
