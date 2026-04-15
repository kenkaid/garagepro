// src/screens/ScanScreen.tsx
import React, {useState, useEffect} from 'react';
import {View, StyleSheet, FlatList, Alert} from 'react-native';
import {Text, Button, Card, List, ProgressBar} from 'react-native-paper';
import {Device} from 'react-native-ble-plx';
import {obdService} from '../services/obdService';
import {apiService} from '../services/apiService';
import {useStore} from '../store/useStore';
import {OBDData, DTCCode, ScanSession} from '../types/index';

export const ScanScreen: React.FC<{navigation: any}> = ({navigation}) => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [scanning, setScanning] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);

  const {
    setConnectedDevice,
    setVehicleInfo,
    setIsScanning,
    addDTC,
    clearDTCs,
    setOBDData,
    addScanToHistory,
    mechanic,
  } = useStore();

  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    const granted = await obdService.requestPermissions();
    if (!granted) {
      Alert.alert('Permissions requises', 'Activez Bluetooth et Localisation');
    }
  };

  const startScan = async () => {
    setScanning(true);
    setDevices([]);

    const foundDevices = await obdService.scanForDevices(15000);
    setDevices(foundDevices);
    setScanning(false);

    if (foundDevices.length === 0) {
      Alert.alert('Aucun appareil', 'Vérifiez que votre ELM327 est allumé');
    }
  };

  const connectToDevice = async (device: Device) => {
    setConnecting(true);

    const success = await obdService.connectToDevice(device);

    if (success) {
      setConnectedDevice(device);
      setVehicleInfo({connected: true, deviceName: device.name || 'ELM327'});

      // Détecter protocole
      try {
        const protocol = await obdService.detectProtocol();
        setVehicleInfo({protocol});
      } catch (e) {
        console.log('Protocole auto-détecté');
      }

      Alert.alert('Connecté', `Connecté à ${device.name}`);
      navigation.navigate('Diagnostic');
    } else {
      Alert.alert('Erreur', 'Impossible de se connecter');
    }

    setConnecting(false);
  };

  const runFullDiagnostic = async () => {
    setIsScanning(true);
    setScanProgress(0);
    clearDTCs();

    try {
      // Étape 1: Codes défaut (40%)
      setScanProgress(0.2);
      const dtcs = await obdService.readDTCs();
      dtcs.forEach(addDTC);

      // Étape 2: Données temps réel (80%)
      setScanProgress(0.6);
      const obdData = await obdService.readCommonPIDs();
      setOBDData(obdData);

      // Étape 3: Sauvegarde (100%)
      setScanProgress(0.9);

      const scanSession: ScanSession = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        vehicleInfo: {connected: true, protocol: 'AUTO'},
        dtcs,
        obdData,
        mechanicId: mechanic?.id || 'unknown',
        notes: '',
      };

      await apiService.saveScan(scanSession);
      addScanToHistory(scanSession);

      setScanProgress(1);
      Alert.alert(
        'Diagnostic terminé',
        `${dtcs.length} code(s) défaut trouvé(s). ${obdData.length} paramètres lus.`,
      );

      navigation.navigate('Results');
    } catch (error) {
      Alert.alert('Erreur diagnostic', String(error));
    } finally {
      setIsScanning(false);
    }
  };

  const renderDevice = ({item}: {item: Device}) => (
    <List.Item
      title={item.name || 'Appareil inconnu'}
      description={`ID: ${item.id.substring(0, 8)}... | RSSI: ${item.rssi}dBm`}
      left={props => <List.Icon {...props} icon="bluetooth" />}
      right={props => (
        <Button
          mode="contained"
          onPress={() => connectToDevice(item)}
          loading={connecting}
          disabled={connecting}>
          Connecter
        </Button>
      )}
    />
  );

  return (
    <View style={styles.container}>
      <Card style={styles.scanCard}>
        <Card.Title
          title="Scanner les adaptateurs OBD"
          subtitle="Activez votre ELM327 (LED bleue clignotante)"
        />
        <Card.Content>
          <Button
            mode="contained"
            onPress={startScan}
            loading={scanning}
            disabled={scanning || connecting}
            icon="bluetooth-search"
            style={styles.scanButton}>
            {scanning ? 'Recherche...' : 'Scanner Bluetooth'}
          </Button>

          {scanning && <ProgressBar indeterminate style={styles.progress} />}
        </Card.Content>
      </Card>

      <FlatList
        data={devices}
        renderItem={renderDevice}
        keyExtractor={item => item.id}
        ListEmptyComponent={
          !scanning && (
            <Text style={styles.emptyText}>
              Aucun appareil trouvé. Appuyez sur Scanner.
            </Text>
          )
        }
      />

      {useStore.getState().vehicleInfo.connected && (
        <Card style={styles.diagnosticCard}>
          <Card.Title title="Diagnostic véhicule" />
          <Card.Content>
            <Text>
              Véhicule connecté: {useStore.getState().vehicleInfo.deviceName}
            </Text>
            <ProgressBar progress={scanProgress} style={styles.progress} />

            <Button
              mode="contained"
              onPress={runFullDiagnostic}
              loading={useStore.getState().isScanning}
              disabled={useStore.getState().isScanning}
              icon="play-circle"
              style={styles.diagnosticButton}>
              Lancer le diagnostic complet
            </Button>
          </Card.Content>
        </Card>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scanCard: {
    margin: 16,
    marginBottom: 8,
  },
  scanButton: {
    marginTop: 8,
  },
  progress: {
    marginTop: 12,
    height: 8,
    borderRadius: 4,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    color: '#757575',
  },
  diagnosticCard: {
    margin: 16,
    marginTop: 8,
    backgroundColor: '#E8F5E9',
  },
  diagnosticButton: {
    marginTop: 16,
  },
});
