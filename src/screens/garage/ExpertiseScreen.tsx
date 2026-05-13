import React, {useState, useEffect} from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Platform,
  Text as RNText,
  Alert,
} from 'react-native';
import {
  Card,
  Avatar,
  Surface,
  Divider,
  Button,
  Text,
  ActivityIndicator,
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {obdService} from '../../services/obdService';
import {useStore} from '../../store/useStore';

export const ExpertiseScreen: React.FC<{navigation: any; route: any}> = ({
  navigation,
  route,
}) => {
  const {vehicleInfo, setVehicleInfo} = useStore();
  const [loading, setLoading] = useState(false);
  const [localVehicle, setLocalVehicle] = useState<any>(route.params?.vehicle);

  useEffect(() => {
    const fetchVehicleInfo = async () => {
      if (obdService.isConnected && !localVehicle && !vehicleInfo.brand) {
        setLoading(true);
        try {
          const vin = await obdService.readVIN();
          if (vin) {
            const wmi = vin.substring(0, 3).toUpperCase();
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
              SAL: 'Land Rover', SARR: 'Range Rover', SCC: 'Lotus',
              UU1: 'Dacia', W0L: 'Opel', W0V: 'Vauxhall',
            };
            const brand = wmiToBrand[wmi] || wmiToBrand[wmi.substring(0, 2)] || 'Inconnu';
            const yearCode = vin.charAt(9).toUpperCase();
            const yearCodes: {[key: string]: number} = {
              A: 2010, B: 2011, C: 2012, D: 2013, E: 2014, F: 2015,
              G: 2016, H: 2017, J: 2018, K: 2019, L: 2020, M: 2021,
              N: 2022, P: 2023, R: 2024, S: 2025,
              Y: 2000, '1': 2001, '2': 2002, '3': 2003, '4': 2004,
              '5': 2005, '6': 2006, '7': 2007, '8': 2008, '9': 2009,
            };
            const year = yearCodes[yearCode];
            const newInfo = {vin, brand, year, connected: true};
            setVehicleInfo(newInfo);
            setLocalVehicle({vin, brand, year});
          }
        } catch (error) {
          console.error('[ExpertiseScreen] Error fetching VIN:', error);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchVehicleInfo();
  }, [vehicleInfo.brand, localVehicle, setVehicleInfo]);

  const handleLaunchCertification = () => {
    if (!obdService.isConnected) {
      Alert.alert(
        'Non connecté',
        "Veuillez vous connecter à l'adaptateur EML327 pour lancer la certification.",
        [
          {text: 'Annuler', style: 'cancel'},
          {text: 'Continuer quand même', onPress: () => navigation.navigate('ExpertScan', {vehicleData: localVehicle || undefined})},
        ],
      );
      return;
    }

    const vehicleData =
      localVehicle ||
      (vehicleInfo.brand
        ? {
            licensePlate: vehicleInfo.licensePlate,
            brand: vehicleInfo.brand,
            model: vehicleInfo.model,
            year: vehicleInfo.year,
            vin: vehicleInfo.vin,
          }
        : undefined);

    navigation.navigate('ExpertScan', {
      vehicleData,
    });
  };

  return (
    <ScrollView style={styles.container}>
      <Surface style={styles.header} elevation={4}>
        <Icon name="shield-check" size={36} color="white" style={styles.headerIcon} />
        <Text variant="titleLarge" style={styles.headerTitle}>
          Certification Kilométrique
        </Text>
        <RNText style={styles.headerSubtitle}>
          Analyse complète anti-fraude du véhicule
        </RNText>
      </Surface>

      <View style={styles.content}>

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator animating={true} color="#004BA0" />
            <Text style={styles.loadingText}>Récupération des infos véhicule...</Text>
          </View>
        )}

        {(localVehicle || vehicleInfo.brand) && !loading && (
          <Card style={styles.vehicleCard}>
            <Card.Title
              title="Véhicule à certifier"
              subtitle={localVehicle?.vin || vehicleInfo.vin || 'VIN Inconnu'}
              left={props => (
                <Avatar.Icon {...props} icon="car" style={styles.iconVehicle} />
              )}
            />
            <Card.Content>
              <View style={styles.vehicleInfoRow}>
                <Text variant="bodyMedium" style={styles.vehicleInfoText}>
                  Marque :{' '}
                  <Text style={styles.bold}>
                    {localVehicle?.brand || vehicleInfo.brand || 'Inconnue'}
                  </Text>
                </Text>
                <Text variant="bodyMedium" style={styles.vehicleInfoText}>
                  Année :{' '}
                  <Text style={styles.bold}>
                    {localVehicle?.year || vehicleInfo.year || 'N/A'}
                  </Text>
                </Text>
              </View>
            </Card.Content>
          </Card>
        )}

        <Card style={styles.certCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.certTitle}>
              Ce que la certification analyse
            </Text>
            <Divider style={styles.divider} />

            <View style={styles.analysisSection}>
              <View style={styles.analysisTitleRow}>
                <Icon name="speedometer" size={22} color="#004BA0" />
                <Text style={styles.analysisSectionTitle}>Kilométrage</Text>
              </View>
              <View style={styles.featureItem}>
                <Icon name="check-circle" size={16} color="#4CAF50" />
                <RNText style={styles.featureText}>Comparaison tableau de bord / ECU / ABS</RNText>
              </View>
              <View style={styles.featureItem}>
                <Icon name="check-circle" size={16} color="#4CAF50" />
                <RNText style={styles.featureText}>Détection de recul ou manipulation d'odomètre</RNText>
              </View>
              <View style={styles.featureItem}>
                <Icon name="check-circle" size={16} color="#4CAF50" />
                <RNText style={styles.featureText}>Score de fiabilité kilométrique</RNText>
              </View>
            </View>

            <Divider style={styles.divider} />

            <View style={styles.analysisSection}>
              <View style={styles.analysisTitleRow}>
                <Icon name="airbag" size={22} color="#C62828" />
                <Text style={styles.analysisSectionTitle}>Sécurité (Airbags / Crash Data)</Text>
              </View>
              <View style={styles.featureItem}>
                <Icon name="check-circle" size={16} color="#4CAF50" />
                <RNText style={styles.featureText}>Lecture du module SRS (airbags)</RNText>
              </View>
              <View style={styles.featureItem}>
                <Icon name="check-circle" size={16} color="#4CAF50" />
                <RNText style={styles.featureText}>Détection de Crash Data masquées</RNText>
              </View>
              <View style={styles.featureItem}>
                <Icon name="check-circle" size={16} color="#4CAF50" />
                <RNText style={styles.featureText}>Historique de déploiement d'airbags</RNText>
              </View>
            </View>
          </Card.Content>
        </Card>

        <Button
          mode="contained"
          icon="shield-search"
          onPress={handleLaunchCertification}
          contentStyle={styles.mainButtonContent}
          style={styles.mainButton}>
          DÉMARRER LA CERTIFICATION
        </Button>

        <Card style={styles.infoCard}>
          <Card.Content>
            <View style={styles.infoRow}>
              <Icon name="information-outline" size={18} color="#F57F17" />
              <Text variant="titleSmall" style={styles.infoTitle}>Note importante</Text>
            </View>
            <RNText style={styles.infoText}>
              Un adaptateur compatible (vLinker, OBDLink ou ELM327 V1.5 original) est
              recommandé pour interroger les modules ABS et SRS. L'ELM327 V2.1 peut
              être limité pour ces modules profonds.
            </RNText>
          </Card.Content>
        </Card>

      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 24,
    paddingTop: Platform.OS === 'ios' ? 20 : 16,
    backgroundColor: '#004BA0',
    alignItems: 'center',
  },
  headerIcon: {
    marginBottom: 8,
  },
  headerTitle: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
    fontSize: 13,
  },
  content: {
    padding: 15,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
  },
  loadingText: {
    marginLeft: 10,
    color: '#004BA0',
  },
  vehicleCard: {
    marginBottom: 15,
    backgroundColor: '#f9f9f9',
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  iconVehicle: {
    backgroundColor: '#E8F5E9',
  },
  vehicleInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  vehicleInfoText: {
    color: '#444',
  },
  bold: {
    fontWeight: 'bold',
  },
  certCard: {
    marginBottom: 20,
    borderRadius: 14,
    elevation: 3,
    backgroundColor: '#fff',
    borderTopWidth: 4,
    borderTopColor: '#004BA0',
  },
  certTitle: {
    color: '#004BA0',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  divider: {
    marginVertical: 12,
  },
  analysisSection: {
    marginBottom: 4,
  },
  analysisTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  analysisSectionTitle: {
    marginLeft: 8,
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 7,
    paddingLeft: 4,
  },
  featureText: {
    marginLeft: 8,
    fontSize: 13,
    color: '#444',
  },
  mainButton: {
    borderRadius: 12,
    backgroundColor: '#004BA0',
    marginBottom: 20,
    elevation: 4,
  },
  mainButtonContent: {
    height: 54,
  },
  infoCard: {
    backgroundColor: '#FFF9C4',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FBC02D',
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  infoTitle: {
    fontSize: 14,
    color: '#F57F17',
    marginLeft: 6,
  },
  infoText: {
    fontSize: 13,
    color: '#5D4037',
    fontStyle: 'italic',
    lineHeight: 20,
  },
});
