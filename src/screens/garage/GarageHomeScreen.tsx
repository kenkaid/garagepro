import React, {useEffect, useState, useLayoutEffect, useCallback} from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Text,
  Alert,
  Dimensions,
  StyleSheet,
  StatusBar,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import * as ReactNavigation from '@react-navigation/native';
const {useFocusEffect} = ReactNavigation;
import {Avatar, Surface, Card} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  Portal,
  Modal,
  TextInput,
  Button,
  ActivityIndicator,
} from 'react-native-paper';
import {useStore} from '../../store/useStore';
import {apiService} from '../../services/apiService';
import {obdService} from '../../services/obdService';
import {notificationSoundService} from '../../services/NotificationSoundService';
import {hasFeature} from '../../utils/featureControl';

const {width} = Dimensions.get('window');

// Import dynamique sécurisé pour LinearGradient
let LinearGradient: any;
try {
  LinearGradient = require('react-native-linear-gradient').default;
} catch (e) {
  LinearGradient = View; // Fallback
}

export const GarageHomeScreen: React.FC<{navigation: any}> = ({navigation}) => {
  const {
    user,
    unreadScansCount,
    vehicleInfo,
    setCurrentScreen,
    setUser,
    setConnectedDevice,
    setVehicleInfo,
  } = useStore();

  const [notifications, setNotifications] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showExpertModal, setShowExpertModal] = useState(false);
  const [specialties, setSpecialties] = useState(user?.specialties || '');
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    setCurrentScreen('home');

    const loadProfile = async () => {
      if (!user || !user.first_name || !user.user_type) {
        const data = await apiService.getCurrentUser();
        if (data) {
          setUser(data);
        }
      }
    };

    const loadNotifications = async () => {
      // Sécurité: ne pas charger si pas de user ou si déconnecté
      if (!user) return;
      try {
        const data = await apiService.getNotifications();

        // Détection de nouvelles notifications de chat non lues
        const newUnreadChat = data.filter(
          (n: any) => !n.is_read && n.notification_type === 'CHAT',
        );

        setNotifications(prev => {
          const prevUnreadIds = new Set(
            prev.filter(n => !n.is_read).map(n => n.id),
          );
          const hasNewChat = newUnreadChat.some(
            (n: any) => !prevUnreadIds.has(n.id),
          );

          if (hasNewChat) {
            notificationSoundService.play();
          }
          return data;
        });
      } catch (error) {
        console.error('Error loading notifications:', error);
      }
    };

    loadProfile();
    loadNotifications();

    // Rafraîchir toutes les 30 secondes
    const interval = setInterval(() => {
      if (apiService.getToken()) {
        // Vérification rapide avant interval
        loadProfile();
        loadNotifications();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [setCurrentScreen, user, setUser]);

  useFocusEffect(
    useCallback(() => {
      const loadProfile = async () => {
        try {
          const data = await apiService.getCurrentUser();
          if (data) {
            setUser(data);
          }
        } catch (error) {
          console.error('Error loading profile:', error);
        }
      };

      const loadNotifications = async () => {
        try {
          const data = await apiService.getNotifications();
          setNotifications(data);
        } catch (error) {}
      };
      loadProfile();
      loadNotifications();
    }, [setUser]),
  );

  const handleNotificationsPress = () => {
    // Si on a des messages non lus, on pourrait aller vers ChatList
    // Mais par défaut on garde Notifications
    navigation.navigate('Notifications');
  };

  const requestLocationPermission = async () => {
    if (Platform.OS === 'ios') {
      const auth = await Geolocation.requestAuthorization('whenInUse');
      return auth === 'granted';
    }

    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Permission de localisation',
            message:
              "L'application a besoin d'accéder à votre position pour vous enregistrer comme expert sur la carte.",
            buttonNeutral: 'Plus tard',
            buttonNegative: 'Annuler',
            buttonPositive: 'OK',
          },
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        return false;
      }
    }
    return false;
  };

  const handleRegisterAsExpert = async () => {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      Alert.alert(
        'Permission refusée',
        'La localisation est nécessaire pour cette fonctionnalité.',
      );
      return;
    }

    setIsRegistering(true);

    Geolocation.getCurrentPosition(
      async position => {
        try {
          const {latitude, longitude} = position.coords;
          console.log(
            '[handleRegisterAsExpert] Position obtenue:',
            latitude,
            longitude,
          );

          const result = await apiService.registerAsExpert(
            latitude,
            longitude,
            specialties,
            true,
          );
          if (result) {
            setUser({...user, ...result});
            Alert.alert(
              'Succès',
              'Vous êtes maintenant enregistré comme expert à votre position actuelle !',
            );
            setShowExpertModal(false);
          } else {
            Alert.alert(
              'Erreur',
              "Impossible de s'enregistrer comme expert auprès du serveur.",
            );
          }
        } catch (error) {
          Alert.alert(
            'Erreur',
            "Une erreur est survenue lors de l'enregistrement.",
          );
        } finally {
          setIsRegistering(false);
        }
      },
      error => {
        console.error('[handleRegisterAsExpert] Erreur Geolocation:', error);
        Alert.alert(
          'Erreur GPS',
          "Impossible d'obtenir votre position exacte. Assurez-vous que le GPS est activé.",
        );
        setIsRegistering(false);
      },
      {enableHighAccuracy: true, timeout: 15000, maximumAge: 10000},
    );
  };

  const handleDisconnect = async () => {
    Alert.alert('Déconnexion', "Voulez-vous déconnecter l'adaptateur OBD ?", [
      {text: 'Annuler', style: 'cancel'},
      {
        text: 'Déconnecter',
        style: 'destructive',
        onPress: async () => {
          try {
            await obdService.disconnect();
            setConnectedDevice(null);
            setVehicleInfo({
              connected: false,
              brand: null,
              model: null,
              protocol: null,
              vin: null,
            });
          } catch (error) {
            console.error('Erreur déconnexion:', error);
            // Forcer l'état déconnecté même en cas d'erreur
            setConnectedDevice(null);
            setVehicleInfo({connected: false});
          }
        },
      },
    ]);
  };

  useLayoutEffect(() => {
    const unreadCount = notifications.filter(
      n => !n.is_read && n.notification_type === 'CHAT',
    ).length;
    const canChat = hasFeature(user, 'internal_messaging');

    navigation.setOptions({
      headerLeft: null,
      headerRight: () => (
        <TouchableOpacity
          onPress={() => {
            if (!canChat) {
              Alert.alert(
                'Option Verrouillée',
                "L'accès à la messagerie interne nécessite un plan d'abonnement supérieur. Souhaitez-vous voir nos offres ?",
                [
                  {text: 'Plus tard', style: 'cancel'},
                  {
                    text: 'Voir les offres',
                    onPress: () => navigation.navigate('Subscriptions'),
                  },
                ],
              );
            } else {
              navigation.navigate('Chat');
            }
          }}
          style={{marginRight: 15, opacity: canChat ? 1 : 0.6}}>
          <View>
            <Icon name="chat-outline" size={26} color="#fff" />
            {!canChat && (
              <View
                style={{
                  position: 'absolute',
                  left: -5,
                  top: -5,
                  backgroundColor: '#757575',
                  borderRadius: 10,
                  width: 16,
                  height: 16,
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderWidth: 1.5,
                  borderColor: '#1976D2',
                }}>
                <Icon name="lock" size={10} color="#fff" />
              </View>
            )}
            {canChat && unreadCount > 0 && (
              <View
                style={{
                  position: 'absolute',
                  right: -5,
                  top: -2,
                  backgroundColor: '#F44336',
                  borderRadius: 10,
                  width: 18,
                  height: 18,
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderWidth: 2,
                  borderColor: '#1976D2',
                }}>
                <Text style={{color: '#fff', fontSize: 10, fontWeight: 'bold'}}>
                  {unreadCount}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      ),
    });
  }, [navigation, notifications, user]);

  const renderConnectionStatus = () => (
    <Surface style={styles.statusCard} elevation={2}>
      <View style={styles.statusHeader}>
        <Avatar.Icon
          size={48}
          icon={vehicleInfo.connected ? 'bluetooth-connect' : 'bluetooth-off'}
          color="#fff"
          style={{
            backgroundColor: vehicleInfo.connected ? '#4CAF50' : '#757575',
          }}
        />
        <View style={styles.statusInfo}>
          <Text style={styles.statusTitle}>
            {vehicleInfo.connected ? 'OBD Connecté' : 'OBD Déconnecté'}
          </Text>
          <Text style={styles.statusSubtitle} numberOfLines={1}>
            {vehicleInfo.connected
              ? `${vehicleInfo.brand || ''} ${vehicleInfo.model || ''} (${
                  vehicleInfo.protocol || 'Auto'
                })`.trim()
              : 'Appuyez pour configurer la liaison'}
          </Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            {backgroundColor: vehicleInfo.connected ? '#E8F5E9' : '#F5F5F5'},
          ]}>
          <View
            style={[
              styles.dot,
              {backgroundColor: vehicleInfo.connected ? '#4CAF50' : '#BDBDBD'},
            ]}
          />
          <Text
            style={[
              styles.statusBadgeText,
              {color: vehicleInfo.connected ? '#2E7D32' : '#616161'},
            ]}>
            {vehicleInfo.connected ? 'LIVE' : 'IDLE'}
          </Text>
        </View>
      </View>

      <View style={styles.statusActions}>
        {vehicleInfo.connected ? (
          <TouchableOpacity
            style={styles.actionBtnOutline}
            onPress={handleDisconnect}>
            <Icon name="close-circle-outline" size={18} color="#F44336" />
            <Text style={styles.actionBtnTextDanger}>Déconnecter</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.actionBtnPrimary}
            onPress={() => navigation.navigate('Scan')}>
            <Icon name="plus-circle-outline" size={18} color="#fff" />
            <Text style={styles.actionBtnTextPrimary}>Nouvelle Connexion</Text>
          </TouchableOpacity>
        )}
      </View>
    </Surface>
  );

  const ActionItem = ({
    icon,
    label,
    color,
    onPress,
    badge,
    featureCode,
  }: any) => {
    const isLocked = featureCode ? !hasFeature(user, featureCode) : false;

    const handlePress = () => {
      if (isLocked) {
        Alert.alert(
          'Option Verrouillée',
          `L'accès à "${label}" nécessite un plan d'abonnement supérieur. Souhaitez-vous voir nos offres ?`,
          [
            {text: 'Plus tard', style: 'cancel'},
            {
              text: 'Voir les offres',
              onPress: () => navigation.navigate('Subscriptions'),
            },
          ],
        );
      } else {
        onPress();
      }
    };

    return (
      <TouchableOpacity
        style={[styles.gridItem, isLocked && {opacity: 0.6}]}
        onPress={handlePress}>
        <Surface style={styles.gridIconContainer} elevation={1}>
          <Icon name={icon} size={30} color={isLocked ? '#9E9E9E' : color} />
          {isLocked && (
            <View style={styles.lockBadge}>
              <Icon name="lock" size={12} color="#fff" />
            </View>
          )}
          {badge > 0 && !isLocked && (
            <View style={styles.gridBadge}>
              <Text style={styles.gridBadgeText}>{badge}</Text>
            </View>
          )}
        </Surface>
        <Text style={styles.gridLabel} numberOfLines={2}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderQuickActions = () => {
    return (
      <View style={styles.gridSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Services Principaux</Text>
        </View>

        <View style={styles.grid}>
          <ActionItem
            icon="magnify-scan"
            label="Diagnostic"
            color="#2196F3"
            featureCode="scan_diagnostic"
            onPress={() => {
              if (obdService.isConnected && vehicleInfo.connected) {
                navigation.navigate('Scan', {skipConnect: true});
              } else {
                navigation.navigate('Scan');
              }
            }}
          />
          <ActionItem
            icon="clipboard-text-outline"
            label="Rapports"
            color="#673AB7"
            featureCode="scan_history"
            badge={unreadScansCount}
            onPress={() => navigation.navigate('History')}
          />
          <ActionItem
            icon="car-info"
            label="Expertise"
            color="#4CAF50"
            featureCode="expertise_report"
            onPress={() => navigation.navigate('Expertise')}
          />
          <ActionItem
            icon="calendar-clock"
            label="Rendez-vous"
            color="#FF5722"
            featureCode="appointment_booking"
            onPress={() => navigation.navigate('Appointments')}
          />
          <ActionItem
            icon="chart-timeline-variant"
            label="Live Data"
            color="#FF9800"
            featureCode="live_monitor"
            onPress={() => {
              if (obdService.isConnected && vehicleInfo.connected) {
                navigation.navigate('LiveMonitor', {skipConnect: true});
              } else {
                navigation.navigate('LiveMonitor');
              }
            }}
          />
          <ActionItem
            icon="finance"
            label="Mon Bilan"
            color="#E91E63"
            featureCode="mechanic_dashboard"
            onPress={() => navigation.navigate('Dashboard')}
          />
          <ActionItem
            icon="database-search"
            label="Base DTC"
            color="#607D8B"
            featureCode="dtc_library"
            onPress={() => navigation.navigate('DTCBase')}
          />
          <ActionItem
            icon="map-marker-star"
            label="Expert Carte"
            color="#F44336"
            featureCode="register_expert"
            onPress={() => setShowExpertModal(true)}
          />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Outils & Paramètres</Text>
        </View>

        <View style={styles.grid}>
          <ActionItem
            icon="shield-star-outline"
            label="Abonnements"
            color="#FBC02D"
            onPress={() => navigation.navigate('Subscriptions')}
          />
          <ActionItem
            icon="rocket-launch-outline"
            label="Nouveautés"
            color="#03A9F4"
            featureCode="upcoming_modules"
            onPress={() => navigation.navigate('UpcomingModules')}
          />
          <ActionItem
            icon="account-circle-outline"
            label="Profil"
            color="#9E9E9E"
            onPress={() => navigation.navigate('Profile')}
          />
          <ActionItem
            icon="truck-fast-outline"
            label="Remorquage"
            color="#FF5722"
            featureCode="towing_service"
            onPress={() => navigation.navigate('TowTrucks')}
          />
        </View>
      </View>
    );
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const profileData = await apiService.getCurrentUser();
      if (profileData) {
        setUser(profileData);
      }
      const notifData = await apiService.getNotifications();
      setNotifications(notifData);
    } catch (error) {
      console.error('Error refreshing GarageHome:', error);
    } finally {
      setRefreshing(false);
    }
  }, [setUser]);

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={{paddingBottom: 30}}>
        <LinearGradient
          colors={['#1976D2', '#1565C0', '#0D47A1']}
          style={styles.headerGradient}>
          <View style={styles.headerContent}>
            <View style={styles.headerTop}>
              <View>
                <Text style={styles.shopName}>
                  {user?.shop_name || 'Garagiste Expert'}
                </Text>

                {/* Ajout des notes et badges */}
                <View style={styles.ratingContainer}>
                  <Icon name="star" size={16} color="#FFD700" />
                  <Text style={styles.ratingText}>
                    {user?.average_rating > 0
                      ? user.average_rating.toFixed(1)
                      : '0.0'}
                  </Text>
                  <Text style={styles.reviewCount}>
                    ({user?.review_count || 0} avis)
                  </Text>
                </View>

                {user?.badges && user.badges.length > 0 && (
                  <View style={styles.badgeRow}>
                    {user.badges.map((badge: string, index: number) => (
                      <View key={index} style={styles.badge}>
                        <Text style={styles.badgeText}>{badge}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
              {user?.avatar ? (
                <Avatar.Image
                  size={50}
                  source={{uri: user.avatar}}
                  style={styles.avatar}
                />
              ) : (
                <Avatar.Icon
                  size={50}
                  icon="account"
                  style={styles.avatar}
                  color="#1565C0"
                />
              )}
            </View>

            {user?.is_trial && (
              <Surface style={styles.trialBanner} elevation={2}>
                <Icon name="star" size={18} color="#FFD600" />
                <Text style={styles.trialText}>
                  Premium (Essai) : {user?.trial_days_remaining || 0} jours
                </Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate('Subscriptions')}>
                  <Text style={styles.upgradeLink}>Gérer</Text>
                </TouchableOpacity>
              </Surface>
            )}
          </View>
        </LinearGradient>

        <View style={styles.mainContent}>
          {renderConnectionStatus()}
          {renderQuickActions()}
        </View>
      </ScrollView>

      <Portal>
        <Modal
          visible={showExpertModal}
          onDismiss={() => !isRegistering && setShowExpertModal(false)}
          contentContainerStyle={styles.modalContent}>
          <Text style={styles.modalTitle}>Devenir Expert sur la Carte</Text>
          <Text style={styles.modalSubtitle}>
            En vous enregistrant, les automobilistes en panne à proximité
            pourront vous trouver et vous contacter.
          </Text>

          <TextInput
            label="Vos Spécialités (ex: Expert Ford, Électricien)"
            value={specialties}
            onChangeText={setSpecialties}
            mode="outlined"
            style={styles.modalInput}
            placeholder="Séparez par des virgules"
          />

          <View style={styles.modalActions}>
            <Button
              mode="text"
              onPress={() => setShowExpertModal(false)}
              disabled={isRegistering}>
              Annuler
            </Button>
            <Button
              mode="contained"
              onPress={handleRegisterAsExpert}
              loading={isRegistering}
              disabled={isRegistering}
              style={styles.modalSubmitBtn}>
              {isRegistering ? 'Enregistrement...' : "S'enregistrer"}
            </Button>
          </View>
        </Modal>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 20 : 10,
    paddingBottom: 40,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcomeText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    fontWeight: '500',
  },
  shopName: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 0,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  ratingText: {
    color: '#FFD600',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  reviewCount: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginLeft: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    marginTop: 6,
    gap: 6,
  },
  badge: {
    backgroundColor: '#FFD600',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    color: '#000',
    fontSize: 10,
    fontWeight: 'bold',
  },
  avatar: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  trialBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginTop: 20,
    padding: 12,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  trialText: {
    color: '#fff',
    marginLeft: 8,
    flex: 1,
    fontWeight: '600',
  },
  upgradeLink: {
    color: '#FFD600',
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
  mainContent: {
    paddingHorizontal: 16,
    marginTop: -25,
  },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 24,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusInfo: {
    flex: 1,
    marginLeft: 12,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  statusSubtitle: {
    fontSize: 13,
    color: '#757575',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  statusActions: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  actionBtnPrimary: {
    backgroundColor: '#1976D2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
  },
  actionBtnOutline: {
    borderWidth: 1,
    borderColor: '#FFCDD2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
  },
  actionBtnTextPrimary: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  actionBtnTextDanger: {
    color: '#F44336',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  gridSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A237E',
  },
  seeAll: {
    color: '#1976D2',
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  gridItem: {
    width: (width - 48) / 3,
    alignItems: 'center',
    marginBottom: 20,
  },
  gridIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  gridLabel: {
    fontSize: 12,
    color: '#444',
    textAlign: 'center',
    fontWeight: '500',
  },
  gridBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#F44336',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  gridBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 4,
  },
  lockBadge: {
    position: 'absolute',
    top: -5,
    left: -5,
    backgroundColor: '#757575',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 15,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A237E',
    marginBottom: 10,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  modalInput: {
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modalSubmitBtn: {
    marginLeft: 10,
    borderRadius: 8,
  },
});
