import React from 'react';
import {createStackNavigator} from '@react-navigation/stack';
import {FleetHomeScreen} from '../screens/fleet/FleetHomeScreen';
import {FleetDashboardScreen} from '../screens/fleet/FleetDashboardScreen';
import {FleetLiveMonitorScreen} from '../screens/fleet/FleetLiveMonitorScreen';
import {FleetHistoryScreen} from '../screens/fleet/FleetHistoryScreen';
import {FleetPredictionScreen} from '../screens/fleet/FleetPredictionScreen';
import {FleetSubscriptionScreen} from '../screens/fleet/FleetSubscriptionScreen';
import {ProfileScreen} from '../screens/shared/ProfileScreen';
import {UpcomingModulesScreen} from '../screens/shared/UpcomingModulesScreen';
import {ExpertiseScreen} from '../screens/garage/ExpertiseScreen';
import {ExpertScanScreen} from '../screens/garage/ExpertScanScreen';
import {ScanScreen} from '../screens/garage/ScanScreen';
import {ResultsScreen} from '../screens/garage/ResultsScreen';
import {ExpertResultsScreen} from '../screens/garage/ExpertResultsScreen';
import {TowTrucksScreen} from '../screens/shared/TowTrucksScreen';

const Stack = createStackNavigator();

export const FleetNavigator = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: {backgroundColor: '#1976D2'},
      headerTintColor: '#fff',
      headerTitleStyle: {fontWeight: 'bold'},
    }}>
    <Stack.Screen
      name="FleetHome"
      component={FleetHomeScreen}
      options={{title: 'Gestion de Flotte'}}
    />
    <Stack.Screen
      name="FleetDashboard"
      component={FleetDashboardScreen}
      options={{title: 'Ma Flotte'}}
    />
    <Stack.Screen
      name="FleetLiveMonitor"
      component={FleetLiveMonitorScreen}
      options={{title: 'Live Monitor Flotte'}}
    />
    <Stack.Screen
      name="FleetHistory"
      component={FleetHistoryScreen}
      options={{title: 'Journal de bord'}}
    />
    <Stack.Screen
      name="FleetPrediction"
      component={FleetPredictionScreen}
      options={{title: 'Prédiction IA'}}
    />
    <Stack.Screen
      name="FleetSubscriptions"
      component={FleetSubscriptionScreen}
      options={{title: 'Offres Flotte'}}
    />
    <Stack.Screen
      name="Profile"
      component={ProfileScreen}
      options={{title: 'Mon Profil'}}
    />
    <Stack.Screen
      name="Expertise"
      component={ExpertiseScreen}
      options={{title: 'Certification Kilométrique'}}
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
      name="ExpertScan"
      component={ExpertScanScreen}
      options={{title: 'Scan Expert', headerShown: false}}
    />
    <Stack.Screen
      name="TowTrucks"
      component={TowTrucksScreen}
      options={{title: 'Service de Remorquage'}}
    />
    <Stack.Screen
      name="UpcomingModules"
      component={UpcomingModulesScreen}
      options={{title: 'Modules à venir'}}
    />
  </Stack.Navigator>
);
