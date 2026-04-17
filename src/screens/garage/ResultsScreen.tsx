// src/screens/ResultsScreen.tsx
import React, {useState} from 'react';
import {View, StyleSheet, ScrollView, Alert, Text} from 'react-native';
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
        ? displayDTCs.map((d: any) => d.code)
        : currentDTCs.map(d => d.code),
      notes: isHistoryView
        ? historyScan.notes
        : "Scan effectué via l'application mobile.",
      actual_labor_cost: parseInt(laborCost, 10) || 0,
      actual_parts_cost: parseInt(partsCost, 10) || 0,
      is_completed: isCompleted,
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

  const renderDTCItem = (dtc: any) => {
    if (!dtc) {
      return null;
    }
    const dtcData = typeof dtc === 'string' ? {code: dtc} : dtc;
    return (
      <DTCCard
        key={typeof dtc === 'string' ? dtc : dtc.code}
        dtc={dtc}
        isHistoryView={isHistoryView}
        historyScan={historyScan}>
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
          {/* eslint-disable-next-line react-native/no-inline-styles */}
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
  Chip: {
    borderRadius: 12,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
