import React from 'react';
import {createStackNavigator} from '@react-navigation/stack';
import {GarageHomeScreen} from '../screens/garage/GarageHomeScreen';
import {ScanScreen} from '../screens/garage/ScanScreen';
import {ResultsScreen} from '../screens/garage/ResultsScreen';
import {ExpertResultsScreen} from '../screens/garage/ExpertResultsScreen';
import {HistoryScreen} from '../screens/garage/HistoryScreen';
import {DashboardScreen} from '../screens/garage/DashboardScreen';
import {LiveMonitorScreen} from '../screens/garage/LiveMonitorScreen';
import {ExpertiseScreen} from '../screens/garage/ExpertiseScreen';
import {ExpertScanScreen} from '../screens/garage/ExpertScanScreen';
import {DTCBaseScreen} from '../screens/garage/DTCBaseScreen';
import {ProfileScreen} from '../screens/shared/ProfileScreen';
import {SubscriptionScreen} from '../screens/shared/SubscriptionScreen';
import {UpcomingModulesScreen} from '../screens/shared/UpcomingModulesScreen';
import NotificationsScreen from '../screens/garage/NotificationsScreen';
import {ChatScreen} from '../screens/shared/ChatScreen';
import {ChatDetailScreen} from '../screens/shared/ChatDetailScreen';
import {SendResultsScreen} from '../screens/garage/SendResultsScreen';
import {AppointmentsScreen} from '../screens/shared/AppointmentsScreen';
import {TowTrucksScreen} from '../screens/shared/TowTrucksScreen';

const Stack = createStackNavigator();

export const ProNavigator = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: {backgroundColor: '#1976D2'},
      headerTintColor: '#fff',
      headerTitleStyle: {fontWeight: 'bold'},
    }}>
    <Stack.Screen
      name="ProHome"
      component={GarageHomeScreen}
      options={{title: 'Tableau de bord Pro'}}
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
      options={{title: 'Rapport Certification'}}
    />
    <Stack.Screen
      name="History"
      component={HistoryScreen}
      options={{title: 'Historique'}}
    />
    <Stack.Screen
      name="Dashboard"
      component={DashboardScreen}
      options={{title: 'Bilan Financier'}}
    />
    <Stack.Screen
      name="LiveMonitor"
      component={LiveMonitorScreen}
      options={{title: 'Live Monitor'}}
    />
    <Stack.Screen
      name="Expertise"
      component={ExpertiseScreen}
      options={{title: 'Certification Kilométrique'}}
    />
    <Stack.Screen
      name="ExpertScan"
      component={ExpertScanScreen}
      options={{title: 'Scan Expert', headerShown: false}}
    />
    <Stack.Screen
      name="DTCBase"
      component={DTCBaseScreen}
      options={{title: 'Base DTC'}}
    />
    <Stack.Screen
      name="Profile"
      component={ProfileScreen}
      options={{title: 'Mon Profil'}}
    />
    <Stack.Screen
      name="Subscriptions"
      component={SubscriptionScreen}
      options={{title: 'Nos Offres'}}
    />
    <Stack.Screen
      name="UpcomingModules"
      component={UpcomingModulesScreen}
      options={{title: 'Modules à venir'}}
    />
    <Stack.Screen
      name="Notifications"
      component={NotificationsScreen}
      options={{title: 'Mes Notifications'}}
    />
    <Stack.Screen
      name="Chat"
      component={ChatScreen}
      options={{title: 'Messages'}}
    />
    <Stack.Screen
      name="ChatDetail"
      component={ChatDetailScreen}
      options={({route}) => ({title: (route.params as any)?.title || 'Discussion'})}
    />
    <Stack.Screen
      name="SendResults"
      component={SendResultsScreen}
      options={{title: 'Partager Rapport'}}
    />
    <Stack.Screen
      name="Appointments"
      component={AppointmentsScreen}
      options={{title: 'Mes Rendez-vous'}}
    />
    <Stack.Screen
      name="TowTrucks"
      component={TowTrucksScreen}
      options={{title: 'Service de Remorquage'}}
    />
  </Stack.Navigator>
);
