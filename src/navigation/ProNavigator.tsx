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
import {DTCBaseScreen} from '../screens/garage/DTCBaseScreen';
import {ProfileScreen} from '../screens/shared/ProfileScreen';
import {SubscriptionScreen} from '../screens/shared/SubscriptionScreen';
import {UpcomingModulesScreen} from '../screens/shared/UpcomingModulesScreen';

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
      options={{title: 'Rapport Expertise'}}
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
      options={{title: 'Expertise Occasion'}}
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
  </Stack.Navigator>
);
