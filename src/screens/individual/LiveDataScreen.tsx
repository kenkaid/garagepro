import React, {useState, useRef, useCallback, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Vibration,
  Platform,
} from 'react-native';
import {Surface, Card, ActivityIndicator} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {useFocusEffect} from '@react-navigation/native';
import {useStore} from '../../store/useStore';
import {obdService} from '../../services/obdService';
import {apiService} from '../../services/apiService';
import {telemetrySyncService} from '../../services/telemetrySyncService';
import {notificationSoundService} from '../../services/NotificationSoundService';

// ─── Traduction des anomalies en langage simple ───────────────────────────────
type AnomalyInfo = {
  icon: string;
  title: string;
  description: string;
  urgency: string;
  action: string;
};

const simplifyAnomaly = (anomaly: {pid: string; name?: string; severity: string; message: string}): AnomalyInfo => {
  const pid = anomaly.pid?.toUpperCase();
  const msg = (anomaly.message || '').toLowerCase();
  const isCritical = anomaly.severity === 'critical' || anomaly.severity === 'CRITICAL';

  // ── Batterie / Alternateur ──────────────────────────────────────────────────
  if (pid === '42' || pid === 'BATTERY' || msg.includes('battery') || msg.includes('tension') || msg.includes('voltage') || msg.includes('alternator') || msg.includes('alternateur')) {
    if (isCritical) {
      return {
        icon: 'battery-alert',
        title: '🔋 Votre batterie va vous lâcher',
        description: 'La tension de votre batterie est dangereusement basse. Votre voiture risque de ne plus démarrer d\'ici quelques heures ou quelques jours.',
        urgency: 'URGENT',
        action: 'Rendez-vous chez un garagiste aujourd\'hui. Ne coupez pas le moteur si vous pouvez l\'éviter.',
      };
    }
    return {
      icon: 'battery-medium',
      title: '🔋 Batterie ou alternateur faible',
      description: 'Votre batterie ne se recharge pas correctement. Si vous ne faites rien, votre voiture pourrait tomber en panne dans la semaine.',
      urgency: 'ATTENTION',
      action: 'Faites vérifier la batterie et l\'alternateur chez un garagiste cette semaine.',
    };
  }

  // ── Court-circuit ───────────────────────────────────────────────────────────
  if (msg.includes('court-circuit') || msg.includes('short circuit') || msg.includes('short') || msg.includes('court circuit')) {
    return {
      icon: 'lightning-bolt',
      title: '⚡ Court-circuit dans votre voiture',
      description: 'Un court-circuit a été détecté dans le système électrique. C\'est dangereux : cela peut provoquer un incendie ou une panne totale.',
      urgency: 'URGENT',
      action: 'Arrêtez le véhicule dès que possible et appelez un garagiste. Ne laissez pas la voiture sans surveillance.',
    };
  }

  // ── Airbag ──────────────────────────────────────────────────────────────────
  if (msg.includes('airbag') || msg.includes('air bag') || msg.includes('srs') || pid === 'AIRBAG') {
    return {
      icon: 'shield-alert',
      title: '🛡️ Votre airbag est déconnecté',
      description: 'Le système d\'airbag ne fonctionne pas correctement. En cas d\'accident, les airbags pourraient ne pas se déclencher et vous protéger.',
      urgency: 'URGENT',
      action: 'Consultez un garagiste immédiatement. Ne prenez pas de risques avec votre sécurité.',
    };
  }

  // ── ABS ─────────────────────────────────────────────────────────────────────
  if (msg.includes('abs') || pid === 'ABS') {
    return {
      icon: 'car-brake-abs',
      title: '🛑 Votre ABS a lâché',
      description: 'Le système de freinage antiblocage (ABS) est en panne. Par temps de pluie ou en freinage d\'urgence, votre voiture risque de déraper.',
      urgency: 'URGENT',
      action: 'Roulez prudemment et évitez les freinages brusques. Faites réparer l\'ABS dès que possible.',
    };
  }

  // ── Pression d'huile ────────────────────────────────────────────────────────
  if (pid === '0B' || pid === '0A' || msg.includes('oil') || msg.includes('huile') || msg.includes('pression') || msg.includes('pressure')) {
    return {
      icon: 'oil',
      title: '🛢️ Pression d\'huile anormale',
      description: 'La pression d\'huile moteur est trop basse ou trop haute. Sans huile suffisante, le moteur peut se gripper et être irréparable.',
      urgency: 'URGENT',
      action: 'Arrêtez le moteur immédiatement et vérifiez le niveau d\'huile. Appelez un garagiste si le niveau est correct.',
    };
  }

  // ── Température moteur ──────────────────────────────────────────────────────
  if (pid === '05' || msg.includes('coolant') || msg.includes('refroidissement') || msg.includes('surchauffe') || msg.includes('overheat') || msg.includes('température') || msg.includes('temperature')) {
    return {
      icon: 'thermometer-alert',
      title: '🌡️ Votre moteur surchauffe',
      description: 'La température du moteur est trop élevée. Si vous continuez à rouler, le moteur peut être endommagé de façon irréparable et coûter très cher à réparer.',
      urgency: 'URGENT',
      action: 'Arrêtez-vous dès que possible en lieu sûr. Coupez le moteur et attendez qu\'il refroidisse. Vérifiez le liquide de refroidissement.',
    };
  }

  // ── Carburant ───────────────────────────────────────────────────────────────
  if (pid === '2F' || msg.includes('fuel') || msg.includes('carburant') || msg.includes('essence') || msg.includes('gasoil')) {
    return {
      icon: 'gas-station-off',
      title: '⛽ Niveau de carburant critique',
      description: 'Votre réservoir est presque vide. Votre voiture risque de tomber en panne sèche d\'un moment à l\'autre.',
      urgency: 'ATTENTION',
      action: 'Faites le plein dès que possible. Ne prenez pas le risque de tomber en panne sur la route.',
    };
  }

  // ── Régime moteur (RPM) ─────────────────────────────────────────────────────
  if (pid === '0C' || msg.includes('rpm') || msg.includes('régime') || msg.includes('ralenti')) {
    return {
      icon: 'engine',
      title: '⚙️ Régime moteur anormal',
      description: 'Le moteur tourne de façon irrégulière. Cela peut indiquer un problème d\'injection, de bougies ou de courroie de distribution.',
      urgency: isCritical ? 'URGENT' : 'ATTENTION',
      action: 'Évitez les accélérations brusques. Faites vérifier le moteur chez un garagiste rapidement.',
    };
  }

  // ── Charge moteur ───────────────────────────────────────────────────────────
  if (pid === '04' || msg.includes('load') || msg.includes('charge moteur')) {
    return {
      icon: 'engine-off',
      title: '🔧 Moteur trop sollicité',
      description: 'Votre moteur travaille trop fort par rapport à la normale. Cela peut user prématurément les pièces et augmenter votre consommation.',
      urgency: 'ATTENTION',
      action: 'Réduisez la vitesse et évitez les accélérations. Faites vérifier le filtre à air et l\'injection.',
    };
  }

  // ── Papillon / Accélération ─────────────────────────────────────────────────
  if (pid === '11' || msg.includes('throttle') || msg.includes('papillon') || msg.includes('accelerat')) {
    return {
      icon: 'speedometer',
      title: '🚦 Problème d\'accélération',
      description: 'Le système qui contrôle l\'accélération de votre voiture ne répond pas normalement. Vous pourriez avoir des à-coups ou une perte de puissance.',
      urgency: 'ATTENTION',
      action: 'Consultez un garagiste. Évitez les longs trajets en attendant.',
    };
  }

  // ── Calage / Distribution ───────────────────────────────────────────────────
  if (pid === '0E' || msg.includes('timing') || msg.includes('avance') || msg.includes('distribution') || msg.includes('courroie')) {
    return {
      icon: 'cog-sync',
      title: '⚠️ Problème de distribution moteur',
      description: 'Le calage du moteur est perturbé. Si la courroie de distribution casse, le moteur peut être détruit complètement.',
      urgency: 'URGENT',
      action: 'Faites vérifier la courroie de distribution immédiatement. C\'est une réparation critique.',
    };
  }

  // ── Vitesse capteur ─────────────────────────────────────────────────────────
  if (pid === '0D' || msg.includes('speed sensor') || msg.includes('capteur vitesse')) {
    return {
      icon: 'speedometer-slow',
      title: '🚗 Capteur de vitesse défaillant',
      description: 'Le capteur qui mesure votre vitesse ne fonctionne pas correctement. Votre compteur peut afficher une vitesse incorrecte.',
      urgency: 'ATTENTION',
      action: 'Faites vérifier le capteur de vitesse chez un garagiste.',
    };
  }

  // ── Générique critique ──────────────────────────────────────────────────────
  if (isCritical) {
    return {
      icon: 'alert-circle',
      title: `🚨 Problème grave détecté`,
      description: `Un problème sérieux a été détecté sur votre véhicule${anomaly.name ? ' : ' + anomaly.name : ''}. Ignorer ce problème peut entraîner une panne ou un accident.`,
      urgency: 'URGENT',
      action: 'Consultez un garagiste immédiatement. Ne tardez pas.',
    };
  }

  // ── Générique avertissement ─────────────────────────────────────────────────
  return {
    icon: 'alert',
    title: `⚠️ Anomalie détectée`,
    description: `Votre voiture présente une anomalie${anomaly.name ? ' (' + anomaly.name + ')' : ''}. Ce n\'est peut-être pas urgent, mais il vaut mieux ne pas l\'ignorer.`,
    urgency: 'ATTENTION',
    action: 'Faites vérifier votre voiture chez un garagiste dans les prochains jours.',
  };
};

