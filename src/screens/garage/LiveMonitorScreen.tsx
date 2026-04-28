import React, {useState, useRef, useCallback} from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  FlatList,
  Dimensions,
  TouchableOpacity,
  Animated,
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
  Chip,
} from 'react-native-paper';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import {useStore} from '../../store/useStore';
import {obdService} from '../../services/obdService';
import {apiService} from '../../services/apiService';

const {width} = Dimensions.get('window');

export const LiveMonitorScreen: React.FC = () => {
  const navigation = useNavigation();
  const {currentOBDData, vehicleInfo, setOBDData, updateSingleOBDData} =
    useStore();
  const [isLive, setIsLive] = useState(false);
  const [selectedPID, setSelectedPID] = useState<any>(null);
  const [favorites, setFavorites] = useState<string[]>(['0C', '05']); // RPM et Temp par défaut
  const [history, setHistory] = useState<Record<string, number[]>>({});
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const activeRef = useRef<boolean>(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const isAnalyzingRef = useRef(false);
  const aiTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastAIRunRef = useRef<number>(0);
  const lastOBDDataRef = useRef<any[]>([]);

  // Animation pulse sur le dot quand les données arrivent
  const triggerPulse = useCallback(() => {
    Animated.sequence([
      Animated.timing(pulseAnim, {toValue: 1.8, duration: 150, useNativeDriver: true}),
      Animated.timing(pulseAnim, {toValue: 1, duration: 300, useNativeDriver: true}),
    ]).start();
  }, [pulseAnim]);

  // Lecture des données en boucle (mode réel : séquentiel pour ne pas saturer l'ELM327)
  const startMonitoring = () => {
    if (!obdService.isConnected && !obdService.isMockMode()) {
      console.warn('[LiveMonitor] startMonitoring: non connecté, abandon');
      return;
    }
    if (activeRef.current) {
      return; // Déjà en cours
    }
    activeRef.current = true;
    setIsLive(true);
    const runLoop = async () => {
      if (!activeRef.current) return; // Arrêté entre-temps
      try {
        const data = await obdService.readCommonPIDs();
        if (data && data.length > 0) {
          lastOBDDataRef.current = data;
          setOBDData(data);
          setLastUpdate(new Date());
          triggerPulse();
          // Analyse IA toutes les 30s (pas à chaque lecture pour ne pas surcharger)
          const now = Date.now();
          if (!isAnalyzingRef.current && now - lastAIRunRef.current > 30000) {
            lastAIRunRef.current = now;
            runAIAnalysis(data);
          }
          setHistory(prev => {
            const newHistory = {...prev};
            data.forEach(item => {
              if (typeof item.value === 'number') {
                const pidHistory = newHistory[item.pid] || [];
                newHistory[item.pid] = [...pidHistory, item.value].slice(-20);
              }
            });
            return newHistory;
          });
        }
      } catch (e) {
        console.warn('[LiveMonitor] Erreur lecture PIDs:', e);
      }
      if (activeRef.current) {
        // Planifier la prochaine lecture après 1s (évite les chevauchements)
        timerRef.current = setTimeout(runLoop as any, 1000) as any;
      }
    };
    // Démarrer la boucle immédiatement
    timerRef.current = setTimeout(runLoop as any, 0) as any;
  };

  const stopMonitoring = () => {
    activeRef.current = false;
    setIsLive(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (aiTimerRef.current) {
      clearTimeout(aiTimerRef.current);
      aiTimerRef.current = null;
    }
  };

  // useFocusEffect démarre/arrête le monitoring à chaque fois que l'écran est actif
  useFocusEffect(
    useCallback(() => {
      if (vehicleInfo.connected || obdService.isConnected) {
        startMonitoring();
      }
      return () => stopMonitoring();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [vehicleInfo.connected]),
  );

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

  const runAIAnalysis = useCallback(async (obdData: any[]) => {
    if (isAnalyzingRef.current || obdData.length === 0) return;
    isAnalyzingRef.current = true;
    setIsAnalyzing(true);
    try {
      const pids = obdData
        .filter(item => typeof item.value === 'number')
        .map(item => ({pid: item.pid, value: item.value, unit: item.unit || ''}));
      console.log('[LiveMonitor] Lancement analyse IA avec', pids.length, 'PIDs');
      const result = await apiService.analyzeLive(pids);
      console.log('[LiveMonitor] Résultat IA:', result?.status, 'anomalies:', result?.anomalies?.length);
      if (result && !result.__error) {
        setAiAnalysis(result);
        setShowAIPanel(true);
      }
    } catch (e) {
      console.warn('[LiveMonitor] Erreur analyse IA:', e);
    } finally {
      isAnalyzingRef.current = false;
      setIsAnalyzing(false);
    }
  }, []);

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
            disabled={!vehicleInfo.connected && !obdService.isConnected}
          />
        </View>
      </Surface>

      {/* Bouton analyse IA manuelle */}
      {(isLive || currentOBDData.length > 0 || lastOBDDataRef.current.length > 0) && (
        <TouchableOpacity
          style={styles.aiButton}
          onPress={() => {
            const data = currentOBDData.length > 0 ? currentOBDData : lastOBDDataRef.current;
            if (data.length > 0) {
              runAIAnalysis(data);
            }
          }}
          disabled={isAnalyzing}>
          <RNText style={styles.aiButtonText}>
            {isAnalyzing ? '🔍 Analyse en cours...' : '🤖 Analyse IA'}
          </RNText>
          {aiAnalysis?.summary?.total_anomalies > 0 && (
            <View style={styles.aiBadge}>
              <RNText style={styles.aiBadgeText}>{aiAnalysis.summary.total_anomalies}</RNText>
            </View>
          )}
        </TouchableOpacity>
      )}

      {/* Panneau d'alertes IA Deep Analyze v3 */}
      {showAIPanel && aiAnalysis && (
        <View style={styles.aiPanel}>
          {/* En-tête avec verdict global */}
          <View style={styles.aiPanelHeader}>
            <View style={{flex: 1}}>
              <RNText style={styles.aiPanelTitle}>
                {aiAnalysis.verdict || (aiAnalysis.status === 'ok' ? '🟢 Aucune anomalie' : '⚠️ Anomalies détectées')}
              </RNText>
              {aiAnalysis.verdict_detail ? (
                <RNText style={styles.aiVerdictDetail}>{aiAnalysis.verdict_detail}</RNText>
              ) : null}
            </View>
            <TouchableOpacity onPress={() => setShowAIPanel(false)} style={{padding: 4}}>
              <RNText style={styles.aiPanelClose}>✕</RNText>
            </TouchableOpacity>
          </View>

          {/* Compteurs résumé */}
          {aiAnalysis.summary && aiAnalysis.summary.total_anomalies > 0 && (
            <View style={styles.aiCountRow}>
              {aiAnalysis.summary.anomalies_critiques > 0 && (
                <View style={[styles.aiCountBadge, {backgroundColor: '#F44336'}]}>
                  <RNText style={styles.aiCountText}>🔴 {aiAnalysis.summary.anomalies_critiques} critique(s)</RNText>
                </View>
              )}
              {aiAnalysis.summary.anomalies_severes > 0 && (
                <View style={[styles.aiCountBadge, {backgroundColor: '#FF9800'}]}>
                  <RNText style={styles.aiCountText}>🟠 {aiAnalysis.summary.anomalies_severes} sévère(s)</RNText>
                </View>
              )}
              {aiAnalysis.summary.syndromes_caches > 0 && (
                <View style={[styles.aiCountBadge, {backgroundColor: '#7B1FA2'}]}>
                  <RNText style={styles.aiCountText}>🔬 {aiAnalysis.summary.syndromes_caches} syndrome(s) caché(s)</RNText>
                </View>
              )}
            </View>
          )}

          <ScrollView style={styles.aiPanelScroll} nestedScrollEnabled>
            {aiAnalysis.anomalies?.map((anomaly: any, i: number) => {
              const severityColor =
                anomaly.severity === 'critical' ? '#F44336' :
                anomaly.severity === 'high'     ? '#FF9800' :
                anomaly.severity === 'medium'   ? '#FFC107' : '#4CAF50';
              const isCorrelation = anomaly.type === 'correlation';
              return (
                <View key={i} style={[styles.aiDiagCard, {borderLeftColor: severityColor}]}>
                  {/* Badge type + sévérité + certitude */}
                  <View style={styles.aiDiagHeader}>
                    <View style={{flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1}}>
                      {isCorrelation && (
                        <View style={styles.aiCorrelationBadge}>
                          <RNText style={styles.aiCorrelationText}>🔬 SYNDROME</RNText>
                        </View>
                      )}
                      <RNText style={styles.aiDiagCode}>{anomaly.dtc_code}</RNText>
                    </View>
                    <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
                      <RNText style={styles.aiCertitude}>{anomaly.certitude}%</RNText>
                      <View style={[styles.aiSeverityBadge, {backgroundColor: severityColor}]}>
                        <RNText style={styles.aiSeverityText}>{anomaly.severity?.toUpperCase()}</RNText>
                      </View>
                    </View>
                  </View>

                  {/* Label */}
                  <RNText style={styles.aiDiagLabel}>{anomaly.label}</RNText>

                  {/* Valeur(s) mesurée(s) */}
                  {anomaly.valeur_actuelle !== undefined && (
                    <RNText style={styles.aiMeasured}>
                      📊 Valeur mesurée : <RNText style={{fontWeight: 'bold', color: severityColor}}>{anomaly.valeur_actuelle}</RNText>
                      {' '}(PID {anomaly.pid})
                    </RNText>
                  )}
                  {anomaly.valeurs && (
                    <RNText style={styles.aiMeasured}>
                      📊 PIDs impliqués : {Object.entries(anomaly.valeurs).map(([k, v]) => `${k}=${v}`).join(' | ')}
                    </RNText>
                  )}

                  {/* Interprétation */}
                  {anomaly.interpretation ? (
                    <View style={styles.aiInterpretBox}>
                      <RNText style={styles.aiInterpretTitle}>🧠 Interprétation :</RNText>
                      <RNText style={styles.aiInterpretText}>{anomaly.interpretation}</RNText>
                    </View>
                  ) : null}

                  {/* Causes probables */}
                  {anomaly.causes_probables?.length > 0 && (
                    <View style={styles.aiSection}>
                      <RNText style={styles.aiSectionTitle}>⚙️ Causes probables :</RNText>
                      {anomaly.causes_probables.slice(0, 3).map((c: string, j: number) => (
                        <RNText key={j} style={styles.aiSectionItem}>• {c}</RNText>
                      ))}
                    </View>
                  )}

                  {/* Actions recommandées */}
                  {anomaly.actions_recommandees?.length > 0 && (
                    <View style={styles.aiSection}>
                      <RNText style={styles.aiSectionTitle}>🔧 Actions recommandées :</RNText>
                      {anomaly.actions_recommandees.map((s: string, j: number) => (
                        <RNText key={j} style={[styles.aiSectionItem, j === 0 && anomaly.severity === 'critical' && {color: '#F44336', fontWeight: 'bold'}]}>
                          {j + 1}. {s}
                        </RNText>
                      ))}
                    </View>
                  )}

                  {/* Coûts estimés */}
                  {(anomaly.cout_main_oeuvre_estime > 0 || anomaly.cout_pieces_local > 0) && (
                    <View style={styles.aiCostRow}>
                      {anomaly.cout_main_oeuvre_estime > 0 && (
                        <RNText style={styles.aiCostItem}>👨‍🔧 MO : {anomaly.cout_main_oeuvre_estime.toLocaleString()} FCFA</RNText>
                      )}
                      {anomaly.cout_pieces_local > 0 && (
                        <RNText style={styles.aiCostItem}>🔩 Pièces : {anomaly.cout_pieces_local.toLocaleString()} FCFA</RNText>
                      )}
                    </View>
                  )}
                </View>
              );
            })}
            {aiAnalysis.status === 'ok' && (
              <RNText style={styles.aiOkText}>✅ Tous les paramètres analysés sont dans les normes.</RNText>
            )}
          </ScrollView>
          <RNText style={styles.aiEngine}>{aiAnalysis.summary?.engine_version}</RNText>
        </View>
      )}

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
            {vehicleInfo.connected || obdService.isConnected
              ? 'Démarrage du flux de données...'
              : 'Connectez l\'adaptateur OBD pour voir les données en temps réel.'}
          </RNText>
          {!vehicleInfo.connected && !obdService.isConnected && (
            <Button mode="contained" style={{marginTop: 20}} onPress={() => navigation.navigate('Scan')}>
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
        <Animated.View
          style={[
            styles.dot,
            {backgroundColor: isLive ? '#4CAF50' : '#F44336', transform: [{scale: isLive ? pulseAnim : 1}]},
          ]}
        />
        <RNText style={styles.footerText}>
          {isLive ? 'Flux en direct' : 'Flux arrêté'} • {vehicleInfo.protocol || 'Auto'}
          {lastUpdate ? ` • MàJ ${lastUpdate.toLocaleTimeString('fr-FR', {hour: '2-digit', minute: '2-digit', second: '2-digit'})}` : ''}
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
  aiButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1565C0',
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 4,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  aiButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
    flex: 1,
  },
  aiBadge: {
    backgroundColor: '#F44336',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  aiBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  aiPanel: {
    backgroundColor: '#1A237E',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    padding: 12,
    maxHeight: 420,
  },
  aiPanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  aiPanelTitle: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  aiVerdictDetail: {
    color: '#90CAF9',
    fontSize: 11,
    marginTop: 2,
  },
  aiPanelClose: {
    color: '#90CAF9',
    fontSize: 18,
    paddingHorizontal: 4,
  },
  aiPanelScroll: {
    maxHeight: 320,
  },
  aiCountRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  aiCountBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  aiCountText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  aiDiagCard: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    borderLeftWidth: 4,
  },
  aiDiagHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  aiCorrelationBadge: {
    backgroundColor: '#7B1FA2',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
    marginRight: 4,
  },
  aiCorrelationText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: 'bold',
  },
  aiCertitude: {
    color: '#B0BEC5',
    fontSize: 11,
    fontWeight: 'bold',
    marginRight: 4,
  },
  aiDiagCode: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
    fontFamily: 'monospace',
  },
  aiSeverityBadge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  aiSeverityText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  aiDiagLabel: {
    color: '#E3F2FD',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  aiMeasured: {
    color: '#B0BEC5',
    fontSize: 11,
    marginBottom: 4,
  },
  aiInterpretBox: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 6,
    padding: 8,
    marginVertical: 6,
  },
  aiInterpretTitle: {
    color: '#64B5F6',
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  aiInterpretText: {
    color: '#E3F2FD',
    fontSize: 11,
    lineHeight: 16,
  },
  aiCostRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  aiCostItem: {
    color: '#A5D6A7',
    fontSize: 11,
    fontWeight: 'bold',
  },
  aiSection: {
    marginTop: 4,
  },
  aiSectionTitle: {
    color: '#90CAF9',
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  aiSectionItem: {
    color: '#BBDEFB',
    fontSize: 11,
    marginLeft: 4,
    marginBottom: 1,
  },
  aiOkText: {
    color: '#A5D6A7',
    fontSize: 13,
    textAlign: 'center',
    padding: 10,
  },
  aiEngine: {
    color: '#5C6BC0',
    fontSize: 10,
    textAlign: 'right',
    marginTop: 6,
  },
});
