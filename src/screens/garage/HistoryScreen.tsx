// src/screens/HistoryScreen.tsx
import React, {useState, useEffect, useMemo} from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Alert,
  Text,
  TextInput,
  TouchableOpacity,
  Platform,
} from 'react-native';
import {Card, Button} from 'react-native-paper';
import DateTimePicker, {DateTimePickerAndroid} from '@react-native-community/datetimepicker';
import {useStore} from '../../store/useStore';
import {apiService} from '../../services/apiService';

export const HistoryScreen: React.FC<{navigation: any}> = ({navigation}) => {
  const {scanHistory, user, resetUnreadScans, setScanHistory} = useStore();
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(false);

  // --- Filtres ---
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState<Date | null>(null);
  const [dateTo, setDateTo] = useState<Date | null>(null);
  const [showPickerFrom, setShowPickerFrom] = useState(false);
  const [showPickerTo, setShowPickerTo] = useState(false);

  useEffect(() => {
    const loadHistory = async () => {
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
  }, []);

  const userName = user?.name || 'Mécanicien';

  const syncOfflineData = async () => {
    setSyncing(true);
    const synced = await apiService.syncLocalScans();
    setSyncing(false);
    Alert.alert(`${synced} scan(s) synchronisé(s)`);
  };

  const clearFilters = () => {
    setSearch('');
    setDateFrom(null);
    setDateTo(null);
  };

  // --- Filtrage ---
  const filteredHistory = useMemo(() => {
    // Déduplication par ID avant filtrage
    const uniqueMap = new Map();
    scanHistory.forEach(item => {
      if (item.id) {
        // En cas de doublon d'ID, on garde le plus récent (si disponible) ou le premier trouvé
        if (!uniqueMap.has(item.id)) {
          uniqueMap.set(item.id, item);
        }
      } else {
        // Les scans locaux n'ont pas d'ID, on les garde via une clé temporaire
        uniqueMap.set(`local-${Math.random()}`, item);
      }
    });

    const uniqueHistory = Array.from(uniqueMap.values());

    return uniqueHistory.filter(item => {
      // Filtre texte : marque, modèle ou plaque
      const brand = (item.vehicle?.brand || item.vehicleInfo?.brand || '').toLowerCase();
      const model = (item.vehicle?.model || item.vehicleInfo?.model || '').toLowerCase();
      const plate = (
        item.vehicle?.license_plate ||
        item.vehicle?.licensePlate ||
        item.vehicleInfo?.licensePlate ||
        ''
      ).toLowerCase();
      const q = search.toLowerCase().trim();
      const matchSearch = !q || brand.includes(q) || model.includes(q) || plate.includes(q);

      // Filtre date
      const itemDate = item.date ? new Date(item.date) : null;
      const matchFrom = !dateFrom || (itemDate && itemDate >= dateFrom);
      const endOfDay = dateTo ? new Date(dateTo.getFullYear(), dateTo.getMonth(), dateTo.getDate(), 23, 59, 59) : null;
      const matchTo = !endOfDay || (itemDate && itemDate <= endOfDay);

      return matchSearch && matchFrom && matchTo;
    });
  }, [scanHistory, search, dateFrom, dateTo]);

  const hasActiveFilters = search.trim() !== '' || dateFrom !== null || dateTo !== null;

  const formatDate = (d: Date | null) =>
    d ? d.toLocaleDateString('fr-FR') : 'JJ/MM/AAAA';

  const renderScanItem = ({item}: {item: any}) => (
    <Card
      style={styles.scanCard}
      onPress={() =>
        navigation.navigate(
          item.scan_type === 'EXPERT' ? 'ExpertResults' : 'Results',
          {scan: item},
        )
      }>
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
          {item.vehicle?.license_plate ||
            item.vehicle?.licensePlate ||
            item.vehicleInfo?.licensePlate ||
            'N/A'}
        </Text>
        <Text>{item.found_dtcs?.length || 0} code(s) défaut</Text>
        <Text style={styles.cost}>Total: {item.total_cost || 0} FCFA</Text>
        {(item.user_details?.shop_name || user?.shop_name) && (
          <Text style={styles.user}>
            Garage : {item.user_details?.shop_name || user?.shop_name}
          </Text>
        )}
      </Card.Content>
    </Card>
  );

  const openPickerFrom = () => {
    if (Platform.OS === 'android') {
      try {
        const DateTimePickerModule = require('@react-native-community/datetimepicker');
        const AndroidPicker = DateTimePickerModule.DateTimePickerAndroid;

        if (AndroidPicker && typeof AndroidPicker.open === 'function') {
          AndroidPicker.open({
            value: dateFrom || new Date(),
            onChange: (_, selected) => {
              if (selected) setDateFrom(selected);
            },
            mode: 'date',
            display: 'default',
            maximumDate: dateTo || new Date(),
          });
        } else {
          throw new Error('Module RNCDatePicker non trouvé');
        }
      } catch (e) {
        console.warn('openPickerFrom non disponible:', e);
        Alert.alert('Information', 'Le calendrier visuel nécessite une mise à jour de l\'application (recompilation native).\n\nEn attendant, les filtres de date sont désactivés.');
      }
    } else {
      setShowPickerFrom(true);
    }
  };

  const openPickerTo = () => {
    if (Platform.OS === 'android') {
      try {
        const DateTimePickerModule = require('@react-native-community/datetimepicker');
        const AndroidPicker = DateTimePickerModule.DateTimePickerAndroid;

        if (AndroidPicker && typeof AndroidPicker.open === 'function') {
          AndroidPicker.open({
            value: dateTo || new Date(),
            onChange: (_, selected) => {
              if (selected) setDateTo(selected);
            },
            mode: 'date',
            display: 'default',
            minimumDate: dateFrom || undefined,
            maximumDate: new Date(),
          });
        } else {
          throw new Error('Module RNCDatePicker non trouvé');
        }
      } catch (e) {
        console.warn('openPickerTo non disponible:', e);
        Alert.alert('Information', 'Le calendrier visuel nécessite une mise à jour de l\'application (recompilation native).\n\nEn attendant, les filtres de date sont désactivés.');
      }
    } else {
      setShowPickerTo(true);
    }
  };

  return (
    <View style={styles.container}>
      {/* En-tête */}
      <View style={styles.header}>
        <Text style={styles.title}>Historique - {userName}</Text>
        <Button mode="outlined" onPress={syncOfflineData} loading={syncing}>
          Sync
        </Button>
      </View>

      {/* Barre de recherche */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 Marque, modèle ou plaque..."
          placeholderTextColor="#9E9E9E"
          value={search}
          onChangeText={setSearch}
          clearButtonMode="while-editing"
        />
      </View>

      {/* Filtre de dates */}
      <View style={styles.dateRow}>
        <TouchableOpacity
          style={[styles.datePicker, dateFrom && styles.datePickerActive]}
          onPress={openPickerFrom}>
          <Text style={[styles.datePickerText, dateFrom && styles.datePickerTextActive]}>
            📅 Du : {formatDate(dateFrom)}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.datePicker, dateTo && styles.datePickerActive]}
          onPress={openPickerTo}>
          <Text style={[styles.datePickerText, dateTo && styles.datePickerTextActive]}>
            📅 Au : {formatDate(dateTo)}
          </Text>
        </TouchableOpacity>

        {hasActiveFilters && (
          <TouchableOpacity style={styles.clearBtn} onPress={clearFilters}>
            <Text style={styles.clearBtnText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Résumé des résultats */}
      {hasActiveFilters && (
        <Text style={styles.resultCount}>
          {filteredHistory.length} résultat(s) sur {scanHistory.length}
        </Text>
      )}

      {/* Pickers natifs */}
      {Platform.OS === 'ios' && showPickerFrom && (
        <DateTimePicker
          value={dateFrom || new Date()}
          mode="date"
          display="inline"
          maximumDate={dateTo || new Date()}
          onChange={(_, selected) => {
            setShowPickerFrom(false);
            if (selected) setDateFrom(selected);
          }}
        />
      )}
      {Platform.OS === 'ios' && showPickerTo && (
        <DateTimePicker
          value={dateTo || new Date()}
          mode="date"
          display="inline"
          minimumDate={dateFrom || undefined}
          maximumDate={new Date()}
          onChange={(_, selected) => {
            setShowPickerTo(false);
            if (selected) setDateTo(selected);
          }}
        />
      )}

      <FlatList
        data={filteredHistory}
        renderItem={renderScanItem}
        keyExtractor={(item, index) =>
          item.id != null ? `scan-${item.id}` : `local-${index}`
        }
        refreshing={loading}
        onRefresh={async () => {
          const history = await apiService.getScanHistory();
          if (history) setScanHistory(history);
        }}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {loading
              ? 'Chargement...'
              : hasActiveFilters
              ? 'Aucun résultat pour ces filtres'
              : 'Aucun diagnostic enregistré'}
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
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    alignItems: 'center',
  },
  title: {fontSize: 18, fontWeight: 'bold'},
  // Recherche
  searchRow: {
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  searchInput: {
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    color: '#212121',
  },
  // Dates
  dateRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingBottom: 6,
    alignItems: 'center',
    gap: 8,
  },
  datePicker: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  datePickerActive: {
    borderColor: '#1976D2',
    backgroundColor: '#E3F2FD',
  },
  datePickerText: {
    fontSize: 12,
    color: '#757575',
  },
  datePickerTextActive: {
    color: '#1976D2',
    fontWeight: '600',
  },
  clearBtn: {
    backgroundColor: '#EF5350',
    borderRadius: 20,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearBtnText: {color: '#fff', fontWeight: 'bold', fontSize: 14},
  resultCount: {
    fontSize: 12,
    color: '#1976D2',
    paddingHorizontal: 16,
    paddingBottom: 4,
    fontStyle: 'italic',
  },
  // Cartes
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
  user: {fontSize: 12, color: '#757575', marginTop: 4},
  empty: {textAlign: 'center', marginTop: 50, color: '#757575'},
});
