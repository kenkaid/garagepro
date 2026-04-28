// src/screens/individual/ResultsScreen.tsx
import React, {useState} from 'react';
import {View, StyleSheet, ScrollView, Alert, Text} from 'react-native';
import {Card, Button, Divider, List} from 'react-native-paper';
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

  const getHomeRoute = () => 'IndividualHome';

  const historyScan = route.params?.scan;
  const isHistoryView = !!historyScan && !route.params?.isNewScan;
  const originalScanType = route.params?.scanType || historyScan?.scan_type;
  const isExpertScan =
    originalScanType === 'EXPERT' ||
    originalScanType === 'expert' ||
    originalScanType === 'security' ||
    historyScan?.scan_type === 'EXPERT';

  const [loading, setLoading] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

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
    : currentDTCs.length > 0
    ? currentDTCs
    : route.params?.scan?.found_dtcs || [];

  const displayVehicle = isHistoryView ? historyScan.vehicle : vehicleInfo;

  const vehicleBrand =
    historyScan?.vehicle?.brand || (displayVehicle as any)?.brand || 'Inconnue';
  const vehicleModel =
    historyScan?.vehicle?.model || (displayVehicle as any)?.model || 'Inconnu';
  const vehicleYear =
    historyScan?.vehicle?.year || (displayVehicle as any)?.year || 2020;
  const vehiclePlate =
    historyScan?.vehicle?.license_plate ||
    (displayVehicle as any)?.license_plate ||
    (displayVehicle as any)?.licensePlate ||
    'INCONNU';

  const handleClearEngineCodes = async () => {
    if (isHistoryView) return;

    if (!obdService.isConnected) {
      Alert.alert('Non connecté', "Vous devez être connecté à l'appareil OBD.");
      return;
    }

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
        notes: 'Codes défauts effacés par le particulier.',
      };
      await apiService.saveScan(clearScanData);

      clearDTCs();
      navigation.replace('Scan', {
        autoRun: true,
        scanType: isExpertScan ? 'EXPERT' : 'verification',
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
        "L'effacement a échoué. Vérifiez que le contact est mis et le moteur éteint.",
      );
    }
  };

  const renderDTCItem = (dtc: any, index: number) => {
    if (!dtc) return null;
    const dtcData = typeof dtc === 'string' ? {code: dtc} : dtc;
    return (
      <DTCCard
        key={`${typeof dtc === 'string' ? dtc : dtc.code}-${index}`}
        dtc={dtc}
        isHistoryView={isHistoryView}
        historyScan={historyScan}>
        {!!(dtcData.estimatedLaborCost || dtcData.est_labor_cost) && (
          <View style={styles.pricingCard}>
            <Text style={styles.sectionTitle}>💰 Estimation de réparation</Text>
            <View style={styles.priceRow}>
              <Text style={styles.priceRowLabel}>Main d'œuvre approx. :</Text>
              <Text style={styles.price}>
                {`${formatPrice(
                  dtcData.estimatedLaborCost || dtcData.est_labor_cost || 0,
                )} FCFA`}
              </Text>
            </View>
          </View>
        )}
      </DTCCard>
    );
  };

  const renderOBDData = () => {
    if (currentOBDData.length === 0) return null;

    return (
      <Card style={styles.dataCard}>
        <Card.Title
          title="Données en direct"
          subtitle="Valeurs mesurées pendant le scan"
        />
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
          <Text style={styles.successText}>✅ Aucun code défaut détecté</Text>
          <Text style={styles.successSubtext}>
            Votre véhicule semble être en bonne santé électronique.
          </Text>
        </Card>
      )}

      {!isHistoryView && displayDTCs.length > 0 && (
        <Button
          mode="contained"
          buttonColor="#D32F2F"
          icon="engine-off"
          loading={isClearing}
          disabled={isClearing}
          onPress={handleClearEngineCodes}
          style={styles.clearButton}>
          Effacer les codes défauts
        </Button>
      )}

      {!isHistoryView && renderOBDData()}

      <Button
        mode="contained"
        onPress={() => {
          clearDTCs();
          navigation.navigate(getHomeRoute());
        }}
        style={styles.homeButton}>
        Retour au Tableau de Bord
      </Button>

      <View style={{height: 40}} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#f5f5f5', padding: 16},
  successCard: {
    padding: 24,
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    marginBottom: 16,
    elevation: 2,
  },
  successText: {fontSize: 18, color: '#2E7D32', fontWeight: 'bold'},
  successSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  dataCard: {marginVertical: 12, elevation: 2},
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  dataName: {fontSize: 14, color: '#444'},
  dataValue: {fontWeight: 'bold', color: '#1976D2'},
  pricingCard: {
    marginTop: 12,
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 4,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceRowLabel: {fontSize: 13, color: '#333'},
  price: {fontWeight: 'bold', color: '#1B5E20', fontSize: 15},
  clearButton: {marginVertical: 16, paddingVertical: 4},
  homeButton: {marginTop: 8, backgroundColor: '#1976D2', paddingVertical: 4},
});
