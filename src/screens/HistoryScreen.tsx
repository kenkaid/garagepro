// src/screens/HistoryScreen.tsx
import React, {useState, useEffect} from 'react';
import {View, StyleSheet, FlatList, Alert, Text} from 'react-native';
import {Card, Button} from 'react-native-paper';
import {useStore} from '../store/useStore';
import {apiService} from '../services/apiService';

export const HistoryScreen: React.FC<{navigation: any}> = ({navigation}) => {
  const {scanHistory, mechanic, resetUnreadScans, setScanHistory} = useStore();
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadHistory = async () => {
      // Éviter de clignoter si on a déjà des données (on mettra à jour en arrière-plan)
      if (scanHistory.length === 0) {
        setLoading(true);
      }

      const history = await apiService.getScanHistory();
      if (history) {
        setScanHistory(history);
      }
      setLoading(false);
      resetUnreadScans();
    };

    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Ne recharger qu'au montage du composant

  // Utilise mechanic pour afficher info si besoin
  const mechanicName = mechanic?.name || 'Mécanicien';

  const syncOfflineData = async () => {
    setSyncing(true);
    const synced = await apiService.syncLocalScans();
    setSyncing(false);
    Alert.alert(`${synced} scan(s) synchronisé(s)`);
  };

  const renderScanItem = ({item}: {item: any}) => (
    <Card
      style={styles.scanCard}
      onPress={() => navigation.navigate('Results', {scan: item})}>
      <Card.Content>
        <View style={styles.cardHeader}>
          <Text style={styles.date}>
            {item.date
              ? new Date(item.date).toLocaleDateString('fr-FR')
              : 'Date inconnue'}
          </Text>
          <Text style={styles.status}>
            {item.is_completed ? '✅ Terminé' : '⏳ En cours'}
          </Text>
        </View>
        <Text style={styles.vehicleInfo}>
          🚗 {item.vehicle?.brand || item.vehicleInfo?.brand || 'Inconnue'}{' '}
          {item.vehicle?.model || item.vehicleInfo?.model || 'Inconnu'} -{' '}
          {item.vehicle?.license_plate || item.vehicle?.licensePlate || item.vehicleInfo?.licensePlate || 'N/A'}
        </Text>
        <Text>{item.found_dtcs?.length || 0} code(s) défaut</Text>
        <Text style={styles.cost}>Total: {item.total_cost || 0} FCFA</Text>
        {(item.mechanic_details?.shop_name || mechanic?.shop_name) && (
          <Text style={styles.mechanic}>
            Garage : {item.mechanic_details?.shop_name || mechanic?.shop_name}
          </Text>
        )}
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {/* @ts-ignore */}
        <Text style={styles.title}>Historique - {mechanicName}</Text>
        <Button mode="outlined" onPress={syncOfflineData} loading={syncing}>
          Sync
        </Button>
      </View>

      <FlatList
        data={scanHistory}
        renderItem={renderScanItem}
        keyExtractor={item => item.id?.toString() || Math.random().toString()}
        refreshing={loading}
        onRefresh={() => {
          const loadHistory = async () => {
            const history = await apiService.getScanHistory();
            if (history) {
              setScanHistory(history);
            }
          };
          loadHistory();
        }}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {loading ? 'Chargement...' : 'Aucun diagnostic enregistré'}
          </Text>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#f5f5f5'},
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    alignItems: 'center',
  },
  title: {fontSize: 18, fontWeight: 'bold'},
  scanCard: {margin: 8, elevation: 2},
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  date: {fontWeight: 'bold'},
  status: {fontSize: 12, fontWeight: 'bold'},
  vehicleInfo: {fontSize: 14, marginBottom: 4, color: '#1976D2'},
  cost: {fontSize: 14, fontWeight: 'bold', color: '#4CAF50', marginTop: 4},
  mechanic: {fontSize: 12, color: '#757575', marginTop: 4},
  empty: {textAlign: 'center', marginTop: 50, color: '#757575'},
});
