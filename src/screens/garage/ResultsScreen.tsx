// src/screens/ResultsScreen.tsx
import React, {useState} from 'react';
import {View, StyleSheet, ScrollView, Alert, Text, ActivityIndicator} from 'react-native';
import {Card, Button, Divider, TextInput, Switch} from 'react-native-paper';
import {DTCCard} from '../../components/garage/DTCCard';
import {VehicleDiagnosticHeader} from '../../components/garage/VehicleDiagnosticHeader';
import {apiService} from '../../services/apiService';
import {obdService} from '../../services/obdService';
import {useStore} from '../../store/useStore.ts';
import {formatPrice} from '../../utils/diagnosticUtils';

export const ResultsScreen: React.FC<{navigation: any; route: any}> = ({
  navigation,
  route,
}) => {
  const {
    user,
    currentDTCs,
    currentOBDData,
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
      case 'MECHANIC':
        return 'ProHome';
      default:
        return 'ProHome';
    }
  };

  // Si on vient de l'historique, on utilise les données de la route
  // isNewScan=true signifie qu'on vient d'un scan en direct (pas de l'historique)
  const historyScan = route.params?.scan;
  const isHistoryView = !!historyScan && !route.params?.isNewScan;

  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false); // Anti-double clic
  const [isClearing, setIsClearing] = useState(false); // État pour le chargement du bouton d'effacement
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);

  // On initialise les coûts avec les données de l'historique ou du store
  const [laborCost, setLaborCost] = useState(
    isHistoryView ? (historyScan.actual_labor_cost ?? 0).toString() : '0',
  );
  const [partsCost, setPartsCost] = useState(
    isHistoryView ? (historyScan.actual_parts_cost ?? 0).toString() : '0',
  );
  const [initialIsCompleted] = useState(
    isHistoryView ? historyScan.is_completed : false,
  );
  const [isCompleted, setIsCompleted] = useState(initialIsCompleted);

  // Choix des DTC à afficher : soit ceux du store (nouveau scan), soit ceux de l'historique
  // Fusionner les données de l'IA dans l'historique si disponibles
  const aiDiagnostics = isHistoryView
    ? historyScan?.ai_predictions?.diagnostics
    : [];

  // Pour un nouveau scan : on priorise currentDTCs (store) car ils sont toujours présents,
  // puis on tente route.params.scan.found_dtcs comme fallback (cas scan sauvegardé avec DTCs backend)
  const displayDTCs = isHistoryView
    ? (historyScan.scan_dtcs || historyScan.found_dtcs || []).map((dtc: any) => {
        // Si c'est un scan_dtc, les données sont déjà dans dtc_details ou à plat
        const codeValue = dtc.code || dtc.dtc?.code || dtc;
        const prediction = aiDiagnostics?.find(
          (p: any) => p.code === codeValue,
        );
        return prediction ? {...dtc, ...prediction} : dtc;
      })
    : currentDTCs.length > 0
      ? currentDTCs
      : (route.params?.scan?.scan_dtcs || route.params?.scan?.found_dtcs || []);
  const displayVehicle = isHistoryView ? historyScan.vehicle : vehicleInfo;

  // Sécurisation des données véhicule (Backend snake_case vs Frontend camelCase)
  const vehicleBrand =
    historyScan?.vehicle?.brand ||
    (route.params?.scan?.vehicle as any)?.brand ||
    (displayVehicle as any)?.brand ||
    (vehicleInfo as any)?.brand ||
    'Inconnue';
  const vehicleModel =
    historyScan?.vehicle?.model ||
    (route.params?.scan?.vehicle as any)?.model ||
    (displayVehicle as any)?.model ||
    (vehicleInfo as any)?.model ||
    'Inconnu';
  const vehicleYear =
    historyScan?.vehicle?.year ||
    (route.params?.scan?.vehicle as any)?.year ||
    (displayVehicle as any)?.year ||
    (vehicleInfo as any)?.year ||
    2020;
  const vehiclePlate =
    historyScan?.vehicle?.license_plate ||
    (route.params?.scan?.vehicle as any)?.license_plate ||
    (displayVehicle as any)?.license_plate ||
    (historyScan?.vehicle as any)?.licensePlate ||
    (displayVehicle as any)?.licensePlate ||
    (vehicleInfo as any)?.licensePlate ||
    (route.params?.scan?.vehicle as any)?.licensePlate ||
    'INCONNU';

  const handleAIAnalysis = async () => {
    const codes = isHistoryView
      ? (historyScan.found_dtcs || []).map((d: any) => d.code || d)
      : currentDTCs.map(d => d.code);

    if (!codes || codes.length === 0) {
      Alert.alert('Aucun code', 'Aucun code DTC à analyser.');
      return;
    }

    setIsAnalyzing(true);
    const vehicleInfo = {
      brand: vehicleBrand,
      model: vehicleModel,
      year: typeof vehicleYear === 'number' ? vehicleYear : parseInt(String(vehicleYear), 10),
    };
    const result = await apiService.analyzeDTCs(codes, vehicleInfo);
    setIsAnalyzing(false);

    if (result && result.diagnostics) {
      setAiAnalysis(result);
    } else {
      Alert.alert('Erreur', "L'analyse IA n'a pas pu être effectuée. Vérifiez votre connexion.");
    }
  };

  const handleSaveScan = async () => {
    if (isSaving) {
      return;
    }
    setIsSaving(true);
    setLoading(true);

    const scanData: any = {
      scan_type:
        route.params?.scanType || historyScan?.scan_type || 'DIAGNOSTIC',
      vehicle: {
        license_plate: vehiclePlate,
        brand: vehicleBrand,
        model: vehicleModel,
        year: vehicleYear,
        vin:
          historyScan?.vehicle?.vin ||
          (displayVehicle as any)?.vin ||
          vehicleInfo?.vin,
      },
      dtc_codes: isHistoryView
        ? displayDTCs.map((d: any) => ({ code: d.code, status: d.status || 'confirmed' }))
        : currentDTCs.map(d => ({ code: d.code, status: d.status || 'confirmed' })),
      notes: isHistoryView
        ? historyScan.notes
        : "Scan effectué via l'application mobile.",
      actual_labor_cost: parseInt(laborCost, 10) || 0,
      actual_parts_cost: parseInt(partsCost, 10) || 0,
      is_completed: isCompleted,
      mileage_ecu: isHistoryView
        ? historyScan.mileage_ecu
        : route.params?.scan?.mileage_ecu,
      mileage_abs: isHistoryView
        ? historyScan.mileage_abs
        : route.params?.scan?.mileage_abs,
      mileage_dashboard: isHistoryView
        ? historyScan.mileage_dashboard
        : route.params?.scan?.mileage_dashboard,
      safety_check: isHistoryView
        ? historyScan.safety_check
        : route.params?.scan?.safety_check,
    };

    // Important : On transmet l'ID si on est en train de modifier un scan existant
    if (isHistoryView && historyScan.id) {
      scanData.id = historyScan.id;
    }

    const result = await apiService.saveScan(scanData);

    if (result) {
      // Mettre à jour l'historique dans le store avec la version enrichie du serveur
      if (isHistoryView) {
        const updatedHistory = scanHistory.map((s: any) =>
          (s as any).id === (result as any).id ? (result as any) : s,
        );
        setScanHistory(updatedHistory);
      } else {
        addScanToHistory(result as any);
      }

      Alert.alert('Succès', 'Le diagnostic a été enregistré sur le serveur.', [
        {
          text: 'OK',
          onPress: () => {
            clearDTCs();
            navigation.navigate(getHomeRoute());
          },
        },
      ]);
    } else {
      // Si on a échoué à cause d'un abonnement expiré (géré par 403 sur le backend)
      // On peut quand même laisser le mode hors-ligne si c'est une erreur de connexion,
      // mais le backend renvoie 403 pour l'abonnement.
      // Comme on a supprimé le console.error détaillé dans apiService, on garde un message générique ici
      // ou on pourrait améliorer apiService pour renvoyer l'erreur.
      Alert.alert(
        'Information',
        'Le diagnostic a été sauvegardé localement. Si votre abonnement est actif, il sera synchronisé automatiquement.',
        [
          {
            text: 'OK',
            onPress: () => {
              clearDTCs();
              navigation.navigate(getHomeRoute());
            },
          },
        ],
      );
    }
    setLoading(false);
    setIsSaving(false);
  };

  const handleClearEngineCodes = () => {
    // Si on est dans l'historique (mode lecture seule), on ne permet pas l'effacement
    if (isHistoryView) {
      Alert.alert(
        'Information',
        "L'effacement des codes n'est possible que lors d'un diagnostic en direct.",
      );
      return;
    }

    if (!obdService.isConnected) {
      Alert.alert(
        'Non connecté',
        "Vous devez être connecté à l'appareil OBD pour effacer les codes défauts.",
      );
      return;
    }

    Alert.alert(
      'Confirmation',
      'Voulez-vous vraiment effacer les codes défauts du véhicule ? Cela éteindra le voyant moteur au tableau de bord.',
      [
        {text: 'Annuler', style: 'cancel'},
        {
          text: 'Effacer',
          style: 'destructive',
          onPress: async () => {
            setIsClearing(true);
            const success = await obdService.clearAllDTCs();

            if (success) {
              // On informe le backend de l'effacement
              const clearScanData: any = {
                scan_type: 'VERIFICATION',
                vehicle: {
                  license_plate: vehiclePlate,
                  brand: vehicleBrand,
                  model: vehicleModel,
                  year: vehicleYear,
                },
                dtc_codes: [],
                notes: 'Codes défauts effacés avec succès.',
              };
              await apiService.saveScan(clearScanData);

              // Vérifier la connexion OBD avant de lancer le scan de vérification
              // L'effacement des codes peut provoquer une déconnexion temporaire
              if (!obdService.isConnected) {
                // Tentative de reconnexion automatique (max 3 essais, 3s entre chaque)
                let reconnected = false;
                for (let attempt = 1; attempt <= 3; attempt++) {
                  console.log(`[ResultsScreen] Reconnexion OBD après effacement (tentative ${attempt}/3)...`);
                  reconnected = await obdService.reconnect();
                  if (reconnected) break;
                  if (attempt < 3) {
                    await new Promise(resolve => setTimeout(resolve, 3000));
                  }
                }

                if (!reconnected) {
                  setIsClearing(false);
                  Alert.alert(
                    'Reconnexion impossible',
                    "Les codes ont été effacés mais la reconnexion à l'équipement a échoué. Veuillez relancer le scan manuellement depuis l'écran principal.",
                    [{text: 'OK', onPress: () => { clearDTCs(); navigation.navigate(getHomeRoute()); }}],
                  );
                  return;
                }
              }

              setIsClearing(false);
              // Relance automatique du scan de vérification
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
              setIsClearing(false);
              Alert.alert(
                'Échec',
                "Le véhicule n'a pas pu effacer les codes. Vérifiez que le moteur est éteint et le contact mis.",
              );
            }
          },
        },
      ],
    );
  };

  const renderDTCItem = (dtc: any, index: number) => {
    if (!dtc) {
      return null;
    }
    const dtcData = typeof dtc === 'string' ? {code: dtc} : dtc;
    return (
      <DTCCard
        key={`${typeof dtc === 'string' ? dtc : dtc.code}-${index}`}
        dtc={dtc}
        isHistoryView={isHistoryView}
        historyScan={historyScan}
        vehicleBrand={vehicleBrand}
        vehicleModel={vehicleModel}>
        {!!(
          dtcData.estimatedLaborCost ||
          dtcData.localPartPrice ||
          dtcData.est_labor_cost ||
          dtcData.est_part_price_local
        ) && (
          <View style={styles.pricingCard}>
            <Text style={styles.sectionTitle}>💰 Estimation de réparation</Text>
            {dtcData.estimatedLaborCost || dtcData.est_labor_cost ? (
              <View style={styles.priceRow}>
                <Text style={styles.priceRowLabel}>Main d'œuvre :</Text>
                <Text style={styles.price}>
                  {`${formatPrice(
                    dtcData.estimatedLaborCost || dtcData.est_labor_cost || 0,
                  )} FCFA`}
                </Text>
              </View>
            ) : null}
            <Divider />
            <View style={styles.compareRow}>
              <View style={styles.priceColumn}>
                <Text style={styles.priceLabel}>Pièce Locale</Text>
                <Text style={styles.localPrice}>
                  {`${formatPrice(
                    dtcData.localPartPrice || dtcData.est_part_price_local || 0,
                  )} FCFA`}
                </Text>
              </View>
              <View style={styles.priceColumn}>
                <Text style={styles.priceLabel}>Pièce Import</Text>
                <Text style={styles.importPrice}>
                  {`${formatPrice(
                    dtcData.importPartPrice ||
                      dtcData.est_part_price_import ||
                      0,
                  )} FCFA`}
                </Text>
              </View>
            </View>
          </View>
        )}
      </DTCCard>
    );
  };

  // Utilise currentOBDData pour afficher les données temps réel
  const renderOBDData = () => {
    if (currentOBDData.length === 0) {
      return null;
    }

    return (
      <Card style={styles.dataCard}>
        <Card.Title title="Données temps réel" />
        <Card.Content>
          {currentOBDData.map((data, idx) => (
            <View key={idx} style={styles.dataRow}>
              <Text style={styles.dataName}>{data.name}</Text>
              <Text style={styles.dataValue}>
                {typeof data.value === 'number'
                  ? data.value.toFixed(3)
                  : String(data.value)}{' '}
                {String(data.unit)}
              </Text>
            </View>
          ))}
        </Card.Content>
      </Card>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <VehicleDiagnosticHeader
        brand={vehicleBrand}
        model={vehicleModel}
        year={vehicleYear}
        plate={vehiclePlate}
        date={historyScan?.date}
        isHistoryView={isHistoryView}
      />

      {displayDTCs.length > 0 ? (
        displayDTCs.map((dtc: any, idx: number) => renderDTCItem(dtc, idx))
      ) : (
        <Card style={styles.successCard}>
          <Text style={styles.successText}>✅ Aucun code défaut !</Text>
        </Card>
      )}

      {!isHistoryView && displayDTCs.length > 0 && (
        <Button
          mode="outlined"
          textColor="#D32F2F"
          icon="engine-off"
          loading={isClearing}
          disabled={isClearing}
          onPress={handleClearEngineCodes}
          style={styles.clearButton}>
          Effacer les codes défauts
        </Button>
      )}

      {displayDTCs.length > 0 && (
        <Button
          mode="contained"
          icon="robot"
          loading={isAnalyzing}
          disabled={isAnalyzing}
          onPress={handleAIAnalysis}
          style={styles.aiButton}>
          {/* eslint-disable-next-line react-native/no-inline-styles */}
          <Text style={{color: '#fff'}}>
            {isAnalyzing ? 'Analyse en cours...' : '🤖 Analyse IA Approfondie'}
          </Text>
        </Button>
      )}

      {isAnalyzing && (
        <View style={styles.analyzingBox}>
          <ActivityIndicator size="large" color="#1565C0" />
          <Text style={styles.analyzingText}>Analyse IA en cours — DB + Base locale + Web...</Text>
        </View>
      )}

      {aiAnalysis && (
        <Card style={styles.aiCard}>
          <Card.Title
            title="🤖 Analyse IA Approfondie"
            titleStyle={styles.aiCardTitle}
          />
          <Card.Content>
            {aiAnalysis.summary?.verdict ? (
              <View style={styles.verdictBox}>
                <Text style={styles.verdictText}>{aiAnalysis.summary.verdict}</Text>
                <Text style={styles.engineVersion}>{aiAnalysis.summary.engine_version}</Text>
              </View>
            ) : null}

            {(aiAnalysis.diagnostics || []).map((diag: any, idx: number) => (
              <View key={idx} style={styles.aiDiagBlock}>
                <View style={styles.aiDiagHeader}>
                  <Text style={[
                    styles.aiDiagCode,
                    {color: diag.severity === 'critical' ? '#B71C1C' : diag.severity === 'high' ? '#E65100' : '#F57F17'},
                  ]}>
                    {diag.code}
                  </Text>
                  {diag.certitude ? (
                    <Text style={styles.certitudeBadge}>Certitude : {diag.certitude}%</Text>
                  ) : null}
                </View>

                {diag.interpretation ? (
                  <View style={styles.interpretationBox}>
                    <Text style={styles.interpretationText}>{diag.interpretation}</Text>
                  </View>
                ) : null}

                {diag.possibleCauses?.length > 0 && (
                  <View style={styles.aiSection}>
                    <Text style={styles.aiSectionTitle}>🔍 Causes probables</Text>
                    {diag.possibleCauses.map((c: string, i: number) => (
                      <Text key={i} style={styles.aiListItem}>{i + 1}. {c}</Text>
                    ))}
                  </View>
                )}

                {diag.suggestedFixes?.length > 0 && (
                  <View style={styles.aiSection}>
                    <Text style={styles.aiSectionTitle}>🔧 Solutions recommandées</Text>
                    {diag.suggestedFixes.map((s: string, i: number) => (
                      <Text
                        key={i}
                        style={[
                          styles.aiListItem,
                          i === 0 && diag.severity === 'critical' ? styles.firstSolutionCritical : null,
                        ]}>
                        {i + 1}. {s}
                      </Text>
                    ))}
                  </View>
                )}

                {(diag.estimatedLaborCost > 0 || diag.localPartPrice > 0) && (
                  <View style={styles.aiCostRow}>
                    {diag.estimatedLaborCost > 0 && (
                      <Text style={styles.aiCostText}>🛠 MO : {diag.estimatedLaborCost.toLocaleString()} FCFA</Text>
                    )}
                    {diag.localPartPrice > 0 && (
                      <Text style={styles.aiCostText}>🔩 Pièce : {diag.localPartPrice.toLocaleString()} FCFA</Text>
                    )}
                  </View>
                )}

                {diag.warnings ? (
                  <View style={styles.aiWarningBox}>
                    <Text style={styles.aiWarningText}>⚠️ {diag.warnings}</Text>
                  </View>
                ) : null}

                {idx < (aiAnalysis.diagnostics.length - 1) && <Divider style={styles.aiDivider} />}
              </View>
            ))}

            {aiAnalysis.summary?.total_estimated_labor > 0 && (
              <View style={styles.aiTotalBox}>
                <Text style={styles.aiTotalText}>
                  💰 Coût total estimé MO : {aiAnalysis.summary.total_estimated_labor.toLocaleString()} FCFA
                </Text>
              </View>
            )}
          </Card.Content>
        </Card>
      )}

      {!isHistoryView && renderOBDData()}

      <Card style={styles.billingCard}>
        <Card.Title
          title={
            isHistoryView
              ? String('🛠️ Récapitulatif financier')
              : String('🛠️ Clôture du travail')
          }
        />
        <Card.Content>
          <TextInput
            label="Main d'œuvre (FCFA)"
            value={laborCost}
            onChangeText={setLaborCost}
            keyboardType="numeric"
            mode="outlined"
            style={styles.billInput}
            disabled={initialIsCompleted}
          />
          <TextInput
            label="Pièces détachées (FCFA)"
            value={partsCost}
            onChangeText={setPartsCost}
            keyboardType="numeric"
            mode="outlined"
            style={styles.billInput}
            disabled={initialIsCompleted}
          />
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Travail terminé et payé ?</Text>
            <Switch
              value={isCompleted}
              onValueChange={setIsCompleted}
              color="#4CAF50"
              disabled={isHistoryView && initialIsCompleted}
            />
          </View>
        </Card.Content>
      </Card>

      {!initialIsCompleted && (
        <Button
          mode="contained"
          loading={loading}
          disabled={loading}
          onPress={handleSaveScan}
          style={styles.saveButton}>
          {/* eslint-disable-next-line react-native/no-inline-styles */}
          <Text style={{color: '#fff'}}>
            {isHistoryView
              ? String('Mettre à jour le travail')
              : String('Enregistrer et Quitter')}
          </Text>
        </Button>
      )}

      {isHistoryView && (
        <Button
          mode="contained-tonal"
          icon="share-variant"
          onPress={() => navigation.navigate('SendResults', {scan: historyScan})}
          style={styles.shareButton}>
          <Text>Envoyer au client</Text>
        </Button>
      )}

      {isHistoryView && (
        <Button
          mode="contained"
          onPress={() => navigation.goBack()}
          style={initialIsCompleted ? styles.saveButton : styles.backButton}>
          {/* eslint-disable-next-line react-native/no-inline-styles */}
          <Text style={{color: '#fff'}}>Retour à l'Historique</Text>
        </Button>
      )}

      <Button
        mode="text"
        onPress={() => {
          clearDTCs();
          navigation.navigate(getHomeRoute());
        }}
        style={styles.cancelButton}>
        {/* eslint-disable-next-line react-native/no-inline-styles */}
        <Text style={{color: '#757575'}}>Annuler le diagnostic</Text>
      </Button>
      {/* eslint-disable-next-line react-native/no-inline-styles */}
      <View style={{height: 40}} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#f5f5f5', padding: 16},
  title: {fontSize: 24, fontWeight: 'bold', marginBottom: 16},
  dtcCard: {marginBottom: 16, elevation: 3},
  dtcHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dtcCode: {fontSize: 22, fontWeight: 'bold', color: '#D32F2F'},
  confidenceScore: {
    fontSize: 12,
    color: '#388E3C',
    fontWeight: 'bold',
    marginTop: -4,
  },
  description: {fontSize: 16, color: '#333', marginBottom: 8},
  meaningContainer: {
    backgroundColor: '#FFF9C4',
    padding: 10,
    borderRadius: 6,
    marginVertical: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FBC02D',
  },
  meaningTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#F57F17',
    marginBottom: 4,
  },
  meaningText: {
    fontSize: 14,
    color: '#5D4037',
    lineHeight: 20,
  },
  divider: {marginVertical: 12},
  visualAide: {backgroundColor: '#f9f9f9', padding: 10, borderRadius: 8},
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 8,
  },
  partImage: {width: '100%', height: 180, borderRadius: 8, marginBottom: 8},
  locationText: {fontSize: 13, fontStyle: 'italic', color: '#555'},
  subTitle: {fontWeight: 'bold', marginTop: 8, color: '#1976D2'},
  pricingCard: {
    marginTop: 16,
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  priceRowLabel: {fontSize: 14, color: '#333'},
  price: {fontWeight: 'bold', color: '#1B5E20'},
  compareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  priceColumn: {alignItems: 'center', width: '48%'},
  priceLabel: {fontSize: 10, color: '#666'},
  localPrice: {fontSize: 14, fontWeight: 'bold', color: '#E65100'},
  importPrice: {fontSize: 14, fontWeight: 'bold', color: '#1565C0'},
  successCard: {padding: 20, alignItems: 'center', backgroundColor: '#E8F5E9'},
  successText: {fontSize: 18, color: '#2E7D32', fontWeight: 'bold'},
  dataCard: {marginVertical: 12},
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  dataName: {fontSize: 14, color: '#333'},
  dataValue: {fontWeight: 'bold', color: '#1976D2'},
  billingCard: {marginTop: 16, elevation: 4, borderRadius: 12},
  billInput: {marginBottom: 10},
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  switchLabel: {fontSize: 14, color: '#333'},
  saveButton: {marginTop: 20, backgroundColor: '#4CAF50', paddingVertical: 8},
  backButton: {marginTop: 10, backgroundColor: '#757575', paddingVertical: 8},
  cancelButton: {
    marginTop: 10,
    paddingVertical: 4,
  },
  clearButton: {
    marginVertical: 10,
    borderColor: '#D32F2F',
    borderWidth: 1.5,
    borderRadius: 8,
  },
  aiButton: {
    marginVertical: 10,
    backgroundColor: '#1565C0',
    borderRadius: 8,
  },
  analyzingBox: {
    alignItems: 'center',
    padding: 16,
    gap: 8,
  },
  analyzingText: {
    fontSize: 13,
    color: '#1565C0',
    textAlign: 'center',
    marginTop: 8,
  },
  aiCard: {
    marginTop: 16,
    marginBottom: 8,
    elevation: 4,
    backgroundColor: '#0D1B2A',
    borderRadius: 12,
  },
  aiCardTitle: {
    color: '#90CAF9',
    fontWeight: 'bold',
  },
  verdictBox: {
    backgroundColor: '#1A237E',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  verdictText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  engineVersion: {
    color: '#90CAF9',
    fontSize: 11,
    marginTop: 4,
  },
  aiDiagBlock: {
    marginVertical: 8,
  },
  aiDiagHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  aiDiagCode: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  certitudeBadge: {
    fontSize: 12,
    color: '#A5D6A7',
    fontWeight: '600',
  },
  interpretationBox: {
    backgroundColor: '#1A2744',
    borderRadius: 6,
    padding: 10,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#42A5F5',
  },
  interpretationText: {
    color: '#E3F2FD',
    fontSize: 13,
    lineHeight: 20,
  },
  aiSection: {
    marginTop: 8,
  },
  aiSectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#90CAF9',
    marginBottom: 4,
  },
  aiListItem: {
    fontSize: 13,
    color: '#CFD8DC',
    lineHeight: 22,
    marginLeft: 4,
  },
  firstSolutionCritical: {
    color: '#EF9A9A',
    fontWeight: 'bold',
  },
  aiCostRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  aiCostText: {
    fontSize: 12,
    color: '#A5D6A7',
    fontWeight: '600',
  },
  aiWarningBox: {
    backgroundColor: '#3E2723',
    borderRadius: 6,
    padding: 8,
    marginTop: 8,
  },
  aiWarningText: {
    color: '#FFCC80',
    fontSize: 12,
  },
  aiDivider: {
    backgroundColor: '#263238',
    marginVertical: 10,
  },
  aiTotalBox: {
    backgroundColor: '#1B5E20',
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
  },
  aiTotalText: {
    color: '#C8E6C9',
    fontWeight: 'bold',
    fontSize: 14,
    textAlign: 'center',
  },
  shareButton: {
    marginTop: 8,
    marginHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#E3F2FD',
  },
  Chip: {
    borderRadius: 12,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
