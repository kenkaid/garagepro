import React, {
  useState,
  useCallback,
  useLayoutEffect,
  useRef,
  useEffect,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  StatusBar,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import * as ReactNavigation from '@react-navigation/native';
const { useFocusEffect } = ReactNavigation;
import {Avatar, Surface, Card} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import ReviewModal from '../../components/ReviewModal';
import {hasFeature} from '../../utils/featureControl';
import DatePickerModal from '../../components/DatePickerModal';
import {useStore} from '../../store/useStore';
import {apiService} from '../../services/apiService';
import apiIndividualService from '../../services/individual/apiIndividualService';
import {obdService} from '../../services/obdService';
import {telemetrySyncService} from '../../services/telemetrySyncService';
import {notificationSoundService} from '../../services/NotificationSoundService';

const {width} = Dimensions.get('window');

// Import dynamique sécurisé pour LinearGradient
let LinearGradient: any;
try {
  LinearGradient = require('react-native-linear-gradient').default;
} catch (e) {
  LinearGradient = View; // Fallback
}

type OBDLiveData = {
  rpm: number | null;
  speed: number | null;
  coolantTemp: number | null;
  fuelLevel: number | null;
  throttle: number | null;
};

const PersonalDashboardScreen = ({navigation}: any) => {
  const {user} = useStore();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [bleConnected, setBleConnected] = useState(false);
  const [obdLive, setObdLive] = useState<OBDLiveData | null>(null);
  const [liveLoading, setLiveLoading] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const liveLoopRef = useRef(false);
  const notifPollingRef = useRef<any>(null);
  const isMounted = useRef(true);

  // Pour la prise de RDV avec date
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedGarage, setSelectedGarage] = useState<any>(null);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [garageToReview, setGarageToReview] = useState<any>(null);

  const reminderCount =
    dashboardData?.reminders?.filter((r: any) => !r.is_completed).length || 0;

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const refreshUnreadCount = async () => {
    try {
      const count = await apiService.getUnreadNotificationsCount('CHAT');
      if (isMounted.current) {
        setUnreadCount(count);
      }
    } catch (_) {}
  };

  const fetchDashboard = async () => {
    let lat: number | undefined;
    let lng: number | undefined;

    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          const position: any = await new Promise((resolve, reject) => {
            Geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 15000,
              maximumAge: 10000,
            });
          });
          lat = position.coords.latitude;
          lng = position.coords.longitude;
        }
      } else {
        const position: any = await new Promise((resolve, reject) => {
          Geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 10000,
          });
        });
        lat = position.coords.latitude;
        lng = position.coords.longitude;
      }
    } catch (e) {
      console.log('Location not available for dashboard', e);
    }

    try {
      const data = await apiIndividualService.getDashboardData(lat, lng);
      if (isMounted.current) {
        setDashboardData(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      if (isMounted.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  };

  // Polling du badge de notifications toutes les 15s
  useEffect(() => {
    let lastUnreadChatIds = new Set<number>();

    const poll = async () => {
      if (!user || !isMounted.current) return;
      try {
        const data = await apiService.getNotifications();
        if (!isMounted.current) return;

        const unread = data.filter((n: any) => !n.is_read);

        // On ne compte pour l'icône de message que les notifications de type CHAT
        const unreadChat = unread.filter(
          (n: any) => n.notification_type === 'CHAT',
        );
        setUnreadCount(unreadChat.length);

        const currentUnreadChatIds = unreadChat.map((n: any) => n.id);

        const hasNewChat = currentUnreadChatIds.some(
          id => !lastUnreadChatIds.has(id),
        );
        if (hasNewChat) {
          notificationSoundService.play();
        }

        lastUnreadChatIds = new Set(currentUnreadChatIds);
      } catch (error) {
        // Erreur silencieuse
      }
    };

    poll();
    notifPollingRef.current = setInterval(poll, 15000);
    return () => {
      if (notifPollingRef.current) clearInterval(notifPollingRef.current);
    };
  }, [user]);

  // Rafraîchir le badge quand l'écran reprend le focus (ex: retour du chat)
  useFocusEffect(
    useCallback(() => {
      refreshUnreadCount();
      fetchDashboard();
    }, []),
  );

  const pulse = () => {
    Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: 1.4,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const aiLoopCounterRef = useRef(0);

  const startLiveLoop = useCallback(async () => {
    liveLoopRef.current = true;
    setLiveLoading(true);
    while (liveLoopRef.current && isMounted.current && obdService.isConnected) {
      try {
        const pids = await obdService.readCommonPIDs();
        if (pids && pids.length > 0 && isMounted.current) {
          // readCommonPIDs retourne OBDData[] — on indexe par pid
          const byPid: Record<string, number> = {};
          pids.forEach(p => {
            if (typeof p.value === 'number') {
              byPid[p.pid.toUpperCase()] = p.value;
            }
          });
          const newData = {
            rpm: byPid['0C'] ?? null,
            speed: byPid['0D'] ?? null,
            coolantTemp: byPid['05'] ?? null,
            fuelLevel: byPid['2F'] ?? null,
            throttle: byPid['11'] ?? null,
          };
          setObdLive(newData);

          // Mise à jour du buffer de synchro cloud
          telemetrySyncService.updateBuffer(newData);

          pulse();

          // Analyse IA toutes les 5 lectures (environ toutes les 15 secondes)
          aiLoopCounterRef.current += 1;
          if (aiLoopCounterRef.current % 5 === 0) {
            const pidList = pids
              .filter(p => typeof p.value === 'number')
              .map(p => ({pid: p.pid, value: p.value as number, unit: p.unit || ''}));
            try {
              const result = await apiService.analyzeLive(pidList, dashboardData?.vehicle?.id, []);
              if (result && !result.__error && result.summary?.total_anomalies > 0) {
                // 🔔 Notification système 3 fois de suite
                notificationSoundService.play();
                setTimeout(() => notificationSoundService.play(), 1500);
                setTimeout(() => notificationSoundService.play(), 3000);
              }
            } catch (_) {
              // Ignore les erreurs d'analyse IA
            }
          }
        }
      } catch (e) {
        // Ignore les erreurs transitoires
      }
      if (isMounted.current) {
        setLiveLoading(false);
      }
      await new Promise(r => setTimeout(r, 3000));
    }
    liveLoopRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboardData?.vehicle?.id]);

  const stopLiveLoop = () => {
    liveLoopRef.current = false;
    setObdLive(null);
    setLiveLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      fetchDashboard();
      // Si déjà connecté BLE, démarrer le live et la synchro cloud
      if (obdService.isConnected && dashboardData?.vehicle?.id) {
        setBleConnected(true);
        startLiveLoop();
        telemetrySyncService.start(dashboardData.vehicle.id);
      }
      return () => {
        stopLiveLoop();
        telemetrySyncService.stop();
      };
    }, [startLiveLoop, dashboardData?.vehicle?.id]),
  );

  useLayoutEffect(() => {
    const canChat = hasFeature(user, 'internal_messaging');

    navigation.setOptions({
      headerLeft: null,
      headerRight: () => (
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
          {/* Liste de chat avec badge */}
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
            style={{marginRight: 20, opacity: canChat ? 1 : 0.6}}>
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
                    right: -6,
                    top: -3,
                    backgroundColor: '#FF5252',
                    borderRadius: 10,
                    minWidth: 18,
                    height: 18,
                    justifyContent: 'center',
                    alignItems: 'center',
                    paddingHorizontal: 2,
                    borderWidth: 1.5,
                    borderColor: '#1976D2',
                  }}>
                  <Text
                    style={{color: '#fff', fontSize: 10, fontWeight: 'bold'}}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
          {/* Cloche rappels entretien */}
          <TouchableOpacity
            onPress={() => navigation.navigate('MaintenanceReminders')}
            style={{marginRight: 20}}>
            <View>
              <Icon name="bell" size={24} color="#fff" />
              {reminderCount > 0 && (
                <View
                  style={{
                    position: 'absolute',
                    right: -6,
                    top: -3,
                    backgroundColor: '#FF9800',
                    borderRadius: 10,
                    width: 18,
                    height: 18,
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderWidth: 1.5,
                    borderColor: '#1976D2',
                  }}>
                  <Text
                    style={{color: '#fff', fontSize: 10, fontWeight: 'bold'}}>
                    {reminderCount}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('Settings')}
            style={{marginRight: 15}}>
            <Icon name="cog" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, unreadCount, reminderCount, user]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboard();
  };

  const handleConnectOBD = () => {
    if (bleConnected) {
      Alert.alert(
        "Déconnecter l'équipement",
        "Voulez-vous déconnecter l'équipement OBD ? La surveillance du véhicule s'arrêtera, mais la messagerie restera active.",
        [
          {text: 'Annuler', style: 'cancel'},
          {
            text: 'Déconnecter',
            style: 'destructive',
            onPress: async () => {
              try {
                stopLiveLoop();
                telemetrySyncService.stop();
                await obdService.disconnect();
                setBleConnected(false);
              } catch (e) {
                // Forcer la déconnexion même en cas d'erreur
                stopLiveLoop();
                telemetrySyncService.stop();
                setBleConnected(false);
              }
            },
          },
        ],
      );
    } else {
      navigation.navigate('Scan', {
        vehicleData: dashboardData.vehicle,
      });
    }
  };

  const handleMarkCompleted = async (id: number) => {
    try {
      await apiIndividualService.markReminderCompleted(id);
      fetchDashboard();
      Alert.alert('Succès', 'Entretien marqué comme effectué.');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de mettre à jour le rappel.');
    }
  };

  const handleTakeAppointment = (garage: any) => {
    if (!dashboardData?.vehicle) {
      Alert.alert(
        'Attention',
        "Veuillez d'abord ajouter un véhicule pour prendre rendez-vous.",
      );
      return;
    }
    setSelectedGarage(garage);
    setShowDatePicker(true);
  };

  const confirmAppointment = async (garage: any, date: Date) => {
    try {
      await apiIndividualService.createAppointment({
        mechanic: garage.id,
        appointment_date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
        reason: "Entretien suggéré par OBD Côte d'Ivoire",
        vehicle: dashboardData.vehicle.id,
      });

      Alert.alert(
        'Succès',
        `Votre rendez-vous chez ${
          garage.name
        } pour le ${date.toLocaleDateString('fr-FR')} a été enregistré.`,
      );
    } catch (error: any) {
      const msg = error?.response?.data?.error;
      if (msg) {
        Alert.alert('Rendez-vous', msg);
      }
    } finally {
      setSelectedGarage(null);
    }
  };

  const onDateConfirm = (date: Date) => {
    setShowDatePicker(false);
    if (selectedGarage) {
      confirmAppointment(selectedGarage, date);
    }
  };

  const onDateCancel = () => {
    setShowDatePicker(false);
    setSelectedGarage(null);
  };

  // Valeur carburant : priorité aux données live OBD, sinon backend
  const fuelLevel =
    obdLive?.fuelLevel ?? dashboardData?.fuel_stats?.current_level;
  const fuelRange = dashboardData?.fuel_stats?.estimated_range;
  const avgConsumption = dashboardData?.fuel_stats?.avg_consumption;
  const healthScore = dashboardData?.health_score ?? 0;

  // Estimation des économies FCFA (Phase 2)
  const estimatedSavings = avgConsumption
    ? Math.round(avgConsumption * 0.18 * 100)
    : 0;

  const renderOBDStatus = () => (
    <View style={styles.renderOBDStatus}>
      <View style={styles.statusHeader}>
        <Avatar.Icon
          size={48}
          icon={bleConnected ? 'bluetooth-connect' : 'bluetooth-off'}
          color="#fff"
          style={{
            backgroundColor: bleConnected ? '#4CAF50' : '#757575',
          }}
        />
        <View style={styles.statusInfo}>
          <Text style={styles.statusTitle}>
            {bleConnected ? 'OBD Connecté' : 'OBD Déconnecté'}
          </Text>
          <Text style={styles.statusSubtitle} numberOfLines={1}>
            {bleConnected
              ? `${dashboardData?.vehicle?.brand || ''} ${
                  dashboardData?.vehicle?.model || ''
                }`.trim()
              : 'Appuyez pour configurer la liaison'}
          </Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            {backgroundColor: bleConnected ? '#E8F5E9' : '#F5F5F5'},
          ]}>
          <View
            style={[
              styles.dot,
              {backgroundColor: bleConnected ? '#4CAF50' : '#BDBDBD'},
            ]}
          />
          <Text
            style={[
              styles.statusBadgeText,
              {color: bleConnected ? '#2E7D32' : '#616161'},
            ]}>
            {bleConnected ? 'LIVE' : 'IDLE'}
          </Text>
        </View>
      </View>

      <View style={styles.statusActions}>
        <TouchableOpacity
          style={
            bleConnected ? styles.actionBtnOutline : styles.actionBtnPrimary
          }
          onPress={handleConnectOBD}>
          <Icon
            name={bleConnected ? 'close-circle-outline' : 'plus-circle-outline'}
            size={18}
            color={bleConnected ? '#F44336' : '#fff'}
          />
          <Text
            style={
              bleConnected
                ? styles.actionBtnTextDanger
                : styles.actionBtnTextPrimary
            }>
            {bleConnected ? 'Déconnecter' : 'Nouvelle Connexion'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const ServiceItem = ({
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

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1976D2" />
        <Text style={{marginTop: 10}}>Chargement de vos données...</Text>
      </View>
    );
  }

  if (!dashboardData?.has_vehicle) {
    return (
      <View style={styles.center}>
        <Icon name="car-off" size={80} color="#ccc" />
        <Text style={styles.title}>Bienvenue !</Text>
        <Text style={styles.subtitle}>
          Vous n'avez pas encore de véhicule associé à votre compte.
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('AddVehicle')}>
          <Text style={styles.buttonText}>Ajouter mon véhicule</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{flex: 1, backgroundColor: '#f8f9fa'}}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        style={{flex: 1}}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }>
        {/* Header Premium avec dégradé */}
        <LinearGradient
          colors={['#1976D2', '#1565C0']}
          style={styles.premiumHeader}>
          <View style={styles.headerContent}>
            <View style={styles.userInfo}>
              <Avatar.Text
                size={50}
                label={`${user?.first_name?.[0] || 'U'}${
                  user?.last_name?.[0] || ''
                }`}
                style={styles.avatar}
                labelStyle={{color: '#1976D2', fontWeight: 'bold'}}
              />
              <View style={styles.userNameContainer}>
                <Text style={styles.welcomeText}>Bonjour,</Text>
                <Text style={styles.userName}>
                  {user?.first_name || 'Utilisateur'}
                </Text>
              </View>
            </View>

            {/* Carte de Santé Flottante */}
            <Surface style={styles.floatingHealthCard} elevation={4}>
              <View style={styles.healthInfo}>
                <View>
                  <Text style={styles.healthLabel}>SANTÉ VÉHICULE</Text>
                  <Text style={styles.healthValue}>{healthScore}%</Text>
                </View>
                <View style={styles.healthStatus}>
                  <Icon
                    name={
                      healthScore > 80
                        ? 'check-decagram'
                        : healthScore > 50
                        ? 'alert-decagram'
                        : 'alert-octagon'
                    }
                    size={24}
                    color={
                      healthScore > 80
                        ? '#4CAF50'
                        : healthScore > 50
                        ? '#FF9800'
                        : '#F44336'
                    }
                  />
                  <Text
                    style={[
                      styles.healthStatusText,
                      {
                        color:
                          healthScore > 80
                            ? '#4CAF50'
                            : healthScore > 50
                            ? '#FF9800'
                            : '#F44336',
                      },
                    ]}>
                    {healthScore > 80
                      ? 'Optimal'
                      : healthScore > 50
                      ? 'À suivre'
                      : 'Urgent'}
                  </Text>
                </View>
              </View>
              <View style={styles.vehicleBriefRow}>
                <View style={styles.vehicleBrief}>
                  <Icon name="car" size={14} color="#666" />
                  <Text style={styles.vehicleBriefText}>
                    {dashboardData.vehicle.brand} {dashboardData.vehicle.model} •{' '}
                    {dashboardData.vehicle.license_plate}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.editVehicleBtn}
                  onPress={() =>
                    navigation.navigate('EditVehicle', {
                      vehicle: dashboardData.vehicle,
                    })
                  }>
                  <Icon name="pencil" size={16} color="#1976D2" />
                </TouchableOpacity>
              </View>
            </Surface>
          </View>
        </LinearGradient>

        <View style={styles.content}>
          {/* État OBD */}
          {renderOBDStatus()}

          {/* Widgets de Télémétrie */}
          <View style={styles.statsRow}>
            <Surface style={styles.statCard} elevation={1}>
              <View style={styles.statIconCircle}>
                <Icon name="fuel" size={20} color="#1976D2" />
              </View>
              <Text style={styles.statCardLabel}>CARBURANT</Text>
              <Text style={styles.statCardValue}>
                {fuelLevel !== null && fuelLevel !== undefined
                  ? `${Math.round(fuelLevel)}%`
                  : '--'}
              </Text>
              {fuelRange !== null && fuelRange !== undefined && (
                <Text style={styles.statCardSub}>
                  {typeof fuelRange === 'number'
                    ? fuelRange.toFixed(2)
                    : fuelRange}{' '}
                  km restants
                </Text>
              )}
            </Surface>

            <Surface style={styles.statCard} elevation={1}>
              <View style={styles.statIconCircle}>
                <Icon name="chart-bell-curve" size={20} color="#4CAF50" />
              </View>
              <Text style={styles.statCardLabel}>CONSOMMATION</Text>
              <Text style={styles.statCardValue}>
                {avgConsumption !== null && avgConsumption !== undefined
                  ? avgConsumption.toFixed(2)
                  : '--'}
              </Text>
              <Text style={styles.statCardSub}>L/100km (Moy.)</Text>
            </Surface>
          </View>

          {/* Grille de Services */}
          <View style={styles.gridSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Mes Services</Text>
            </View>
            <View style={styles.grid}>
              <ServiceItem
                icon="magnify-scan"
                label="Scanner"
                color="#2196F3"
                featureCode="scan_diagnostic"
                onPress={() => navigation.navigate('Scan')}
              />
              <ServiceItem
                icon="file-certificate-outline"
                label="Expertise"
                color="#4CAF50"
                featureCode="expertise_report"
                onPress={() =>
                  navigation.navigate('Expertise', {
                    vehicle: dashboardData.vehicle,
                  })
                }
              />
              <ServiceItem
                icon="calendar-clock"
                label="Rendez-vous"
                color="#FF5722"
                featureCode="appointment_booking"
                onPress={() => navigation.navigate('Appointments')}
              />
              <ServiceItem
                icon="map-marker-path"
                label="Trajets"
                color="#9C27B0"
                featureCode="trip_history"
                onPress={() => navigation.navigate('Trips')}
              />
              <ServiceItem
                icon="bell-ring-outline"
                label="Entretiens"
                color="#FF9800"
                featureCode="maintenance_reminders"
                badge={
                  dashboardData?.reminders?.filter((r: any) => !r.is_completed)
                    .length || 0
                }
                onPress={() => navigation.navigate('MaintenanceReminders')}
              />
              <ServiceItem
                icon="shield-star-outline"
                label="Abonnement"
                color="#E91E63"
                onPress={() => navigation.navigate('Subscriptions')}
              />
              <ServiceItem
                icon="truck-fast-outline"
                label="Remorquage"
                color="#F44336"
                featureCode="towing_service"
                onPress={() => navigation.navigate('TowTrucks')}
              />
              <ServiceItem
                icon="rocket-launch-outline"
                label="Nouveautés"
                color="#00BCD4"
                featureCode="upcoming_modules"
                onPress={() => navigation.navigate('UpcomingModules')}
              />
              <ServiceItem
                icon="chart-line"
                label="Live Data"
                color="#7C4DFF"
                featureCode="live_monitor"
                onPress={() => navigation.navigate('LiveData')}
              />
            </View>
          </View>

          {/* Alertes de maintenance */}
          <View style={styles.alertSection}>
            <Text style={styles.sectionTitle}>Alertes & Diagnostics</Text>
            {dashboardData.active_alerts.length === 0 ? (
              <Surface style={styles.emptyAlertSurface} elevation={1}>
                <Icon name="check-circle" size={24} color="#4CAF50" />
                <Text style={styles.emptyAlertText}>
                  Aucune anomalie détectée sur votre véhicule.
                </Text>
              </Surface>
            ) : (
              dashboardData.active_alerts.map((alert: any) => (
                <Card key={alert.id} style={styles.alertCardPaper}>
                  <Card.Content style={styles.alertCardContent}>
                    <Icon name="alert-decagram" size={24} color="#F44336" />
                    <View style={styles.alertTextContainer}>
                      <Text style={styles.alertTitle}>
                        {alert.alert_type_display}
                      </Text>
                      <Text style={styles.alertDescription}>
                        {alert.message}
                      </Text>
                    </View>
                  </Card.Content>
                </Card>
              ))
            )}
          </View>

          {/* Éco-Conduite */}
          <Card style={styles.ecoCardPremium}>
            <Card.Content>
              <View style={styles.ecoHeaderRow}>
                <View>
                  <Text style={styles.ecoTitlePremium}>Eco-Conduite</Text>
                  <Text style={styles.ecoSubPremium}>
                    Votre indice d'économie réelle
                  </Text>
                </View>
                <Surface style={styles.ecoBadgePremium} elevation={2}>
                  <Icon name="leaf" size={16} color="#fff" />
                  <Text style={styles.ecoBadgeText}>
                    {obdLive?.rpm && obdLive.rpm > 3000 ? 'Élevée' : 'Optimale'}
                  </Text>
                </Surface>
              </View>
              <Text style={styles.ecoTipPremium}>
                {obdLive?.rpm && obdLive.rpm > 3000
                  ? 'Pensez à passer la vitesse supérieure pour réduire votre consommation.'
                  : 'Bravo ! Votre style de conduite actuel est économe.'}
              </Text>
              <TouchableOpacity
                style={styles.ecoButtonPremium}
                onPress={() =>
                  Alert.alert(
                    'Économies',
                    `Vous économisez environ ${
                      estimatedSavings || 1000
                    } FCFA par semaine grâce à votre conduite.`,
                  )
                }>
                <Text style={styles.ecoButtonText}>Voir mes gains en FCFA</Text>
                <Icon name="chevron-right" size={20} color="#2E7D32" />
              </TouchableOpacity>
            </Card.Content>
          </Card>

          {/* Garages à proximité */}
          <View style={styles.nearbySectionPremium}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                Garages à proximité
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('NearbyGarages')}>
                <Text style={styles.seeAllText}>Voir tout</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.nearbyScrollContent}>
              {dashboardData.nearby_garages?.map((garage: any) => (
                <Surface
                  key={garage.id}
                  style={styles.garageCard}
                  elevation={1}>
                  <View style={styles.garageIconBg}>
                    <Icon
                      name={garage.is_certified ? 'shield-check' : 'wrench'}
                      size={24}
                      color={garage.is_certified ? '#4CAF50' : '#1976D2'}
                    />
                  </View>
                  <Text style={styles.garageName} numberOfLines={1}>
                    {garage.shop_name || garage.name}
                  </Text>
                  <View style={styles.garageRatingRow}>
                    <Icon name="star" size={12} color="#FFD700" />
                    <Text style={styles.garageRatingText}>
                      {garage.average_rating > 0 ? garage.average_rating.toFixed(1) : 'N/A'}
                    </Text>
                  </View>
                  {garage.specialties && (
                    <Text style={styles.garageSpecs} numberOfLines={1}>
                      {garage.specialties}
                    </Text>
                  )}
                  {/* Ajout des badges */}
                  {garage.badges && garage.badges.length > 0 && (
                    <View style={styles.dashboardBadgeRow}>
                      {garage.badges.map((badge: string, index: number) => (
                        <View key={index} style={styles.dashboardBadge}>
                          <Text style={styles.dashboardBadgeText}>{badge}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                  <Text style={styles.garageDist}>{garage.distance}</Text>
                  <View style={styles.garageActionRow}>
                    <TouchableOpacity
                      style={styles.garageBtn}
                      onPress={() => handleTakeAppointment(garage)}>
                      <Text style={styles.garageBtnText}>RDV</Text>
                    </TouchableOpacity>
                    {(garage.notifiable_scan_id ||
                      garage.notifiable_appointment_id) && (
                      <TouchableOpacity
                        style={styles.garageReviewBtn}
                        onPress={() => {
                          setGarageToReview(garage);
                          setReviewModalVisible(true);
                        }}>
                        <Icon name="star-plus-outline" size={18} color="#FF9800" />
                      </TouchableOpacity>
                    )}
                  </View>
                </Surface>
              ))}
            </ScrollView>
          </View>

          {/* SOS Remorquage */}
          <View style={{height: 100}} />
        </View>
      </ScrollView>

      <DatePickerModal
        visible={showDatePicker}
        title={`📅 RDV chez ${selectedGarage?.shop_name || selectedGarage?.name || ''}`}
        onConfirm={onDateConfirm}
        onCancel={onDateCancel}
        minimumDate={new Date()}
      />

      {garageToReview && (
        <ReviewModal
          visible={reviewModalVisible}
          onClose={() => setReviewModalVisible(false)}
          mechanicId={garageToReview.id}
          mechanicName={garageToReview.shop_name || garageToReview.name}
          scanSessionId={garageToReview.notifiable_scan_id}
          appointmentId={garageToReview.notifiable_appointment_id}
          onSuccess={() => {
            fetchDashboard(); // Refresh to show new rating
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  renderOBDStatus: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 10},
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 3,
  },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 18,
    marginBottom: 24,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusInfo: {
    flex: 1,
    marginLeft: 15,
  },
  statusTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#1A1C1E',
  },
  statusSubtitle: {
    fontSize: 13,
    color: '#6C757D',
    marginTop: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusActions: {
    marginTop: 18,
    flexDirection: 'row',
    gap: 12,
  },
  actionBtnPrimary: {
    flex: 1,
    backgroundColor: '#1976D2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
  },
  actionBtnOutline: {
    flex: 1,
    backgroundColor: '#FFF5F5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FFE3E3',
    gap: 8,
  },
  actionBtnTextPrimary: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  actionBtnTextDanger: {
    color: '#F44336',
    fontWeight: 'bold',
    fontSize: 14,
  },
  premiumHeader: {
    paddingTop: 20,
    paddingBottom: 45,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  headerContent: {
    paddingHorizontal: 24,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
  },
  avatar: {
    backgroundColor: '#fff',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  userNameContainer: {
    marginLeft: 15,
  },
  welcomeText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  floatingHealthCard: {
    backgroundColor: '#fff',
    borderRadius: 28,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 15},
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  healthInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  healthLabel: {
    fontSize: 11,
    color: '#6C757D',
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  healthValue: {
    fontSize: 32,
    fontWeight: '900',
    color: '#1A1C1E',
    marginTop: 2,
  },
  healthStatus: {
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 18,
  },
  healthStatusText: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 4,
  },
  vehicleBriefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  vehicleBrief: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F3F5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    flex: 1,
    marginRight: 10,
  },
  editVehicleBtn: {
    backgroundColor: '#E3F2FD',
    padding: 8,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  vehicleBriefText: {
    fontSize: 13,
    color: '#495057',
    marginLeft: 8,
    fontWeight: '500',
  },
  content: {
    paddingHorizontal: 20,
    marginTop: -30,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    backgroundColor: '#fff',
    width: (width - 52) / 2,
    padding: 20,
    borderRadius: 24,
    alignItems: 'center',
  },
  statIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statCardLabel: {
    fontSize: 10,
    color: '#6C757D',
    fontWeight: 'bold',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  statCardValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1A1C1E',
  },
  statCardSub: {
    fontSize: 11,
    color: '#ADB5BD',
    marginTop: 4,
    fontWeight: '500',
  },
  gridSection: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A1C1E',
  },
  seeAllText: {
    fontSize: 14,
    color: '#1976D2',
    fontWeight: 'bold',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  gridItem: {
    width: (width - 64) / 3,
    alignItems: 'center',
    marginBottom: 15,
  },
  gridIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  gridLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#495057',
    textAlign: 'center',
  },
  gridBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#FF5252',
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  gridBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
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
  alertSection: {
    marginBottom: 20,
  },
  emptyAlertSurface: {
    backgroundColor: '#F0FFF4',
    padding: 10,
    marginTop: 10,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  emptyAlertText: {
    fontSize: 13,
    color: '#166534',
    marginLeft: 12,
    fontWeight: '500',
    flex: 1,
  },
  alertCardPaper: {
    borderRadius: 20,
    marginBottom: 12,
    backgroundColor: '#FFF5F5',
    elevation: 0,
    borderWidth: 1,
    borderColor: '#FFE3E3',
  },
  alertCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  alertTextContainer: {
    marginLeft: 15,
    flex: 1,
  },
  alertTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#C53030',
  },
  alertDescription: {
    fontSize: 13,
    color: '#742727',
    marginTop: 2,
    lineHeight: 18,
  },
  ecoCardPremium: {
    borderRadius: 28,
    backgroundColor: '#E6FFFA',
    marginBottom: 28,
    elevation: 0,
    borderWidth: 1,
    borderColor: '#B2F5EA',
  },
  ecoHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  ecoTitlePremium: {
    fontSize: 18,
    fontWeight: '800',
    color: '#234E52',
  },
  ecoSubPremium: {
    fontSize: 12,
    color: '#2C7A7B',
    marginTop: 2,
  },
  ecoBadgePremium: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#38B2AC',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  ecoBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  ecoTipPremium: {
    fontSize: 14,
    color: '#285E61',
    lineHeight: 20,
    fontWeight: '500',
    marginBottom: 18,
  },
  ecoButtonPremium: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.6)',
    padding: 14,
    borderRadius: 16,
  },
  ecoButtonText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#234E52',
  },
  nearbySectionPremium: {
    marginBottom: 30,
  },
  nearbyScrollContent: {
    paddingRight: 20,
    gap: 15,
  },
  garageCard: {
    backgroundColor: '#fff',
    width: 140,
    padding: 8,
    marginBottom: 8,
    borderRadius: 24,
    alignItems: 'center',
  },
  garageIconBg: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  garageName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1A1C1E',
    textAlign: 'center',
  },
  garageRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  garageRatingText: {
    fontSize: 11,
    color: '#666',
    marginLeft: 2,
  },
  garageDist: {
    fontSize: 11,
    color: '#6C757D',
    marginTop: 2,
    fontWeight: '500',
  },
  dashboardBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  dashboardBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 4,
    marginBottom: 2,
  },
  dashboardBadgeText: {
    fontSize: 9,
    color: '#1976D2',
    fontWeight: 'bold',
  },
  garageSpecs: {
    fontSize: 9,
    color: '#1976D2',
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 2,
  },
  garageBtn: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    flex: 1,
    marginRight: 6,
  },
  garageBtnText: {
    color: '#1976D2',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  garageActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    width: '100%',
    paddingHorizontal: 8,
  },
  garageReviewBtn: {
    backgroundColor: '#FFF8E1',
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFECB3',
  },
  sosButtonPremium: {
    marginBottom: 0,
  },
  sosGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 20,
    gap: 12,
    shadowColor: '#F44336',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  sosText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F8F9FA',
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: '#1A1C1E',
    marginTop: 20,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#6C757D',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 22,
    paddingHorizontal: 30,
  },
  button: {
    backgroundColor: '#1976D2',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 20,
    marginTop: 30,
    shadowColor: '#1976D2',
    shadowOffset: {width: 0, height: 10},
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default PersonalDashboardScreen;
