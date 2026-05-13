// src/screens/ScanScreen.tsx
import React, {useState, useEffect} from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  ListRenderItem,
  Alert,
  ScrollView,
  Text,
} from 'react-native';
import {
  Button,
  Card,
  List,
  ProgressBar,
  TextInput,
  Menu,
  Divider,
} from 'react-native-paper';
import {Device} from 'react-native-ble-plx';
import {obdService} from '../../services/obdService';
import {apiService} from '../../services/apiService';
import {useStore} from '../../store/useStore';
import {ScanSession} from '../../types';

// Composant externe pour l'icône Bluetooth (évite création pendant render)
const BluetoothIcon: React.FC = () => <List.Icon icon="bluetooth" />;

// Composant externe pour le bouton connecter
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

// Composant externe pour renderItem (évite création pendant render)
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
  const [licensePlate, setLicensePlate] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [vin, setVin] = useState('');
  const [showLicenseInput, setShowLicenseInput] = useState(false);
  const [vehicleStats, setVehicleStats] = useState<any>(null);
  const [vehicleHistory, setVehicleHistory] = useState<any[]>([]);

  // Suggestions de modèles
  const [vehicleModels, setVehicleModels] = useState<any[]>([]);
  const [filteredBrands, setFilteredBrands] = useState<string[]>([]);
  const [filteredModels, setFilteredModels] = useState<string[]>([]);
  const [showBrandMenu, setShowBrandMenu] = useState(false);
  const [showModelMenu, setShowModelMenu] = useState(false);

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
    scanHistory,
    isTestMode,
  } = useStore();

  useEffect(() => {
    // Sincroniser le mode mock de l'obdService avec le store au chargement
    obdService.setMockMode(isTestMode);
  }, [isTestMode]);

  useEffect(() => {
    checkPermissions();
    loadVehicleModels();
  }, []);

  // Gestion du scan automatique (ex: après effacement)
  useEffect(() => {
    if (route.params?.autoRun) {
      if (route.params.vehicleData) {
        setLicensePlate(route.params.vehicleData.licensePlate || route.params.vehicleData.license_plate || '');
        setBrand(route.params.vehicleData.brand || '');
        setModel(route.params.vehicleData.model || '');
        setYear(route.params.vehicleData.year?.toString() || '');
        setShowLicenseInput(false);
      }

      // Si on est déjà connecté (store ET BLE réel), on peut lancer le diagnostic directement
      if (obdService.isConnected) {
        // Un petit délai pour laisser l'UI s'initialiser
        setTimeout(() => {
          runFullDiagnostic();
        }, 800);
      }
    }
  }, [route.params?.autoRun, route.params?.vehicleData]);

  // Réinitialiser les champs si on n'est pas déjà en train de scanner ou connecté
  useEffect(() => {
    if (isScanning || route.params?.autoRun) {
      return;
    }

    if (!vehicleInfo.connected) {
      setLicensePlate('');
      setBrand('');
      setModel('');
      setYear('');
      setShowLicenseInput(false);
    } else {
      setLicensePlate(vehicleInfo.licensePlate || '');
      setBrand(vehicleInfo.brand || '');
      setModel(vehicleInfo.model || '');
      setYear(vehicleInfo.year?.toString() || '');
      
      // Si skipConnect est passé, on montre l'écran final de lancement si on a les infos, 
      // sinon on garde le formulaire de saisie de plaque
      const hasVehicleData = (vehicleInfo.brand && vehicleInfo.model) || vehicleInfo.licensePlate;
      setShowLicenseInput(route.params?.skipConnect && hasVehicleData ? false : true);
    }
  }, [vehicleInfo.connected, route.params?.skipConnect]);

  const loadVehicleModels = async () => {
    const models = await apiService.getVehicleModels();
    setVehicleModels(models);
    const brands = [...new Set(models.map((m: any) => m.brand))];
    setFilteredBrands(brands);
  };

  const onBrandChange = (text: string) => {
    setBrand(text);
    const brands = [...new Set(vehicleModels.map((m: any) => m.brand))].filter(
      b => b.toLowerCase().includes(text.toLowerCase()),
    );
    setFilteredBrands(brands);
    if (brands.length > 0) {
      setShowBrandMenu(true);
    } else {
      setShowBrandMenu(false);
    }

    // Reset model if brand changes
    setModel('');
    setFilteredModels([]);
  };

  const onSelectBrand = (selectedBrand: string) => {
    setBrand(selectedBrand);
    setShowBrandMenu(false);
    const models = vehicleModels
      .filter(m => m.brand === selectedBrand)
      .map(m => m.model);
    setFilteredModels([...new Set(models)]);
  };

  const onModelChange = (text: string) => {
    setModel(text);
    const models = vehicleModels
      .filter(
        m =>
          m.brand === brand &&
          m.model.toLowerCase().includes(text.toLowerCase()),
      )
      .map(m => m.model);
    setFilteredModels([...new Set(models)]);
    if (models.length > 0) {
      setShowModelMenu(true);
    } else {
      setShowModelMenu(false);
    }
  };

  const onSelectModel = (selectedModel: string) => {
    setModel(selectedModel);
    setShowModelMenu(false);
  };

  const onLicensePlateChange = async (text: string) => {
    setLicensePlate(text);

    // Si la plaque semble complète (ex: 4+ caractères)
    if (text.length >= 4) {
      const vehicleData = await apiService.getVehicleByPlate(text);
      if (vehicleData) {
        setBrand(vehicleData.brand || '');
        setModel(vehicleData.model || '');
        setYear(vehicleData.year?.toString() || '');
        setVehicleStats(vehicleData.stats || null);
        setVehicleHistory(vehicleData.history || []);

        // Mettre à jour les listes filtrées pour les menus
        if (vehicleData.brand) {
          const models = vehicleModels
            .filter(m => m.brand === vehicleData.brand)
            .map(m => m.model);
          setFilteredModels([...new Set(models)]);
        }
      } else {
        setVehicleStats(null);
        setVehicleHistory([]);
      }
    } else {
      setVehicleStats(null);
      setVehicleHistory([]);
    }
  };

  const checkRecurrence = (plate: string) => {
    const previousScans = scanHistory.filter(
      s =>
        s?.vehicleInfo?.licensePlate === plate ||
        (s?.vehicleInfo as any)?.license_plate === plate,
    );
    if (previousScans.length >= 2) {
      Alert.alert(
        'Attention : Récurrence détectée',
        `Ce véhicule (${plate}) est déjà venu ${previousScans.length} fois pour des diagnostics.`,
      );
    }
  };

  const checkPermissions = async () => {
    const granted = await obdService.requestPermissions();
    if (!granted) {
      Alert.alert('Permissions requises : Activez Bluetooth et Localisation');
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
        'Aucun appareil trouvé. Vérifiez que votre ELM327 est allumé.',
      );
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
      } catch (e) {
        console.log('Protocole auto-détecté');
      }

      // Tentative de lecture automatique du VIN
      try {
        const detectedVin = await obdService.readVIN();
        if (detectedVin) {
          setVin(detectedVin);
          setVehicleInfo({vin: detectedVin});

          // Identification automatique de la marque via WMI (3 premiers car.)
          const wmi = detectedVin.substring(0, 3).toUpperCase();
          const wmiToBrand: {[key: string]: string} = {
            'VF1': 'Renault', 'VF3': 'Peugeot', 'VF7': 'Citroën',
            'WVW': 'Volkswagen', 'WVG': 'Volkswagen', 'WV2': 'Volkswagen',
            'WBA': 'BMW', 'WBS': 'BMW', 'WDB': 'Mercedes-Benz', 'WDD': 'Mercedes-Benz',
            'VF3': 'Peugeot', 'ZFA': 'Fiat', 'TSM': 'Suzuki',
            'JT1': 'Toyota', 'JTD': 'Toyota', 'JT6': 'Toyota', 'JTM': 'Toyota',
            'JMB': 'Mitsubishi', 'JA3': 'Mitsubishi', 'JM0': 'Mazda',
            'JN1': 'Nissan', 'JN8': 'Nissan', 'JHM': 'Honda', 'JHL': 'Honda',
            'KMH': 'Hyundai', 'KNA': 'Kia', 'KND': 'Kia', 'KNM': 'Samsung',
            '1FM': 'Ford', '1FT': 'Ford', '1FC': 'Ford', '2FM': 'Ford',
            '1GC': 'Chevrolet', '1GN': 'Chevrolet', '1G1': 'Chevrolet',
            'SAL': 'Land Rover', 'SARR': 'Range Rover', 'SCC': 'Lotus',
            'UU1': 'Dacia', 'W0L': 'Opel', 'W0V': 'Vauxhall',
            'LSY': 'Yutong', 'LHG': 'Guangzhou', 'LZE': 'Isuzu China',
          };

          const detectedBrand = wmiToBrand[wmi] || wmiToBrand[wmi.substring(0, 2)];
          if (detectedBrand && !brand) {
            setBrand(detectedBrand);
            // Charger les modèles pour cette marque
            const models = vehicleModels
              .filter(m => m.brand.toLowerCase() === detectedBrand.toLowerCase())
              .map(m => m.model);
            setFilteredModels([...new Set(models)]);
          }

          // Extraction de l'année (10ème caractère du VIN standard)
          const yearCode = detectedVin.charAt(9).toUpperCase();
          const yearCodes: {[key: string]: number} = {
            'A': 2010, 'B': 2011, 'C': 2012, 'D': 2013, 'E': 2014, 'F': 2015,
            'G': 2016, 'H': 2017, 'J': 2018, 'K': 2019, 'L': 2020, 'M': 2021,
            'N': 2022, 'P': 2023, 'R': 2024, 'S': 2025,
            'Y': 2000, '1': 2001, '2': 2002, '3': 2003, '4': 2004, '5': 2005,
            '6': 2006, '7': 2007, '8': 2008, '9': 2009,
          };
          if (yearCodes[yearCode] && !year) {
            setYear(yearCodes[yearCode].toString());
          }

          Alert.alert(
            'Véhicule identifié',
            `VIN : ${detectedVin}\nMarque détectée : ${detectedBrand || 'Inconnue'}\n\nVeuillez maintenant compléter les informations du véhicule.`,
          );
        } else {
          Alert.alert(`Connecté à ${device.name}`, 'Veuillez maintenant compléter les informations du véhicule.');
        }
      } catch (vinErr) {
        console.error('Erreur lecture VIN:', vinErr);
        Alert.alert(`Connecté à ${device.name}`, 'Veuillez maintenant compléter les informations du véhicule.');
      }

      // Afficher le formulaire après la connexion réussie
      setShowLicenseInput(true);
    } else {
      Alert.alert('Impossible de se connecter');
    }

    setConnecting(false);
  };

  const runFullDiagnostic = async () => {
    // Éviter de lancer deux diagnostics en même temps
    if (useStore.getState().isScanning) {
      console.log('Scan déjà en cours, annulation du nouvel appel');
      return;
    }

    if (!obdService.isConnected) {
      Alert.alert('Non connecté', 'Veuillez vous connecter à un appareil OBD avant de lancer le diagnostic.');
      return;
    }

    setIsScanning(true);
    setScanProgress(0);
    clearDTCs();

    try {
      setScanProgress(0.1);
      // Correction : passer le scanType à readDTCs
      const detectedDtcs = await obdService.readDTCs(route.params?.scanType || scanType);
      detectedDtcs.forEach(item => addDTC(item));

      setScanProgress(0.4);
      const obdData = await obdService.readCommonPIDs();
      setOBDData(obdData);

      setScanProgress(0.6);

      let mileageData = null;
      let safetyData = null;

      const currentScanType = route.params?.scanType || scanType;

      if (currentScanType === 'EXPERT' || currentScanType === 'expert' || currentScanType === 'security') {
        setScanProgress(0.7);
        mileageData = await obdService.readMileageData();

        setScanProgress(0.85);
        safetyData = await obdService.readSafetyData();
      }

      setScanProgress(0.95);

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
        safety_check: safetyData ? {
          has_crash_data: safetyData.has_crash_data,
          airbags_deployed: safetyData.airbags_deployed,
          impact_sensors_count: safetyData.impact_sensors_count,
        } : undefined,
      };

      const savedScan = await apiService.saveScan({
        ...scanSession,
        // @ts-ignore
        scan_type: route.params?.scanType === 'verification' ? 'VERIFICATION' : (route.params?.scanType === 'EXPERT' ? 'EXPERT' : 'DIAGNOSTIC')
      });
      addScanToHistory((savedScan || scanSession) as any);

      setScanProgress(1);
      Alert.alert(
        `${detectedDtcs.length} code(s) défaut trouvé(s). ${obdData.length} paramètres lus.`,
      );

      const target = (route.params?.scanType === 'EXPERT' || scanType === 'EXPERT')
        ? (user?.user_type === 'INDIVIDUAL' ? 'ExpertResults' : 'ExpertResults')
        : 'Results';

      // Note: ExpertResults est redirigé vers l'écran individual via le Navigator pour les particuliers
      navigation.navigate(target, {
        scan: (savedScan || scanSession) as any,
        scanType: route.params?.scanType || scanType,
        isNewScan: true,
      });
    } catch (error: any) {
      let errorMessage = 'Une erreur est survenue lors du diagnostic.';
      if (error?.response?.data) {
        // Extraction des messages d'erreur DRF
        const data = error.response.data;
        if (typeof data === 'object') {
          errorMessage = Object.values(data).flat().join('\n');
        } else {
          errorMessage = data.toString();
        }
      } else if (error?.message) {
        errorMessage = error.message;
      }
      Alert.alert('Erreur diagnostic', errorMessage);
    } finally {
      setIsScanning(false);
    }
  };
  useStore(state => state.currentDTCs);
