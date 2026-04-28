import React from 'react';
import {createStackNavigator} from '@react-navigation/stack';
import PersonalDashboardScreen from '../screens/individual/PersonalDashboardScreen';
import AddPersonalVehicleScreen from '../screens/individual/AddPersonalVehicleScreen';
import EditVehicleScreen from '../screens/individual/EditVehicleScreen';
import IndividualSettingsScreen from '../screens/individual/IndividualSettingsScreen';
import {ProfileScreen} from '../screens/shared/ProfileScreen';
import {SubscriptionScreen} from '../screens/shared/SubscriptionScreen';
import {UpcomingModulesScreen} from '../screens/shared/UpcomingModulesScreen';
import {ExpertiseScreen} from '../screens/individual/ExpertiseScreen';
import {ScanScreen} from '../screens/individual/ScanScreen';
import {ResultsScreen} from '../screens/individual/ResultsScreen';
import {ExpertResultsScreen} from '../screens/individual/ExpertResultsScreen';
import TripsScreen from '../screens/individual/TripsScreen';
import {NearbyGaragesScreen} from '../screens/individual/NearbyGaragesScreen';
import MaintenanceRemindersScreen from '../screens/individual/MaintenanceRemindersScreen';
import {ChatScreen} from '../screens/shared/ChatScreen';
import {ChatDetailScreen} from '../screens/shared/ChatDetailScreen';
import {AppointmentsScreen} from '../screens/shared/AppointmentsScreen';
import IndividualNotificationsScreen from '../screens/individual/IndividualNotificationsScreen';

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
      name="EditVehicle"
      component={EditVehicleScreen}
      options={{title: 'Modifier le Véhicule'}}
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
      name="Scan"
      component={ScanScreen}
      options={{title: 'Connexion OBD'}}
    />
    <Stack.Screen
      name="Results"
      component={ResultsScreen}
      options={{title: 'Résultats'}}
    />
    <Stack.Screen
      name="ExpertResults"
      component={ExpertResultsScreen}
      options={{title: 'Rapport Expertise'}}
    />
    <Stack.Screen
      name="UpcomingModules"
      component={UpcomingModulesScreen}
      options={{title: 'Modules à venir'}}
    />
    <Stack.Screen
      name="Trips"
      component={TripsScreen}
      options={{title: 'Mes Trajets'}}
    />
    <Stack.Screen
      name="NearbyGarages"
      component={NearbyGaragesScreen}
      options={{title: 'Garages à proximité'}}
    />
    <Stack.Screen
      name="MaintenanceReminders"
      component={MaintenanceRemindersScreen}
      options={{title: 'Rappels Importants'}}
    />
    <Stack.Screen
      name="Chat"
      component={ChatScreen}
      options={{title: 'Mes Messages'}}
    />
    <Stack.Screen
      name="ChatDetail"
      component={ChatDetailScreen}
      options={({route}) => ({title: (route.params as any)?.title || 'Discussion'})}
    />
    <Stack.Screen
      name="Notifications"
      component={IndividualNotificationsScreen}
      options={{title: 'Mes Notifications'}}
    />
    <Stack.Screen
      name="Appointments"
      component={AppointmentsScreen}
      options={{title: 'Mes Rendez-vous'}}
    />
  </Stack.Navigator>
);
