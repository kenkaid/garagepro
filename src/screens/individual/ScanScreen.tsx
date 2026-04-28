// src/screens/individual/ScanScreen.tsx
import React, {useState, useEffect} from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  ListRenderItem,
  Alert,
  ScrollView,
  Text,
  ActivityIndicator,
} from 'react-native';
import {
  Button,
  Card,
  List,
  ProgressBar,
  TextInput,
  Divider,
} from 'react-native-paper';
import {Device} from 'react-native-ble-plx';
import {obdService} from '../../services/obdService';
import {apiService} from '../../services/apiService';
import {useStore} from '../../store/useStore';
import {ScanSession} from '../../types';

// Composant externe pour l'icône Bluetooth
const BluetoothIcon: React.FC = () => <List.Icon icon="bluetooth" />;

interface ConnectButtonProps {
  connecting: boolean;
  onPress: () => void;
}

const ConnectButton: React.FC<ConnectButtonProps> = ({connecting, onPress}) => (
  <Button
    mode="contained"
    onPress={onPress}
    loading={connecting}
    disabled={connecting}>
    Connecter
  </Button>
);

interface DeviceItemProps {
  item: Device;
  connecting: boolean;
  onConnect: (device: Device) => void;
}

const DeviceItem: React.FC<DeviceItemProps> = ({
  item,
  connecting,
  onConnect,
}) => (
  <List.Item
    title={item.name || 'Appareil inconnu'}
    description={`ID: ${item.id.substring(0, 8)}... | RSSI: ${item.rssi}dBm`}
    left={BluetoothIcon}
    /* eslint-disable-next-line react/no-unstable-nested-components */
    right={() => (
      <ConnectButton connecting={connecting} onPress={() => onConnect(item)} />
    )}
  />
);

