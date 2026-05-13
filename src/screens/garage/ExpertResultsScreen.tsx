// src/screens/garage/ExpertResultsScreen.tsx
import React, {useState, useMemo} from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  Text,
  TouchableOpacity,
  Share,
  Platform,
} from 'react-native';
import {
  Card,
  Button,
  Divider,
  List,
  TextInput,
  Chip,
  Badge,
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {obdService} from '../../services/obdService';
import {DTCCard} from '../../components/garage/DTCCard';
import {VehicleDiagnosticHeader} from '../../components/garage/VehicleDiagnosticHeader';
import {apiService} from '../../services/apiService';
import {useStore} from '../../store/useStore.ts';
import {hasFeature} from '../../utils/featureControl';

// ─── Helpers ────────────────────────────────────────────────────────────────

const getScoreColor = (score: number) => {
  if (score >= 80) return '#2E7D32';
  if (score >= 50) return '#E65100';
  return '#B71C1C';
};

const getScoreLabel = (score: number) => {
  if (score >= 80) return 'FIABLE';
  if (score >= 50) return 'DOUTEUX';
  return 'SUSPECT';
};

const getRecommendationColor = (rec: string) => {
  switch (rec) {
    case 'ACHETER':
      return '#2E7D32';
    case 'NÉGOCIER':
      return '#E65100';
    case 'FUIR':
      return '#B71C1C';
    default:
      return '#757575';
  }
};

const getRecommendationIcon = (rec: string) => {
  switch (rec) {
    case 'ACHETER':
      return 'thumb-up-outline';
    case 'FUIR':
      return 'thumb-down-outline';
    default:
      return 'hand-okay';
  }
};

const formatDate = (dateStr?: string) => {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
};

// ─── Calcul local du score si absent du backend ──────────────────────────────
const computeLocalScore = (
  mileageEcu?: number,
  mileageDashboard?: number,
  mileageAbs?: number,
  safetyCheck?: any,
  dtcCount?: number,
): number => {
  let score = 100;
  if (mileageEcu && mileageDashboard) {
    const diff = Math.abs(mileageEcu - mileageDashboard);
    if (diff > 10000) score -= 40;
    else if (diff > 1000) score -= 20;
    else if (diff > 100) score -= 10;
  }
  if (mileageAbs && mileageDashboard) {
    const diff = Math.abs(mileageAbs - mileageDashboard);
    if (diff > 10000) score -= 20;
    else if (diff > 1000) score -= 10;
  }
  if (safetyCheck?.has_crash_data) score -= 30;
  if (safetyCheck?.airbags_deployed > 0) score -= 10;
  if (dtcCount && dtcCount > 0) score -= Math.min(dtcCount * 3, 15);
  return Math.max(0, score);
};

const computeRecommendation = (score: number): string => {
  if (score >= 80) return 'ACHETER';
  if (score >= 50) return 'NÉGOCIER';
  return 'FUIR';
};

// ─── Composant principal ─────────────────────────────────────────────────────

export const ExpertResultsScreen: React.FC<{navigation: any; route: any}> = ({
  navigation,
  route,
}) => {
  const {
    user,
    currentDTCs,
    clearDTCs,
    vehicleInfo,
    scanHistory,
    setScanHistory,
    addScanToHistory,
  } = useStore();

  const getHomeRoute = () => {
    switch (user?.user_type) {
      case 'FLEET_OWNER':
        return 'FleetHome';
      case 'INDIVIDUAL':
        return 'IndividualHome';
      default:
        return 'ProHome';
    }
  };

  const historyScan = route.params?.scan;
  const isHistoryView = !!historyScan && !route.params?.isNewScan;

  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [dtcExpanded, setDtcExpanded] = useState(false);
  const [notes, setNotes] = useState(
    isHistoryView ? historyScan.notes || '' : '',
  );

  // ── Données véhicule ──────────────────────────────────────────────────────
  const displayVehicle = isHistoryView
    ? historyScan.vehicle
    : route.params?.scan?.vehicle || vehicleInfo;

  const vehicleBrand =
    historyScan?.vehicle?.brand ||
    (route.params?.scan?.vehicle as any)?.brand ||
    (displayVehicle as any)?.brand ||
    'Inconnue';
  const vehicleModel =
    historyScan?.vehicle?.model ||
    (route.params?.scan?.vehicle as any)?.model ||
    (displayVehicle as any)?.model ||
    'Inconnu';
  const vehicleYear =
    historyScan?.vehicle?.year ||
    (route.params?.scan?.vehicle as any)?.year ||
    (displayVehicle as any)?.year ||
    2020;
  const vehiclePlate =
    historyScan?.vehicle?.license_plate ||
    (route.params?.scan?.vehicle as any)?.license_plate ||
    (displayVehicle as any)?.license_plate ||
    (displayVehicle as any)?.licensePlate ||
    'INCONNU';
  const vehicleVin =
    historyScan?.vehicle?.vin ||
    (route.params?.scan?.vehicle as any)?.vin ||
    (displayVehicle as any)?.vin ||
    vehicleInfo?.vin;

  // ── Données certification ─────────────────────────────────────────────────
  const session = useStore.getState();
  const mileageEcu: number | undefined = isHistoryView
    ? historyScan.mileage_ecu
    : route.params?.scan?.mileage_ecu ?? (session as any).mileage_ecu;
  const mileageAbs: number | undefined = isHistoryView
    ? historyScan.mileage_abs
    : route.params?.scan?.mileage_abs ?? (session as any).mileage_abs;
  const mileageDashboard: number | undefined = isHistoryView
    ? historyScan.mileage_dashboard
    : route.params?.scan?.mileage_dashboard ??
      (session as any).mileage_dashboard;
  const safetyCheck = isHistoryView
    ? historyScan.safety_check
    : route.params?.scan?.safety_check ?? (session as any).safety_check;
  const scanDate =
    historyScan?.date || route.params?.scan?.date || new Date().toISOString();

  // ── DTCs ──────────────────────────────────────────────────────────────────
  const aiDiagnostics = isHistoryView
    ? historyScan?.ai_predictions?.diagnostics
    : [];
  const displayDTCs = isHistoryView
    ? (historyScan.found_dtcs || []).map((dtc: any) => {
        const prediction = aiDiagnostics?.find(
          (p: any) => p.code === (dtc.code || dtc),
        );
        return prediction ? {...dtc, ...prediction} : dtc;
      })
    : route.params?.scan?.found_dtcs?.length > 0
    ? route.params.scan.found_dtcs
    : currentDTCs.length > 0
    ? currentDTCs
    : route.params?.scan?.found_dtcs || [];

  // ── Score ─────────────────────────────────────────────────────────────────
  const rawHealthScore =
    historyScan?.health_score ?? route.params?.scan?.health_score;
  const healthScore: number = useMemo(() => {
    if (rawHealthScore !== undefined && rawHealthScore !== null)
      return rawHealthScore;
    return computeLocalScore(
      mileageEcu,
      mileageDashboard,
      mileageAbs,
      safetyCheck,
      displayDTCs.length,
    );
  }, [
    rawHealthScore,
    mileageEcu,
    mileageDashboard,
    mileageAbs,
    safetyCheck,
    displayDTCs.length,
  ]);

  const rawRec =
    historyScan?.buying_recommendation ??
    route.params?.scan?.buying_recommendation;
  const buyingRecommendation: string =
    rawRec || computeRecommendation(healthScore);

  const hasMileageDiscrepancy =
    !!mileageEcu &&
    !!mileageDashboard &&
    Math.abs(mileageEcu - mileageDashboard) > 100;
  const mileageGap =
    hasMileageDiscrepancy && mileageEcu && mileageDashboard
      ? Math.abs(mileageEcu - mileageDashboard)
      : 0;

  const canSeeExpertise = hasFeature(user, 'expertise_report');

  // ── Résumé textuel automatique ────────────────────────────────────────────
  const autoSummary = useMemo(() => {
    const lines: string[] = [];
    if (mileageDashboard) {
      if (hasMileageDiscrepancy) {
        lines.push(
          `⚠️ Écart de ${mileageGap.toLocaleString()} km détecté entre le compteur et l'ECU — manipulation probable.`,
        );
      } else {
        lines.push(
          '✅ Kilométrage cohérent entre les modules (compteur, ECU, ABS).',
        );
      }
    } else {
      lines.push('ℹ️ Données kilométriques non disponibles via OBD.');
    }
    if (safetyCheck) {
      if (safetyCheck.has_crash_data) {
        lines.push(
          `❌ Crash Data détectées — ${
            safetyCheck.airbags_deployed || 0
          } airbag(s) déployé(s).`,
        );
      } else {
        lines.push("✅ Aucun historique d'accident grave (SRS sain).");
      }
    } else {
      lines.push('ℹ️ Module SRS non disponible via cet adaptateur.');
    }
    if (displayDTCs.length > 0) {
      lines.push(`⚠️ ${displayDTCs.length} code(s) défaut détecté(s).`);
    } else {
      lines.push('✅ Aucun code défaut actif.');
    }
    return lines;
  }, [
    mileageDashboard,
    hasMileageDiscrepancy,
    mileageGap,
    safetyCheck,
    displayDTCs.length,
  ]);

  // ── Partage ───────────────────────────────────────────────────────────────
  const handleShare = async () => {
    const text = [
      `📋 RAPPORT DE CERTIFICATION — GaragistePro`,
      ``,
      `🚗 Véhicule : ${vehicleBrand} ${vehicleModel} ${vehicleYear}`,
      `🔖 Plaque : ${vehiclePlate}`,
      vehicleVin ? `🔑 VIN : ${vehicleVin}` : null,
      `📅 Date : ${formatDate(scanDate)}`,
      ``,
      `🏆 Score : ${healthScore}/100 — ${getScoreLabel(healthScore)}`,
      `📌 Recommandation : ${buyingRecommendation}`,
      ``,
      ...autoSummary,
      ``,
      `— Généré par GaragistePro`,
    ]
      .filter(Boolean)
      .join('\n');

    try {
      await Share.share({message: text, title: 'Rapport de Certification'});
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de partager le rapport.');
    }
  };

  // ── Sauvegarde ────────────────────────────────────────────────────────────
  const handleSaveScan = async () => {
    if (isSaving) return;
    setIsSaving(true);
    setLoading(true);

    const scanData: any = {
      scan_type: 'EXPERT',
      vehicle: {
        license_plate: vehiclePlate,
        brand: vehicleBrand,
        model: vehicleModel,
        year: vehicleYear,
        vin: vehicleVin,
      },
      dtc_codes: isHistoryView
        ? displayDTCs.map((d: any) => d.code)
        : currentDTCs.map(d => d.code),
      notes: notes || "Certification effectuée via l'application mobile.",
      mileage_ecu: mileageEcu,
      mileage_abs: mileageAbs,
      mileage_dashboard: mileageDashboard,
      safety_check: safetyCheck,
    };

    if (historyScan?.id || route.params?.scan?.id) {
      scanData.id = historyScan?.id || route.params.scan.id;
    }

    const result = await apiService.saveScan(scanData);
    if (result) {
      if (isHistoryView) {
        setScanHistory(
          scanHistory.map((s: any) =>
            (s as any).id === (result as any).id ? (result as any) : s,
          ),
        );
      } else {
        addScanToHistory(result as any);
      }
      Alert.alert('Succès', 'La certification a été enregistrée.', [
        {
          text: 'OK',
          onPress: () => {
            clearDTCs();
            navigation.navigate(getHomeRoute());
          },
        },
      ]);
    } else {
      Alert.alert(
        'Erreur',
        "L'enregistrement a échoué. Vérifiez votre connexion.",
      );
    }
    setLoading(false);
    setIsSaving(false);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDU
  // ─────────────────────────────────────────────────────────────────────────

  if (!canSeeExpertise && !isHistoryView) {
    return (
      <View style={styles.lockedScreen}>
        <Icon name="lock-outline" size={56} color="#9E9E9E" />
        <Text style={styles.lockedTitle}>Fonctionnalité Premium</Text>
        <Text style={styles.lockedSub}>
          La certification approfondie est réservée aux membres Premium.
        </Text>
        <Button
          mode="contained"
          onPress={() => navigation.navigate('Subscriptions')}
          style={styles.upgradeButton}>
          Voir les offres
        </Button>
      </View>
    );
  }

  const scoreColor = getScoreColor(healthScore);
  const recColor = getRecommendationColor(buyingRecommendation);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}>
      {/* ── BANNIÈRE VERDICT ─────────────────────────────────────────────── */}
      <View style={[styles.verdictBanner, {backgroundColor: scoreColor}]}>
        <View style={styles.verdictLeft}>
          <Text style={styles.verdictTitle}>RÉSULTAT DE CERTIFICATION</Text>
          <Text style={styles.verdictDate}>{formatDate(scanDate)}</Text>
        </View>
        <View style={styles.verdictScoreBox}>
          <Text style={styles.verdictScoreNum}>{healthScore}</Text>
          <Text style={styles.verdictScoreOf}>/100</Text>
          <Text style={styles.verdictScoreLabel}>
            {getScoreLabel(healthScore)}
          </Text>
        </View>
      </View>

      {/* ── EN-TÊTE VÉHICULE ─────────────────────────────────────────────── */}
      <VehicleDiagnosticHeader
        brand={vehicleBrand}
        model={vehicleModel}
        year={vehicleYear}
        plate={vehiclePlate}
        date={historyScan?.date}
        isHistoryView={isHistoryView}
      />

      {/* ── RECOMMANDATION ───────────────────────────────────────────────── */}
      <Card style={[styles.recCard, {borderLeftColor: recColor}]}>
        <Card.Content style={styles.recContent}>
          <Icon
            name={getRecommendationIcon(buyingRecommendation)}
            size={32}
            color={recColor}
          />
          <View style={styles.recTextBlock}>
            <Text style={styles.recLabel}>RECOMMANDATION D'ACHAT</Text>
            <Text style={[styles.recValue, {color: recColor}]}>
              {buyingRecommendation}
            </Text>
          </View>
        </Card.Content>
      </Card>

      {/* ── RÉSUMÉ AUTOMATIQUE ───────────────────────────────────────────── */}
      <Card style={styles.summaryCard}>
        <Card.Content>
          <Text style={styles.sectionLabel}>SYNTHÈSE DE L'ANALYSE</Text>
          {autoSummary.map((line, i) => (
            <Text key={i} style={styles.summaryLine}>
              {line}
            </Text>
          ))}
        </Card.Content>
      </Card>

      {/* ── AUDIT KILOMÉTRIQUE ───────────────────────────────────────────── */}
      <Card
        style={[
          styles.auditCard,
          hasMileageDiscrepancy
            ? styles.auditDanger
            : mileageDashboard
            ? styles.auditOk
            : styles.auditNeutral,
        ]}>
        <Card.Content>
          <View style={styles.auditHeader}>
            <Icon
              name="speedometer"
              size={22}
              color={
                hasMileageDiscrepancy
                  ? '#B71C1C'
                  : mileageDashboard
                  ? '#1B5E20'
                  : '#546E7A'
              }
            />
            <Text style={styles.auditTitle}>Audit Kilométrique</Text>
            <Chip
              style={[
                styles.chip,
                {
                  backgroundColor: hasMileageDiscrepancy
                    ? '#FFCDD2'
                    : mileageDashboard
                    ? '#C8E6C9'
                    : '#ECEFF1',
                },
              ]}
              textStyle={{
                color: hasMileageDiscrepancy
                  ? '#B71C1C'
                  : mileageDashboard
                  ? '#1B5E20'
                  : '#546E7A',
                fontSize: 10,
                lineHeight: 12,
                fontWeight: 'bold',
                marginVertical: 0,
                marginHorizontal: 4,
              }}
              compact>
              {hasMileageDiscrepancy
                ? '⚠️ Écart suspect'
                : mileageDashboard
                ? '✅ Cohérent'
                : 'ℹ️ N/D'}
            </Chip>
          </View>

          {mileageDashboard ? (
            <>
              <View style={styles.mileageGrid}>
                <View style={styles.mileageCell}>
                  <Icon name="gauge" size={20} color="#37474F" />
                  <Text style={styles.mileageCellLabel}>Compteur</Text>
                  <Text style={styles.mileageCellValue}>
                    {mileageDashboard.toLocaleString()} km
                  </Text>
                </View>
                {!!mileageEcu && (
                  <View style={styles.mileageCell}>
                    <Icon name="chip" size={20} color="#37474F" />
                    <Text style={styles.mileageCellLabel}>ECU Moteur</Text>
                    <Text
                      style={[
                        styles.mileageCellValue,
                        hasMileageDiscrepancy && styles.textDanger,
                      ]}>
                      {mileageEcu.toLocaleString()} km
                    </Text>
                  </View>
                )}
                {!!mileageAbs && (
                  <View style={styles.mileageCell}>
                    <Icon name="car-brake-abs" size={20} color="#37474F" />
                    <Text style={styles.mileageCellLabel}>Module ABS</Text>
                    <Text style={styles.mileageCellValue}>
                      {mileageAbs.toLocaleString()} km
                    </Text>
                  </View>
                )}
              </View>
              {hasMileageDiscrepancy && (
                <View style={styles.alertBox}>
                  <Icon name="alert-circle" size={16} color="#B71C1C" />
                  <Text style={styles.alertBoxText}>
                    Écart de {mileageGap.toLocaleString()} km entre le compteur
                    et l'ECU. Manipulation probable de l'odomètre.
                  </Text>
                </View>
              )}
            </>
          ) : (
            <View style={styles.naBox}>
              <Icon name="information-outline" size={18} color="#78909C" />
              <Text style={styles.naText}>
                Données kilométriques non disponibles. L'adaptateur n'a pas pu
                lire les modules ECU/ABS.
              </Text>
            </View>
          )}
        </Card.Content>
      </Card>

      {/* ── AUDIT SÉCURITÉ SRS ───────────────────────────────────────────── */}
      <Card
        style={[
          styles.auditCard,
          safetyCheck?.has_crash_data
            ? styles.auditDanger
            : safetyCheck
            ? styles.auditOk
            : styles.auditNeutral,
        ]}>
        <Card.Content>
          <View style={styles.auditHeader}>
            <Icon
              name="airbag"
              size={22}
              color={
                safetyCheck?.has_crash_data
                  ? '#B71C1C'
                  : safetyCheck
                  ? '#1B5E20'
                  : '#546E7A'
              }
            />
            <Text style={styles.auditTitle}>
              Audit Sécurité (SRS / Airbags)
            </Text>
            <Chip
              style={[
                styles.chip,
                {
                  backgroundColor: safetyCheck?.has_crash_data
                    ? '#FFCDD2'
                    : safetyCheck
                    ? '#C8E6C9'
                    : '#ECEFF1',
                },
              ]}
              textStyle={{
                color: safetyCheck?.has_crash_data
                  ? '#B71C1C'
                  : safetyCheck
                  ? '#1B5E20'
                  : '#546E7A',
                fontSize: 10,
                lineHeight: 12,
                fontWeight: 'bold',
                marginVertical: 0,
                marginHorizontal: 4,
              }}
              compact>
              {safetyCheck?.has_crash_data
                ? '❌ Crash Data'
                : safetyCheck
                ? '✅ Sain'
                : 'ℹ️ N/D'}
            </Chip>
          </View>

          {safetyCheck ? (
            <>
              <List.Item
                title={
                  safetyCheck.has_crash_data
                    ? "Données d'impact (Crash Data) détectées"
                    : "Aucun historique d'accident grave"
                }
                titleStyle={{
                  color: safetyCheck.has_crash_data ? '#B71C1C' : '#2E7D32',
                  fontWeight: 'bold',
                  fontSize: 14,
                }}
                left={props => (
                  <List.Icon
                    {...props}
                    icon={
                      safetyCheck.has_crash_data
                        ? 'shield-alert'
                        : 'shield-check'
                    }
                    color={safetyCheck.has_crash_data ? '#B71C1C' : '#4CAF50'}
                  />
                )}
              />
              {safetyCheck.has_crash_data && (
                <View style={styles.alertBox}>
                  <Icon name="alert" size={14} color="#B71C1C" />
                  <Text style={styles.alertBoxText}>
                    Airbags déployés détectés :{' '}
                    {safetyCheck.airbags_deployed || 0}
                  </Text>
                </View>
              )}
            </>
          ) : (
            <View style={styles.naBox}>
              <Icon name="information-outline" size={18} color="#78909C" />
              <Text style={styles.naText}>
                Module SRS non accessible via cet adaptateur. Un vLinker ou
                OBDLink est recommandé.
              </Text>
            </View>
          )}
        </Card.Content>
      </Card>

      {/* ── CODES DÉFAUTS (accordéon) ────────────────────────────────────── */}
      <TouchableOpacity
        style={[
          styles.dtcAccordionHeader,
          dtcExpanded && styles.dtcAccordionHeaderOpen,
        ]}
        onPress={() => setDtcExpanded(v => !v)}
        activeOpacity={0.8}>
        <Icon
          name="engine"
          size={20}
          color={displayDTCs.length > 0 ? '#E65100' : '#388E3C'}
        />
        <Text style={styles.dtcAccordionTitle}>Codes Défauts</Text>
        {displayDTCs.length > 0 && (
          <Badge style={styles.dtcBadge}>{displayDTCs.length}</Badge>
        )}
        <Icon
          name={dtcExpanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color="#555"
          style={{marginLeft: 'auto'}}
        />
      </TouchableOpacity>

      {dtcExpanded && (
        <View style={styles.dtcList}>
          {displayDTCs.length > 0 ? (
            displayDTCs.map((dtc: any, idx: number) => (
              <DTCCard
                key={`${typeof dtc === 'string' ? dtc : dtc.code}-${idx}`}
                dtc={dtc}
                isHistoryView={isHistoryView}
                historyScan={historyScan}
              />
            ))
          ) : (
            <View style={styles.noDtcBox}>
              <Icon name="check-circle-outline" size={24} color="#2E7D32" />
              <Text style={styles.noDtcText}>Aucun code défaut détecté.</Text>
            </View>
          )}

          {!isHistoryView && displayDTCs.length > 0 && (
            <Button
              mode="outlined"
              textColor="#B71C1C"
              icon="engine-off"
              loading={isClearing}
              disabled={isClearing}
              onPress={() => {
                Alert.alert(
                  'Confirmation',
                  'Voulez-vous vraiment effacer les codes défauts ? Cela éteindra le voyant moteur.',
                  [
                    {text: 'Annuler', style: 'cancel'},
                    {
                      text: 'Effacer',
                      style: 'destructive',
                      onPress: async () => {
                        setIsClearing(true);
                        const success = await obdService.clearAllDTCs();
                        setIsClearing(false);
                        if (success) {
                          const clearScanData: any = {
                            scan_type: 'VERIFICATION',
                            vehicle: {
                              license_plate: vehiclePlate,
                              brand: vehicleBrand,
                              model: vehicleModel,
                              year: vehicleYear,
                            },
                            dtc_codes: [],
                            notes:
                              'Codes défauts effacés (post-certification).',
                          };
                          await apiService.saveScan(clearScanData);
                          clearDTCs();
                          navigation.navigate('Scan', {
                            autoRun: true,
                            scanType: 'verification',
                            vehicleData: {
                              licensePlate: vehiclePlate,
                              brand: vehicleBrand,
                              model: vehicleModel,
                              year: vehicleYear.toString(),
                            },
                          });
                        } else {
                          Alert.alert(
                            'Échec',
                            "Impossible d'effacer les codes. Vérifiez que le moteur est éteint.",
                          );
                        }
                      },
                    },
                  ],
                );
              }}
              style={styles.clearButton}>
              Effacer les codes défauts
            </Button>
          )}
        </View>
      )}

      <Divider style={styles.divider} />

      {/* ── NOTES ────────────────────────────────────────────────────────── */}
      <Card style={styles.notesCard}>
        <Card.Title
          title="📋 Notes du technicien"
          titleStyle={styles.notesTitleStyle}
        />
        <Card.Content>
          <TextInput
            label="Observations et conseils pour le client"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            mode="outlined"
            style={styles.notesInput}
            placeholder="Ex: Kilométrage suspect, prévoir contre-expertise."
            disabled={isHistoryView}
          />
        </Card.Content>
      </Card>

      {/* ── ACTIONS ──────────────────────────────────────────────────────── */}
      <View style={styles.actionsRow}>
        <Button
          mode="outlined"
          icon="share-variant"
          onPress={handleShare}
          style={styles.shareButton}
          textColor="#004BA0">
          Partager
        </Button>

        {isHistoryView ? (
          <Button
            mode="contained"
            icon="arrow-left"
            onPress={() => navigation.goBack()}
            style={styles.saveButton}>
            Retour
          </Button>
        ) : (
          <Button
            mode="contained"
            icon="content-save-check"
            loading={loading}
            disabled={loading}
            onPress={handleSaveScan}
            style={styles.saveButton}>
            Enregistrer
          </Button>
        )}
      </View>

      <Button
        mode="text"
        onPress={() => {
          clearDTCs();
          navigation.navigate(getHomeRoute());
        }}
        style={styles.quitButton}
        textColor="#9E9E9E">
        Quitter sans enregistrer
      </Button>

      <View style={{height: 40}} />
    </ScrollView>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#ECEFF1'},
  contentContainer: {paddingBottom: 20},

  // Locked
  lockedScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#ECEFF1',
  },
  lockedTitle: {fontSize: 20, fontWeight: 'bold', color: '#333', marginTop: 16},
  lockedSub: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  upgradeButton: {marginTop: 24, backgroundColor: '#004BA0', borderRadius: 10},

  // Verdict banner
  verdictBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
    paddingTop: Platform.OS === 'ios' ? 22 : 18,
  },
  verdictLeft: {flex: 1},
  verdictTitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  verdictDate: {color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 4},
  verdictScoreBox: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderRadius: 14,
    padding: 12,
    minWidth: 80,
  },
  verdictScoreNum: {
    color: '#fff',
    fontSize: 36,
    fontWeight: '900',
    lineHeight: 40,
  },
  verdictScoreOf: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: 'bold',
  },
  verdictScoreLabel: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 2,
  },

  // Recommandation
  recCard: {
    marginHorizontal: 12,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 14,
    elevation: 3,
    backgroundColor: '#fff',
    borderLeftWidth: 6,
  },
  recContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 8,
  },
  recTextBlock: {flex: 1},
  recLabel: {
    fontSize: 10,
    color: '#888',
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  recValue: {fontSize: 24, fontWeight: '900', marginTop: 2},

  // Résumé
  summaryCard: {
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 14,
    elevation: 2,
    backgroundColor: '#fff',
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#888',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  summaryLine: {fontSize: 13, color: '#333', lineHeight: 22, marginBottom: 2},

  // Audit cards
  auditCard: {
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 14,
    elevation: 2,
    backgroundColor: '#fff',
  },
  auditOk: {borderLeftWidth: 5, borderLeftColor: '#4CAF50'},
  auditDanger: {borderLeftWidth: 5, borderLeftColor: '#D32F2F'},
  auditNeutral: {borderLeftWidth: 5, borderLeftColor: '#90A4AE'},
  auditHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  auditTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#222',
    marginLeft: 4,
  },
  chip: {
    height: 22,
    minWidth: 85,
    paddingHorizontal: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Mileage grid
  mileageGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#F5F7FA',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 8,
    marginTop: 4,
  },
  mileageCell: {alignItems: 'center', gap: 4},
  mileageCellLabel: {
    fontSize: 10,
    color: '#888',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  mileageCellValue: {fontSize: 14, fontWeight: 'bold', color: '#1565C0'},
  textDanger: {color: '#B71C1C'},

  // Alert / NA boxes
  alertBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
    gap: 6,
  },
  alertBoxText: {flex: 1, fontSize: 13, color: '#C62828', lineHeight: 18},
  naBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#ECEFF1',
    borderRadius: 8,
    padding: 10,
    marginTop: 4,
    gap: 8,
  },
  naText: {
    flex: 1,
    fontSize: 13,
    color: '#546E7A',
    lineHeight: 18,
    fontStyle: 'italic',
  },

  // DTC accordion
  dtcAccordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    marginBottom: 2,
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    elevation: 2,
    gap: 8,
  },
  dtcAccordionHeaderOpen: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  dtcAccordionTitle: {fontSize: 14, fontWeight: '700', color: '#222'},
  dtcBadge: {backgroundColor: '#E65100'},
  dtcList: {
    marginHorizontal: 12,
    marginBottom: 8,
    backgroundColor: '#fff',
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    paddingHorizontal: 8,
    paddingBottom: 8,
    elevation: 2,
  },
  noDtcBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    backgroundColor: '#E8F5E9',
    borderRadius: 10,
    margin: 8,
  },
  noDtcText: {fontSize: 14, color: '#2E7D32', fontWeight: 'bold'},
  clearButton: {
    marginTop: 8,
    marginHorizontal: 8,
    borderColor: '#B71C1C',
    borderWidth: 1.5,
    borderRadius: 8,
  },

  divider: {marginHorizontal: 12, marginVertical: 12},

  // Notes
  notesCard: {
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 14,
    elevation: 2,
  },
  notesTitleStyle: {fontSize: 15, fontWeight: '700'},
  notesInput: {minHeight: 80, marginBottom: 4},

  // Actions
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 12,
    marginBottom: 8,
  },
  shareButton: {
    flex: 1,
    borderColor: '#004BA0',
    borderWidth: 1.5,
    borderRadius: 10,
  },
  saveButton: {
    flex: 2,
    backgroundColor: '#2E7D32',
    borderRadius: 10,
  },
  quitButton: {marginHorizontal: 12, marginBottom: 4},
});