// ─── Types ────────────────────────────────────────────────────────────────────
type LiveData = {
  rpm: number | null;
  speed: number | null;
  coolantTemp: number | null;
  fuelLevel: number | null;
  throttle: number | null;
  voltage: number | null;
  engineLoad: number | null;
};

type AIResult = {
  status: string;
  verdict?: string;
  summary?: {
    total_anomalies: number;
    anomalies_critiques: number;
    courts_circuits: number;
  };
  anomalies?: Array<{
    pid: string;
    name?: string;
    severity: string;
    message: string;
  }>;
};

// ─── Composant carte de donnée ─────────────────────────────────────────────
const DataCard = ({
  icon,
  label,
  value,
  unit,
  color,
  warning,
}: {
  icon: string;
  label: string;
  value: number | null;
  unit: string;
  color: string;
  warning?: boolean;
}) => (
  <Surface style={[styles.dataCard, warning && styles.dataCardWarning]} elevation={2}>
    <View style={[styles.dataCardIcon, {backgroundColor: color + '22'}]}>
      <Icon name={icon} size={24} color={warning ? '#F44336' : color} />
    </View>
    <Text style={styles.dataCardLabel}>{label}</Text>
    <Text style={[styles.dataCardValue, warning && {color: '#F44336'}]}>
      {value !== null && value !== undefined ? value.toFixed(0) : '--'}
    </Text>
    <Text style={styles.dataCardUnit}>{unit}</Text>
  </Surface>
);

