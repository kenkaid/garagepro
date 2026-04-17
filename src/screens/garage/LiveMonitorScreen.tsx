import React, {useEffect, useState, useRef} from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  FlatList,
  Dimensions,
  TouchableOpacity,
  Text as RNText,
} from 'react-native';
import {
  Card,
  Surface,
  IconButton,
  ProgressBar,
  Portal,
  Modal,
  Button,
  Text,
} from 'react-native-paper';
import {useStore} from '../../store/useStore';
import {obdService} from '../../services/obdService';

const {width} = Dimensions.get('window');

export const LiveMonitorScreen: React.FC = () => {
  const {currentOBDData, vehicleInfo, setOBDData, updateSingleOBDData} =
    useStore();
  const [isLive, setIsLive] = useState(false);
  const [selectedPID, setSelectedPID] = useState<any>(null);
  const [favorites, setFavorites] = useState<string[]>(['0C', '05']); // RPM et Temp par défaut
  const [history, setHistory] = useState<Record<string, number[]>>({});
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Simulation/Lecture des données en boucle
  const startMonitoring = () => {
    setIsLive(true);
    timerRef.current = setInterval(async () => {
      const data = await obdService.readCommonPIDs();
      if (data && data.length > 0) {
        setOBDData(data);
        // Mise à jour de l'historique pour les graphiques
        setHistory(prev => {
          const newHistory = {...prev};
          data.forEach(item => {
            if (typeof item.value === 'number') {
              const pidHistory = newHistory[item.pid] || [];
              newHistory[item.pid] = [...pidHistory, item.value].slice(-10);
            }
          });
          return newHistory;
        });
      }
    }, 2000); // Toutes les 2 secondes
  };

  const stopMonitoring = () => {
    setIsLive(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  useEffect(() => {
    if (vehicleInfo.connected) {
      startMonitoring();
    }
    return () => stopMonitoring();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicleInfo.connected]);

  const toggleFavorite = (pid: string) => {
    setFavorites(prev =>
      prev.includes(pid) ? prev.filter(p => p !== pid) : [...prev, pid],
    );
  };

  const getStatusColor = (item: any) => {
    if (item.pid === '05') {
      // Température liquide
      if (item.value > 105) return '#F44336'; // Rouge
      if (item.value > 95) return '#FF9800'; // Orange
      return '#4CAF50'; // Vert
    }
    if (item.pid === '0C') {
      // RPM
      if (item.value > 5000) return '#F44336';
      if (item.value > 3500) return '#FF9800';
    }
    return '#1976D2';
  };

  const renderMiniChart = (pid: string, color: string) => {
    const data = history[pid] || [];
    if (data.length < 2) return null;

    const max = Math.max(...data) || 1;
    const min = Math.min(...data) || 0;
    const range = max - min || 1;

    return (
      <View style={styles.chartContainer}>
        {data.map((val, i) => (
          <View
            key={i}
            style={[
              styles.chartBar,
              {
                height: ((val - min) / range) * 20 + 2,
                backgroundColor: color,
                opacity: 0.3 + (i / data.length) * 0.7,
              },
            ]}
          />
        ))}
      </View>
    );
  };

  const renderPIDCard = (item: any, isLarge = false) => {
    const statusColor = getStatusColor(item);
    const isFav = favorites.includes(item.pid);

    return (
      <Card
        style={[styles.pidCard, isLarge && styles.largeCard]}
        onPress={() => setSelectedPID(item)}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <View>
              <RNText style={styles.pidName}>{item.name}</RNText>
              <RNText style={styles.pidSource}>{item.pid}</RNText>
            </View>
            <IconButton
              icon={isFav ? 'star' : 'star-outline'}
              iconColor={isFav ? '#FFD700' : '#757575'}
              size={20}
              onPress={() => toggleFavorite(item.pid)}
            />
          </View>

          <View style={styles.valueRow}>
            <View style={{flex: 1}}>
              <View style={{flexDirection: 'row', alignItems: 'baseline'}}>
                <RNText style={[styles.pidValue, {color: statusColor}]}>
                  {typeof item.value === 'number'
                    ? item.value.toFixed(item.pid === '0C' ? 0 : 1)
                    : String(item.value)}
                </RNText>
                <RNText style={styles.pidUnit}>{item.unit}</RNText>
              </View>
            </View>
            {renderMiniChart(item.pid, statusColor)}
          </View>

          {typeof item.value === 'number' && (
            <ProgressBar
              progress={Math.min(item.value / (item.pid === '0C' ? 7000 : 120), 1)}
              color={statusColor}
              style={styles.progressBar}
            />
          )}
        </Card.Content>
      </Card>
    );
  };

  const sortedData = [...currentOBDData].sort((a, b) => {
    const aFav = favorites.includes(a.pid);
    const bFav = favorites.includes(b.pid);
    if (aFav && !bFav) return -1;
    if (!aFav && bFav) return 1;
    return 0;
  });

  return (
    <View style={styles.container}>
      <Surface style={styles.header} elevation={4}>
        <View style={styles.headerRow}>
          <View>
            <Text variant="titleLarge" style={styles.headerTitle}>Live Monitor</Text>
            <RNText style={styles.headerSubtitle}>
              {vehicleInfo.connected
                ? `Véhicule: ${vehicleInfo.licensePlate || vehicleInfo.deviceName || 'Connecté'}`
                : 'Non connecté'}
            </RNText>
          </View>
          <IconButton
            icon={isLive ? 'stop-circle' : 'play-circle'}
            iconColor="white"
            size={32}
            onPress={isLive ? stopMonitoring : startMonitoring}
            disabled={!vehicleInfo.connected}
          />
        </View>
      </Surface>

      {currentOBDData.length > 0 ? (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.grid}>
            {sortedData.map((item, index) => (
              <View
                key={item.pid}
                style={favorites.includes(item.pid) ? styles.fullWidth : styles.halfWidth}>
                {renderPIDCard(item, favorites.includes(item.pid))}
              </View>
            ))}
          </View>
        </ScrollView>
      ) : (
        <View style={styles.emptyContainer}>
          <RNText style={styles.emptyIcon}>📡</RNText>
          <Text variant="titleLarge" style={styles.emptyTitle}>Prêt pour le direct</Text>
          <RNText style={styles.emptyText}>
            {vehicleInfo.connected
              ? 'Démarrage du flux de données...'
              : 'Connectez l\'adaptateur OBD pour voir les données en temps réel.'}
          </RNText>
          {!vehicleInfo.connected && (
            <Button mode="contained" style={{marginTop: 20}} onPress={() => {}}>
              Aller au Scan
            </Button>
          )}
        </View>
      )}

      {/* Modal Focus */}
      <Portal>
        <Modal
          visible={!!selectedPID}
          onDismiss={() => setSelectedPID(null)}
          contentContainerStyle={styles.modalContent}>
          {selectedPID && (
            <View style={styles.focusContainer}>
              <RNText style={styles.focusName}>{selectedPID.name}</RNText>
              <RNText style={[styles.focusValue, {color: getStatusColor(selectedPID)}]}>
                {typeof selectedPID.value === 'number'
                  ? selectedPID.value.toFixed(1)
                  : String(selectedPID.value)}
                <RNText style={styles.focusUnit}> {selectedPID.unit}</RNText>
              </RNText>
              <RNText style={styles.focusRaw}>Donnée brute: {selectedPID.rawData}</RNText>
              <Button
                mode="outlined"
                onPress={() => setSelectedPID(null)}
                style={styles.closeButton}>
                Fermer
              </Button>
            </View>
          )}
        </Modal>
      </Portal>

      <View style={styles.footer}>
        <View style={[styles.dot, {backgroundColor: isLive ? '#4CAF50' : '#F44336'}]} />
        <RNText style={styles.footerText}>
          {isLive ? 'Flux en direct' : 'Flux arrêté'} • {vehicleInfo.protocol || 'Auto'}
        </RNText>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 16,
    backgroundColor: '#1976D2',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
  },
  scrollContent: {
    padding: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  halfWidth: {
    width: '50%',
    padding: 4,
  },
  fullWidth: {
    width: '100%',
    padding: 4,
  },
  pidCard: {
    borderRadius: 12,
    elevation: 3,
    backgroundColor: 'white',
    height: 120,
    justifyContent: 'center',
  },
  largeCard: {
    height: 140,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  pidName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  pidSource: {
    fontSize: 10,
    color: '#9e9e9e',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginVertical: 4,
  },
  pidValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  pidUnit: {
    fontSize: 12,
    color: '#757575',
    marginLeft: 4,
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 30,
    paddingLeft: 10,
  },
  chartBar: {
    width: 3,
    marginHorizontal: 1,
    borderRadius: 1,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    marginTop: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  emptyTitle: {
    textAlign: 'center',
    color: '#333',
  },
  emptyText: {
    textAlign: 'center',
    color: '#757575',
    marginTop: 10,
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 30,
    margin: 20,
    borderRadius: 20,
    alignItems: 'center',
  },
  focusContainer: {
    alignItems: 'center',
    width: '100%',
  },
  focusName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#757575',
    marginBottom: 20,
  },
  focusValue: {
    fontSize: 64,
    fontWeight: 'bold',
  },
  focusUnit: {
    fontSize: 24,
    color: '#757575',
  },
  focusRaw: {
    marginTop: 20,
    fontSize: 12,
    color: '#9e9e9e',
    fontFamily: 'monospace',
  },
  closeButton: {
    marginTop: 30,
    width: '100%',
  },
  footer: {
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#757575',
    marginLeft: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
