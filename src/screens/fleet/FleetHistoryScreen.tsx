import React, {useState, useEffect} from 'react';
import {View, StyleSheet, FlatList, Text, RefreshControl} from 'react-native';
import {Card, Avatar, Chip} from 'react-native-paper';
import {apiService} from '../../services/apiService';

export const FleetHistoryScreen: React.FC<{navigation: any}> = ({navigation}) => {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadHistory = async () => {
    setLoading(true);
    const data = await apiService.getPredictiveAlerts();
    if (data) {
      setAlerts(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return '#F44336';
      case 'WARNING':
        return '#FF9800';
      default:
        return '#2196F3';
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'BATTERY':
        return 'battery-alert';
      case 'ENGINE':
        return 'engine-outline';
      case 'THEFT':
        return 'shield-alert';
      case 'DRIVING':
        return 'steering';
      default:
        return 'alert-circle-outline';
    }
  };

  const renderAlertItem = ({item}: {item: any}) => (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.cardHeader}>
          <View style={styles.titleRow}>
            <Avatar.Icon
              size={36}
              icon={getAlertIcon(item.alert_type)}
              style={{backgroundColor: getSeverityColor(item.severity)}}
            />
            <View style={styles.titleText}>
              <Text style={styles.vehiclePlate}>
                {item.vehicle_plate || 'Véhicule inconnu'}
              </Text>
              {(item.vehicle_brand || item.vehicle_model) && (
                <Text style={styles.vehicleDetails}>
                  {item.vehicle_brand} {item.vehicle_model} {item.vehicle_year ? `(${item.vehicle_year})` : ''}
                </Text>
              )}
              {item.vehicle_owner && (
                <Text style={styles.ownerText}>
                  Chauffeur: {item.vehicle_owner}
                </Text>
              )}
              <Text style={styles.alertType}>{item.alert_type_display || item.alert_type}</Text>
            </View>
          </View>
        <View style={[styles.statusBadge, {backgroundColor: getSeverityColor(item.severity)}]}>
          <Text style={styles.statusText}>
            {item.severity_display || item.severity}
          </Text>
        </View>
      </View>

        <Text style={styles.message}>{item.message}</Text>

        <View style={styles.cardFooter}>
          <Text style={styles.date}>
            {item.created_at
              ? new Date(item.created_at).toLocaleString('fr-FR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : ''}
          </Text>
          {item.probability_score > 0 && (
            <Text style={styles.probability}>
              Confiance: {Math.round(item.probability_score * 100)}%
            </Text>
          )}
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Journal de bord Flotte</Text>
        <Text style={styles.subtitle}>Alertes et événements récents</Text>
      </View>

      <FlatList
        data={alerts}
        renderItem={renderAlertItem}
        keyExtractor={item => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadHistory} />
        }
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {loading ? 'Chargement...' : 'Aucun événement majeur à signaler'}
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#f5f5f5'},
  header: {
    padding: 20,
    backgroundColor: '#002B5B', // Bleu nuit pour la flotte
  },
  title: {color: 'white', fontSize: 20, fontWeight: 'bold'},
  subtitle: {color: 'rgba(255,255,255,0.7)', fontSize: 14},
  listContent: {padding: 12},
  card: {marginBottom: 12, elevation: 2},
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  titleRow: {flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8},
  titleText: {marginLeft: 12, flexShrink: 1},
  vehiclePlate: {fontSize: 14, fontWeight: 'bold', color: '#002B5B'},
  vehicleDetails: {fontSize: 12, color: '#333', fontWeight: '500'},
  ownerText: {fontSize: 11, color: '#666', fontStyle: 'italic'},
  alertType: {fontSize: 10, color: '#757575', textTransform: 'uppercase', marginTop: 2},
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    minWidth: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    fontSize: 9,
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  message: {fontSize: 14, color: '#333', lineHeight: 20, marginBottom: 12, flexWrap: 'wrap'},
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 8,
  },
  date: {fontSize: 11, color: '#9e9e9e'},
  probability: {fontSize: 11, color: '#9e9e9e', fontStyle: 'italic'},
  emptyContainer: {marginTop: 100, alignItems: 'center'},
  emptyText: {color: '#757575', fontSize: 16},
});
