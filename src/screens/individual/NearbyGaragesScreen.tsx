import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import {TextInput} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Geolocation from 'react-native-geolocation-service';
import DatePickerModal from '../../components/DatePickerModal';
import apiIndividualService from '../../services/individual/apiIndividualService';
import ReviewModal from '../../components/ReviewModal';

export const NearbyGaragesScreen = ({navigation}: any) => {
  const [garages, setGarages] = useState<any[]>([]);
  const [filteredGarages, setFilteredGarages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [userVehicleId, setUserVehicleId] = useState<number | null>(null);

  // Pour la notation
  const [selectedGarage, setSelectedGarage] = useState<any>(null);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);

  // Pour le RDV
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [garageForAppointment, setGarageForAppointment] = useState<any>(null);

  useEffect(() => {
    fetchGarages();
    fetchUserVehicle();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredGarages(garages);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = garages.filter(
        garage =>
          (garage.shop_name && garage.shop_name.toLowerCase().includes(query)) ||
          (garage.location && garage.location.toLowerCase().includes(query)) ||
          (garage.specialties && garage.specialties.toLowerCase().includes(query)),
      );
      setFilteredGarages(filtered);
    }
  }, [searchQuery, garages]);

  const fetchUserVehicle = async () => {
    try {
      const data = await apiIndividualService.getDashboardData();
      if (data?.vehicle?.id) {
        setUserVehicleId(data.vehicle.id);
      }
    } catch (error) {
      // Pas bloquant si le véhicule n'est pas récupéré
    }
  };

  const requestLocationPermission = async () => {
    if (Platform.OS === 'ios') {
      const auth = await Geolocation.requestAuthorization('whenInUse');
      return auth === 'granted';
    }
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        return false;
      }
    }
    return false;
  };

  const fetchGarages = async () => {
    setLoading(true);
    const hasPermission = await requestLocationPermission();

    if (hasPermission) {
      Geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            const data = await apiIndividualService.getNearbyGarages(latitude, longitude);
            setGarages(data);
            setFilteredGarages(data);
          } catch (error) {
            Alert.alert('Erreur', 'Impossible de charger les garages avec votre position.');
          } finally {
            setLoading(false);
          }
        },
        async (error) => {
          console.error('[NearbyGarages] GPS Error:', error);
          // Fallback sur position par défaut si GPS échoue
          loadGaragesWithDefault();
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );
    } else {
      loadGaragesWithDefault();
    }
  };

  const loadGaragesWithDefault = async () => {
    try {
      const data = await apiIndividualService.getNearbyGarages(); // Utilise Abidjan par défaut dans le service
      setGarages(data);
      setFilteredGarages(data);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de charger la liste des garages.');
    } finally {
      setLoading(false);
    }
  };

  const handleTakeAppointment = (garage: any) => {
    setGarageForAppointment(garage);
    setShowDatePicker(true);
  };

  const confirmAppointment = async (garage: any, date: Date) => {
    try {
      const appointmentData: {
        mechanic: number;
        appointment_date: string;
        reason: string;
        vehicle?: number;
      } = {
        mechanic: garage.id,
        appointment_date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
        reason: 'Entretien général',
      };
      if (userVehicleId) {
        appointmentData.vehicle = userVehicleId;
      }
      await apiIndividualService.createAppointment(appointmentData);
      Alert.alert(
        'Succès',
        `Votre rendez-vous chez ${
          garage.shop_name || garage.name
        } pour le ${date.toLocaleDateString('fr-FR')} a été enregistré.`,
      );
    } catch (error: any) {
      const msg = error?.response?.data?.error;
      if (msg) {
        Alert.alert('Rendez-vous', msg);
      }
    } finally {
      setGarageForAppointment(null);
    }
  };

  const onDateConfirm = (date: Date) => {
    setShowDatePicker(false);
    if (garageForAppointment) {
      confirmAppointment(garageForAppointment, date);
    }
  };

  const onDateCancel = () => {
    setShowDatePicker(false);
    setGarageForAppointment(null);
  };

  const renderGarageItem = ({item}: {item: any}) => (
    <View style={styles.garageCard}>
      <View style={styles.garageInfo}>
        <View style={styles.iconContainer}>
          <Icon
            name={item.is_expert ? 'star-circle' : 'wrench'}
            size={30}
            color={item.is_expert ? '#FF9800' : '#1976D2'}
          />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.garageName}>{item.shop_name || item.name}</Text>
          <View style={styles.ratingRow}>
            <Icon name="star" size={16} color="#FFD700" />
            <Text style={styles.ratingText}>
              {item.average_rating > 0 ? item.average_rating.toFixed(1) : 'N/A'}
              ({item.review_count})
            </Text>
            {item.badges && item.badges.length > 0 && (
              <View style={styles.badgeContainer}>
                {item.badges.map((badge: string, index: number) => (
                  <View key={index} style={styles.badge}>
                    <Text style={styles.badgeText}>{badge}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
          <Text style={styles.garageLocation}>{item.location}</Text>
          {item.specialties ? (
            <Text style={styles.specialtiesText}>
              <Icon name="tag-outline" size={12} /> {item.specialties}
            </Text>
          ) : null}
          <Text style={styles.garageDistance}>
            {typeof item.distance === 'number'
              ? item.distance.toFixed(2)
              : item.distance}{' '}
            km de vous
          </Text>
        </View>
        {item.notifiable_scan_id || item.notifiable_appointment_id ? (
          <TouchableOpacity
            style={styles.rateIconBtn}
            onPress={() => {
              setSelectedGarage(item);
              setReviewModalVisible(true);
            }}>
            <Icon name="star-plus-outline" size={24} color="#FF9800" />
            <Text style={styles.rateText}>Noter</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      <TouchableOpacity
        style={styles.appointmentBtn}
        onPress={() => handleTakeAppointment(item)}>
        <Text style={styles.appointmentBtnText}>Prendre RDV</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1976D2" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredGarages}
        keyExtractor={item => item.id.toString()}
        renderItem={renderGarageItem}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <TextInput
            label="Rechercher un garage..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            mode="outlined"
            style={styles.searchBar}
            left={<TextInput.Icon icon="magnify" />}
            clearButtonMode="while-editing"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {searchQuery.length > 0
                ? "Aucun résultat pour cette recherche."
                : "Aucun garage trouvé à proximité."}
            </Text>
          </View>
        }
      />

      {selectedGarage && (
        <ReviewModal
          visible={reviewModalVisible}
          onClose={() => setReviewModalVisible(false)}
          mechanicId={selectedGarage.id}
          mechanicName={selectedGarage.shop_name || selectedGarage.name}
          scanSessionId={selectedGarage.notifiable_scan_id}
          appointmentId={selectedGarage.notifiable_appointment_id}
          onSuccess={() => {
            fetchGarages(); // Rafraîchir pour voir la nouvelle note
          }}
        />
      )}

      <DatePickerModal
        visible={showDatePicker}
        title={`📅 RDV chez ${garageForAppointment?.shop_name || garageForAppointment?.name || ''}`}
        onConfirm={onDateConfirm}
        onCancel={onDateCancel}
        minimumDate={new Date()}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  searchBar: {
    marginBottom: 16,
    backgroundColor: '#FFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  garageCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  garageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  garageName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  ratingText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
    marginRight: 8,
  },
  badgeContainer: {
    flexDirection: 'row',
  },
  badge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  badgeText: {
    fontSize: 10,
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  garageLocation: {
    fontSize: 14,
    color: '#666',
  },
  specialtiesText: {
    fontSize: 13,
    color: '#FF9800',
    marginTop: 4,
    fontStyle: 'italic',
    fontWeight: '500',
  },
  garageDistance: {
    fontSize: 12,
    color: '#1976D2',
    marginTop: 4,
    fontWeight: '600',
  },
  rateIconBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 8,
  },
  rateText: {
    fontSize: 10,
    color: '#FF9800',
    fontWeight: 'bold',
  },
  appointmentBtn: {
    backgroundColor: '#1976D2',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  appointmentBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
});
