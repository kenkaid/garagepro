import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import apiIndividualService from '../../services/individual/apiIndividualService';

const PersonalDashboardScreen = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    fetchDashboard();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboard();
  };

  if (loading) {
    return <View style={styles.center}><Text>Chargement...</Text></View>;
  }

  if (!dashboardData?.has_vehicle) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Bienvenue !</Text>
        <Text style={styles.subtitle}>Vous n'avez pas encore de véhicule associé.</Text>
        <TouchableOpacity style={styles.button}>
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
        <Text style={styles.brand}>{dashboardData.vehicle.brand} {dashboardData.vehicle.model}</Text>
        <Text style={styles.plate}>{dashboardData.vehicle.license_plate}</Text>
      </View>

      <View style={styles.scoreCard}>
        <Text style={styles.cardTitle}>Score de Santé</Text>
        <Text style={styles.scoreText}>{dashboardData.health_score}%</Text>
      </View>

      <View style={styles.row}>
        <View style={styles.halfCard}>
          <Text style={styles.cardTitle}>Carburant</Text>
          <Text style={styles.statText}>{dashboardData.fuel_stats.current_level}%</Text>
          <Text style={styles.subStat}>{dashboardData.fuel_stats.estimated_range} km restants</Text>
        </View>
        <View style={styles.halfCard}>
          <Text style={styles.cardTitle}>Consommation</Text>
          <Text style={styles.statText}>{dashboardData.fuel_stats.avg_consumption}</Text>
          <Text style={styles.subStat}>L/100km (moyenne)</Text>
        </View>
      </View>

      <View style={styles.alertSection}>
        <Text style={styles.sectionTitle}>Alertes de maintenance</Text>
        {dashboardData.active_alerts.length === 0 ? (
          <Text style={styles.emptyText}>Aucune anomalie détectée. Bonne route !</Text>
        ) : (
          dashboardData.active_alerts.map(alert => (
            <View key={alert.id} style={styles.alertCard}>
              <Text style={styles.alertType}>{alert.alert_type_display}</Text>
              <Text style={styles.alertMsg}>{alert.message}</Text>
            </View>
          ))
        )}
      </View>
      
      <View style={styles.menuGrid}>
          <TouchableOpacity style={styles.menuItem}>
              <Text>Expertise Occasion</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem}>
              <Text>Historique Trajets</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem}>
              <Text>Mes Abonnements</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem}>
              <Text>Offres & Boutique</Text>
          </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 15 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { marginBottom: 20 },
  brand: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  plate: { fontSize: 16, color: '#666' },
  scoreCard: { backgroundColor: '#fff', padding: 20, borderRadius: 10, alignItems: 'center', marginBottom: 15 },
  cardTitle: { fontSize: 14, color: '#888', marginBottom: 5 },
  scoreText: { fontSize: 36, fontWeight: 'bold', color: '#4CAF50' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  halfCard: { backgroundColor: '#fff', padding: 15, borderRadius: 10, width: '48%' },
  statText: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  subStat: { fontSize: 12, color: '#999' },
  alertSection: { marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  alertCard: { backgroundColor: '#FFF3E0', padding: 15, borderRadius: 10, borderLeftWidth: 5, borderLeftColor: '#FF9800', marginBottom: 10 },
  alertType: { fontWeight: 'bold', color: '#E65100' },
  alertMsg: { fontSize: 13, color: '#555' },
  emptyText: { color: '#999', fontStyle: 'italic' },
  menuGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  menuItem: { backgroundColor: '#fff', width: '48%', height: 100, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  button: { backgroundColor: '#2196F3', padding: 15, borderRadius: 10, marginTop: 20 },
  buttonText: { color: '#fff', fontWeight: 'bold' }
});

export default PersonalDashboardScreen;
