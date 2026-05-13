import React, {useState, useRef, useCallback, useMemo} from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  Platform,
  Animated,
  Text as RNText,
  Vibration,
} from 'react-native';
import RNPrint from 'react-native-print';
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
import {useFocusEffect} from '@react-navigation/native';
import {useNavigation, NavigationProp} from '@react-navigation/core';
import {useStore} from '../../store/useStore';
import {obdService} from '../../services/obdService';
import {apiService} from '../../services/apiService';
import {telemetrySyncService} from '../../services/telemetrySyncService';
import {notificationSoundService} from '../../services/NotificationSoundService';

const {width} = Dimensions.get('window');

export const LiveMonitorScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp<any>>();
  const {
    currentOBDData,
    vehicleInfo,
    setOBDData,
    updateSingleOBDData,
    isTestMode,
  } = useStore();
  const [isLive, setIsLive] = useState(false);
  const [selectedPID, setSelectedPID] = useState<any>(null);
  const [favorites, setFavorites] = useState<string[]>([
    '0C',
    '05',
    'BATTERY',
    '04',
    '0E',
    '42',
    '11',
  ]); // RPM, Temp, Batterie, Charge, Avance, Module, Papillon
  const historyRef = useRef<Record<string, number[]>>({});
  const [historyTick, setHistoryTick] = useState(0); // trigger re-render du chart uniquement
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const activeRef = useRef<boolean>(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [aiPanelCollapsed, setAiPanelCollapsed] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const isAnalyzingRef = useRef(false);
  const aiTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastAIRunRef = useRef<number>(0);
  const lastOBDDataRef = useRef<any[]>([]);
  const [freezeFrame, setFreezeFrame] = useState<{
    timestamp: Date;
    pids: any[];
  } | null>(null);
  const [showFreezeFrame, setShowFreezeFrame] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showHelpModal, setShowHelpModal] = useState(false);
  // Historique PID pour analyse temporelle des tendances (60 derniers snapshots)
  const pidHistoryRef = useRef<Record<string, number>[]>([]);
  // Compteur pour envoyer record_live_snapshot toutes les 5 lectures
  const snapshotCounterRef = useRef(0);
  // Progression baseline
  const [baselineProgress, setBaselineProgress] = useState<{sample_count: number; is_mature: boolean; progress: number} | null>(null);

  // Alerte vibration selon la sévérité de l'anomalie détectée
  const playAlertSound = useCallback(
    (level: 'warning' | 'critical' | 'shortcircuit') => {
      if (!soundEnabled) return;
      if (level === 'shortcircuit') {
        // 3 impulsions rapides : court-circuit
        Vibration.vibrate([0, 200, 100, 200, 100, 200]);
      } else if (level === 'critical') {
        // 2 impulsions : anomalie critique
        Vibration.vibrate([0, 400, 200, 400]);
      } else {
        // 1 impulsion : avertissement
        Vibration.vibrate([0, 300]);
      }
    },
    [soundEnabled],
  );

  // Animation pulse sur le dot quand les données arrivent
  const triggerPulse = useCallback(() => {
    Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: 1.8,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [pulseAnim]);

  // Ref pour la boucle lente (PIDs complets)
  const slowTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Lecture des données en 2 boucles indépendantes :
  // - fastLoop : 13 PIDs critiques toutes les ~500ms → affichage fluide
  // - slowLoop : 38 PIDs complets toutes les 10s → sparklines + analyse IA
  const startMonitoring = () => {
    if (!obdService.isConnected && !obdService.isMockMode()) {
      return;
    }
    if (activeRef.current) {
      return; // Déjà en cours
    }
    activeRef.current = true;
    setIsLive(true);

    // ── BOUCLE RAPIDE : PIDs critiques (~500ms) ──────────────────────────────
    const fastLoop = async () => {
      if (!activeRef.current) return;
      try {
        const data = await obdService.readFastPIDs();
        if (data && data.length > 0) {
          // Merge avec les données existantes (on ne remplace que les PIDs lus)
          const merged = [...lastOBDDataRef.current];
          data.forEach(newItem => {
            const idx = merged.findIndex(d => d.pid === newItem.pid);
            if (idx >= 0) merged[idx] = newItem;
            else merged.push(newItem);
          });
          lastOBDDataRef.current = merged;

          // Mise à jour du buffer télémétrie
          const telemetryData: any = {};
          data.forEach(item => {
            if (item.pid === '0C') telemetryData.rpm = item.value;
            if (item.pid === '0D') telemetryData.speed = item.value;
            if (item.pid === '05') telemetryData.coolantTemp = item.value;
            if (item.pid === '11') telemetryData.throttle = item.value;
            if (item.pid.toUpperCase() === 'BATTERY') telemetryData.voltage = item.value;
            if (item.pid === '42' && !telemetryData.voltage) telemetryData.voltage = item.value;
            if (item.pid === '2F') telemetryData.fuelLevel = item.value;
            if (item.pid === '04') telemetryData.engineLoad = item.value;
          });
          telemetrySyncService.updateBuffer(telemetryData);

          // Re-render UI immédiat (batch setState)
          setOBDData([...merged]);
          setLastUpdate(new Date());
          triggerPulse();
        }
      } catch (e) {
        console.warn('[LiveMonitor] Erreur fastLoop:', e);
      }
      if (activeRef.current) {
        timerRef.current = setTimeout(fastLoop as any, 500) as any;
      }
    };

    // ── BOUCLE LENTE : tous les PIDs + historique + IA (10s) ─────────────────
    const slowLoop = async () => {
      if (!activeRef.current) return;
      try {
        const data = await obdService.readCommonPIDs();
        if (data && data.length > 0) {
          lastOBDDataRef.current = data;

          // Mise à jour de l'historique sparklines (ref → pas de re-render)
          data.forEach(item => {
            if (typeof item.value === 'number') {
              const pidHistory = historyRef.current[item.pid] || [];
              historyRef.current[item.pid] = [...pidHistory, item.value].slice(-60);
            }
          });

          // Snapshot pour analyse temporelle (toutes les 5 lectures lentes)
          snapshotCounterRef.current += 1;
          if (snapshotCounterRef.current % 5 === 0) {
            const snapshot: Record<string, number> = {};
            data.forEach(item => {
              if (typeof item.value === 'number') snapshot[item.pid] = item.value;
            });
            pidHistoryRef.current = [...pidHistoryRef.current, snapshot].slice(-60);
          }

          // Rafraîchir les sparklines
          setHistoryTick(t => t + 1);
          // Mettre à jour l'UI avec les données complètes
          setOBDData(data);

          // Analyse IA toutes les 30s max
          const now = Date.now();
          if (!isAnalyzingRef.current && now - lastAIRunRef.current > 30000) {
            lastAIRunRef.current = now;
            runAIAnalysis(data);
          }
        }
      } catch (e) {
        console.warn('[LiveMonitor] Erreur slowLoop:', e);
      }
      if (activeRef.current) {
        slowTimerRef.current = setTimeout(slowLoop as any, 10000) as any;
      }
    };

    // Démarrer les 2 boucles immédiatement
    timerRef.current = setTimeout(fastLoop as any, 0) as any;
    slowTimerRef.current = setTimeout(slowLoop as any, 2000) as any; // slowLoop démarre 2s après pour laisser fastLoop s'initialiser
  };

  const stopMonitoring = () => {
    activeRef.current = false;
    setIsLive(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (slowTimerRef.current) {
      clearTimeout(slowTimerRef.current);
      slowTimerRef.current = null;
    }
    if (aiTimerRef.current) {
      clearTimeout(aiTimerRef.current);
      aiTimerRef.current = null;
    }
  };

  // useFocusEffect démarre/arrête le monitoring à chaque fois que l'écran est actif
  useFocusEffect(
    useCallback(() => {
      const checkAndStart = () => {
        // En mode mock, on démarre toujours
        // En mode réel, on vérifie la connexion physique
        if (obdService.isMockMode() || obdService.isConnected) {
          startMonitoring();
          if (vehicleInfo.id) {
            telemetrySyncService.start(vehicleInfo.id);
          }
        }
      };

      checkAndStart();

      return () => {
        stopMonitoring();
        telemetrySyncService.stop();
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [vehicleInfo.id, isTestMode]),
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
      return '#4CAF50';
    }
    if (
      item.pid === 'battery' ||
      item.pid === '42' ||
      item.pid.toUpperCase() === 'BATTERY'
    ) {
      // Tension batterie / module
      if (item.value < 11.5) return '#F44336';
      if (item.value < 12.2) return '#FF9800';
      if (item.value > 15.0) return '#FF9800';
      return '#4CAF50';
    }
    if (item.pid === '04') {
      // Charge moteur
      if (item.value > 85) return '#F44336';
      if (item.value > 60) return '#FF9800';
      return '#4CAF50';
    }
    if (item.pid === '06' || item.pid === '07') {
      // Fuel Trim
      if (Math.abs(item.value) > 15) return '#F44336';
      if (Math.abs(item.value) > 8) return '#FF9800';
      return '#4CAF50';
    }
    if (item.pid === '5C') {
      // Température huile moteur
      if (item.value > 130) return '#F44336'; // Surchauffe critique
      if (item.value > 120) return '#FF9800'; // Surchauffe
      if (item.value < 60) return '#2196F3'; // Huile froide
      return '#4CAF50'; // Normale (60-120°C)
    }
    return '#1976D2';
  };

  const renderMiniChart = (pid: string, color: string) => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const data = historyRef.current[pid] || [];
    if (data.length < 2) return null;

    const W = 90;
    const H = 40;
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;

    // Calcul des points normalisés
    const points = data.map((val, i) => ({
      x: (i / (data.length - 1)) * W,
      y: H - ((val - min) / range) * (H - 6) - 3,
    }));

    // Segments de ligne entre chaque point consécutif
    const segments = points.slice(0, -1).map((p, i) => {
      const next = points[i + 1];
      const dx = next.x - p.x;
      const dy = next.y - p.y;
      const length = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx) * (180 / Math.PI);
      return {x: p.x, y: p.y, length, angle};
    });

    const lastPoint = points[points.length - 1];

    return (
      <View style={[styles.chartContainer, {width: W, height: H}]}>
        {/* Zone de remplissage simulée par des barres fines */}
        {points.map((p, i) => (
          <View
            key={`fill-${i}`}
            style={{
              position: 'absolute',
              left: p.x,
              bottom: 0,
              width: i < points.length - 1 ? W / (data.length - 1) : 1,
              height: H - p.y,
              backgroundColor: color,
              opacity: 0.12,
            }}
          />
        ))}
        {/* Segments de ligne */}
        {segments.map((seg, i) => {
          // En React Native, transform rotate tourne autour du centre du View.
          // On compense en décalant left/top pour que l'origine soit au point de départ.
          const rad = seg.angle * (Math.PI / 180);
          const offsetX = (seg.length / 2) * Math.cos(rad);
          const offsetY = (seg.length / 2) * Math.sin(rad);
          return (
            <View
              key={`seg-${i}`}
              style={{
                position: 'absolute',
                left: seg.x + offsetX - seg.length / 2,
                top: seg.y + offsetY - 1,
                width: seg.length,
                height: 2,
                backgroundColor: color,
                opacity: 0.85,
                transform: [{rotate: `${seg.angle}deg`}],
              }}
            />
          );
        })}
        {/* Point courant (dernier) */}
        <View
          style={{
            position: 'absolute',
            left: lastPoint.x - 3,
            top: lastPoint.y - 3,
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: color,
          }}
        />
        {/* Label min */}
        <RNText
          style={[
            styles.chartLabel,
            {position: 'absolute', bottom: 0, left: 0},
          ]}>
          {Math.round(min)}
        </RNText>
        {/* Label max */}
        <RNText
          style={[styles.chartLabel, {position: 'absolute', top: 0, left: 0}]}>
          {Math.round(max)}
        </RNText>
      </View>
    );
  };

  // Icône contextuelle par PID
  const getPIDIcon = (pid: string): string => {
    const p = pid.toUpperCase();
    if (p === '0D') return '🚗';
    if (p === '0C') return '⚙️';
    if (p === '05') return '🌡️';
    if (p === '5C') return '🛢️';
    if (p === '0F') return '💨';
    if (p === '2F') return '⛽';
    if (p === '07' || p === '06') return '🔧';
    if (p === '11') return '🦋';
    if (p === '04') return '📊';
    if (p === '0E') return '⚡';
    if (p === 'BATTERY' || p === '42') return '🔋';
    return '📡';
  };

  // Badge de statut textuel par PID
  const getPIDBadge = (item: any, statusColor: string): string | null => {
    const v = item.value;
    if (typeof v !== 'number') return null;
    const p = item.pid.toUpperCase();
    if (p === '0D') {
      if (v === 0) return "🔴 Véhicule à l'arrêt";
      if (v < 30) return '🟡 Allure lente';
      if (v < 90) return '🟢 Vitesse normale';
      if (v < 130) return '🟠 Vitesse élevée';
      return '🔴 Vitesse excessive';
    }
    if (p === '05') {
      if (v < 60) return '🔵 Moteur froid';
      if (v <= 100) return '🟢 Température normale';
      if (v <= 110) return '🟠 Température élevée';
      return '🔴 Surchauffe — Arrêt immédiat !';
    }
    if (p === '5C') {
      if (v < 60) return '🔵 Huile froide — Éviter les hauts régimes';
      if (v <= 120) return '🟢 Température huile normale';
      if (v <= 130) return '🟠 Température huile élevée';
      return '🔴 Surchauffe critique — Arrêt immédiat !';
    }
    if (p === '0F') {
      if (v < 10) return '🔵 Air très froid';
      if (v <= 40) return '🟢 Température air normale';
      if (v <= 60) return '🟠 Air chaud — Perte de puissance possible';
      return '🔴 Air surchauffé';
    }
    if (p === '2F') {
      if (v < 10) return '🔴 Réservoir quasi vide !';
      if (v < 25) return '🟠 Niveau bas — Faire le plein';
      if (v < 75) return '🟢 Niveau correct';
      return '🟢 Réservoir plein';
    }
    if (p === '07' || p === '06') {
      if (Math.abs(v) <= 5) return '🟢 Correction normale';
      if (Math.abs(v) <= 10) return '🟠 Correction modérée';
      return '🔴 Correction excessive — Anomalie détectée';
    }
    if (p === 'BATTERY' || p === '42') {
      if (v < 11.5) return '🔴 Batterie déchargée';
      if (v < 12.4) return '🟠 Batterie faible';
      if (v <= 14.8) return '🟢 Tension normale';
      return '🔴 Surtension — Vérifier alternateur';
    }
    return null;
  };

  const renderPIDCard = useCallback((item: any, isLarge = false) => {
    const statusColor = getStatusColor(item);
    const isFav = favorites.includes(item.pid);
    const icon = getPIDIcon(item.pid);
    const badge = getPIDBadge(item, statusColor);
    const maxVal =
      item.pid === '0C'
        ? 7000
        : item.pid === '0D'
        ? 220
        : item.pid === '05' || item.pid === '0F' || item.pid === '5C'
        ? 150
        : ['battery', '42', 'BATTERY'].includes(item.pid.toUpperCase())
        ? 16
        : 100;

    return (
      <Card
        style={[
          styles.pidCard,
          isLarge && styles.largeCard,
          badge ? styles.pidCardWithBadge : null,
        ]}
        onPress={() => setSelectedPID(item)}>
        <Card.Content style={styles.pidCardContent}>
          {/* En-tête : icône + nom + étoile */}
          <View style={styles.cardHeader}>
            <View style={styles.pidNameRow}>
              <RNText style={styles.pidIcon}>{icon}</RNText>
              <View>
                <RNText style={styles.pidName}>{item.name}</RNText>
                <RNText style={styles.pidSource}>PID {item.pid}</RNText>
              </View>
            </View>
            <IconButton
              icon={isFav ? 'star' : 'star-outline'}
              iconColor={isFav ? '#FFD700' : '#BDBDBD'}
              size={18}
              style={styles.favButton}
              onPress={() => toggleFavorite(item.pid)}
            />
          </View>

          {/* Valeur + sparkline */}
          <View style={styles.valueRow}>
            <View style={styles.valueBlock}>
              <RNText style={[styles.pidValue, {color: statusColor}]}>
                {typeof item.value === 'number'
                  ? item.pid === '0C'
                    ? Math.round(item.value).toLocaleString('fr-FR')
                    : item.unit === '%'
                    ? item.value.toFixed(1)
                    : Math.round(item.value)
                  : String(item.value)}
              </RNText>
              <RNText style={[styles.pidUnit, {color: statusColor + 'CC'}]}>
                {item.unit}
              </RNText>
            </View>
            {renderMiniChart(item.pid, statusColor)}
          </View>

          {/* Barre de progression */}
          {typeof item.value === 'number' && (
            <ProgressBar
              progress={Math.min(Math.max(item.value / maxVal, 0), 1)}
              color={statusColor}
              style={styles.progressBar}
            />
          )}

          {/* Badge de statut */}
          {badge && (
            <RNText style={[styles.pidBadge, {color: statusColor}]}>
              {badge}
            </RNText>
          )}
        </Card.Content>
      </Card>
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [favorites, historyTick]);

  // Calcul de l'indicateur λ (richesse du mélange) à partir des fuel trims STFT (PID 06) et LTFT (PID 07)
  const getLambdaIndicator = () => {
    const stftData = currentOBDData.find(d => d.pid === '06');
    const ltftData = currentOBDData.find(d => d.pid === '07');
    if (
      !stftData ||
      !ltftData ||
      typeof stftData.value !== 'number' ||
      typeof ltftData.value !== 'number'
    ) {
      return null;
    }
    const stft = stftData.value; // en %
    const ltft = ltftData.value; // en %
    const lambda = 1 / (1 + (stft + ltft) / 100);
    let status: 'rich' | 'lean' | 'ok';
    let label: string;
    let color: string;
    let icon: string;
    let detail: string;
    if (lambda < 0.97) {
      status = 'rich';
      label = 'Mélange RICHE ▼';
      color = '#F44336';
      icon = '🔴';
      detail = `λ = ${lambda.toFixed(
        3,
      )} — Trop de carburant. Causes possibles : injecteur qui fuit, sonde lambda défaillante, pression carburant trop élevée.`;
    } else if (lambda > 1.03) {
      status = 'lean';
      label = 'Mélange PAUVRE ▲';
      color = '#FF9800';
      icon = '🟠';
      detail = `λ = ${lambda.toFixed(
        3,
      )} — Manque de carburant. Causes possibles : fuite d'air, injecteur bouché, pompe à carburant faible.`;
    } else {
      status = 'ok';
      label = 'Mélange CORRECT ✓';
      color = '#4CAF50';
      icon = '🟢';
      detail = `λ = ${lambda.toFixed(
        3,
      )} — Stœchiométrie optimale (λ ≈ 1). Combustion efficace.`;
    }
    return {lambda, status, label, color, icon, detail, stft, ltft};
  };

  const renderLambdaIndicator = () => {
    const lambda = getLambdaIndicator();
    if (!lambda || !isLive) return null;
    return (
      <View style={styles.lambdaCard}>
        <View style={styles.lambdaHeader}>
          <RNText style={styles.lambdaTitle}>⚗️ Richesse du mélange (λ)</RNText>
          <RNText style={[styles.lambdaLabel, {color: lambda.color}]}>
            {lambda.icon} {lambda.label}
          </RNText>
        </View>
        <View style={styles.lambdaBar}>
          {/* Barre de richesse : 0 = très riche, 0.5 = λ=1, 1 = très pauvre */}
          <View
            style={[
              styles.lambdaFill,
              {
                width: `${Math.min(
                  Math.max(((lambda.lambda - 0.85) / 0.3) * 100, 0),
                  100,
                )}%`,
                backgroundColor: lambda.color,
              },
            ]}
          />
          {/* Marqueur central (λ=1) */}
          <View style={styles.lambdaCenter} />
        </View>
        <View style={styles.lambdaBarLabels}>
          <RNText style={styles.lambdaBarLabel}>Riche</RNText>
          <RNText
            style={[
              styles.lambdaBarLabel,
              {color: '#4CAF50', fontWeight: 'bold'},
            ]}>
            λ=1
          </RNText>
          <RNText style={styles.lambdaBarLabel}>Pauvre</RNText>
        </View>
        <RNText style={styles.lambdaDetail}>{lambda.detail}</RNText>
        <View style={styles.lambdaTrimRow}>
          <RNText style={styles.lambdaTrimItem}>
            STFT : {lambda.stft > 0 ? '+' : ''}
            {lambda.stft.toFixed(1)}%
          </RNText>
          <RNText style={styles.lambdaTrimItem}>
            LTFT : {lambda.ltft > 0 ? '+' : ''}
            {lambda.ltft.toFixed(1)}%
          </RNText>
        </View>
      </View>
    );
  };

  const getEngineLoadInterpretation = () => {
    const loadData = currentOBDData.find(d => d.pid === '04');
    const rpmData = currentOBDData.find(d => d.pid === '0C');
    const throttleData = currentOBDData.find(d => d.pid === '11');

    if (!loadData || typeof loadData.value !== 'number') return null;

    const load = loadData.value;
    const rpm =
      rpmData && typeof rpmData.value === 'number' ? rpmData.value : 0;
    const throttle =
      throttleData && typeof throttleData.value === 'number'
        ? throttleData.value
        : 0;

    // 1. Analyse au ralenti (RPM < 1000)
    if (rpm > 0 && rpm < 1000 && throttle < 5) {
      if (load > 35) {
        return {
          status: 'warning',
          title: 'Charge élevée au ralenti',
          message:
            'La charge est anormalement haute (>35%) pour un ralenti. Vérifiez si la clim est éteinte. Si oui, cela indique une résistance interne ou un capteur (MAF/MAP) encrassé.',
          icon: 'alert-circle',
        };
      }
      return {
        status: 'ok',
        title: 'Charge au ralenti normale',
        message:
          'Le moteur "respire" bien au repos (entre 15% et 30% de charge).',
        icon: 'check-circle',
      };
    }

    // 2. Pleine accélération (WOT)
    if (throttle > 80 || load > 80) {
      if (load < 60 && rpm > 2500) {
        return {
          status: 'critical',
          title: "Moteur étouffé (Manque d'air)",
          message:
            'La charge plafonne (<60%) malgré une forte accélération. Cause probable : filtre à air bouché, échappement obstrué ou turbo fatigué.',
          icon: 'piston',
        };
      }
      if (load > 90) {
        return {
          status: 'ok',
          title: 'Pleine charge opérationnelle',
          message:
            "Le moteur atteint sa capacité maximale d'admission d'air. Performance optimale.",
          icon: 'speedometer',
        };
      }
    }

    // 3. Vitesse stabilisée / Charge modérée
    if (load >= 40 && load <= 70 && rpm > 1500) {
      return {
        status: 'info',
        title: 'Effort moteur modéré',
        message:
          'Fonctionnement normal en charge partielle (vitesse stabilisée).',
        icon: 'information',
      };
    }

    return null;
  };

  const renderEngineLoadInsight = () => {
    const insight = getEngineLoadInterpretation();
    if (!insight) return null;

    const bgColor =
      insight.status === 'critical'
        ? '#FFEBEE'
        : insight.status === 'warning'
        ? '#FFF3E0'
        : insight.status === 'ok'
        ? '#E8F5E9'
        : '#E3F2FD';

    const textColor =
      insight.status === 'critical'
        ? '#B71C1C'
        : insight.status === 'warning'
        ? '#E65100'
        : insight.status === 'ok'
        ? '#1B5E20'
        : '#0D47A1';

    const iconColor = textColor;

    return (
      <Surface
        style={[styles.insightCard, {backgroundColor: bgColor}]}
        elevation={2}>
        <View style={styles.insightHeader}>
          <IconButton
            icon={insight.icon}
            iconColor={iconColor}
            size={24}
            style={{margin: 0}}
          />
          <RNText style={[styles.insightTitle, {color: textColor}]}>
            {insight.title}
          </RNText>
        </View>
        <RNText style={[styles.insightMessage, {color: textColor}]}>
          {insight.message}
        </RNText>
      </Surface>
    );
  };

  const runAIAnalysis = useCallback(async (obdData: any[]) => {
    if (isAnalyzingRef.current || obdData.length === 0) return;
    isAnalyzingRef.current = true;
    setIsAnalyzing(true);
    try {
      const pids = obdData
        .filter(item => typeof item.value === 'number')
        .map(item => ({
          pid: item.pid,
          value: item.value,
          unit: item.unit || '',
        }));

      // Construire le snapshot courant pour l'historique temporel
      const currentSnapshot: Record<string, number> = {};
      obdData.forEach(item => {
        if (typeof item.value === 'number') currentSnapshot[item.pid] = item.value;
      });
      pidHistoryRef.current = [...pidHistoryRef.current.slice(-59), currentSnapshot];

      // Envoyer record_live_snapshot toutes les 5 lectures (baseline + historique ML)
      snapshotCounterRef.current += 1;
      if (snapshotCounterRef.current % 5 === 0 && vehicleInfo?.id) {
        apiService.recordLiveSnapshot(pids, vehicleInfo.id).then((res: any) => {
          if (res?.baseline) {
            setBaselineProgress({
              sample_count: res.baseline.sample_count,
              is_mature: res.baseline.is_mature,
              progress: Math.min(100, Math.round(res.baseline.sample_count / 500 * 100)),
            });
          }
        }).catch(() => {});
      }

      console.log('[LiveMonitor] Lancement analyse IA avec', pids.length, 'PIDs');
      const result = await apiService.analyzeLive(
        pids,
        vehicleInfo?.id,
        pidHistoryRef.current,
      );
      console.log('[LiveMonitor] Résultat IA:', result?.status, 'anomalies:', result?.anomalies?.length);
      if (result && !result.__error) {
        setAiAnalysis(result);
        setShowAIPanel(true);
        // Freeze Frame : capturer le snapshot si anomalie détectée
        if (result.status !== 'ok' && result.summary?.total_anomalies > 0) {
          setFreezeFrame({timestamp: new Date(), pids: obdData});
          setShowFreezeFrame(false);

          // 🔊 Bip sonore selon la sévérité
          const verdict: string = result.verdict || '';
          const summary = result.summary || {};
          if (verdict.includes('COURT-CIRCUIT') || summary.courts_circuits > 0) {
            playAlertSound('shortcircuit');
          } else if (summary.anomalies_critiques > 0) {
            playAlertSound('critical');
          } else if (summary.total_anomalies > 0) {
            playAlertSound('warning');
          }

          // 🔔 Notification système 3 fois de suite
          notificationSoundService.play();
          setTimeout(() => notificationSoundService.play(), 1500);
          setTimeout(() => notificationSoundService.play(), 3000);
        }
      }
    } catch (e) {
      console.warn('[LiveMonitor] Erreur analyse IA:', e);
    } finally {
      isAnalyzingRef.current = false;
      setIsAnalyzing(false);
    }
  }, [vehicleInfo, playAlertSound]);

  const generatePDFReport = async () => {
    setIsGeneratingPDF(true);
    try {
      const now = new Date();
      const dateStr = now.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
      const timeStr = now.toLocaleTimeString('fr-FR');
      const vehicle =
        vehicleInfo.licensePlate || vehicleInfo.deviceName || 'Inconnu';

      // Section PIDs
      const pidsData =
        currentOBDData.length > 0 ? currentOBDData : lastOBDDataRef.current;
      const pidsRows = pidsData
        .map(item => {
          const val =
            typeof item.value === 'number'
              ? item.value.toFixed(2)
              : String(item.value ?? '-');
          return `<tr><td>${item.pid}</td><td>${
            item.name || item.pid
          }</td><td><strong>${val}</strong></td><td>${
            item.unit || '-'
          }</td></tr>`;
        })
        .join('');

      // Section anomalies IA
      let anomaliesSection = '';
      if (aiAnalysis && aiAnalysis.anomalies?.length > 0) {
        const rows = aiAnalysis.anomalies
          .map((a: any) => {
            const color =
              a.severity === 'critical'
                ? '#F44336'
                : a.severity === 'high'
                ? '#FF9800'
                : a.severity === 'medium'
                ? '#FFC107'
                : '#4CAF50';
            const causes =
              a.causes_probables
                ?.slice(0, 3)
                .map((c: string) => `<li>${c}</li>`)
                .join('') || '';
            const actions =
              a.actions_recommandees
                ?.map((s: string) => `<li>${s}</li>`)
                .join('') || '';
            const cout =
              a.cout_main_oeuvre_estime > 0 || a.cout_pieces_local > 0
                ? `<p>💰 MO : ${(
                    a.cout_main_oeuvre_estime || 0
                  ).toLocaleString()} FCFA &nbsp;|&nbsp; Pièces : ${(
                    a.cout_pieces_local || 0
                  ).toLocaleString()} FCFA</p>`
                : '';
            return `<div style="border-left:4px solid ${color};padding:8px 12px;margin-bottom:10px;background:#fafafa;border-radius:4px">
            <p style="margin:0 0 4px"><strong style="color:${color}">${
              a.label
            }</strong></p>
            ${
              a.interpretation
                ? `<p style="color:#555;font-size:12px">${a.interpretation}</p>`
                : ''
            }
            ${
              causes
                ? `<p style="margin:4px 0 2px"><strong>Causes :</strong></p><ul style="margin:0;padding-left:16px;font-size:12px">${causes}</ul>`
                : ''
            }
            ${
              actions
                ? `<p style="margin:4px 0 2px"><strong>Actions :</strong></p><ul style="margin:0;padding-left:16px;font-size:12px">${actions}</ul>`
                : ''
            }
            ${cout}
          </div>`;
          })
          .join('');
        anomaliesSection = `<h2 style="color:#D32F2F">⚠️ Anomalies détectées (${aiAnalysis.anomalies.length})</h2>${rows}`;
      } else if (aiAnalysis?.status === 'ok') {
        anomaliesSection = `<h2 style="color:#388E3C">✅ Aucune anomalie détectée</h2><p>Tous les paramètres analysés sont dans les normes.</p>`;
      }

      // Section Freeze Frame
      let freezeSection = '';
      if (freezeFrame) {
        const ffTime = freezeFrame.timestamp.toLocaleTimeString('fr-FR');
        const ffRows = freezeFrame.pids
          .filter(item => typeof item.value === 'number')
          .map(
            (item: any) =>
              `<td style="padding:4px 8px;border:1px solid #ddd;text-align:center"><strong>${
                item.pid
              }</strong><br/>${item.value.toFixed(1)} ${item.unit || ''}</td>`,
          )
          .join('');
        freezeSection = `<h2>📸 Freeze Frame — ${ffTime}</h2><table style="border-collapse:collapse;width:100%"><tr>${ffRows}</tr></table>`;
      }

      // Section Lambda
      let lambdaSection = '';
      const stftItem = pidsData.find((d: any) => d.pid === '06');
      const ltftItem = pidsData.find((d: any) => d.pid === '07');
      if (stftItem && ltftItem) {
        const stft = stftItem.value as number;
        const ltft = ltftItem.value as number;
        const lambda = 1 / (1 + (stft + ltft) / 100);
        const status =
          lambda < 0.97
            ? '🔴 RICHE'
            : lambda > 1.03
            ? '🟠 PAUVRE'
            : '🟢 CORRECT';
        lambdaSection = `<h2>λ Richesse du mélange</h2><p>λ = <strong>${lambda.toFixed(
          3,
        )}</strong> — ${status}</p><p>STFT : ${stft.toFixed(
          1,
        )}% &nbsp;|&nbsp; LTFT : ${ltft.toFixed(1)}%</p>`;
      }

      const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <title>Rapport Diagnostic — ${vehicle}</title>
  <style>
    body { font-family: Arial, sans-serif; color: #212121; padding: 20px; font-size: 13px; }
    h1 { color: #1565C0; border-bottom: 2px solid #1565C0; padding-bottom: 6px; }
    h2 { color: #37474F; margin-top: 20px; }
    table { border-collapse: collapse; width: 100%; margin-bottom: 16px; }
    th { background: #1565C0; color: white; padding: 6px 10px; text-align: left; }
    td { padding: 5px 10px; border-bottom: 1px solid #E0E0E0; }
    tr:nth-child(even) td { background: #F5F5F5; }
    .footer { margin-top: 30px; font-size: 11px; color: #9E9E9E; text-align: center; }
    .badge { display:inline-block; padding:2px 8px; border-radius:10px; color:white; font-size:11px; margin-right:6px; }
  </style>
</head>
<body>
  <h1>🔧 Rapport Diagnostic Live — GaragistePro</h1>
  <p><strong>Véhicule :</strong> ${vehicle} &nbsp;|&nbsp; <strong>Date :</strong> ${dateStr} à ${timeStr}</p>
  ${
    aiAnalysis?.verdict
      ? `<p><span class="badge" style="background:#1565C0">${aiAnalysis.verdict}</span></p>`
      : ''
  }

  <h2>📊 Données OBD en temps réel</h2>
  <table>
    <thead><tr><th>PID</th><th>Paramètre</th><th>Valeur</th><th>Unité</th></tr></thead>
    <tbody>${pidsRows}</tbody>
  </table>

  ${lambdaSection}
  ${anomaliesSection}
  ${freezeSection}

  <div class="footer">Généré par GaragistePro — IA Deep Analyze v4.0 — ${dateStr} ${timeStr}</div>
</body>
</html>`;

      await RNPrint.print({html});
    } catch (e) {
      console.warn('[LiveMonitor] Erreur génération PDF:', e);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const sortedData = useMemo(() => {
    return [...currentOBDData].sort((a, b) => {
      const aFav = favorites.includes(a.pid);
      const bFav = favorites.includes(b.pid);
      if (aFav && !bFav) return -1;
      if (!aFav && bFav) return 1;
      return 0;
    });
    // historyTick force le recalcul toutes les 2s pour rafraîchir les charts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentOBDData, favorites, historyTick]);

  return (
    <View style={styles.container}>
      <Surface style={styles.header} elevation={4}>
        <View style={styles.headerRow}>
          <View>
            <Text variant="titleLarge" style={styles.headerTitle}>
              Live Monitor
            </Text>
            <RNText style={styles.headerSubtitle}>
              {vehicleInfo.connected
                ? `Véhicule: ${
                    vehicleInfo.licensePlate ||
                    vehicleInfo.deviceName ||
                    'Connecté'
                  }`
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

      {/* Boutons analyse IA + rapport PDF + son */}
      {(isLive ||
        currentOBDData.length > 0 ||
        lastOBDDataRef.current.length > 0) && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginHorizontal: 16,
            marginTop: 8,
            gap: 8,
          }}>
          <TouchableOpacity
            style={[
              styles.pdfButton,
              {flex: 1, marginHorizontal: 0, marginTop: 0},
              isGeneratingPDF && {opacity: 0.6},
            ]}
            onPress={generatePDFReport}
            disabled={isGeneratingPDF}>
            <RNText style={styles.pdfButtonText}>
              {isGeneratingPDF ? '⏳ Génération...' : '📄 Rapport PDF'}
            </RNText>
          </TouchableOpacity>
          {/* Bouton activer/désactiver les bips sonores */}
          <TouchableOpacity
            style={styles.soundButton}
            onPress={() => setSoundEnabled(prev => !prev)}>
            <RNText style={styles.soundButtonText}>
              {soundEnabled ? '🔊' : '🔇'}
            </RNText>
          </TouchableOpacity>
          {/* Bouton aide */}
          <TouchableOpacity
            style={styles.soundButton}
            onPress={() => setShowHelpModal(true)}>
            <RNText style={styles.soundButtonText}>❓</RNText>
          </TouchableOpacity>
        </View>
      )}
      {(isLive ||
        currentOBDData.length > 0 ||
        lastOBDDataRef.current.length > 0) && (
        <TouchableOpacity
          style={styles.aiButton}
          onPress={() => {
            const data =
              currentOBDData.length > 0
                ? currentOBDData
                : lastOBDDataRef.current;
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
              <RNText style={styles.aiBadgeText}>
                {aiAnalysis.summary.total_anomalies}
              </RNText>
            </View>
          )}
        </TouchableOpacity>
      )}

      {/* Panneau d'alertes IA Deep Analyze v3 - inline sous le bouton */}
      {showAIPanel && aiAnalysis && (
        <View style={styles.aiPanel}>
          {/* En-tête avec verdict global */}
          <View style={styles.aiPanelHeader}>
            <View style={{flex: 1}}>
              <RNText style={styles.aiPanelTitle}>
                {aiAnalysis.verdict ||
                  (aiAnalysis.status === 'ok'
                    ? '🟢 Aucune anomalie'
                    : '⚠️ Anomalies détectées')}
              </RNText>
              {!aiPanelCollapsed && aiAnalysis.verdict_detail ? (
                <RNText style={styles.aiVerdictDetail}>
                  {aiAnalysis.verdict_detail}
                </RNText>
              ) : null}
            </View>
            <TouchableOpacity
              onPress={() => setAiPanelCollapsed(prev => !prev)}
              style={{padding: 4}}>
              <RNText style={styles.aiPanelClose}>
                {aiPanelCollapsed ? '▼' : '▲'}
              </RNText>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowAIPanel(false)}
              style={{padding: 4}}>
              <RNText style={styles.aiPanelClose}>✕</RNText>
            </TouchableOpacity>
          </View>

          {/* Compteurs résumé */}
          {!aiPanelCollapsed &&
            aiAnalysis.summary &&
            aiAnalysis.summary.total_anomalies > 0 && (
              <View style={styles.aiCountRow}>
                {aiAnalysis.summary.anomalies_critiques > 0 && (
                  <View
                    style={[styles.aiCountBadge, {backgroundColor: '#F44336'}]}>
                    <RNText style={styles.aiCountText}>
                      🔴 {aiAnalysis.summary.anomalies_critiques} critique(s)
                    </RNText>
                  </View>
                )}
                {aiAnalysis.summary.courts_circuits > 0 && (
                  <View
                    style={[styles.aiCountBadge, {backgroundColor: '#B71C1C'}]}>
                    <RNText style={styles.aiCountText}>
                      ⚡ {aiAnalysis.summary.courts_circuits}{' '}
                      court(s)-circuit(s)
                    </RNText>
                  </View>
                )}
                {aiAnalysis.summary.anomalies_severes > 0 && (
                  <View
                    style={[styles.aiCountBadge, {backgroundColor: '#FF9800'}]}>
                    <RNText style={styles.aiCountText}>
                      🟠 {aiAnalysis.summary.anomalies_severes} sévère(s)
                    </RNText>
                  </View>
                )}
                {aiAnalysis.summary.predictions > 0 && (
                  <View
                    style={[styles.aiCountBadge, {backgroundColor: '#4527A0'}]}>
                    <RNText style={styles.aiCountText}>
                      🔮 {aiAnalysis.summary.predictions} prédiction(s)
                    </RNText>
                  </View>
                )}
                {aiAnalysis.summary.syndromes_caches > 0 && (
                  <View
                    style={[styles.aiCountBadge, {backgroundColor: '#7B1FA2'}]}>
                    <RNText style={styles.aiCountText}>
                      🔬 {aiAnalysis.summary.syndromes_caches} syndrome(s)
                    </RNText>
                  </View>
                )}
              </View>
            )}

          {!aiPanelCollapsed && (
            <ScrollView style={styles.aiPanelScroll} nestedScrollEnabled>
              {aiAnalysis.anomalies?.map((anomaly: any, i: number) => {
                const severityColor =
                  anomaly.severity === 'critical'
                    ? '#F44336'
                    : anomaly.severity === 'high'
                    ? '#FF9800'
                    : anomaly.severity === 'medium'
                    ? '#FFC107'
                    : '#4CAF50';
                const isCorrelation = anomaly.type === 'correlation';
                return (
                  <View
                    key={i}
                    style={[
                      styles.aiDiagCard,
                      {borderLeftColor: severityColor},
                    ]}>
                    {/* Badge type + sévérité + certitude */}
                    <View style={styles.aiDiagHeader}>
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6,
                          flex: 1,
                        }}>
                        {isCorrelation && (
                          <View style={styles.aiCorrelationBadge}>
                            <RNText style={styles.aiCorrelationText}>
                              🔬 SYNDROME
                            </RNText>
                          </View>
                        )}
                        <RNText style={styles.aiDiagCode}>
                          {anomaly.dtc_code}
                        </RNText>
                      </View>
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 4,
                        }}>
                        <RNText style={styles.aiCertitude}>
                          {anomaly.certitude}%
                        </RNText>
                        <View
                          style={[
                            styles.aiSeverityBadge,
                            {backgroundColor: severityColor},
                          ]}>
                          <RNText style={styles.aiSeverityText}>
                            {anomaly.severity?.toUpperCase()}
                          </RNText>
                        </View>
                      </View>
                    </View>

                    {/* Label */}
                    <RNText style={styles.aiDiagLabel}>{anomaly.label}</RNText>

                    {/* Valeur(s) mesurée(s) */}
                    {anomaly.valeur_actuelle !== undefined && (
                      <RNText style={styles.aiMeasured}>
                        📊 Valeur mesurée :{' '}
                        <RNText
                          style={{fontWeight: 'bold', color: severityColor}}>
                          {anomaly.valeur_actuelle}
                        </RNText>{' '}
                        (PID {anomaly.pid})
                      </RNText>
                    )}
                    {anomaly.valeurs && (
                      <RNText style={styles.aiMeasured}>
                        📊 PIDs impliqués :{' '}
                        {Object.entries(anomaly.valeurs)
                          .map(([k, v]) => `${k}=${v}`)
                          .join(' | ')}
                      </RNText>
                    )}

                    {/* Interprétation */}
                    {anomaly.interpretation ? (
                      <View style={styles.aiInterpretBox}>
                        <RNText style={styles.aiInterpretTitle}>
                          🧠 Interprétation :
                        </RNText>
                        <RNText style={styles.aiInterpretText}>
                          {anomaly.interpretation}
                        </RNText>
                      </View>
                    ) : null}

                    {/* Causes probables */}
                    {anomaly.causes_probables?.length > 0 && (
                      <View style={styles.aiSection}>
                        <RNText style={styles.aiSectionTitle}>
                          ⚙️ Causes probables :
                        </RNText>
                        {anomaly.causes_probables
                          .slice(0, 3)
                          .map((c: string, j: number) => (
                            <RNText key={j} style={styles.aiSectionItem}>
                              • {c}
                            </RNText>
                          ))}
                      </View>
                    )}

                    {/* Actions recommandées */}
                    {anomaly.actions_recommandees?.length > 0 && (
                      <View style={styles.aiSection}>
                        <RNText style={styles.aiSectionTitle}>
                          🔧 Actions recommandées :
                        </RNText>
                        {anomaly.actions_recommandees.map(
                          (s: string, j: number) => (
                            <RNText
                              key={j}
                              style={[
                                styles.aiSectionItem,
                                j === 0 &&
                                  anomaly.severity === 'critical' && {
                                    color: '#F44336',
                                    fontWeight: 'bold',
                                  },
                              ]}>
                              {j + 1}. {s}
                            </RNText>
                          ),
                        )}
                      </View>
                    )}

                    {/* Coûts estimés */}
                    {(anomaly.cout_main_oeuvre_estime > 0 ||
                      anomaly.cout_pieces_local > 0) && (
                      <View style={styles.aiCostRow}>
                        {anomaly.cout_main_oeuvre_estime > 0 && (
                          <RNText style={styles.aiCostItem}>
                            👨‍🔧 MO :{' '}
                            {anomaly.cout_main_oeuvre_estime.toLocaleString()}{' '}
                            FCFA
                          </RNText>
                        )}
                        {anomaly.cout_pieces_local > 0 && (
                          <RNText style={styles.aiCostItem}>
                            🔩 Pièces :{' '}
                            {anomaly.cout_pieces_local.toLocaleString()} FCFA
                          </RNText>
                        )}
                      </View>
                    )}
                  </View>
                );
              })}
              {aiAnalysis.status === 'ok' && (
                <RNText style={styles.aiOkText}>
                  ✅ Tous les paramètres analysés sont dans les normes.
                </RNText>
              )}
            </ScrollView>
          )}
          {/* Freeze Frame */}
          {!aiPanelCollapsed && freezeFrame && (
            <View style={styles.freezeFrameContainer}>
              <TouchableOpacity
                style={styles.freezeFrameHeader}
                onPress={() => setShowFreezeFrame(prev => !prev)}>
                <RNText style={styles.freezeFrameTitle}>
                  📸 Freeze Frame —{' '}
                  {freezeFrame.timestamp.toLocaleTimeString('fr-FR')}
                </RNText>
                <RNText style={styles.freezeFrameToggle}>
                  {showFreezeFrame ? '▲' : '▼'}
                </RNText>
              </TouchableOpacity>
              {showFreezeFrame && (
                <View style={styles.freezeFrameGrid}>
                  {freezeFrame.pids
                    .filter(item => typeof item.value === 'number')
                    .map((item: any, i: number) => (
                      <View key={i} style={styles.freezeFrameCell}>
                        <RNText style={styles.freezeFramePid}>
                          {item.pid}
                        </RNText>
                        <RNText style={styles.freezeFrameValue}>
                          {typeof item.value === 'number'
                            ? item.value.toFixed(1)
                            : item.value}
                        </RNText>
                        {item.unit ? (
                          <RNText style={styles.freezeFrameUnit}>
                            {item.unit}
                          </RNText>
                        ) : null}
                      </View>
                    ))}
                </View>
              )}
            </View>
          )}
          {!aiPanelCollapsed && (
            <View>
              {/* Badges analytiques avancés */}
              {(aiAnalysis.summary?.tendances_detectees > 0 ||
                aiAnalysis.summary?.ecarts_baseline > 0 ||
                aiAnalysis.summary?.ml_alerte > 0) && (
                <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8, paddingHorizontal: 4}}>
                  {aiAnalysis.summary?.tendances_detectees > 0 && (
                    <View style={[styles.aiBadge, {backgroundColor: '#E65100'}]}>
                      <RNText style={styles.aiBadgeText}>📈 {aiAnalysis.summary.tendances_detectees} tendance(s)</RNText>
                    </View>
                  )}
                  {aiAnalysis.summary?.ecarts_baseline > 0 && (
                    <View style={[styles.aiBadge, {backgroundColor: '#4527A0'}]}>
                      <RNText style={styles.aiBadgeText}>🧠 {aiAnalysis.summary.ecarts_baseline} écart(s) baseline</RNText>
                    </View>
                  )}
                  {aiAnalysis.summary?.ml_alerte > 0 && (
                    <View style={[styles.aiBadge, {backgroundColor: '#00695C'}]}>
                      <RNText style={styles.aiBadgeText}>🤖 Alerte ML</RNText>
                    </View>
                  )}
                </View>
              )}
              {/* Progression baseline */}
              {baselineProgress && (
                <View style={{marginBottom: 8, paddingHorizontal: 4}}>
                  <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3}}>
                    <RNText style={{color: '#90CAF9', fontSize: 11}}>
                      🧠 Apprentissage baseline : {baselineProgress.sample_count} lectures
                    </RNText>
                    <RNText style={{color: baselineProgress.is_mature ? '#66BB6A' : '#FFA726', fontSize: 11}}>
                      {baselineProgress.is_mature ? '✓ Mature' : `${baselineProgress.progress}%`}
                    </RNText>
                  </View>
                  <ProgressBar
                    progress={baselineProgress.progress / 100}
                    color={baselineProgress.is_mature ? '#66BB6A' : '#42A5F5'}
                    style={{height: 4, borderRadius: 2, backgroundColor: '#1E3A5F'}}
                  />
                </View>
              )}
              <RNText style={styles.aiEngine}>
                {aiAnalysis.summary?.engine_version}
              </RNText>
            </View>
          )}
        </View>
      )}

      {/* Analyse spécifique de la charge moteur */}
      {isLive && renderEngineLoadInsight()}

      {renderLambdaIndicator()}

      {currentOBDData.length > 0 ? (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.grid}>
            {sortedData.map(item => (
              <View
                key={item.pid}
                style={
                  favorites.includes(item.pid)
                    ? styles.fullWidth
                    : styles.halfWidth
                }>
                {renderPIDCard(item, favorites.includes(item.pid))}
              </View>
            ))}
          </View>
        </ScrollView>
      ) : (
        <View style={styles.emptyContainer}>
          <RNText style={styles.emptyIcon}>📡</RNText>
          <Text variant="titleLarge" style={styles.emptyTitle}>
            Prêt pour le direct
          </Text>
          <RNText style={styles.emptyText}>
            {obdService.isConnected || obdService.isMockMode()
              ? 'Démarrage du flux de données...'
              : "Connectez l'adaptateur OBD pour voir les données en temps réel."}
          </RNText>
          {!obdService.isConnected && !obdService.isMockMode() && (
            <Button
              mode="contained"
              style={{marginTop: 20}}
              onPress={() => navigation.navigate('Scan')}>
              Aller au Scan
            </Button>
          )}
        </View>
      )}

      {/* Modal Aide — Glossaire des termes */}
      <Portal>
        <Modal
          visible={showHelpModal}
          onDismiss={() => setShowHelpModal(false)}
          contentContainerStyle={styles.helpModalContent}>
          <View style={styles.helpModalHeader}>
            <RNText style={styles.helpModalTitle}>❓ Guide des paramètres</RNText>
            <TouchableOpacity onPress={() => setShowHelpModal(false)}>
              <RNText style={styles.helpModalClose}>✕</RNText>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.helpModalScroll} showsVerticalScrollIndicator={false}>
            {[
              {
                section: '🔧 Moteur',
                items: [
                  { term: 'Régime moteur (tr/min)', desc: "Nombre de tours que fait le moteur par minute. Au ralenti : 700–900 tr/min. Si c'est trop bas, le moteur cale. Si c'est trop haut sans raison, il y a un problème." },
                  { term: 'Charge moteur (%)', desc: "À quel point le moteur travaille dur. 0% = moteur au repos. 100% = moteur à fond. Une charge élevée en permanence peut indiquer un moteur qui peine." },
                  { term: 'Avance à l\'allumage (°)', desc: "À quel moment précis l'étincelle met le feu au mélange. Si la valeur est négative ou très faible, le moteur cliquète ou perd de la puissance." },
                  { term: 'Couple moteur réel (%)', desc: "La force que le moteur produit en ce moment, en pourcentage de sa force maximale. Utile pour voir si le moteur donne toute sa puissance." },
                  { term: 'Débit air (MAF) (g/s)', desc: "La quantité d'air qui entre dans le moteur. Si cette valeur est anormale, le moteur reçoit trop ou pas assez d'air — signe d'un filtre bouché ou d'un capteur défaillant." },
                ],
              },
              {
                section: '🌡️ Températures',
                items: [
                  { term: 'Température liquide (°C)', desc: "Température de l'eau de refroidissement du moteur. Normal : 80–95°C. Au-dessus de 100°C, le moteur surchauffe — risque de casse." },
                  { term: 'Température huile (°C)', desc: "Température de l'huile moteur. Normal : 80–120°C. Une huile trop chaude se dégrade et ne lubrifie plus bien — risque d'usure rapide." },
                  { term: 'Température air admission (°C)', desc: "Température de l'air qui entre dans le moteur. Un air trop chaud réduit la puissance. Normal : proche de la température ambiante." },
                  { term: 'Température ambiante (°C)', desc: "La température extérieure mesurée par le véhicule. Sert de référence pour les autres mesures thermiques." },
                  { term: 'Température gaz échapp. (°C)', desc: "Chaleur des gaz qui sortent du moteur. Une valeur très élevée peut indiquer un problème de combustion ou un catalyseur en surchauffe." },
                  { term: 'Température liquide 2 (°C)', desc: "Deuxième sonde de température du liquide de refroidissement. Présente sur certains moteurs pour surveiller plusieurs zones." },
                ],
              },
              {
                section: '⛽ Carburant & Injection',
                items: [
                  { term: 'Niveau carburant (%)', desc: "Quantité de carburant restante dans le réservoir. En dessous de 10%, le risque de panne sèche est élevé." },
                  { term: 'Correction carburant (%)', desc: "Ajustement que fait le calculateur sur la quantité de carburant injectée, en ce moment. Une valeur très positive ou négative (>10%) signale un problème d'injection ou une fuite d'air." },
                  { term: 'Correction inject. court (%)', desc: "Correction immédiate et rapide de l'injection. Varie constamment. Si elle reste bloquée à une valeur extrême, la sonde lambda ou les injecteurs sont suspects." },
                  { term: 'Ratio air/carburant', desc: "Proportion d'air par rapport au carburant dans le mélange. La valeur idéale est 14,7 (stochiométrie). Trop d'air = mélange pauvre. Trop de carburant = mélange riche." },
                  { term: 'Consommation carburant (L/h)', desc: "Litres de carburant consommés par heure en ce moment. Utile pour détecter une surconsommation anormale." },
                  { term: 'Pression carburant inj. (kPa)', desc: "Pression dans le circuit d'injection. Une pression trop basse indique une pompe à carburant fatiguée ou un filtre bouché." },
                ],
              },
              {
                section: '💨 Admission & Pression',
                items: [
                  { term: 'Position papillon (%)', desc: "Ouverture de la valve qui contrôle l'air entrant. 0% = pied levé. 100% = pied au plancher. Permet de voir si le conducteur accélère." },
                  { term: 'Pression collecteur MAP (kPa)', desc: "Pression dans le tuyau d'admission. Sert à calculer la quantité d'air. Une valeur anormale peut indiquer une fuite ou un turbo défaillant." },
                  { term: 'Pression atmosphérique (kPa)', desc: "Pression de l'air extérieur. Normale au niveau de la mer : 101 kPa. Diminue en altitude. Sert de référence pour le calcul du turbo." },
                  { term: 'Pression admission abs. (kPa)', desc: "Pression absolue dans l'admission. Combinée à la pression atmosphérique, elle indique le niveau de suralimentation (turbo/compresseur)." },
                  { term: 'Charge absolue moteur (%)', desc: "Charge réelle du moteur calculée différemment de la charge standard. Donne une image plus précise du travail effectif du moteur." },
                ],
              },
              {
                section: '🔋 Électrique & Batterie',
                items: [
                  { term: 'Tension module (V)', desc: "Tension électrique mesurée par le calculateur moteur. Normal moteur tournant : 13,5–14,5V. En dessous de 12V, l'alternateur ne charge plus." },
                  { term: 'Tension batterie (V)', desc: "Tension directe de la batterie 12V. Moteur arrêté : 12,4–12,7V. Moteur tournant : 13,5–14,5V. En dessous de 11,5V, la batterie est à plat." },
                  { term: 'Charge batterie hybride (%)', desc: "Niveau de charge de la batterie haute tension sur les véhicules hybrides. En dessous de 20%, le moteur thermique prend le relais." },
                ],
              },
              {
                section: '🚗 Vitesse & Transmission',
                items: [
                  { term: 'Vitesse véhicule (km/h)', desc: "Vitesse actuelle du véhicule lue directement depuis le calculateur. Plus fiable que le compteur de bord qui peut être mal étalonné." },
                  { term: 'Accélérateur relatif (%)', desc: "Position de la pédale d'accélérateur par rapport à sa plage de fonctionnement. Différent de la position du papillon car il y a un calculateur entre les deux." },
                  { term: 'Papillon commandé (%)', desc: "Position que le calculateur demande au papillon d'atteindre. Si différente de la position réelle, il y a un problème de commande électronique." },
                  { term: 'Position papillon relatif (%)', desc: "Position du papillon par rapport à sa position de repos. Utile pour détecter un papillon encrassé qui ne ferme pas complètement." },
                  { term: 'Papillon absolu B (%)', desc: "Deuxième capteur de position du papillon (sur les moteurs avec double capteur). Sert à la sécurité et à la redondance." },
                ],
              },
              {
                section: '🔬 Sondes & Émissions',
                items: [
                  { term: 'Sonde O2 amont (V)', desc: "Sonde lambda avant le catalyseur. Mesure la richesse du mélange. Oscille entre 0,1V (pauvre) et 0,9V (riche). Si elle reste fixe, elle est morte." },
                  { term: 'Sonde O2 aval (V)', desc: "Sonde lambda après le catalyseur. Doit rester stable autour de 0,6–0,7V. Si elle oscille comme la sonde amont, le catalyseur est épuisé." },
                ],
              },
              {
                section: '⏱️ Diagnostics & Historique',
                items: [
                  { term: 'Durée depuis démarrage (s)', desc: "Temps écoulé depuis le démarrage du moteur, en secondes. Utile pour savoir si le moteur est chaud ou encore en phase de chauffe." },
                  { term: 'Distance avec MIL allumé (km)', desc: "Kilomètres parcourus avec le voyant moteur allumé (le voyant en forme de moteur sur le tableau de bord). Plus c'est élevé, plus le problème dure." },
                  { term: 'Distance depuis RAZ DTC (km)', desc: "Kilomètres parcourus depuis la dernière remise à zéro des codes d'erreur. Permet de savoir si les codes sont récents ou anciens." },
                  { term: 'Durée MIL allumé (min)', desc: "Temps total en minutes pendant lequel le voyant moteur a été allumé. Un chiffre élevé indique un problème persistant non résolu." },
                  { term: 'Durée depuis RAZ DTC (min)', desc: "Temps en minutes depuis la dernière effacement des codes d'erreur. Utile pour évaluer la fiabilité d'un véhicule récemment scanné." },
                ],
              },
              {
                section: '📊 Indicateurs calculés',
                items: [
                  { term: 'Indicateur λ (Lambda)', desc: "Richesse du mélange air/carburant calculée à partir des corrections d'injection. λ=1 = mélange parfait. λ<1 = trop de carburant (riche). λ>1 = pas assez de carburant (pauvre)." },
                  { term: 'Efficacité catalyseur (%)', desc: "Pourcentage d'efficacité du pot catalytique, calculé en comparant les sondes O2 amont et aval. En dessous de 60%, le catalyseur doit être remplacé." },
                  { term: 'Freeze Frame', desc: "Photo instantanée de tous les paramètres au moment exact où une anomalie a été détectée. Permet de savoir dans quelles conditions la panne est apparue." },
                ],
              },
            ].map((section, si) => (
              <View key={si} style={styles.helpSection}>
                <RNText style={styles.helpSectionTitle}>{section.section}</RNText>
                {section.items.map((item, ii) => (
                  <View key={ii} style={styles.helpItem}>
                    <RNText style={styles.helpTerm}>{item.term}</RNText>
                    <RNText style={styles.helpDesc}>{item.desc}</RNText>
                  </View>
                ))}
              </View>
            ))}
            <View style={{height: 20}} />
          </ScrollView>
        </Modal>
      </Portal>

      {/* Modal Focus */}
      <Portal>
        <Modal
          visible={!!selectedPID}
          onDismiss={() => setSelectedPID(null)}
          contentContainerStyle={styles.modalContent}>
          {selectedPID && (
            <View style={styles.focusContainer}>
              <RNText style={styles.focusName}>{selectedPID.name}</RNText>
              <RNText
                style={[
                  styles.focusValue,
                  {color: getStatusColor(selectedPID)},
                ]}>
                {typeof selectedPID.value === 'number'
                  ? Math.round(selectedPID.value)
                  : String(selectedPID.value)}
                <RNText style={styles.focusUnit}> {selectedPID.unit}</RNText>
              </RNText>
              <RNText style={styles.focusRaw}>
                Donnée brute: {selectedPID.rawData}
              </RNText>
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
            {
              backgroundColor: isLive ? '#4CAF50' : '#F44336',
              transform: [{scale: isLive ? pulseAnim : 1}],
            },
          ]}
        />
        <RNText style={styles.footerText}>
          {isLive ? 'Flux en direct' : 'Flux arrêté'} •{' '}
          {vehicleInfo.protocol || 'Auto'}
          {lastUpdate
            ? ` • MàJ ${lastUpdate.toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}`
            : ''}
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
    paddingTop: Platform.OS === 'ios' ? 20 : 10,
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
    borderRadius: 14,
    elevation: 4,
    backgroundColor: '#FAFAFA',
    minHeight: 140,
    justifyContent: 'center',
  },
  pidCardWithBadge: {
    minHeight: 160,
  },
  pidCardContent: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  largeCard: {
    minHeight: 170,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  pidNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  pidIcon: {
    fontSize: 20,
    marginRight: 6,
  },
  favButton: {
    margin: 0,
    padding: 0,
  },
  pidName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#212121',
  },
  pidSource: {
    fontSize: 9,
    color: '#BDBDBD',
    letterSpacing: 0.5,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  valueBlock: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flex: 1,
  },
  pidValue: {
    fontSize: 26,
    fontWeight: 'bold',
  },
  pidUnit: {
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '500',
  },
  pidBadge: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 3,
  },
  chartContainer: {
    position: 'relative',
    overflow: 'hidden',
    marginLeft: 8,
  },
  chartLabel: {
    fontSize: 8,
    color: '#9E9E9E',
    lineHeight: 10,
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
    marginTop: 4,
    marginBottom: 4,
    borderRadius: 12,
    padding: 12,
    maxHeight: 420,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  insightCard: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    borderRadius: 10,
    padding: 12,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    marginLeft: -8,
  },
  insightTitle: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  insightMessage: {
    fontSize: 12,
    lineHeight: 16,
    opacity: 0.9,
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
  lambdaCard: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#1A237E',
    borderRadius: 12,
    padding: 12,
    elevation: 3,
  },
  lambdaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  lambdaTitle: {
    color: '#E3F2FD',
    fontSize: 13,
    fontWeight: 'bold',
  },
  lambdaLabel: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  lambdaBar: {
    height: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 5,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 4,
  },
  lambdaFill: {
    height: '100%',
    borderRadius: 5,
  },
  lambdaCenter: {
    position: 'absolute',
    left: '50%',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: '#4CAF50',
  },
  lambdaBarLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  lambdaBarLabel: {
    color: '#90CAF9',
    fontSize: 10,
  },
  lambdaDetail: {
    color: '#B0BEC5',
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 6,
  },
  lambdaTrimRow: {
    flexDirection: 'row',
    gap: 16,
  },
  lambdaTrimItem: {
    color: '#64B5F6',
    fontSize: 11,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  freezeFrameContainer: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.15)',
    paddingTop: 8,
  },
  freezeFrameHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  freezeFrameTitle: {
    color: '#80DEEA',
    fontSize: 12,
    fontWeight: 'bold',
  },
  freezeFrameToggle: {
    color: '#80DEEA',
    fontSize: 12,
    paddingHorizontal: 4,
  },
  freezeFrameGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  freezeFrameCell: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'center',
    minWidth: 70,
  },
  freezeFramePid: {
    color: '#90CAF9',
    fontSize: 10,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  freezeFrameValue: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  freezeFrameUnit: {
    color: '#B0BEC5',
    fontSize: 9,
  },
  pdfButton: {
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 2,
    backgroundColor: '#00695C',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  pdfButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  soundButton: {
    backgroundColor: '#1A237E',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  soundButtonText: {
    fontSize: 20,
  },
  // Styles Modal Aide
  helpModalContent: {
    backgroundColor: '#1A2A3A',
    marginHorizontal: 12,
    marginVertical: 40,
    borderRadius: 16,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  helpModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#2E4A6A',
    backgroundColor: '#0D1B2A',
  },
  helpModalTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#E3F2FD',
  },
  helpModalClose: {
    fontSize: 20,
    color: '#90CAF9',
    paddingHorizontal: 4,
  },
  helpModalScroll: {
    paddingHorizontal: 14,
    paddingTop: 8,
  },
  helpSection: {
    marginTop: 16,
    marginBottom: 4,
  },
  helpSectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#64B5F6',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  helpItem: {
    backgroundColor: '#0D1B2A',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#1565C0',
  },
  helpTerm: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#90CAF9',
    marginBottom: 4,
  },
  helpDesc: {
    fontSize: 12,
    color: '#B0BEC5',
    lineHeight: 18,
  },
});
