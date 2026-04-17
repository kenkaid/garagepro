// src/screens/ResultsScreen.tsx
import React, {useState} from 'react';
import {View, StyleSheet, ScrollView, Image, Alert, Text} from 'react-native';
import {
  Card,
  Button,
  Divider,
  List,
  TextInput,
  Switch,
} from 'react-native-paper';
import {useStore} from '../store/useStore';
import {apiService} from '../services/apiService';
import {obdService} from '../services/obdService';

export const ResultsScreen: React.FC<{navigation: any; route: any}> = ({
  navigation,
  route,
}) => {
  const {
    currentDTCs,
    currentOBDData,
    clearDTCs,
    vehicleInfo,
    scanHistory,
    setScanHistory,
    addScanToHistory,
  } = useStore();

  // Si on vient de l'historique, on utilise les données de la route
  const historyScan = route.params?.scan;
  const isHistoryView = !!historyScan;

  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false); // Anti-double clic
  const [isClearing, setIsClearing] = useState(false); // État pour le chargement du bouton d'effacement

  // On initialise les coûts avec les données de l'historique ou du store
  const [laborCost, setLaborCost] = useState(
    isHistoryView ? historyScan.actual_labor_cost.toString() : '0',
  );
  const [partsCost, setPartsCost] = useState(
    isHistoryView ? historyScan.actual_parts_cost.toString() : '0',
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

  const displayDTCs = isHistoryView
    ? (historyScan.found_dtcs || []).map((dtc: any) => {
        // Trouver la prédiction correspondante pour enrichir le DTC de base
        const prediction = aiDiagnostics?.find(
          (p: any) => p.code === (dtc.code || dtc),
        );
        return prediction ? {...dtc, ...prediction} : dtc;
      })
    : currentDTCs;
  const displayVehicle = isHistoryView ? historyScan.vehicle : vehicleInfo;

  // Sécurisation des données véhicule (Backend snake_case vs Frontend camelCase)
  const vehicleBrand =
    historyScan?.vehicle?.brand ||
    (displayVehicle as any)?.brand ||
    (vehicleInfo as any)?.brand ||
    'Inconnue';
  const vehicleModel =
    historyScan?.vehicle?.model ||
    (displayVehicle as any)?.model ||
    (vehicleInfo as any)?.model ||
    'Inconnu';
  const vehicleYear =
    historyScan?.vehicle?.year ||
    (displayVehicle as any)?.year ||
    (vehicleInfo as any)?.year ||
    2020;
  const vehiclePlate =
    historyScan?.vehicle?.license_plate ||
    (displayVehicle as any)?.license_plate ||
    (historyScan?.vehicle as any)?.licensePlate ||
    (displayVehicle as any)?.licensePlate ||
    (vehicleInfo as any)?.licensePlate ||
    'INCONNU';

  const handleSaveScan = async () => {
    if (isSaving) {
      return;
    }
    setIsSaving(true);
    setLoading(true);

    const scanData: any = {
      scan_type: route.params?.scanType || 'DIAGNOSTIC',
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
        ? displayDTCs.map((d: any) => d.code)
        : currentDTCs.map(d => d.code),
      notes: isHistoryView
        ? historyScan.notes
        : "Scan effectué via l'application mobile.",
      actual_labor_cost: parseInt(laborCost, 10) || 0,
      actual_parts_cost: parseInt(partsCost, 10) || 0,
      is_completed: isCompleted,
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
          s.id === result.id ? result : s,
        );
        setScanHistory(updatedHistory);
      } else {
        addScanToHistory(result);
      }

      Alert.alert('Succès', 'Le diagnostic a été enregistré sur le serveur.', [
        {
          text: 'OK',
          onPress: () => {
            clearDTCs();
            navigation.navigate('Home');
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
              navigation.navigate('Home');
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
            setIsClearing(false);

            if (success) {
              Alert.alert(
                'Succès',
                'Les codes ont été effacés du calculateur. Voulez-vous relancer un scan de vérification ?',
                [
                  {
                    text: 'Plus tard',
                    onPress: () => {
                      clearDTCs();
                      navigation.navigate('Home');
                    },
                  },
                  {
                    text: 'Vérifier maintenant',
                    onPress: () => {
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
                    },
                  },
                ],
              );
            } else {
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

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return '#D32F2F';
      case 'high':
        return '#F57C00';
      case 'medium':
        return '#FBC02D';
      default:
        return '#388E3C';
    }
  };

  const getSeverityLabel = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical':
        return 'CRITIQUE';
      case 'high':
        return 'ÉLEVÉ';
      case 'medium':
        return 'MOYEN';
      default:
        return 'FAIBLE';
    }
  };

  const formatPrice = (price: any) => {
    if (price === undefined || price === null) {
      return '0';
    }
    const num = typeof price === 'string' ? parseFloat(price) : price;
    if (isNaN(num)) {
      return '0';
    }
    return Math.floor(num)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  };

  const renderDTCItem = (dtc: any) => {
    if (!dtc) {
      return null;
    }

    // Si dtc est une chaîne de caractères (code brut), on essaie de le résoudre
    const dtcData = typeof dtc === 'string' ? {code: dtc} : dtc;
    const severity = (dtcData.severity || 'medium').toString();
    const code = (dtcData.code || 'INCONNU').toString();

    // Détection si c'est un code "expert" (ABS/SRS/Châssis)
    const isExpertCode =
      code.startsWith('C') || code.startsWith('B') || code.startsWith('U');

    return (
      <Card
        key={code}
        style={[styles.dtcCard, isExpertCode && styles.expertDtcCard]}>
        <Card.Content>
          <View style={styles.dtcHeader}>
            <View>
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <Text style={styles.dtcCode}>{code}</Text>
                {isExpertCode && (
                  <View style={styles.expertBadge}>
                    <Text style={styles.expertBadgeText}>EXPERT</Text>
                  </View>
                )}
              </View>
              {isHistoryView &&
                historyScan?.ai_predictions?.summary?.confidence_score && (
                  <Text style={styles.confidenceScore}>
                    Fiabilité :{' '}
                    {Math.round(
                      historyScan.ai_predictions.summary.confidence_score * 100,
                    )}
                    %
                  </Text>
                )}
            </View>
            <View
              style={[
                styles.severityBadge,
                {backgroundColor: getSeverityColor(severity)},
              ]}>
              <Text style={styles.severityText}>
                {getSeverityLabel(severity)}
              </Text>
            </View>
          </View>
          <Text style={styles.description}>
            {dtcData.description || 'Pas de description disponible'}
          </Text>

          {!!dtcData.meaning && (
            <View style={styles.meaningContainer}>
              <Text style={styles.meaningTitle}>💡 Explication :</Text>
              <Text style={styles.meaningText}>{dtcData.meaning}</Text>
            </View>
          )}

          <Divider style={styles.divider} />

          {!!(dtcData.partImageUrl || dtcData.part_image_url) && (
            <View style={styles.visualAide}>
              <Text style={styles.sectionTitle}>📸 À quoi ça ressemble ?</Text>
              <Image
                source={{uri: dtcData.partImageUrl || dtcData.part_image_url}}
                style={styles.partImage}
                resizeMode="cover"
              />
              <Text style={styles.locationText}>
                📍 Emplacement :{' '}
                {String(
                  dtcData.partLocation ||
                    dtcData.part_location ||
                    'Non spécifié',
                )}
              </Text>
            </View>
          )}

          {!!(
            dtcData.possibleCauses ||
            dtcData.suggestedFixes ||
            dtcData.probable_causes ||
            dtcData.suggested_solutions ||
            dtcData.probable_causes_list ||
            dtcData.suggested_solutions_list
          ) && (
            <List.Accordion
              title="Causes & Solutions"
              left={props => <List.Icon {...props} icon="wrench" />}>
              {(dtcData.possibleCauses ||
                dtcData.probable_causes ||
                dtcData.probable_causes_list) &&
                Array.isArray(
                  dtcData.possibleCauses ||
                    dtcData.probable_causes ||
                    dtcData.probable_causes_list,
                ) && (
                  <View style={{paddingLeft: 16}}>
                    <Text style={styles.subTitle}>Causes probables :</Text>
                    {(
                      dtcData.possibleCauses ||
                      dtcData.probable_causes ||
                      dtcData.probable_causes_list
                    ).map((cause: string, i: number) => (
                      <Text key={i}>• {String(cause)}</Text>
                    ))}
                  </View>
                )}
              {(dtcData.possibleCauses ||
                dtcData.probable_causes ||
                dtcData.probable_causes_list) &&
                Array.isArray(
                  dtcData.possibleCauses ||
                    dtcData.probable_causes ||
                    dtcData.probable_causes_list,
                ) &&
                (dtcData.suggestedFixes ||
                  dtcData.suggested_solutions ||
                  dtcData.suggested_solutions_list) &&
                Array.isArray(
                  dtcData.suggestedFixes ||
                    dtcData.suggested_solutions ||
                    dtcData.suggested_solutions_list,
                ) && <Divider style={{marginVertical: 5}} />}
              {(dtcData.suggestedFixes ||
                dtcData.suggested_solutions ||
                dtcData.suggested_solutions_list) &&
                Array.isArray(
                  dtcData.suggestedFixes ||
                    dtcData.suggested_solutions ||
                    dtcData.suggested_solutions_list,
                ) && (
                  <View style={{paddingLeft: 16}}>
                    <Text style={styles.subTitle}>Actions recommandées :</Text>
                    {(
                      dtcData.suggestedFixes ||
                      dtcData.suggested_solutions ||
                      dtcData.suggested_solutions_list
                    ).map((fix: string, i: number) => (
                      <Text key={i}>• {String(fix)}</Text>
                    ))}
                  </View>
                )}
            </List.Accordion>
          )}

          {!!(
            dtcData.estimatedLaborCost ||
            dtcData.localPartPrice ||
            dtcData.est_labor_cost ||
            dtcData.est_part_price_local
          ) && (
            <View style={styles.pricingCard}>
              <Text style={styles.sectionTitle}>
                💰 Estimation de réparation
              </Text>
              {dtcData.estimatedLaborCost || dtcData.est_labor_cost ? (
                <View style={styles.priceRow}>
                  <Text style={styles.priceRowLabel}>Main d'œuvre :</Text>
                  <Text style={styles.price}>
                    {formatPrice(
                      dtcData.estimatedLaborCost || dtcData.est_labor_cost || 0,
                    )}{' '}
                    FCFA
                  </Text>
                </View>
              ) : null}
              <Divider />
              <View style={styles.compareRow}>
                <View style={styles.priceColumn}>
                  <Text style={styles.priceLabel}>Pièce Locale</Text>
                  <Text style={styles.localPrice}>
                    {formatPrice(
                      dtcData.localPartPrice ||
                        dtcData.est_part_price_local ||
                        0,
                    )}{' '}
                    FCFA
                  </Text>
                </View>
                <View style={styles.priceColumn}>
                  <Text style={styles.priceLabel}>Pièce Import</Text>
                  <Text style={styles.importPrice}>
                    {formatPrice(
                      dtcData.importPartPrice ||
                        dtcData.est_part_price_import ||
                        0,
                    )}{' '}
                    FCFA
                  </Text>
                </View>
              </View>
            </View>
          )}
        </Card.Content>
      </Card>
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
                  ? data.value.toFixed(1)
                  : String(data.value)}{' '}
                {String(data.unit)}
              </Text>
            </View>
          ))}
        </Card.Content>
      </Card>
    );
  };

  const renderExpertiseData = () => {
    const session = isHistoryView ? historyScan : useStore.getState();
    const mileageEcu = isHistoryView
      ? historyScan.mileage_ecu
      : session.mileage_ecu;
    const mileageAbs = isHistoryView
      ? historyScan.mileage_abs
      : session.mileage_abs;
    const mileageDashboard = isHistoryView
      ? historyScan.mileage_dashboard
      : session.mileage_dashboard;
    const safetyCheck = isHistoryView
      ? historyScan.safety_check
      : session.safety_check;

    if (!mileageEcu && !safetyCheck) {
      return null;
    }

    const hasMileageDiscrepancy =
      mileageEcu &&
      mileageDashboard &&
      Math.abs(mileageEcu - mileageDashboard) > 100;

    return (
      <Card style={styles.expertiseResultCard}>
        <Card.Title
          title="🛡️ Expertise Anti-fraude & Sécurité"
          titleStyle={{fontSize: 16, fontWeight: 'bold', color: '#1976D2'}}
        />
        <Card.Content>
          {!!mileageDashboard && (
            <View style={{marginBottom: 15}}>
              <List.Item
                title="Audit Kilométrique"
                description={
                  hasMileageDiscrepancy
                    ? '⚠️ Écart suspect détecté !'
                    : '✅ Kilométrage cohérent'
                }
                descriptionStyle={{
                  color: hasMileageDiscrepancy ? '#D32F2F' : '#388E3C',
                  fontWeight: 'bold',
                }}
                left={props => (
                  <List.Icon
                    {...props}
                    icon="speedometer"
                    color={hasMileageDiscrepancy ? '#D32F2F' : '#1976D2'}
                  />
                )}
              />
              <View style={styles.mileageGrid}>
                <View style={styles.mileageItem}>
                  <Text style={styles.mileageLabel}>Compteur</Text>
                  <Text style={styles.mileageValue}>{mileageDashboard} km</Text>
                </View>
                {!!mileageEcu && (
                  <View style={styles.mileageItem}>
                    <Text style={styles.mileageLabel}>Calculateur (ECU)</Text>
                    <Text style={styles.mileageValue}>{mileageEcu} km</Text>
                  </View>
                )}
                {!!mileageAbs && (
                  <View style={styles.mileageItem}>
                    <Text style={styles.mileageLabel}>Module ABS</Text>
                    <Text style={styles.mileageValue}>{mileageAbs} km</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {!!safetyCheck && (
            <View>
              <Divider />
              <List.Item
                title="Audit de Sécurité SRS"
                description={
                  safetyCheck.has_crash_data
                    ? "❌ Données d'impact (Crash Data) détectées"
                    : "✅ Aucun historique d'accident grave"
                }
                descriptionStyle={{
                  color: safetyCheck.has_crash_data ? '#D32F2F' : '#388E3C',
                  fontWeight: 'bold',
                }}
                left={props => (
                  <List.Icon
                    {...props}
                    icon="shield-alert"
                    color={safetyCheck.has_crash_data ? '#D32F2F' : '#4CAF50'}
                  />
                )}
              />
              {safetyCheck.has_crash_data && (
                <Text style={styles.expertiseNotes}>
                  Airbags déployés : {safetyCheck.airbags_deployed || 0}
                </Text>
              )}
            </View>
          )}
        </Card.Content>
      </Card>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.vehicleHeader}>
        <Card.Content>
          <Text style={styles.vehicleTitle}>
            🚗 {String(vehicleBrand)} {String(vehicleModel)} (
            {String(vehicleYear)})
          </Text>
          <Text style={styles.licensePlate}>
            Plaque : {String(vehiclePlate)}
          </Text>
          {!!isHistoryView && (
            <Text style={styles.historyDate}>
              Scan du {new Date(historyScan.date).toLocaleDateString('fr-FR')}
            </Text>
          )}
        </Card.Content>
      </Card>

      {renderExpertiseData()}

      <Text style={styles.title}>
        {isHistoryView
          ? String('Historique du Scan')
          : String('Résultats du diagnostic')}
      </Text>

      {displayDTCs.length > 0 ? (
        displayDTCs.map((dtc: any) => renderDTCItem(dtc))
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
          mode="contained"
          onPress={() => navigation.goBack()}
          style={initialIsCompleted ? styles.saveButton : styles.backButton}>
          <Text style={{color: '#fff'}}>Retour à l'Historique</Text>
        </Button>
      )}

      <Button
        mode="text"
        onPress={() => {
          clearDTCs();
          navigation.navigate('Home');
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
  vehicleHeader: {marginBottom: 10, backgroundColor: '#fff', elevation: 2},
  vehicleTitle: {fontSize: 18, fontWeight: 'bold', color: '#1976D2'},
  licensePlate: {fontSize: 14, color: '#666'},
  historyDate: {fontSize: 12, color: '#999', marginTop: 4},
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
  clearButton: {
    marginVertical: 10,
    borderColor: '#D32F2F',
    borderWidth: 1.5,
    borderRadius: 8,
  },
  Chip: {
    borderRadius: 12,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  severityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  severityText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  expertiseResultCard: {
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1976D2',
    backgroundColor: '#fff',
  },
  expertiseRow: {
    marginTop: 5,
  },
  mileageGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderRadius: 8,
    marginTop: 5,
  },
  mileageItem: {
    alignItems: 'center',
  },
  mileageLabel: {
    fontSize: 10,
    color: '#757575',
    fontWeight: 'bold',
  },
  mileageValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1976D2',
  },
  expertiseNotes: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
    paddingLeft: 55,
    marginTop: -5,
  },
  expertDtcCard: {
    borderLeftWidth: 5,
    borderLeftColor: '#1976D2',
  },
  expertBadge: {
    backgroundColor: '#1976D2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 10,
  },
  expertBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