// ─── Écran principal ───────────────────────────────────────────────────────
const LiveDataScreen = ({navigation}: any) => {
  const {user} = useStore();
  const [isLive, setIsLive] = useState(false);
  const [liveData, setLiveData] = useState<LiveData>({
    rpm: null,
    speed: null,
    coolantTemp: null,
    fuelLevel: null,
    throttle: null,
    voltage: null,
    engineLoad: null,
  });
  const [aiResult, setAiResult] = useState<AIResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const activeRef = useRef(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const aiCounterRef = useRef(0);
  const isAnalyzingRef = useRef(false);
  const isMounted = useRef(true);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const triggerPulse = useCallback(() => {
    Animated.sequence([
      Animated.timing(pulseAnim, {toValue: 1.6, duration: 150, useNativeDriver: true}),
      Animated.timing(pulseAnim, {toValue: 1, duration: 300, useNativeDriver: true}),
    ]).start();
  }, [pulseAnim]);

  const playAlert = useCallback((level: 'warning' | 'critical') => {
    if (level === 'critical') {
      Vibration.vibrate([0, 400, 200, 400]);
    } else {
      Vibration.vibrate([0, 300]);
    }
  }, []);

  const runAIAnalysis = useCallback(
    async (pids: Array<{pid: string; value: number; unit: string}>) => {
      if (isAnalyzingRef.current || pids.length === 0) return;
      isAnalyzingRef.current = true;
      if (isMounted.current) setIsAnalyzing(true);
      try {
        const result = await apiService.analyzeLive(pids, undefined, []);
        if (result && !result.__error && isMounted.current) {
          setAiResult(result);
          if (result.summary?.total_anomalies > 0) {
            // Vibration selon sévérité
            if (result.summary.anomalies_critiques > 0 || result.summary.courts_circuits > 0) {
              playAlert('critical');
            } else {
              playAlert('warning');
            }
            // Notification système 3 fois
            notificationSoundService.play();
            setTimeout(() => notificationSoundService.play(), 1500);
            setTimeout(() => notificationSoundService.play(), 3000);
          }
        }
      } catch (_) {}
      finally {
        isAnalyzingRef.current = false;
        if (isMounted.current) setIsAnalyzing(false);
      }
    },
    [playAlert],
  );

  const startLive = useCallback(() => {
    if (!obdService.isConnected && !obdService.isMockMode()) {
      return;
    }
    if (activeRef.current) return;
    activeRef.current = true;
    setIsLive(true);

    const loop = async () => {
      if (!activeRef.current || !isMounted.current) return;
      try {
        const pids = await obdService.readCommonPIDs();
        if (pids && pids.length > 0 && isMounted.current) {
          const byPid: Record<string, number> = {};
          pids.forEach(p => {
            if (typeof p.value === 'number') byPid[p.pid.toUpperCase()] = p.value;
          });

          const newData: LiveData = {
            rpm: byPid['0C'] ?? null,
            speed: byPid['0D'] ?? null,
            coolantTemp: byPid['05'] ?? null,
            fuelLevel: byPid['2F'] ?? null,
            throttle: byPid['11'] ?? null,
            voltage: byPid['42'] ?? byPid['BATTERY'] ?? null,
            engineLoad: byPid['04'] ?? null,
          };
          setLiveData(newData);
          setLastUpdate(new Date());
          triggerPulse();

          // Sync cloud
          telemetrySyncService.updateBuffer({
            rpm: newData.rpm,
            speed: newData.speed,
            coolantTemp: newData.coolantTemp,
            fuelLevel: newData.fuelLevel,
            throttle: newData.throttle,
          });

          // Analyse IA toutes les 5 lectures (~15s)
          aiCounterRef.current += 1;
          if (aiCounterRef.current % 5 === 0) {
            const pidList = pids
              .filter(p => typeof p.value === 'number')
              .map(p => ({pid: p.pid, value: p.value as number, unit: p.unit || ''}));
            runAIAnalysis(pidList);
          }
        }
      } catch (_) {}
      if (activeRef.current && isMounted.current) {
        timerRef.current = setTimeout(loop as any, 3000) as any;
      }
    };

    loop();
  }, [triggerPulse, runAIAnalysis]);

  const stopLive = useCallback(() => {
    activeRef.current = false;
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsLive(false);
    setLiveData({rpm: null, speed: null, coolantTemp: null, fuelLevel: null, throttle: null, voltage: null, engineLoad: null});
    setAiResult(null);
  }, []);

  useFocusEffect(
    useCallback(() => {
      return () => {
        stopLive();
      };
    }, [stopLive]),
  );

  const isConnected = obdService.isConnected || obdService.isMockMode();

  // Seuils d'alerte
  const tempWarning = liveData.coolantTemp !== null && liveData.coolantTemp > 100;
  const rpmWarning = liveData.rpm !== null && liveData.rpm > 5000;
  const fuelWarning = liveData.fuelLevel !== null && liveData.fuelLevel < 15;

  const severityColor = (s: string) => {
    if (s === 'critical' || s === 'CRITICAL') return '#F44336';
    if (s === 'warning' || s === 'WARNING') return '#FF9800';
    return '#2196F3';
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* ── En-tête statut ── */}
      <Surface style={styles.statusBar} elevation={2}>
        <View style={styles.statusLeft}>
          <Animated.View
            style={[
              styles.statusDot,
              {
                backgroundColor: isLive ? '#4CAF50' : isConnected ? '#FF9800' : '#9E9E9E',
                transform: [{scale: isLive ? pulseAnim : 1}],
              },
            ]}
          />
          <Text style={styles.statusText}>
            {isLive ? 'Lecture en cours...' : isConnected ? 'OBD connecté' : 'OBD non connecté'}
          </Text>
        </View>
        {lastUpdate && (
          <Text style={styles.lastUpdateText}>
            {lastUpdate.toLocaleTimeString('fr-FR')}
          </Text>
        )}
      </Surface>

      {/* ── Bouton Start/Stop ── */}
      <TouchableOpacity
        style={[styles.mainButton, isLive ? styles.stopButton : styles.startButton, !isConnected && styles.disabledButton]}
        onPress={isLive ? stopLive : startLive}
        disabled={!isConnected}>
        <Icon name={isLive ? 'stop-circle' : 'play-circle'} size={28} color="#fff" />
        <Text style={styles.mainButtonText}>
          {isLive ? 'Arrêter' : isConnected ? 'Démarrer le Live' : 'OBD non connecté'}
        </Text>
      </TouchableOpacity>

      {/* ── Analyse IA ── */}
      <View style={styles.aiSection}>
        <View style={styles.aiHeader}>
          <Icon name="brain" size={20} color="#7C4DFF" />
          <Text style={styles.aiTitle}>Analyse IA</Text>
          {isAnalyzing && <ActivityIndicator size="small" color="#7C4DFF" style={{marginLeft: 8}} />}
        </View>

        {!isLive && !aiResult && (
          <Surface style={styles.aiEmpty} elevation={1}>
            <Icon name="information-outline" size={20} color="#9E9E9E" />
            <Text style={styles.aiEmptyText}>Démarrez le live pour activer l'analyse IA</Text>
          </Surface>
        )}

        {isLive && !aiResult && !isAnalyzing && (
          <Surface style={styles.aiEmpty} elevation={1}>
            <Icon name="clock-outline" size={20} color="#9E9E9E" />
            <Text style={styles.aiEmptyText}>Analyse en attente (toutes les ~15 secondes)</Text>
          </Surface>
        )}

        {aiResult && (
          <>
            {/* Statut global */}
            <Surface
              style={[
                styles.aiResultCard,
                aiResult.summary?.total_anomalies === 0
                  ? styles.aiOk
                  : aiResult.summary?.anomalies_critiques > 0
                  ? styles.aiCritical
                  : styles.aiWarning,
              ]}
              elevation={2}>
              <View style={styles.aiResultHeader}>
                <Icon
                  name={
                    aiResult.summary?.total_anomalies === 0
                      ? 'check-circle'
                      : aiResult.summary?.anomalies_critiques > 0
                      ? 'alert-circle'
                      : 'alert'
                  }
                  size={22}
                  color={
                    aiResult.summary?.total_anomalies === 0
                      ? '#4CAF50'
                      : aiResult.summary?.anomalies_critiques > 0
                      ? '#F44336'
                      : '#FF9800'
                  }
                />
                <Text style={styles.aiResultTitle}>
                  {aiResult.summary?.total_anomalies === 0
                    ? '✅ Votre véhicule est en bon état'
                    : aiResult.summary?.anomalies_critiques > 0
                    ? '🚨 Problème grave détecté !'
                    : `⚠️ ${aiResult.summary?.total_anomalies} problème(s) détecté(s)`}
                </Text>
              </View>
              <Text style={styles.aiVerdict}>
                {aiResult.summary?.total_anomalies === 0
                  ? 'Aucun problème détecté. Continuez à rouler sereinement.'
                  : aiResult.summary?.anomalies_critiques > 0
                  ? 'Arrêtez-vous dès que possible et consultez un garagiste.'
                  : 'Faites vérifier votre véhicule prochainement.'}
              </Text>
            </Surface>

            {/* Pannes en langage simple */}
            {aiResult.anomalies && aiResult.anomalies.length > 0 && (
              <View style={styles.faultSection}>
                <View style={styles.faultSectionHeader}>
                  <Icon name="wrench-outline" size={18} color="#E53935" />
                  <Text style={styles.faultSectionTitle}>Ce qui ne va pas sur votre voiture</Text>
                </View>
                {aiResult.anomalies.slice(0, 5).map((a, i) => {
                  const info = simplifyAnomaly(a);
                  const isUrgent = info.urgency === 'URGENT';
                  return (
                    <Surface
                      key={i}
                      style={[styles.faultCard, isUrgent ? styles.faultCardCritical : styles.faultCardWarning]}
                      elevation={2}>
                      {/* Badge urgence */}
                      <View style={[styles.faultBadge, {backgroundColor: isUrgent ? '#F44336' : '#FF9800'}]}>
                        <Text style={styles.faultBadgeText}>{info.urgency}</Text>
                      </View>
                      {/* Icône + Titre */}
                      <View style={styles.faultTitleRow}>
                        <Icon
                          name={info.icon}
                          size={22}
                          color={isUrgent ? '#F44336' : '#FF9800'}
                          style={{marginRight: 8}}
                        />
                        <Text style={[styles.faultTitle, {color: isUrgent ? '#C62828' : '#E65100'}]}>
                          {info.title}
                        </Text>
                      </View>
                      {/* Description claire */}
                      <Text style={styles.faultDescription}>{info.description}</Text>
                      {/* Action à faire */}
                      <View style={styles.faultActionRow}>
                        <Icon name="arrow-right-circle" size={16} color={isUrgent ? '#F44336' : '#FF9800'} style={{marginRight: 6}} />
                        <Text style={[styles.faultAction, {color: isUrgent ? '#C62828' : '#E65100'}]}>
                          {info.action}
                        </Text>
                      </View>
                    </Surface>
                  );
                })}
                <Surface style={styles.faultAdvice} elevation={0}>
                  <Icon name="map-marker-outline" size={16} color="#1976D2" />
                  <Text style={styles.faultAdviceText}>
                    Trouvez un garagiste près de chez vous via l'onglet "Garages à proximité".
                  </Text>
                </Surface>
              </View>
            )}
          </>
        )}
      </View>

      {/* ── Grille de données ── */}
      <View style={styles.grid}>
        <DataCard icon="engine" label="Régime moteur" value={liveData.rpm} unit="tr/min" color="#2196F3" warning={rpmWarning} />
        <DataCard icon="speedometer" label="Vitesse" value={liveData.speed} unit="km/h" color="#9C27B0" />
        <DataCard icon="thermometer" label="Température" value={liveData.coolantTemp} unit="°C" color="#F44336" warning={tempWarning} />
        <DataCard icon="gas-station" label="Carburant" value={liveData.fuelLevel} unit="%" color="#FF9800" warning={fuelWarning} />
        <DataCard icon="lightning-bolt" label="Tension" value={liveData.voltage} unit="V" color="#4CAF50" />
        <DataCard icon="gauge" label="Charge moteur" value={liveData.engineLoad} unit="%" color="#00BCD4" />
      </View>

      {/* ── Conseils ── */}
      {isLive && (
        <Card style={styles.tipsCard}>
          <Card.Content>
            <View style={styles.tipsHeader}>
              <Icon name="lightbulb-outline" size={18} color="#FF9800" />
              <Text style={styles.tipsTitle}>Conseils de conduite</Text>
            </View>
            <Text style={styles.tipText}>
              {liveData.rpm !== null && liveData.rpm > 3000
                ? '⚠️ Régime élevé — pensez à passer la vitesse supérieure.'
                : liveData.coolantTemp !== null && liveData.coolantTemp > 100
                ? '🌡️ Moteur chaud — réduisez la vitesse et vérifiez le liquide de refroidissement.'
                : liveData.fuelLevel !== null && liveData.fuelLevel < 15
                ? '⛽ Carburant faible — pensez à faire le plein bientôt.'
                : '✅ Conduite normale — continuez ainsi !'}
            </Text>
          </Card.Content>
        </Card>
      )}
    </ScrollView>
  );
};

