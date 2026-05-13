// src/screens/garage/ExpertScanScreen.tsx
import React, {useState, useEffect} from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  Text as RNText,
} from 'react-native';
import {
  Button,
  Card,
  ProgressBar,
  Text,
  ActivityIndicator,
  Chip,
  Divider,
  List,
  Menu,
  TextInput,
} from 'react-native-paper';
import {Device} from 'react-native-ble-plx';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {obdService} from '../../services/obdService';
import {apiService} from '../../services/apiService';
import {useStore} from '../../store/useStore';
import {ScanSession} from '../../types';

// ─── Sous-composants stables ────────────────────────────────────────────────

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
    disabled={connecting}
    compact>
    Connecter
  </Button>
);

interface DeviceItemProps {
  item: Device;
  connecting: boolean;
  onConnect: (device: Device) => void;
}
const DeviceItem: React.FC<DeviceItemProps> = ({item, connecting, onConnect}) => (
  <List.Item
    title={item.name || 'Appareil inconnu'}
    description={`ID: ${item.id.substring(0, 8)}... | RSSI: ${item.rssi} dBm`}
    left={BluetoothIcon}
    /* eslint-disable-next-line react/no-unstable-nested-components */
    right={() => (
      <ConnectButton connecting={connecting} onPress={() => onConnect(item)} />
    )}
  />
);

// ─── Écran principal ─────────────────────────────────────────────────────────

type Step = 'connect' | 'vehicle' | 'scanning' | 'done';

