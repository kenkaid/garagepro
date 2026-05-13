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
  Modal,
} from 'react-native';
import {Card, Button} from 'react-native-paper';
import {useStore} from '../../store/useStore';
import {apiService} from '../../services/apiService';

// ─── Composant DatePickerModal (pur React Native, sans dépendance native) ───
const MONTHS_FR = [
  'Janvier','Février','Mars','Avril','Mai','Juin',
  'Juillet','Août','Septembre','Octobre','Novembre','Décembre',
];
const DAYS_FR = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];

interface DatePickerModalProps {
  visible: boolean;
  value: Date | null;
  minDate?: Date | null;
  maxDate?: Date | null;
  onConfirm: (date: Date) => void;
  onCancel: () => void;
  title?: string;
}

const DatePickerModal: React.FC<DatePickerModalProps> = ({
  visible, value, minDate, maxDate, onConfirm, onCancel, title,
}) => {
  const today = new Date();
  const initial = value || today;
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());
  const [selected, setSelected] = useState<Date | null>(value);

  useEffect(() => {
    if (visible) {
      const d = value || today;
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
      setSelected(value);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  // Génère les jours du mois avec offset lundi=0
  const buildDays = () => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay(); // 0=dim
    const offset = firstDay === 0 ? 6 : firstDay - 1; // lundi=0
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: (number | null)[] = Array(offset).fill(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  };

  const isDisabled = (day: number) => {
    const d = new Date(viewYear, viewMonth, day);
    if (minDate && d < new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate())) return true;
    if (maxDate && d > new Date(maxDate.getFullYear(), maxDate.getMonth(), maxDate.getDate())) return true;
    return false;
  };

  const isSelected = (day: number) => {
    if (!selected) return false;
    return selected.getFullYear() === viewYear &&
      selected.getMonth() === viewMonth &&
      selected.getDate() === day;
  };

  const isToday = (day: number) =>
    today.getFullYear() === viewYear &&
    today.getMonth() === viewMonth &&
    today.getDate() === day;

  const cells = buildDays();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <TouchableOpacity style={dpStyles.overlay} activeOpacity={1} onPress={onCancel}>
        <TouchableOpacity activeOpacity={1} style={dpStyles.container}>
          {title && <Text style={dpStyles.title}>{title}</Text>}

          {/* Navigation mois */}
          <View style={dpStyles.navRow}>
            <TouchableOpacity onPress={prevMonth} style={dpStyles.navBtn}>
              <Text style={dpStyles.navArrow}>‹</Text>
            </TouchableOpacity>
            <Text style={dpStyles.monthLabel}>
              {MONTHS_FR[viewMonth]} {viewYear}
            </Text>
            <TouchableOpacity onPress={nextMonth} style={dpStyles.navBtn}>
              <Text style={dpStyles.navArrow}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Jours de la semaine */}
          <View style={dpStyles.weekRow}>
            {DAYS_FR.map(d => (
              <Text key={d} style={dpStyles.weekDay}>{d}</Text>
            ))}
          </View>

          {/* Grille des jours */}
          <View style={dpStyles.grid}>
            {cells.map((day, idx) => {
              if (!day) return <View key={`e-${idx}`} style={dpStyles.cell} />;
              const disabled = isDisabled(day);
              const sel = isSelected(day);
              const tod = isToday(day);
              return (
                <TouchableOpacity
                  key={`d-${day}`}
                  style={[
                    dpStyles.cell,
                    sel && dpStyles.cellSelected,
                    tod && !sel && dpStyles.cellToday,
                    disabled && dpStyles.cellDisabled,
                  ]}
                  onPress={() => {
                    if (!disabled) setSelected(new Date(viewYear, viewMonth, day));
                  }}
                  disabled={disabled}>
                  <Text style={[
                    dpStyles.cellText,
                    sel && dpStyles.cellTextSelected,
                    disabled && dpStyles.cellTextDisabled,
                  ]}>{day}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Boutons */}
          <View style={dpStyles.btnRow}>
            <TouchableOpacity style={dpStyles.btnCancel} onPress={onCancel}>
              <Text style={dpStyles.btnCancelText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[dpStyles.btnConfirm, !selected && dpStyles.btnConfirmDisabled]}
              onPress={() => { if (selected) onConfirm(selected); }}
              disabled={!selected}>
              <Text style={dpStyles.btnConfirmText}>Confirmer</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

export const HistoryScreen: React.FC<{navigation: any}> = ({navigation}) => {
  const {scanHistory, user, resetUnreadScans, setScanHistory} = useStore();
  const scanHistoryRef = React.useRef<any[]>([]);
  React.useEffect(() => { scanHistoryRef.current = Array.isArray(scanHistory) ? scanHistory : []; }, [scanHistory]);
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // --- Filtres ---
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState<Date | null>(null);
  const [dateTo, setDateTo] = useState<Date | null>(null);
  const [showPickerFrom, setShowPickerFrom] = useState(false);
  const [showPickerTo, setShowPickerTo] = useState(false);


  useEffect(() => {
    const loadHistory = async (pageNumber: number = 1) => {
      console.log(`[HistoryScreen] Chargement de l'historique (page ${pageNumber})...`);
      if (pageNumber === 1) setLoading(true);
      else setLoadingMore(true);

      try {
        if (pageNumber === 1) {
          // 1. Tenter la synchro automatique discrète des scans locaux uniquement au début
          try {
            const synced = await apiService.syncLocalScans();
            if (synced > 0) {
              console.log(`[HistoryScreen] ✅ ${synced} scan(s) synchronisé(s) automatiquement.`);
            }
          } catch (syncErr) {
            console.log('[HistoryScreen] Synchro auto ignorée (hors-ligne probable).');
          }
        }

        // 2. Récupérer l'historique paginé
        const response = await apiService.getScanHistory(pageNumber);
        const history = response?.results;
        console.log(`[HistoryScreen] loadHistory (page ${pageNumber}): ${Array.isArray(history) ? history.length : 0} scan(s) récupéré(s).`);

        if (Array.isArray(history)) {
          if (pageNumber === 1) {
            setScanHistory(history);
            setPage(1);
          } else if (history.length > 0) {
            const safePrev = scanHistoryRef.current;
            const existingIds = new Set(safePrev.map((i: any) => i.id));
            const newItems = history.filter((i: any) => !existingIds.has(i.id));
            setScanHistory([...safePrev, ...newItems]);
            setPage(pageNumber);
          }
          setHasMore(!!response?.next);
        } else if (pageNumber === 1) {
          setScanHistory([]);
          setHasMore(false);
        }
      } catch (err: any) {
        console.error('[HistoryScreen] Erreur chargement historique:', err?.message);
      } finally {
        setLoading(false);
        setLoadingMore(false);
        if (pageNumber === 1) resetUnreadScans();
      }
    };
    loadHistory(1);
    // setPage(1); // Supprimé d'ici car loadHistory s'en occupe
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadMore = async () => {
    if (loadingMore || !hasMore || loading) return;
    const nextPage = page + 1;
    // console.log(`[HistoryScreen] loadMore demandant la page ${nextPage}`);

    try {
      setLoadingMore(true);
      const response = await apiService.getScanHistory(nextPage);
      const history = response?.results;
      console.log(`[HistoryScreen] loadMore (page ${nextPage}): ${Array.isArray(history) ? history.length : 0} scans récupérés.`);

      if (Array.isArray(history) && history.length > 0) {
        const safePrev = scanHistoryRef.current;
        const existingIds = new Set(safePrev.map((i: any) => i.id));
        const newItems = history.filter((i: any) => !existingIds.has(i.id));
        setScanHistory([...safePrev, ...newItems]);
        setPage(nextPage);
        setHasMore(!!response.next);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.error('[HistoryScreen] Error loading more:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  const userName = user?.name || 'Mécanicien';

  const syncOfflineData = async () => {
    setSyncing(true);
    const synced = await apiService.syncLocalScans();
    if (synced > 0) {
      // Recharger l'historique après synchronisation
      setPage(1);
      setHasMore(true);
      const response = await apiService.getScanHistory(1);
      if (response && response.results) {
        setScanHistory(response.results);
      }
    }
    setSyncing(false);
    Alert.alert('Synchronisation', `${synced} scan(s) synchronisé(s) avec succès.`);
  };

  const clearFilters = () => {
    setSearch('');
    setDateFrom(null);
    setDateTo(null);
  };

  const uniqueHistory = useMemo(() => {
    const uniqueMap = new Map();
    const safeHistory = Array.isArray(scanHistory) ? scanHistory : [];
    // console.log(`[HistoryScreen] Début uniqueHistory avec ${safeHistory.length} items.`);

    // On ne fait plus de reverse ici car le serveur renvoie déjà trié DESC
    // et on veut que les items les plus récents (ceux déjà dans la map ou nouveaux) prévalent.
    // Si le serveur renvoie les pages, elles sont déjà dans l'ordre.
    safeHistory.forEach((item, index) => {
      if (!item) return;

      // Clé robuste : ID serveur, ou ID local (local_timestamp ou id string), ou index
      let key = 'unknown';
      if (item.id != null) {
        if (typeof item.id === 'number') {
          key = `server-${item.id}`;
        } else {
          key = `local-${item.id}`;
        }
      } else if (item.local_timestamp) {
        key = `local-${item.local_timestamp}`;
      } else {
        key = `idx-${index}`;
      }

      uniqueMap.set(key, item);
    });

    const result = Array.from(uniqueMap.values());
    // Tri explicite par date DESC pour garantir l'ordre même après fusion/déduplication
    result.sort((a: any, b: any) => {
      const dateA = new Date(a.date || 0).getTime();
      const dateB = new Date(b.date || 0).getTime();
      return dateB - dateA;
    });

    // console.log(`[HistoryScreen] uniqueHistory généré: ${result.length} items.`);
    return result;
  }, [scanHistory]);

  const filteredHistory = useMemo(() => {
    if (!uniqueHistory || uniqueHistory.length === 0) {
      console.log('[HistoryScreen] uniqueHistory vide, rien à filtrer.');
      return [];
    }

    const filtered = uniqueHistory.filter(item => {
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

      // Filtre date : On s'assure que la comparaison est robuste
      if (!dateFrom && !dateTo) return matchSearch;

      const itemDate = item.date ? new Date(item.date) : null;
      if (!itemDate || isNaN(itemDate.getTime())) return matchSearch && !dateFrom && !dateTo;

      const matchFrom = !dateFrom || itemDate >= dateFrom;
      const endOfDay = dateTo ? new Date(dateTo.getFullYear(), dateTo.getMonth(), dateTo.getDate(), 23, 59, 59) : null;
      const matchTo = !endOfDay || itemDate <= endOfDay;

      return matchSearch && matchFrom && matchTo;
    });

    console.log(`[HistoryScreen] Affichage de ${filtered.length}/${uniqueHistory.length} scans après filtrage.`);
    return filtered;
  }, [uniqueHistory, search, dateFrom, dateTo]);

  const hasActiveFilters = search.trim() !== '' || dateFrom !== null || dateTo !== null;

  const formatDate = (d: Date | null) =>
    d ? d.toLocaleDateString('fr-FR') : '';

  const renderScanItem = React.useCallback(({item}: {item: any}) => (
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
        {(item.user_details?.shop_name || user?.shop_name || item.mechanic_details?.shop_name) && (
          <Text style={styles.user}>
            Garage : {item.user_details?.shop_name || item.mechanic_details?.shop_name || user?.shop_name}
          </Text>
        )}
      </Card.Content>
    </Card>
  ), [navigation, user?.shop_name]);


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
          onPress={() => setShowPickerFrom(true)}>
          <Text style={[styles.datePickerText, dateFrom && styles.datePickerTextActive]}>
            📅 Du : {dateFrom ? formatDate(dateFrom) : 'JJ/MM/AAAA'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.datePicker, dateTo && styles.datePickerActive]}
          onPress={() => setShowPickerTo(true)}>
          <Text style={[styles.datePickerText, dateTo && styles.datePickerTextActive]}>
            📅 Au : {dateTo ? formatDate(dateTo) : 'JJ/MM/AAAA'}
          </Text>
        </TouchableOpacity>

        {hasActiveFilters && (
          <TouchableOpacity style={styles.clearBtn} onPress={clearFilters}>
            <Text style={styles.clearBtnText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Modals calendrier custom */}
      <DatePickerModal
        visible={showPickerFrom}
        value={dateFrom}
        maxDate={dateTo || new Date()}
        title="Date de début"
        onConfirm={d => { setDateFrom(d); setShowPickerFrom(false); }}
        onCancel={() => setShowPickerFrom(false)}
      />
      <DatePickerModal
        visible={showPickerTo}
        value={dateTo}
        minDate={dateFrom || undefined}
        maxDate={new Date()}
        title="Date de fin"
        onConfirm={d => { setDateTo(d); setShowPickerTo(false); }}
        onCancel={() => setShowPickerTo(false)}
      />

      {/* Résumé des résultats */}
      {hasActiveFilters && (
        <Text style={styles.resultCount}>
          {filteredHistory.length} résultat(s) sur {uniqueHistory.length}
        </Text>
      )}


      <FlatList
        data={filteredHistory}
        renderItem={renderScanItem}
        keyExtractor={(item, index) => {
          if (item.id != null) {
            return typeof item.id === 'number' ? `server-${item.id}` : `local-${item.id}`;
          }
          return item.local_timestamp ? `local-${item.local_timestamp}` : `idx-${index}`;
        }}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={Platform.OS === 'android'}
        refreshing={loading}
        onRefresh={async () => {
          try {
            setLoading(true);
            const response = await apiService.getScanHistory(1);
            if (response && Array.isArray(response.results)) {
              setScanHistory(response.results);
              setPage(1);
              setHasMore(!!response.next);
            } else {
              setScanHistory([]);
            }
          } catch (err) {
            console.error('[HistoryScreen] Refresh error:', err);
          } finally {
            setLoading(false);
          }
        }}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loadingMore ? (
            <View style={{padding: 20}}>
              <Text style={{textAlign: 'center', color: '#9E9E9E'}}>Chargement de la suite...</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.empty}>
              {loading
                ? 'Chargement...'
                : hasActiveFilters
                ? 'Aucun résultat pour ces filtres'
                : 'Aucun diagnostic enregistré'}
            </Text>
            {!loading && scanHistory.length === 0 && (
              <Button mode="contained" onPress={syncOfflineData} style={{marginTop: 20}}>
                Synchroniser les données
              </Button>
            )}
          </View>
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
    paddingTop: Platform.OS === 'ios' ? 20 : 10,
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
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 50,
  },
  empty: {textAlign: 'center', color: '#757575'},
});

// ─── Styles du DatePickerModal ───
const dpStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: 320,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976D2',
    textAlign: 'center',
    marginBottom: 12,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  navBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#E3F2FD',
    width: 36,
    alignItems: 'center',
  },
  navArrow: {fontSize: 22, color: '#1976D2', fontWeight: 'bold'},
  monthLabel: {fontSize: 15, fontWeight: '600', color: '#212121'},
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 4,
  },
  weekDay: {
    width: 36,
    textAlign: 'center',
    fontSize: 11,
    color: '#9E9E9E',
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  cell: {
    width: 36,
    height: 36,
    margin: 2,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cellSelected: {backgroundColor: '#1976D2'},
  cellToday: {borderWidth: 1.5, borderColor: '#1976D2'},
  cellDisabled: {opacity: 0.3},
  cellText: {fontSize: 13, color: '#212121'},
  cellTextSelected: {color: '#fff', fontWeight: 'bold'},
  cellTextDisabled: {color: '#BDBDBD'},
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
    gap: 10,
  },
  btnCancel: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
  },
  btnCancelText: {color: '#757575', fontWeight: '600'},
  btnConfirm: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#1976D2',
  },
  btnConfirmDisabled: {backgroundColor: '#BDBDBD'},
  btnConfirmText: {color: '#fff', fontWeight: '600'},
});
