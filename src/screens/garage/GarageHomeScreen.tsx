import React, {useEffect} from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Text,
  Alert,
} from 'react-native';
import {Avatar} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {useStore} from '../../store/useStore';
import {apiService} from '../../services/apiService';
import {GarageStyles} from '../../styles/garageTheme';

export const GarageHomeScreen: React.FC<{navigation: any}> = ({navigation}) => {
  const {
    user,
    unreadScansCount,
    vehicleInfo,
    setCurrentScreen,
    setUser,
    setConnectedDevice,
  } = useStore();

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

    loadProfile();
  }, [setCurrentScreen, user, setUser]);

  const handleDisconnect = async () => {
    setConnectedDevice(null);
  };

  const renderConnectionStatus = () => (
    <View style={GarageStyles.statusCard}>
      <View style={GarageStyles.statusRow}>
        <Avatar.Icon
          size={50}
          icon={vehicleInfo.connected ? 'check-circle' : 'close-circle'}
          color="#fff"
          style={{
            backgroundColor: vehicleInfo.connected ? '#4CAF50' : '#F44336',
          }}
        />
        <View style={GarageStyles.statusInfo}>
          <Text style={GarageStyles.statusTitle}>
            {vehicleInfo.connected ? 'Véhicule Connecté' : 'Non Connecté'}
          </Text>
          <Text style={GarageStyles.statusSubtitle}>
            {vehicleInfo.connected
              ? `${vehicleInfo.brand || ''} ${vehicleInfo.model || ''} (${vehicleInfo.protocol || 'Auto'})`.trim()
              : 'Adaptateur OBD non détecté'}
          </Text>
        </View>
      </View>

      {vehicleInfo.connected ? (
        <TouchableOpacity style={GarageStyles.disconnectButton} onPress={handleDisconnect}>
          <Icon name="bluetooth-off" size={20} color="#F44336" />
          <Text style={[GarageStyles.buttonText, {color: '#F44336'}]}>Déconnecter</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={GarageStyles.connectButton} onPress={() => navigation.navigate('Scan')}>
          <Icon name="bluetooth-connect" size={20} color="#fff" />
          <Text style={GarageStyles.buttonText}>Connecter OBD</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderQuickActions = () => {
    return (
      <View style={GarageStyles.grid}>
        <TouchableOpacity style={GarageStyles.menuItem} onPress={() => navigation.navigate('Scan')}>
          <View style={GarageStyles.menuIconContainer}>
            <Icon name="magnify" size={32} color="#1976D2" />
          </View>
          <Text style={GarageStyles.menuLabel}>Diagnostic</Text>
        </TouchableOpacity>

        <TouchableOpacity style={GarageStyles.menuItem} onPress={() => navigation.navigate('History')}>
          <View style={GarageStyles.menuIconContainer}>
            <Icon name="clipboard-text-outline" size={32} color="#1976D2" />
          </View>
          <Text style={GarageStyles.menuLabel}>Historique</Text>
          {unreadScansCount > 0 && (
            <View style={GarageStyles.badge}>
              <Text style={GarageStyles.badgeText}>{unreadScansCount}</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={GarageStyles.menuItem} onPress={() => navigation.navigate('Expertise')}>
          <View style={[GarageStyles.menuIconContainer, {backgroundColor: '#E8F5E9'}]}>
            <Icon name="shield-check-outline" size={32} color="#4CAF50" />
          </View>
          <Text style={GarageStyles.menuLabel}>Expertise Occasion</Text>
        </TouchableOpacity>

        <TouchableOpacity style={GarageStyles.menuItem} onPress={() => navigation.navigate('LiveMonitor')}>
          <View style={GarageStyles.menuIconContainer}>
            <Icon name="pulse" size={32} color="#1976D2" />
          </View>
          <Text style={GarageStyles.menuLabel}>Live Monitor</Text>
        </TouchableOpacity>

        <TouchableOpacity style={GarageStyles.menuItem} onPress={() => navigation.navigate('Dashboard')}>
          <View style={GarageStyles.menuIconContainer}>
            <Icon name="chart-bar" size={32} color="#1976D2" />
          </View>
          <Text style={GarageStyles.menuLabel}>Bilan Financier</Text>
        </TouchableOpacity>

        <TouchableOpacity style={GarageStyles.menuItem} onPress={() => navigation.navigate('DTCBase')}>
          <View style={GarageStyles.menuIconContainer}>
            <Icon name="book-open-variant" size={32} color="#1976D2" />
          </View>
          <Text style={GarageStyles.menuLabel}>Base DTC</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={GarageStyles.menuItem} 
          onPress={() => {
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
          }}
        >
          <View style={[GarageStyles.menuIconContainer, {backgroundColor: '#FFF9C4'}]}>
            <Icon name="star-outline" size={32} color="#FBC02D" />
          </View>
          <Text style={GarageStyles.menuLabel}>Nos Offres</Text>
        </TouchableOpacity>

        <TouchableOpacity style={GarageStyles.menuItem} onPress={() => navigation.navigate('UpcomingModules')}>
          <View style={[GarageStyles.menuIconContainer, {backgroundColor: '#E3F2FD'}]}>
            <Icon name="rocket-launch-outline" size={32} color="#2196F3" />
          </View>
          <Text style={GarageStyles.menuLabel}>Modules à venir</Text>
        </TouchableOpacity>

        <TouchableOpacity style={GarageStyles.menuItem} onPress={() => navigation.navigate('Profile')}>
          <View style={GarageStyles.menuIconContainer}>
            <Icon name="account-cog-outline" size={32} color="#1976D2" />
          </View>
          <Text style={GarageStyles.menuLabel}>Mon Compte</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <ScrollView style={GarageStyles.container}>
      <View style={GarageStyles.header}>
        <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
          <View style={{flex: 1}}>
            <Text style={GarageStyles.welcomeText}>
              Bonjour, {user?.first_name || user?.username || 'Mécanicien'}
            </Text>
            <Text style={GarageStyles.shopName}>
              {user?.shop_name || 'Garagiste Pro'}
            </Text>
          </View>
          {user?.is_trial && (
            <TouchableOpacity 
              style={{
                backgroundColor: '#FFF3E0',
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 20,
                flexDirection: 'row',
                alignItems: 'center',
                borderWidth: 1,
                borderColor: '#FF9800'
              }}
              onPress={() => navigation.navigate('Subscriptions')}
            >
              <Icon name="clock-outline" size={16} color="#E65100" style={{marginRight: 4}} />
              <Text style={{color: '#E65100', fontWeight: 'bold', fontSize: 12}}>
                ESSAI : {user?.trial_days_remaining || 0}j restants
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {renderConnectionStatus()}
      {renderQuickActions()}
      <View style={{height: 20}} />
    </ScrollView>
  );
};
