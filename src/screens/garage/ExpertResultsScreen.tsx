// src/screens/ResultsScreen.tsx
import React, {useState} from 'react';
import {View, StyleSheet, ScrollView, Alert, Text} from 'react-native';
import {Card, Button, Divider, List} from 'react-native-paper';
import {DTCCard} from '../../components/garage/DTCCard';
import {VehicleDiagnosticHeader} from '../../components/garage/VehicleDiagnosticHeader';
import {apiService} from '../../services/apiService';
import {useStore} from '../../store/useStore.ts';

export const ExpertResultsScreen: React.FC<{navigation: any; route: any}> = ({
  navigation,
  route,
}) => {
  const {
    currentDTCs,
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
    : route.params?.scan?.found_dtcs || currentDTCs;
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
      scan_type: 'EXPERT',
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
        : "Expertise effectuée via l'application mobile.",
      mileage_ecu: isHistoryView
        ? historyScan.mileage_ecu
        : (useStore.getState() as any).mileage_ecu,
      mileage_abs: isHistoryView
        ? historyScan.mileage_abs
        : (useStore.getState() as any).mileage_abs,
      mileage_dashboard: isHistoryView
        ? historyScan.mileage_dashboard
        : (useStore.getState() as any).mileage_dashboard,
      safety_check: isHistoryView
        ? historyScan.safety_check
        : (useStore.getState() as any).safety_check,
    };

    // Important : On transmet l'ID si on est en train de modifier un scan existant
    if (isHistoryView && historyScan.id) {
      scanData.id = historyScan.id;
    }

    const result = await apiService.saveScan(scanData);

    if (result) {
      if (isHistoryView) {
        const updatedHistory = scanHistory.map((s: any) =>
          (s as any).id === (result as any).id ? (result as any) : s,
        );
        setScanHistory(updatedHistory);
      } else {
        addScanToHistory(result as any);
      }

      Alert.alert('Succès', "L'expertise a été enregistrée.", [
        {
          text: 'OK',
          onPress: () => {
            clearDTCs();
            navigation.navigate('Home');
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

  const renderDTCItem = (dtc: any) => (
    <DTCCard
      key={typeof dtc === 'string' ? dtc : dtc.code}
      dtc={dtc}
      isHistoryView={isHistoryView}
      historyScan={historyScan}
    />
  );

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

    // Récupération du score de santé (uniquement via historique car calculé côté backend)
    const healthScore = historyScan?.health_score;
    const buyingRecommendation = historyScan?.buying_recommendation;

    if (!mileageEcu && !safetyCheck && !healthScore) {
      return null;
    }

    const getScoreColor = (score: number) => {
      if (score >= 80) {
        return '#388E3C';
      }
      if (score >= 50) {
        return '#FBC02D';
      }
      return '#D32F2F';
    };

    const getRecommendationColor = (rec: string) => {
      switch (rec) {
        case 'ACHETER':
          return '#388E3C';
        case 'NÉGOCIER':
          return '#F57C00';
        case 'FUIR':
          return '#D32F2F';
        default:
          return '#757575';
      }
    };

    const hasMileageDiscrepancy =
      mileageEcu &&
      mileageDashboard &&
      Math.abs(mileageEcu - mileageDashboard) > 100;

    return (
      <Card style={styles.expertiseResultCard}>
        <Card.Title
          title="🛡️ Expertise Anti-fraude & Sécurité"
          /* eslint-disable-next-line react-native/no-inline-styles */
          titleStyle={{fontSize: 16, fontWeight: 'bold', color: '#1976D2'}}
        />
        <Card.Content>
          {healthScore !== undefined && (
            <View style={styles.healthScoreContainer}>
              <View style={styles.scoreCircle}>
                <Text
                  style={[
                    styles.scoreValue,
                    {color: getScoreColor(healthScore)},
                  ]}>
                  {healthScore}
                </Text>
                <Text style={styles.scoreLabel}>Health Score</Text>
              </View>
              <View style={styles.recommendationBox}>
                <Text style={styles.recTitle}>RECOMMANDATION :</Text>
                <Text
                  style={[
                    styles.recValue,
                    {color: getRecommendationColor(buyingRecommendation)},
                  ]}>
                  {buyingRecommendation || 'ANALYSE EN COURS'}
                </Text>
              </View>
            </View>
          )}

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
      <VehicleDiagnosticHeader
        brand={vehicleBrand}
        model={vehicleModel}
        year={vehicleYear}
        plate={vehiclePlate}
        date={historyScan?.date}
        isHistoryView={isHistoryView}
      />

      {renderExpertiseData()}

      <Text style={styles.title}>
        {isHistoryView
          ? String('Historique Expertise')
          : String('Résultats Expertise')}
      </Text>

      {displayDTCs.length > 0 ? (
        displayDTCs.map((dtc: any) => renderDTCItem(dtc))
      ) : (
        <Card style={styles.successCard}>
          <Text style={styles.successText}>✅ Aucun code défaut détecté.</Text>
        </Card>
      )}

      {isHistoryView ? (
        <Button
          mode="contained"
          onPress={() => navigation.goBack()}
          style={styles.saveButton}>
          <Text style={{color: '#fff'}}>Retour à l'Historique</Text>
        </Button>
      ) : (
        <Button
          mode="contained"
          loading={loading}
          disabled={loading}
          onPress={handleSaveScan}
          style={styles.saveButton}>
          <Text style={{color: '#fff'}}>Enregistrer l'Expertise</Text>
        </Button>
      )}

      <Button
        mode="text"
        onPress={() => {
          clearDTCs();
          navigation.navigate('Home');
        }}
        style={styles.cancelButton}>
        <Text style={{color: '#757575'}}>Quitter</Text>
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
  expertDtcCard: {borderLeftWidth: 5, borderLeftColor: '#1976D2'},
  dtcHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dtcCode: {fontSize: 22, fontWeight: 'bold', color: '#D32F2F'},
  expertBadge: {
    backgroundColor: '#1976D2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  expertBadgeText: {color: '#fff', fontSize: 10, fontWeight: 'bold'},
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    minWidth: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  severityText: {color: '#fff', fontSize: 12, fontWeight: 'bold'},
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
  cancelButton: {marginTop: 10},
  Chip: {
    borderRadius: 12,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  expertiseResultCard: {
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1976D2',
    backgroundColor: '#fff',
  },
  healthScoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  scoreCircle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreValue: {
    fontSize: 36,
    fontWeight: 'bold',
  },
  scoreLabel: {
    fontSize: 10,
    color: '#6c757d',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  recommendationBox: {
    alignItems: 'center',
  },
  recTitle: {
    fontSize: 10,
    color: '#6c757d',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  recValue: {
    fontSize: 24,
    fontWeight: '900',
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
});