export const ExpertScanScreen: React.FC<{navigation: any; route: any}> = ({
  navigation,
  route,
}) => {
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
    isTestMode,
  } = useStore();

  // Étape courante du wizard
  const [step, setStep] = useState<Step>(
    obdService.isConnected ? 'vehicle' : 'connect',
  );

  // Bluetooth
  const [devices, setDevices] = useState<Device[]>([]);
  const [scanning, setScanning] = useState(false);
  const [connecting, setConnecting] = useState(false);

  // Infos véhicule
  const [licensePlate, setLicensePlate] = useState(
    route.params?.vehicleData?.licensePlate ||
      route.params?.vehicleData?.license_plate ||
      vehicleInfo.licensePlate ||
      '',
  );
  const [brand, setBrand] = useState(
    route.params?.vehicleData?.brand || vehicleInfo.brand || '',
  );
  const [model, setModel] = useState(
    route.params?.vehicleData?.model || vehicleInfo.model || '',
  );
  const [year, setYear] = useState(
    route.params?.vehicleData?.year?.toString() ||
      vehicleInfo.year?.toString() ||
      '',
  );
  const [vin, setVin] = useState(
    route.params?.vehicleData?.vin || (vehicleInfo as any).vin || '',
  );

  // Suggestions marque/modèle
  const [vehicleModels, setVehicleModels] = useState<any[]>([]);
  const [filteredBrands, setFilteredBrands] = useState<string[]>([]);
  const [filteredModels, setFilteredModels] = useState<string[]>([]);
  const [showBrandMenu, setShowBrandMenu] = useState(false);
  const [showModelMenu, setShowModelMenu] = useState(false);

  // Progression du scan
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStatus, setScanStatus] = useState('');

  useEffect(() => {
    obdService.setMockMode(isTestMode);
    obdService.requestPermissions();
    loadVehicleModels();
    // Si déjà connecté, passer directement à l'étape véhicule
    if (obdService.isConnected) {
      setStep('vehicle');
      tryReadVIN();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadVehicleModels = async () => {
    const models = await apiService.getVehicleModels();
    setVehicleModels(models);
    const brands = [...new Set(models.map((m: any) => m.brand))] as string[];
    setFilteredBrands(brands);
  };

  // ── Lecture automatique du VIN ──────────────────────────────────────────
  const tryReadVIN = async () => {
    try {
      const detectedVin = await obdService.readVIN();
      if (detectedVin) {
        setVin(detectedVin);
        setVehicleInfo({vin: detectedVin});

        const wmi = detectedVin.substring(0, 3).toUpperCase();
        const wmiToBrand: {[key: string]: string} = {
          VF1: 'Renault', VF3: 'Peugeot', VF7: 'Citroën',
          WVW: 'Volkswagen', WVG: 'Volkswagen', WV2: 'Volkswagen',
          WBA: 'BMW', WBS: 'BMW', WDB: 'Mercedes-Benz', WDD: 'Mercedes-Benz',
          ZFA: 'Fiat', TSM: 'Suzuki',
          JT1: 'Toyota', JTD: 'Toyota', JT6: 'Toyota', JTM: 'Toyota',
          JMB: 'Mitsubishi', JA3: 'Mitsubishi',
          JM0: 'Mazda', JN1: 'Nissan', JN8: 'Nissan',
          JHM: 'Honda', JHL: 'Honda',
          KMH: 'Hyundai', KNA: 'Kia', KND: 'Kia', KNM: 'Samsung',
          '1FM': 'Ford', '1FT': 'Ford', '1FC': 'Ford', '2FM': 'Ford',
          '1GC': 'Chevrolet', '1GN': 'Chevrolet', '1G1': 'Chevrolet',
          SAL: 'Land Rover', SCC: 'Lotus',
          UU1: 'Dacia', W0L: 'Opel', W0V: 'Vauxhall',
        };
        const detectedBrand = wmiToBrand[wmi] || wmiToBrand[wmi.substring(0, 2)];
        if (detectedBrand && !brand) {
          setBrand(detectedBrand);
          const models = vehicleModels
            .filter(m => m.brand.toLowerCase() === detectedBrand.toLowerCase())
            .map(m => m.model);
          setFilteredModels([...new Set(models)] as string[]);
        }

        const yearCode = detectedVin.charAt(9).toUpperCase();
        const yearCodes: {[key: string]: number} = {
          A: 2010, B: 2011, C: 2012, D: 2013, E: 2014, F: 2015,
          G: 2016, H: 2017, J: 2018, K: 2019, L: 2020, M: 2021,
          N: 2022, P: 2023, R: 2024, S: 2025,
          Y: 2000, '1': 2001, '2': 2002, '3': 2003, '4': 2004,
          '5': 2005, '6': 2006, '7': 2007, '8': 2008, '9': 2009,
        };
        if (yearCodes[yearCode] && !year) {
          setYear(yearCodes[yearCode].toString());
        }
      }
    } catch (e) {
      console.log('[ExpertScan] VIN non disponible');
    }
  };

  // ── Bluetooth ────────────────────────────────────────────────────────────
  const startBluetoothScan = async () => {
    setScanning(true);
    setDevices([]);
    const found = await obdService.scanForDevices(15000);
    setDevices(found);
    setScanning(false);
    if (found.length === 0) {
      Alert.alert('Aucun appareil trouvé', 'Vérifiez que votre ELM327 est allumé et en mode appairage.');
    }
  };

  const connectToDevice = async (device: Device) => {
    setConnecting(true);
    const success = await obdService.connectToDevice(device);
    if (success) {
      setConnectedDevice(device);
      setVehicleInfo({connected: true, deviceName: device.name || 'ELM327'});
      try {
        const protocol = await obdService.detectProtocol();
        setVehicleInfo({protocol});
      } catch (_) {}
      await tryReadVIN();
      setStep('vehicle');
    } else {
      Alert.alert('Connexion échouée', 'Impossible de se connecter à cet appareil.');
    }
    setConnecting(false);
  };

  // ── Suggestions marque/modèle ────────────────────────────────────────────
  const onBrandChange = (text: string) => {
    setBrand(text);
    const brands = [...new Set(vehicleModels.map((m: any) => m.brand))].filter(
      (b: any) => b.toLowerCase().includes(text.toLowerCase()),
    ) as string[];
    setFilteredBrands(brands);
    setShowBrandMenu(brands.length > 0);
    setModel('');
    setFilteredModels([]);
  };

  const onSelectBrand = (selected: string) => {
    setBrand(selected);
    setShowBrandMenu(false);
    const models = vehicleModels
      .filter(m => m.brand === selected)
      .map(m => m.model);
    setFilteredModels([...new Set(models)] as string[]);
  };

  const onModelChange = (text: string) => {
    setModel(text);
    const models = vehicleModels
      .filter(m => m.brand === brand && m.model.toLowerCase().includes(text.toLowerCase()))
      .map(m => m.model);
    setFilteredModels([...new Set(models)] as string[]);
    setShowModelMenu(models.length > 0);
  };

  const onSelectModel = (selected: string) => {
    setModel(selected);
    setShowModelMenu(false);
  };

  const onLicensePlateChange = async (text: string) => {
    setLicensePlate(text);
    if (text.length >= 4) {
      const vehicleData = await apiService.getVehicleByPlate(text);
      if (vehicleData) {
        setBrand(vehicleData.brand || '');
        setModel(vehicleData.model || '');
        setYear(vehicleData.year?.toString() || '');
      }
    }
  };

  // ── Scan EXPERT ──────────────────────────────────────────────────────────
  const runExpertScan = async () => {
    if (useStore.getState().isScanning) {return;}

    setStep('scanning');
    setIsScanning(true);
    setScanProgress(0);
    clearDTCs();

    try {
      setScanStatus('Lecture des codes défauts...');
      setScanProgress(0.1);
      const detectedDtcs = await obdService.readDTCs('EXPERT');
      detectedDtcs.forEach(item => addDTC(item));

      setScanStatus('Lecture des paramètres OBD...');
      setScanProgress(0.35);
      const obdData = await obdService.readCommonPIDs();
      setOBDData(obdData);

      setScanStatus('Lecture du kilométrage multi-modules...');
      setScanProgress(0.55);
      const mileageData = await obdService.readMileageData();

      setScanStatus('Analyse du module SRS (airbags)...');
      setScanProgress(0.75);
      const safetyData = await obdService.readSafetyData();

      setScanStatus('Enregistrement du rapport...');
      setScanProgress(0.9);

      const scanSession: ScanSession = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        vehicleInfo: {
          ...(vehicleInfo || {}),
          connected: true,
          protocol: (vehicleInfo as any)?.protocol || 'AUTO',
          licensePlate,
          brand,
          model,
          year: parseInt(year, 10) || undefined,
          vin: vin || (vehicleInfo as any)?.vin,
        },
        // @ts-ignore
        dtcs: detectedDtcs,
        found_dtcs: detectedDtcs,
        obdData,
        userId: user?.id || 'unknown',
        notes: '',
        mileage_ecu: mileageData?.ecu,
        mileage_abs: mileageData?.abs,
        mileage_dashboard: mileageData?.dashboard,
        safety_check: safetyData
          ? {
              has_crash_data: safetyData.has_crash_data,
              airbags_deployed: safetyData.airbags_deployed,
              impact_sensors_count: safetyData.impact_sensors_count,
            }
          : undefined,
      };

      const savedScan = await apiService.saveScan({
        ...scanSession,
        // @ts-ignore
        scan_type: 'EXPERT',
      });
      addScanToHistory((savedScan || scanSession) as any);

      setScanProgress(1);
      setScanStatus('Analyse terminée !');
      setStep('done');

      navigation.replace('ExpertResults', {
        scan: (savedScan || scanSession) as any,
        scanType: 'EXPERT',
        isNewScan: true,
      });
    } catch (error: any) {
      let msg = 'Une erreur est survenue lors du scan.';
      if (error?.response?.data) {
        const data = error.response.data;
        msg = typeof data === 'object' ? Object.values(data).flat().join('\n') : data.toString();
      } else if (error?.message) {
        msg = error.message;
      }
      Alert.alert('Erreur scan expert', msg);
      setStep('vehicle');
    } finally {
      setIsScanning(false);
    }
  };

  // ── Rendu ────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* En-tête */}
      <View style={styles.header}>
        <Icon name="shield-search" size={28} color="white" />
        <RNText style={styles.headerTitle}>Certification Kilométrique</RNText>
        <RNText style={styles.headerSub}>Scan Expert Anti-Fraude</RNText>
      </View>

      {/* Indicateur d'étapes */}
      <View style={styles.stepsRow}>
        {(['connect', 'vehicle', 'scanning'] as Step[]).map((s, i) => {
          const labels = ['Connexion', 'Véhicule', 'Analyse'];
          const icons = ['bluetooth', 'car', 'magnify-scan'];
          const active = step === s || (step === 'done' && s === 'scanning');
          const done =
            (s === 'connect' && (step === 'vehicle' || step === 'scanning' || step === 'done')) ||
            (s === 'vehicle' && (step === 'scanning' || step === 'done'));
          return (
            <View key={s} style={styles.stepItem}>
              <View style={[styles.stepCircle, done && styles.stepDone, active && styles.stepActive]}>
                <Icon
                  name={done ? 'check' : icons[i]}
                  size={16}
                  color={done || active ? 'white' : '#aaa'}
                />
              </View>
              <RNText style={[styles.stepLabel, (done || active) && styles.stepLabelActive]}>
                {labels[i]}
              </RNText>
              {i < 2 && <View style={[styles.stepLine, done && styles.stepLineDone]} />}
            </View>
          );
        })}
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>

        {/* ── ÉTAPE 1 : Connexion Bluetooth ── */}
        {step === 'connect' && (
          <Card style={styles.card}>
            <Card.Title
              title="Connexion à l'adaptateur OBD"
              subtitle="Recherchez votre ELM327 / vLinker"
              left={props => <List.Icon {...props} icon="bluetooth-connect" />}
            />
            <Card.Content>
              <Button
                mode="contained"
                icon="bluetooth-audio"
                onPress={startBluetoothScan}
                loading={scanning}
                disabled={scanning || connecting}
                style={styles.btn}>
                {scanning ? 'Recherche en cours...' : 'Scanner les appareils Bluetooth'}
              </Button>
              {scanning && <ProgressBar indeterminate style={styles.progress} />}
              {devices.map(device => (
                <DeviceItem
                  key={device.id}
                  item={device}
                  connecting={connecting}
                  onConnect={connectToDevice}
                />
              ))}
              {!scanning && devices.length === 0 && (
                <RNText style={styles.emptyText}>
                  Aucun appareil trouvé. Appuyez sur Scanner.
                </RNText>
              )}
            </Card.Content>
          </Card>
        )}

        {/* ── ÉTAPE 2 : Informations véhicule ── */}
        {step === 'vehicle' && (
          <Card style={styles.card}>
            <Card.Title
              title="Informations du véhicule"
              subtitle={`Connecté à ${vehicleInfo.deviceName || 'ELM327'}`}
              left={props => <List.Icon {...props} icon="car-info" />}
            />
            <Card.Content>
              {vin ? (
                <Chip icon="barcode" style={styles.vinChip} textStyle={styles.vinChipText}>
                  VIN : {vin}
                </Chip>
              ) : null}

              <TextInput
                label="Plaque d'immatriculation"
                value={licensePlate}
                onChangeText={onLicensePlateChange}
                placeholder="ex: 1234AB01"
                autoCapitalize="characters"
                mode="outlined"
                style={styles.input}
              />

              <View style={styles.row}>
                <Menu
                  visible={showBrandMenu}
                  onDismiss={() => setShowBrandMenu(false)}
                  anchor={
                    <TextInput
                      label="Marque"
                      value={brand}
                      onChangeText={onBrandChange}
                      placeholder="ex: Toyota"
                      mode="outlined"
                      style={[styles.input, styles.halfInput]}
                    />
                  }>
                  {filteredBrands.slice(0, 6).map(b => (
                    <Menu.Item key={b} onPress={() => onSelectBrand(b)} title={b} />
                  ))}
                </Menu>

                <Menu
                  visible={showModelMenu}
                  onDismiss={() => setShowModelMenu(false)}
                  anchor={
                    <TextInput
                      label="Modèle"
                      value={model}
                      onChangeText={onModelChange}
                      placeholder="ex: RAV4"
                      mode="outlined"
                      style={[styles.input, styles.halfInput]}
                    />
                  }>
                  {filteredModels.slice(0, 6).map(m => (
                    <Menu.Item key={m} onPress={() => onSelectModel(m)} title={m} />
                  ))}
                </Menu>
              </View>

              <TextInput
                label="Année"
                value={year}
                onChangeText={setYear}
                placeholder="ex: 2015"
                keyboardType="numeric"
                mode="outlined"
                style={styles.input}
              />

              <Divider style={styles.divider} />

              <Button
                mode="contained"
                icon="shield-search"
                onPress={runExpertScan}
                disabled={!brand || !model || isScanning}
                contentStyle={styles.mainBtnContent}
                style={styles.mainBtn}>
                LANCER L'ANALYSE EXPERTE
              </Button>

              <Button
                mode="outlined"
                icon="bluetooth-off"
                onPress={() => {
                  setVehicleInfo({connected: false});
                  setDevices([]);
                  setStep('connect');
                }}
                style={styles.secondaryBtn}>
                Changer d'adaptateur
              </Button>
            </Card.Content>
          </Card>
        )}

        {/* ── ÉTAPE 3 : Scan en cours ── */}
        {(step === 'scanning' || step === 'done') && (
          <Card style={styles.card}>
            <Card.Title
              title="Analyse experte en cours"
              subtitle="Ne quittez pas cet écran"
              left={props => <List.Icon {...props} icon="magnify-scan" />}
            />
            <Card.Content>
              <View style={styles.scanningCenter}>
                <ActivityIndicator animating={step === 'scanning'} size="large" color="#004BA0" />
                <Text style={styles.scanStatusText}>{scanStatus}</Text>
                <ProgressBar
                  progress={scanProgress}
                  color="#004BA0"
                  style={styles.progressBar}
                />
                <RNText style={styles.progressPercent}>
                  {Math.round(scanProgress * 100)}%
                </RNText>
              </View>

              <View style={styles.stepsChecklist}>
                {[
                  {label: 'Codes défauts (DTC)', done: scanProgress >= 0.35},
                  {label: 'Paramètres OBD', done: scanProgress >= 0.55},
                  {label: 'Kilométrage multi-modules', done: scanProgress >= 0.75},
                  {label: 'Module SRS (airbags)', done: scanProgress >= 0.9},
                  {label: 'Enregistrement rapport', done: scanProgress >= 1},
                ].map((item, i) => (
                  <View key={i} style={styles.checkItem}>
                    <Icon
                      name={item.done ? 'check-circle' : 'circle-outline'}
                      size={18}
                      color={item.done ? '#4CAF50' : '#bbb'}
                    />
                    <RNText style={[styles.checkLabel, item.done && styles.checkLabelDone]}>
                      {item.label}
                    </RNText>
                  </View>
                ))}
              </View>
            </Card.Content>
          </Card>
        )}

      </ScrollView>
    </View>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#f0f4f8'},
  header: {
    backgroundColor: '#004BA0',
    paddingTop: Platform.OS === 'ios' ? 20 : 20,
    paddingBottom: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 6,
  },
  headerSub: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    marginTop: 2,
  },
  stepsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    paddingVertical: 12,
    paddingHorizontal: 16,
    elevation: 2,
  },
  stepItem: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepActive: {backgroundColor: '#004BA0'},
  stepDone: {backgroundColor: '#4CAF50'},
  stepLabel: {
    fontSize: 10,
    color: '#aaa',
    marginLeft: 4,
    marginRight: 4,
  },
  stepLabelActive: {color: '#004BA0', fontWeight: '600'},
  stepLine: {
    width: 24,
    height: 2,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 4,
  },
  stepLineDone: {backgroundColor: '#4CAF50'},
  scroll: {flex: 1},
  scrollContent: {padding: 16, paddingBottom: 40},
  card: {borderRadius: 12, elevation: 3, backgroundColor: 'white'},
  btn: {marginBottom: 12},
  progress: {marginVertical: 8, height: 6, borderRadius: 3},
  emptyText: {textAlign: 'center', color: '#999', marginVertical: 16},
  vinChip: {
    backgroundColor: '#E3F2FD',
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  vinChipText: {fontSize: 11, color: '#1565C0'},
  input: {marginBottom: 8},
  row: {flexDirection: 'row', gap: 8},
  halfInput: {flex: 1},
  divider: {marginVertical: 12},
  mainBtn: {
    borderRadius: 10,
    backgroundColor: '#004BA0',
    marginBottom: 10,
    elevation: 3,
  },
  mainBtnContent: {height: 50},
  secondaryBtn: {marginTop: 4},
  scanningCenter: {alignItems: 'center', paddingVertical: 20},
  scanStatusText: {
    marginTop: 12,
    fontSize: 14,
    color: '#004BA0',
    fontWeight: '600',
    textAlign: 'center',
  },
  progressBar: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    marginTop: 16,
  },
  progressPercent: {
    marginTop: 6,
    fontSize: 13,
    color: '#555',
    fontWeight: 'bold',
  },
  stepsChecklist: {marginTop: 16},
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  checkLabel: {
    marginLeft: 10,
    fontSize: 13,
    color: '#bbb',
  },
  checkLabelDone: {color: '#333', fontWeight: '500'},
});
