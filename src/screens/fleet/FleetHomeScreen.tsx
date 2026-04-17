import React, {useEffect} from 'react';
import {View, ScrollView, TouchableOpacity, Text, Alert} from 'react-native';
import {Avatar} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {useStore} from '../../store/useStore.ts';
import {apiService} from '../../services/apiService.ts';
import {FleetStyles} from '../../styles/fleetTheme.ts';

export const FleetHomeScreen: React.FC<{navigation: any}> = ({navigation}) => {
  const {user, vehicleInfo, setCurrentScreen, setUser, setConnectedDevice} =
    useStore();

  useEffect(() => {
    setCurrentScreen('home');

    const loadProfile = async () => {
      if (!user || !user.first_name || user.user_type !== 'FLEET_OWNER') {
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
    <View style={FleetStyles.statusCard}>
      <View style={FleetStyles.statusRow}>
        <Avatar.Icon
          size={50}
          icon={vehicleInfo.connected ? 'check-circle' : 'monitor-dashboard'}
          color="#fff"
          style={
            vehicleInfo.connected
              ? FleetStyles.statusIconAvatarConnected
              : FleetStyles.statusIconAvatar
          }
        />
        <View style={FleetStyles.statusInfo}>
          <Text style={FleetStyles.statusTitle}>
            {vehicleInfo.connected
              ? 'Connecté au véhicule'
              : 'Mode Surveillance'}
          </Text>
          <Text style={FleetStyles.statusSubtitle}>
            {vehicleInfo.connected
              ? `${vehicleInfo.licensePlate || ''} ${vehicleInfo.brand || ''} ${
                  vehicleInfo.model || ''
                }`.trim()
              : 'Suivez vos véhicules en temps réel'}
          </Text>
        </View>
      </View>

      {vehicleInfo.connected ? (
        <TouchableOpacity
          style={FleetStyles.disconnectButton}
          onPress={handleDisconnect}>
          <Icon name="bluetooth-off" size={20} color="#F44336" />
          <Text style={FleetStyles.disconnectButtonText}>Déconnecter</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={FleetStyles.actionButton}
          onPress={() => navigation.navigate('FleetDashboard')}>
          <Icon name="view-dashboard-outline" size={20} color="#fff" />
          <Text style={FleetStyles.buttonText}>Voir ma flotte</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderQuickActions = () => (
    <View style={FleetStyles.grid}>
      <TouchableOpacity
        style={FleetStyles.menuItem}
        onPress={() => navigation.navigate('FleetDashboard')}>
        <View style={FleetStyles.menuIconContainer}>
          <Icon name="truck-delivery-outline" size={32} color="#004BA0" />
        </View>
        <Text style={FleetStyles.menuLabel}>Ma Flotte</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={FleetStyles.menuItem}
        onPress={() => navigation.navigate('FleetHistory')}>
        <View style={FleetStyles.menuIconContainer}>
          <Icon name="clipboard-text-clock-outline" size={32} color="#004BA0" />
        </View>
        <Text style={FleetStyles.menuLabel}>Journal de bord</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={FleetStyles.menuItem}
        onPress={() => navigation.navigate('FleetPrediction')}>
        <View style={FleetStyles.menuIconContainerPrediction}>
          <Icon name="crystal-ball" size={32} color="#3F51B5" />
        </View>
        <Text style={FleetStyles.menuLabel}>Prédictions Pannes</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={FleetStyles.menuItem}
        onPress={() => navigation.navigate('Expertise')}>
        <View style={FleetStyles.menuIconContainerExpertise}>
          <Icon name="shield-check-outline" size={32} color="#4CAF50" />
        </View>
        <Text style={FleetStyles.menuLabel}>Expertise Occasion</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={FleetStyles.menuItem}
        onPress={() => {
          if (user?.is_trial) {
            Alert.alert(
              'Période d\'essai active',
              'Vous profitez actuellement de toutes les fonctionnalités Premium gratuitement. Souhaitez-vous voir nos autres offres pour la suite ?',
              [
                {text: 'Plus tard', style: 'cancel'},
                {text: 'Voir les offres', onPress: () => navigation.navigate('FleetSubscriptions')},
              ],
            );
          } else {
            navigation.navigate('FleetSubscriptions');
          }
        }}>
        <View style={FleetStyles.menuIconContainerSubscriptions}>
          <Icon name="star-outline" size={32} color="#FBC02D" />
        </View>
        <Text style={FleetStyles.menuLabel}>Offres Flotte</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={FleetStyles.menuItem}
        onPress={() => navigation.navigate('UpcomingModules')}>
        <View style={FleetStyles.menuIconContainer}>
          <Icon name="robot-outline" size={32} color="#004BA0" />
        </View>
        <Text style={FleetStyles.menuLabel}>Modules IA</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={FleetStyles.menuItem}
        onPress={() => navigation.navigate('Profile')}>
        <View style={FleetStyles.menuIconContainer}>
          <Icon name="account-cog-outline" size={32} color="#004BA0" />
        </View>
        <Text style={FleetStyles.menuLabel}>Mon Compte</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <ScrollView style={FleetStyles.container}>
      <View style={FleetStyles.header}>
        <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
          <View style={{flex: 1}}>
            <Text style={FleetStyles.welcomeText}>
              Bonjour, {user?.first_name || 'Propriétaire'}
            </Text>
            <Text style={FleetStyles.shopName}>
              {user?.shop_name || 'Ma Flotte'}
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
              onPress={() => navigation.navigate('FleetSubscriptions')}
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
      <View style={FleetStyles.footerSpacer} />
    </ScrollView>
  );
};
