import React, {useEffect, useState} from 'react';
import {View, StyleSheet, ScrollView, RefreshControl, Text as RNText} from 'react-native';
import {Card, List, Avatar, IconButton, Badge, Text} from 'react-native-paper';
import {apiService} from '../../services/apiService';

export const FleetDashboardScreen: React.FC<{navigation: any}> = ({navigation}) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      // Note: Vous devrez ajouter fleetDashboard dans apiService
      const response = await apiService.getFleetDashboard();
      setData(response);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <RNText>Chargement du tableau de bord...</RNText>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.summaryRow}>
        <Card style={styles.summaryCard}>
          <Card.Content>
            <Text variant="headlineMedium" style={styles.summaryValue}>{data?.total_vehicles || 0}</Text>
            <RNText>Véhicules</RNText>
          </Card.Content>
        </Card>
        <Card style={[styles.summaryCard, data?.active_alerts_count > 0 && styles.warningCard]}>
          <Card.Content>
            <Text variant="headlineMedium" style={styles.summaryValue}>{data?.active_alerts_count || 0}</Text>
            <RNText>Alertes IA</RNText>
          </Card.Content>
        </Card>
      </View>

      <Text variant="titleMedium" style={styles.sectionTitle}>État de la Flotte</Text>
      {data?.fleet_status?.map((item: any, index: number) => (
        <Card key={index} style={styles.vehicleCard} onPress={() => navigation.navigate('FleetLiveMonitor', {vehicleId: item.vehicle.id})}>
          <Card.Title
            title={item.vehicle.license_plate}
            subtitle={`${item.vehicle.brand} ${item.vehicle.model}`}
            left={(props) => <Avatar.Icon {...props} icon="car" backgroundColor="#1976D2" />}
            right={(props) => (
                <IconButton {...props} icon="chevron-right" />
            )}
          />
          <Card.Content>
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <RNText style={styles.statLabel}>Carburant</RNText>
                <RNText style={styles.statValue}>{item.fuel_level ? `${item.fuel_level}%` : 'N/A'}</RNText>
              </View>
              <View style={styles.stat}>
                <RNText style={styles.statLabel}>Batterie</RNText>
                <RNText style={[styles.statValue, item.voltage < 12 && styles.dangerText]}>
                    {item.voltage ? `${item.voltage}V` : 'N/A'}
                </RNText>
              </View>
              <View style={styles.stat}>
                <RNText style={styles.statLabel}>Dernier Ping</RNText>
                <RNText style={styles.statValue}>
                    {item.last_ping ? new Date(item.last_ping).toLocaleTimeString() : 'Inactif'}
                </RNText>
              </View>
            </View>
          </Card.Content>
        </Card>
      ))}

      {(!data?.fleet_status || data.fleet_status.length === 0) && (
          <View style={styles.empty}>
              <RNText>Aucun véhicule équipé de boîtier IoT pour le moment.</RNText>
          </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 15,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  summaryCard: {
    flex: 0.48,
    alignItems: 'center',
    elevation: 2,
  },
  warningCard: {
    backgroundColor: '#FFF3E0',
    borderColor: '#FF9800',
    borderWidth: 1,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1976D2',
  },
  sectionTitle: {
    fontSize: 18,
    marginBottom: 10,
    color: '#333',
  },
  vehicleCard: {
    marginBottom: 10,
    elevation: 2,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  stat: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#777',
  },
  statValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  dangerText: {
    color: '#D32F2F',
  },
  empty: {
      padding: 40,
      alignItems: 'center',
  }
});