// ─── Styles ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#F5F5F5'},
  content: {padding: 16, paddingBottom: 40},

  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  statusLeft: {flexDirection: 'row', alignItems: 'center'},
  statusDot: {width: 12, height: 12, borderRadius: 6, marginRight: 8},
  statusText: {fontSize: 14, color: '#333', fontWeight: '500'},
  lastUpdateText: {fontSize: 12, color: '#9E9E9E'},

  mainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 14,
    marginBottom: 20,
    gap: 10,
  },
  startButton: {backgroundColor: '#1976D2'},
  stopButton: {backgroundColor: '#F44336'},
  disabledButton: {backgroundColor: '#BDBDBD'},
  mainButtonText: {color: '#fff', fontSize: 16, fontWeight: 'bold'},

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
    justifyContent: 'space-between',
  },
  dataCard: {
    width: '47%',
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  dataCardWarning: {borderWidth: 1.5, borderColor: '#F44336'},
  dataCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  dataCardLabel: {fontSize: 11, color: '#9E9E9E', textAlign: 'center', marginBottom: 2},
  dataCardValue: {fontSize: 26, fontWeight: 'bold', color: '#212121'},
  dataCardUnit: {fontSize: 11, color: '#9E9E9E'},

  aiSection: {marginBottom: 20},
  aiHeader: {flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 6},
  aiTitle: {fontSize: 16, fontWeight: 'bold', color: '#212121'},
  aiEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#fff',
    gap: 8,
  },
  aiEmptyText: {fontSize: 13, color: '#9E9E9E'},
  aiResultCard: {padding: 14, borderRadius: 12},
  aiOk: {backgroundColor: '#E8F5E9'},
  aiWarning: {backgroundColor: '#FFF3E0'},
  aiCritical: {backgroundColor: '#FFEBEE'},
  aiResultHeader: {flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6},
  aiResultTitle: {fontSize: 15, fontWeight: 'bold', color: '#212121', flex: 1},
  aiVerdict: {fontSize: 13, color: '#555', marginBottom: 8, lineHeight: 18},
  anomaliesList: {marginTop: 4},
  anomalyRow: {flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4, gap: 6},
  anomalyDot: {width: 8, height: 8, borderRadius: 4, marginTop: 4},
  anomalyText: {fontSize: 13, color: '#333', flex: 1},

  faultSection: {marginTop: 12},
  faultSectionHeader: {flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10},
  faultSectionTitle: {fontSize: 15, fontWeight: 'bold', color: '#E53935'},
  faultCard: {
    flexDirection: 'column',
    padding: 14,
    borderRadius: 14,
    marginBottom: 12,
  },
  faultCardCritical: {backgroundColor: '#FFEBEE', borderLeftWidth: 5, borderLeftColor: '#F44336'},
  faultCardWarning: {backgroundColor: '#FFF8E1', borderLeftWidth: 5, borderLeftColor: '#FF9800'},
  faultBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 8,
  },
  faultBadgeText: {fontSize: 11, fontWeight: 'bold', color: '#fff', letterSpacing: 0.5},
  faultTitleRow: {flexDirection: 'row', alignItems: 'center', marginBottom: 6},
  faultTitle: {fontSize: 15, fontWeight: 'bold', flex: 1, lineHeight: 20},
  faultDescription: {fontSize: 14, color: '#444', lineHeight: 21, marginBottom: 10},
  faultActionRow: {flexDirection: 'row', alignItems: 'flex-start'},
  faultAction: {fontSize: 13, fontWeight: '600', flex: 1, lineHeight: 18},
  faultAdvice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#E3F2FD',
    marginTop: 4,
  },
  faultAdviceText: {fontSize: 13, color: '#1976D2', flex: 1, lineHeight: 18},

  tipsCard: {borderRadius: 14, backgroundColor: '#FFF8E1'},
  tipsHeader: {flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6},
  tipsTitle: {fontSize: 14, fontWeight: 'bold', color: '#E65100'},
  tipText: {fontSize: 13, color: '#555', lineHeight: 20},
});

export default LiveDataScreen;
