import React from 'react';
import {createStackNavigator} from '@react-navigation/stack';
import PersonalDashboardScreen from '../screens/individual/PersonalDashboardScreen';
import AddPersonalVehicleScreen from '../screens/individual/AddPersonalVehicleScreen';
import IndividualSettingsScreen from '../screens/individual/IndividualSettingsScreen';
import {ProfileScreen} from '../screens/shared/ProfileScreen';
import {SubscriptionScreen} from '../screens/shared/SubscriptionScreen';
import {UpcomingModulesScreen} from '../screens/shared/UpcomingModulesScreen';
import {ExpertiseScreen} from '../screens/garage/ExpertiseScreen';

const Stack = createStackNavigator();

export const IndividualNavigator = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: {backgroundColor: '#1976D2'},
      headerTintColor: '#fff',
      headerTitleStyle: {fontWeight: 'bold'},
    }}>
    <Stack.Screen
      name="IndividualHome"
      component={PersonalDashboardScreen}
      options={{title: 'Mon Véhicule'}}
    />
    <Stack.Screen
      name="AddVehicle"
      component={AddPersonalVehicleScreen}
      options={{title: 'Ajouter un Véhicule'}}
    />
    <Stack.Screen
      name="Profile"
      component={ProfileScreen}
      options={{title: 'Mon Profil'}}
    />
    <Stack.Screen
      name="Settings"
      component={IndividualSettingsScreen}
      options={{title: 'Paramètres'}}
    />
    <Stack.Screen
      name="Subscriptions"
      component={SubscriptionScreen}
      options={{title: 'Mes Abonnements'}}
    />
    <Stack.Screen
      name="Expertise"
      component={ExpertiseScreen}
      options={{title: 'Expertise Occasion'}}
    />
    <Stack.Screen
      name="UpcomingModules"
      component={UpcomingModulesScreen}
      options={{title: 'Modules à venir'}}
    />
  </Stack.Navigator>
);