// Fonction de render stable (useCallback pour éviter recréation)
  const renderDevice: ListRenderItem<Device> = ({item}) => (
    <DeviceItem
      item={item}
      connecting={connecting}
      onConnect={connectToDevice}
    />
  );

  const keyExtractor = (item: Device) => item.id;
  // @ts-ignore
  return (
    <View style={styles.container}>
      {!vehicleInfo.connected && (
        <>
          <Card style={styles.scanCard}>
            <Card.Title
              title="Connexion à l'équipement OBD"
              subtitle="Scanner les adaptateurs Bluetooth"
            />
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

              {scanning && (
                <ProgressBar indeterminate style={styles.progress} />
              )}
            </Card.Content>
          </Card>

          <FlatList
            data={devices}
            renderItem={renderDevice}
            keyExtractor={keyExtractor}
            ListEmptyComponent={
              !scanning ? (
                // @ts-ignore
                <Text style={styles.emptyText}>
                  Aucun appareil trouvé. Appuyez sur Scanner.
                </Text>
              ) : null
            }
          />
        </>
      )}

      {vehicleInfo.connected && showLicenseInput && (
        <ScrollView style={styles.scrollView}>
          <Card style={styles.scanCard}>
            <Card.Title
              title="Informations du véhicule"
              subtitle={`Connecté à ${vehicleInfo.deviceName || 'ELM327'}`}
            />
            <Card.Content>
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
                      /* eslint-disable-next-line react-native/no-inline-styles */
                      style={[styles.input, {width: 160, marginRight: 8}]}
                    />
                  }>
                  {filteredBrands.slice(0, 5).map(b => (
                    <Menu.Item
                      key={b}
                      onPress={() => onSelectBrand(b)}
                      title={b}
                    />
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
                      style={[styles.input, {width: 160}]}
                    />
                  }>
                  {filteredModels.slice(0, 5).map(m => (
                    <Menu.Item
                      key={m}
                      onPress={() => onSelectModel(m)}
                      title={m}
                    />
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
              {vin ? (
                <TextInput
                  label="VIN (N° Châssis)"
                  value={vin}
                  editable={false}
                  mode="outlined"
                  style={[styles.input, {backgroundColor: '#f0f0f0'}]}
                />
              ) : null}

              <View style={styles.actionButtons}>
                <Button
                  mode="contained"
                  style={styles.actionButton}
                  disabled={!licensePlate || !brand || !model}
                  onPress={() => {
                    const yearInt = parseInt(year, 10);
                    if (year && !isNaN(yearInt)) {
                      const selectedModelData = vehicleModels.find(
                        m =>
                          m.brand.toLowerCase() === brand.toLowerCase() &&
                          m.model.toLowerCase() === model.toLowerCase(),
                      );

                      if (selectedModelData) {
                        if (
                          selectedModelData.year_start &&
                          yearInt < selectedModelData.year_start
                        ) {
                          Alert.alert(
                            'Année invalide',
                            `L'année ${yearInt} est trop ancienne pour ce modèle. L'année minimale est ${selectedModelData.year_start}.`,
                          );
                          return;
                        }
                        if (
                          selectedModelData.year_end &&
                          yearInt > selectedModelData.year_end
                        ) {
                          Alert.alert(
                            'Année invalide',
                            `L'année ${yearInt} est trop récente pour ce modèle. L'année maximale est ${selectedModelData.year_end}.`,
                          );
                          return;
                        }
                      }
                    }

                    setShowLicenseInput(false);
                    setVehicleInfo({
                      licensePlate,
                      brand,
                      model,
                      year: parseInt(year, 10) || undefined,
                      connected: true,
                    });
                    checkRecurrence(licensePlate);
                  }}>
                  Lancer le diagnostic
                </Button>

                <Button
                  mode="outlined"
                  onPress={() => {
                    setVehicleInfo({connected: false});
                    setDevices([]);
                  }}
                  style={styles.secondaryButton}>
                  Changer d'adaptateur
                </Button>
              </View>

              {vehicleStats && (
                <View style={styles.statsContainer}>
                  <Divider style={styles.divider} />
                  <Text style={styles.statsTitle}>
                    Statistiques du véhicule
                  </Text>
                  <View style={styles.statsRow}>
                    <View style={styles.statBox}>
                      <Text style={styles.statValue}>
                        {vehicleStats.scan_count}
                      </Text>
                      <Text style={styles.statLabel}>Passages</Text>
                    </View>
                    {vehicleStats.last_scan && (
                      <View style={[styles.statBox, {flex: 2}]}>
                        <Text style={styles.statValue}>
                          {new Date(
                            vehicleStats.last_scan.date,
                          ).toLocaleDateString()}
                        </Text>
                        <Text style={styles.statLabel}>Dernier scan</Text>
                      </View>
                    )}
                  </View>

                  {vehicleStats.top_dtcs &&
                    vehicleStats.top_dtcs.length > 0 && (
                      <View style={styles.topDtcsContainer}>
                        <Text style={styles.subTitle}>Défauts fréquents :</Text>
                        {vehicleStats.top_dtcs.map(
                          (dtc: any, index: number) => (
                            <View key={index} style={styles.dtcItem}>
                              <View style={styles.dtcHeader}>
                                <Text style={styles.dtcCode}>{dtc.code}</Text>
                                <Text style={styles.dtcOccur}>
                                  ({dtc.count} fois)
                                </Text>
                              </View>
                              <Text style={styles.dtcDescription}>
                                {dtc.description}
                              </Text>
                              {dtc.meaning && (
                                <View style={styles.meaningContainer}>
                                  <Text style={styles.meaningText}>
                                    💡 {dtc.meaning}
                                  </Text>
                                </View>
                              )}
                            </View>
                          ),
                        )}
                      </View>
                    )}
                </View>
              )}

              {vehicleHistory && vehicleHistory.length > 0 && (
                <View style={styles.historyContainer}>
                  <Divider style={styles.divider} />
                  <Text style={styles.statsTitle}>Historique récent</Text>
                  {vehicleHistory.map((scan, index) => (
                    <List.Item
                      key={index}
                      title={
                        new Date(scan.date).toLocaleDateString() +
                        ' - ' +
                        new Date(scan.date).toLocaleTimeString()
                      }
                      description={scan.notes || 'Pas de notes'}
                      left={props => <List.Icon {...props} icon="history" />}
                      right={props => (
                        <Text {...props} style={styles.historyCost}>
                          {scan.total_cost || 0} FCFA
                        </Text>
                      )}
                    />
                  ))}
                </View>
              )}
            </Card.Content>
          </Card>
        </ScrollView>
      )}

      {vehicleInfo.connected && !showLicenseInput && (
        <View style={styles.diagnosticContainer}>
          <Card style={styles.diagnosticCard}>
            <Card.Title
              title="Prêt pour le diagnostic"
              subtitle={`Véhicule : ${brand} ${model} (${licensePlate})`}
            />
            <Card.Content>
              {/* @ts-ignore */}
              <Text style={styles.connectedText}>
                Équipement : {vehicleInfo.deviceName || 'Connecté'}
              </Text>
              <View style={styles.progressContainer}>
                <ProgressBar progress={scanProgress} color="#4CAF50" style={styles.progress} />
                <Text style={styles.progressText}>{Math.round(scanProgress * 100)}%</Text>
              </View>
              <Button
                mode="contained"
                onPress={runFullDiagnostic}
                loading={isScanning}
                disabled={isScanning}
                icon="play"
                style={styles.diagnosticButton}>
                Lancer le diagnostic complet
              </Button>
              <Button
                mode="outlined"
                onPress={() => {
                  setShowLicenseInput(true);
                }}
                style={styles.secondaryButton}
                disabled={isScanning}>
                Modifier infos véhicule
              </Button>
              <Button
                mode="text"
                onPress={() => {
                  setVehicleInfo({connected: false});
                  setDevices([]);
                }}
                style={{marginTop: 10}}
                disabled={isScanning}>
                Déconnecter l'adaptateur
              </Button>
            </Card.Content>
          </Card>
        </View>
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
  scrollView: {
    flex: 1,
  },
  input: {
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
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
  diagnosticContainer: {
    flex: 1,
  },
  diagnosticButton: {
    marginTop: 16,
  },
  actionButtons: {
    marginTop: 16,
  },
  actionButton: {
    marginBottom: 8,
  },
  secondaryButton: {
    marginTop: 8,
  },
  connectedText: {
    fontSize: 14,
    color: '#2E7D32',
    fontWeight: '600',
    marginBottom: 8,
  },
  statsContainer: {
    marginTop: 16,
  },
  historyContainer: {
    marginTop: 16,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statBox: {
    backgroundColor: '#F0F0F0',
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  progressContainer: {
    marginVertical: 10,
  },
  progressText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 10,
    color: '#757575',
    textTransform: 'uppercase',
  },
  subTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  topDtcsContainer: {
    marginTop: 8,
  },
  dtcItem: {
    marginBottom: 12,
    backgroundColor: '#fff',
    padding: 8,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  dtcHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  dtcCode: {
    fontWeight: 'bold',
    marginRight: 8,
    color: '#D32F2F',
    fontSize: 16,
  },
  dtcOccur: {
    fontSize: 12,
    color: '#757575',
  },
  dtcDescription: {
    fontSize: 13,
    color: '#444',
    marginBottom: 4,
  },
  meaningContainer: {
    backgroundColor: '#FFFDE7',
    padding: 8,
    borderRadius: 6,
    borderLeftWidth: 4,
    borderLeftColor: '#FBC02D',
    marginTop: 4,
  },
  meaningText: {
    fontSize: 12,
    color: '#5D4037',
    fontStyle: 'italic',
  },
  divider: {
    marginVertical: 12,
  },
  historyCost: {
    alignSelf: 'center',
    color: '#4CAF50',
    fontWeight: 'bold',
  },
});
