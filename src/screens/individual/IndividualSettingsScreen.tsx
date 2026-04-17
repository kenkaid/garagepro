import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {useNavigation} from '@react-navigation/native';
import {useStore} from '../../store/useStore';

import {apiService} from '../../services/apiService';

const IndividualSettingsScreen = () => {
  const navigation = useNavigation<any>();
  const {user, setUser} = useStore();

  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Voulez-vous vraiment vous déconnecter ?',
      [
        {
          text: 'Annuler',
          style: 'cancel',
        },
        {
          text: 'Se déconnecter',
          onPress: async () => {
            await apiService.logout();
            setUser(null);
            navigation.reset({
              index: 0,
              routes: [{name: 'Welcome'}],
            });
          },
          style: 'destructive',
        },
      ],
      {cancelable: true},
    );
  };

  // États pour les paramètres IA et Bluetooth
  const [autoBluetooth, setAutoBluetooth] = useState(true);
  const [predictiveAlerts, setPredictiveAlerts] = useState(true);
  const [habitAnalysis, setHabitAnalysis] = useState(true);
  const [backgroundService, setBackgroundService] = useState(true);
  const [useKm, setUseKm] = useState(true);

  const renderSettingItem = (
    icon: string,
    title: string,
    subtitle: string,
    onPress?: () => void,
    value?: boolean,
    onValueChange?: (val: boolean) => void,
  ) => (
    <TouchableOpacity
      style={styles.item}
      onPress={onPress}
      disabled={onValueChange !== undefined}>
      <View style={styles.iconContainer}>
        <Icon name={icon} size={24} color="#1976D2" />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.itemTitle}>{title}</Text>
        <Text style={styles.itemSubtitle}>{subtitle}</Text>
      </View>
      {onValueChange !== undefined ? (
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{false: '#D1D1D1', true: '#90CAF9'}}
          thumbColor={value ? '#1976D2' : '#F4F3F4'}
        />
      ) : (
        <Icon name="chevron-right" size={24} color="#BDBDBD" />
      )}
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Mon Compte</Text>
        {renderSettingItem(
          'account-circle',
          'Profil',
          'Modifier vos informations personnelles',
          () => navigation.navigate('Profile'),
        )}
        {renderSettingItem(
          'card-account-details',
          'Abonnement',
          user?.is_trial
            ? `Essai gratuit : ${user?.trial_days_remaining || 0} jours restants`
            : `Plan actuel : ${user?.subscription_tier || 'Gratuit'}`,
          () => {
            if (user?.is_trial) {
              Alert.alert(
                'Période d\'essai active',
                'Vous profitez actuellement de toutes les fonctionnalités Premium gratuitement. Souhaitez-vous voir nos autres offres pour la suite ?',
                [
                  {text: 'Plus tard', style: 'cancel'},
                  {text: 'Voir les offres', onPress: () => navigation.navigate('Subscriptions')},
                ],
              );
            } else {
              navigation.navigate('Subscriptions');
            }
          },
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Automatisation & IA</Text>
        {renderSettingItem(
          'bluetooth-connect',
          'Bluetooth Automatique',
          'Activation intelligente lors de vos trajets',
          undefined,
          autoBluetooth,
          setAutoBluetooth,
        )}
        {renderSettingItem(
          'brain',
          'Alertes Prédictives',
          "Anticiper les pannes via l'IA",
          undefined,
          predictiveAlerts,
          setPredictiveAlerts,
        )}
        {renderSettingItem(
          'chart-timeline-variant',
          'Analyse des habitudes',
          'Optimiser la connexion selon vos horaires',
          undefined,
          habitAnalysis,
          setHabitAnalysis,
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Application</Text>
        {renderSettingItem(
          'cog-sync',
          'Service en arrière-plan',
          'Maintenir la surveillance du véhicule',
          undefined,
          backgroundService,
          setBackgroundService,
        )}
        {renderSettingItem(
          'ruler',
          'Unité de distance',
          useKm ? 'Kilomètres (km)' : 'Miles (mi)',
          undefined,
          useKm,
          setUseKm,
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.version}>OBD-CI Connect v1.2.0</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Icon
            name="logout"
            size={20}
            color="#D32F2F"
            style={styles.logoutIcon}
          />
          <Text style={styles.logoutText}>Se déconnecter</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  section: {
    backgroundColor: '#FFF',
    marginTop: 20,
    paddingHorizontal: 15,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E0E0E0',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1976D2',
    marginTop: 15,
    marginBottom: 5,
    textTransform: 'uppercase',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  iconContainer: {
    width: 40,
    alignItems: 'flex-start',
  },
  textContainer: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    color: '#212121',
    fontWeight: '500',
  },
  itemSubtitle: {
    fontSize: 12,
    color: '#757575',
    marginTop: 2,
  },
  footer: {
    padding: 30,
    alignItems: 'center',
  },
  version: {
    color: '#9E9E9E',
    fontSize: 12,
    marginBottom: 20,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#FFCDD2',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  logoutIcon: {
    marginRight: 8,
  },
  logoutText: {
    color: '#D32F2F',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default IndividualSettingsScreen;
