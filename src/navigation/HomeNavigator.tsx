import React from 'react';
import {View, ActivityIndicator} from 'react-native';
import {useStore} from '../store/useStore';
import {FleetNavigator} from './FleetNavigator';
import {ProNavigator} from './ProNavigator';
import {IndividualNavigator} from './IndividualNavigator';

export const HomeNavigator: React.FC = () => {
  const {user} = useStore();

  if (!user) {
    return (
      // eslint-disable-next-line react-native/no-inline-styles
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
        <ActivityIndicator size="large" color="#1976D2" />
      </View>
    );
  }

  // Logique explicite par type
  switch (user.user_type) {
    case 'FLEET_OWNER':
      return <FleetNavigator />;

    case 'INDIVIDUAL':
      return <IndividualNavigator />;

    case 'MECHANIC':
      return <ProNavigator />;

    default:
      // Cas de secours si le type est inconnu
      return <ProNavigator />;
  }
};