export const ScanScreen: React.FC<{navigation: any; route: any}> = ({
  navigation,
  route,
}) => {
  const scanType = route.params?.scanType || 'standard';
  const [devices, setDevices] = useState<Device[]>([]);
  const [scanning, setScanning] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);

  // Infos véhicule (initialisées via les paramètres de navigation)
  const [licensePlate, setLicensePlate] = useState(route.params?.vehicleData?.license_plate || route.params?.vehicleData?.licensePlate || '');
  const [brand, setBrand] = useState(route.params?.vehicleData?.brand || '');
  const [model, setModel] = useState(route.params?.vehicleData?.model || '');
  const [year, setYear] = useState(route.params?.vehicleData?.year?.toString() || '');

  const {
    setConnectedDevice,
    setVehicleInfo,
    setIsScanning,
    isScanning,
    addDTC,
    clearDTCs,
    setOBDData,
    addScanToHistory,
    user,
    vehicleInfo,
  } = useStore();

  useEffect(() => {
    checkPermissions();
    // Synchroniser l'état de connexion avec le service réel
    if (obdService.isConnected && !vehicleInfo.connected) {
      setVehicleInfo({
        connected: true,
        deviceName: obdService.connectedDevice?.name || 'ELM327',
      });
    }
  }, []);

  // Gestion du scan automatique
  useEffect(() => {
    if (route.params?.autoRun) {
      if (obdService.isConnected) {
        setTimeout(() => {
          runFullDiagnostic();
        }, 800);
      }
    }
  }, [route.params?.autoRun]);

  const checkPermissions = async () => {
    const granted = await obdService.requestPermissions();
    if (!granted) {
      Alert.alert('Permissions requises', 'Veuillez activer le Bluetooth et la Localisation pour scanner.');
    }
  };

  const startScan = async () => {
    setScanning(true);
    setDevices([]);

    const foundDevices = await obdService.scanForDevices(15000);
    setDevices(foundDevices);
    setScanning(false);

    if (foundDevices.length === 0) {
      Alert.alert(
        'Aucun appareil trouvé',
        'Vérifiez que votre adaptateur ELM327 est branché et que le Bluetooth est activé.',
      );
    }
  };

  const connectToDevice = async (device: Device) => {
    setConnecting(true);

    const success = await obdService.connectToDevice(device);

    if (success) {
      setConnectedDevice(device);
      setVehicleInfo({
        connected: true,
        deviceName: device.name || 'ELM327',
        licensePlate,
        brand,
        model,
        year: parseInt(year, 10) || undefined,
      });

      try {
        const protocol = await obdService.detectProtocol();
        setVehicleInfo({protocol});
      } catch (e) {
        console.log('Protocole auto-détecté ou erreur silencieuse');
      }

      Alert.alert('Connexion réussie', `Connecté à ${device.name || 'l\'adaptateur'}`);
    } else {
      Alert.alert('Erreur de connexion', 'Impossible de se connecter à l\'appareil.');
    }

    setConnecting(false);
  };

  const runFullDiagnostic = async () => {
    if (isScanning) return;

    if (!obdService.isConnected) {
      Alert.alert('Non connecté', 'Veuillez vous connecter à un adaptateur OBD.');
      return;
    }

      setIsScanning(true);
      setScanProgress(0.05);
      clearDTCs();

      try {
        setScanProgress(0.1);
        const currentScanType = route.params?.scanType || scanType;

        // Simuler une progression plus granulaire si nécessaire
        const detectedDtcs = await obdService.readDTCs(currentScanType);
        detectedDtcs.forEach(item => addDTC(item));
        setScanProgress(0.3);

        const obdData = await obdService.readCommonPIDs();
        setOBDData(obdData);
        setScanProgress(0.5);

        let mileageData = null;
        let safetyData = null;

        if (currentScanType === 'EXPERT' || currentScanType === 'expert' || currentScanType === 'security') {
          setScanProgress(0.6);
          mileageData = await obdService.readMileageData();
          setScanProgress(0.8);

          safetyData = await obdService.readSafetyData();
          setScanProgress(0.9);
        }

        setScanProgress(0.95);

      const scanSession: ScanSession = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        vehicleInfo: {
          connected: true,
          protocol: (vehicleInfo as any)?.protocol || 'AUTO',
          licensePlate,
          brand,
          model,
          year: parseInt(year, 10) || undefined,
          deviceName: vehicleInfo.deviceName,
        },
        // @ts-ignore
        dtcs: detectedDtcs,
        found_dtcs: detectedDtcs,
        obdData,
        userId: user?.id || 'unknown',
        notes: user?.user_type === 'INDIVIDUAL' ? 'Scan effectué par l\'utilisateur particulier' : '',
        mileage_ecu: mileageData?.ecu,
        mileage_abs: mileageData?.abs,
        mileage_dashboard: mileageData?.dashboard,
        safety_check: safetyData ? {
          has_crash_data: safetyData.has_crash_data,
          airbags_deployed: safetyData.airbags_deployed,
          impact_sensors_count: safetyData.impact_sensors_count,
        } : undefined,
        scan_type: currentScanType === 'verification' ? 'VERIFICATION' : (currentScanType === 'EXPERT' || currentScanType === 'expert' || currentScanType === 'security' ? 'EXPERT' : 'DIAGNOSTIC')
      };

      const savedScan = await apiService.saveScan(scanSession);
      addScanToHistory((savedScan || scanSession) as any);

      setScanProgress(1);

      const dtcCount = detectedDtcs.length;
      const message = dtcCount > 0
        ? `${dtcCount} code(s) défaut(s) trouvé(s).`
        : "Aucun code défaut détecté.";

      Alert.alert(
        "Scan terminé",
        message,
        [
          {
            text: "Voir le rapport",
            onPress: () => {
              const finalScan = savedScan || scanSession;
              const isExpert =
                currentScanType === 'EXPERT' ||
                currentScanType === 'expert' ||
                currentScanType === 'security' ||
                finalScan.scan_type === 'EXPERT';

              const target = isExpert ? 'ExpertResults' : 'Results';

              navigation.replace(target, {
                scan: finalScan as any,
                scanType: currentScanType,
                isNewScan: true,
              });
            },
          }
        ]
      );
    } catch (error: any) {
      console.error(error);
      Alert.alert('Erreur diagnostic', error?.message || 'Une erreur est survenue.');
    } finally {
      setIsScanning(false);
    }
  };

  const disconnectDevice = async () => {
    await obdService.disconnect();
    setConnectedDevice(null);
    setVehicleInfo({connected: false});
  };

  const renderDevice: ListRenderItem<Device> = ({item}) => (
    <DeviceItem
      item={item}
      connecting={connecting}
      onConnect={connectToDevice}
    />
  );

  return (
    <View style={styles.container}>
      {isScanning && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.overlayText}>Initialisation du diagnostic...</Text>
          <Text style={styles.overlayProgress}>{Math.round(scanProgress * 100)}%</Text>
        </View>
      )}
      <ScrollView style={styles.scrollView}>
        <Card style={styles.infoCard}>
          <Card.Title title="Informations Véhicule" subtitle="Données pour le rapport" />
          <Card.Content>
            <View style={styles.vehicleInfoRow}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Plaque</Text>
                <Text style={styles.infoValue}>{licensePlate || 'N/A'}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Marque</Text>
                <Text style={styles.infoValue}>{brand || 'N/A'}</Text>
              </View>
            </View>
            <View style={styles.vehicleInfoRow}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Modèle</Text>
                <Text style={styles.infoValue}>{model || 'N/A'}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Année</Text>
                <Text style={styles.infoValue}>{year || 'N/A'}</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {!vehicleInfo.connected ? (
          <View>
            <Card style={styles.scanCard}>
              <Card.Title title="Connexion OBD" subtitle="Recherchez votre adaptateur" />
              <Card.Content>
                <Button
                  mode="contained"
                  onPress={startScan}
                  loading={scanning}
                  disabled={scanning || connecting}
                  icon="bluetooth"
                  style={styles.scanButton}>
                  {scanning ? 'Recherche...' : 'Scanner Bluetooth'}
                </Button>
                {scanning && <ProgressBar indeterminate style={styles.progress} />}
              </Card.Content>
            </Card>

            <FlatList
              data={devices}
              renderItem={renderDevice}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              ListEmptyComponent={
                !scanning ? (
                  <Text style={styles.emptyText}>Aucun appareil trouvé. Appuyez sur Scanner.</Text>
                ) : null
              }
            />
          </View>
        ) : (
          <Card style={styles.diagnosticCard}>
            <Card.Title
                title="Prêt pour le diagnostic"
                subtitle={scanType === 'EXPERT' ? 'Expertise complète' : 'Scan standard'}
            />
            <Card.Content>
              <View style={styles.connectedDeviceContainer}>
                <List.Icon icon="check-circle" color="#4CAF50" />
                <View>
                    <Text style={styles.connectedLabel}>Appareil connecté :</Text>
                    <Text style={styles.connectedValue}>{vehicleInfo.deviceName || 'ELM327'}</Text>
                </View>
              </View>

              <Divider style={styles.divider} />

              <View style={styles.progressContainer}>
                <Text style={styles.progressLabel}>
                    {isScanning ? 'Scan en cours...' : 'Prêt à démarrer'}
                </Text>
                <ProgressBar progress={scanProgress} color="#2196F3" style={styles.progressBar} />
                <Text style={styles.progressPercentage}>{Math.round(scanProgress * 100)}%</Text>
              </View>

              <Button
                mode="contained"
                onPress={runFullDiagnostic}
                loading={isScanning}
                disabled={isScanning}
                icon="play"
                style={styles.diagnosticButton}>
                {isScanning ? 'Analyse...' : 'Démarrer le Scan'}
              </Button>

              <Button
                mode="text"
                onPress={disconnectDevice}
                disabled={isScanning}
                style={styles.changeDeviceButton}>
                Changer d'adaptateur
              </Button>
            </Card.Content>
          </Card>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    padding: 16,
  },
  infoCard: {
    marginBottom: 16,
    elevation: 2,
  },
  vehicleInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  infoItem: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#6c757d',
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212529',
  },
  scanCard: {
    marginBottom: 16,
    elevation: 2,
  },
  scanButton: {
    marginTop: 8,
  },
  progress: {
    marginTop: 12,
    height: 4,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#6c757d',
    fontStyle: 'italic',
  },
  diagnosticCard: {
    marginBottom: 16,
    elevation: 4,
    borderTopWidth: 4,
    borderTopColor: '#2196F3',
  },
  connectedDeviceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: '#e9f7ef',
    padding: 12,
    borderRadius: 8,
  },
  connectedLabel: {
    fontSize: 12,
    color: '#1e7e34',
  },
  connectedValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#155724',
  },
  divider: {
    marginBottom: 16,
  },
  progressContainer: {
    marginBottom: 20,
  },
  progressLabel: {
    fontSize: 14,
    color: '#495057',
    marginBottom: 8,
    textAlign: 'center',
  },
  progressBar: {
    height: 10,
    borderRadius: 5,
  },
  progressPercentage: {
    textAlign: 'center',
    marginTop: 4,
    fontSize: 12,
    color: '#6c757d',
    fontWeight: 'bold',
  },
  diagnosticButton: {
    paddingVertical: 4,
  },
  changeDeviceButton: {
    marginTop: 8,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    zIndex: 1000,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayText: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  overlayProgress: {
    marginTop: 10,
    fontSize: 24,
    fontWeight: 'bold',
    color: '#495057',
  },
});
