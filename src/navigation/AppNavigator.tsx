// src/navigation/AppNavigator.tsx
import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import {HomeScreen} from '../screens/HomeScreen';
import {ScanScreen} from '../screens/ScanScreen';
import {ResultsScreen} from '../screens/ResultsScreen';
import {HistoryScreen} from '../screens/HistoryScreen';
import {DashboardScreen} from '../screens/DashboardScreen';
import {LiveMonitorScreen} from '../screens/LiveMonitorScreen';
import {LoginScreen} from '../screens/LoginScreen';
import {RegisterScreen} from '../screens/RegisterScreen';
import {ProfileScreen} from '../screens/ProfileScreen';
import {DTCBaseScreen} from '../screens/DTCBaseScreen';
import {SubscriptionScreen} from '../screens/SubscriptionScreen';
import {UpcomingModulesScreen} from '../screens/UpcomingModulesScreen';
import {WelcomeScreen} from '../screens/WelcomeScreen';
import {ExpertiseScreen} from '../screens/ExpertiseScreen';
import {FleetDashboardScreen} from '../screens/FleetDashboardScreen';

export type RootStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  Main: undefined;
  Home: undefined;
  Scan: undefined;
  Results: undefined;
  History: undefined;
  Dashboard: undefined;
  LiveMonitor: undefined;
  Profile: undefined;
  DTCBase: undefined;
  Subscriptions: undefined;
  UpcomingModules: undefined;
  Expertise: undefined;
  FleetDashboard: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

const MainStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerStyle: {backgroundColor: '#1976D2'},
      headerTintColor: '#fff',
      headerTitleStyle: {fontWeight: 'bold'},
    }}>
    <Stack.Screen
      name="Home"
      component={HomeScreen}
      options={{headerShown: false}}
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
      name="Profile"
      component={ProfileScreen}
      options={{title: 'Mon Profil'}}
    />
    <Stack.Screen
      name="DTCBase"
      component={DTCBaseScreen}
      options={{title: 'Base de données DTC'}}
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
      name="Expertise"
      component={ExpertiseScreen}
      options={{title: 'Expertise Occasion'}}
    />
    <Stack.Screen
      name="FleetDashboard"
      component={FleetDashboardScreen}
      options={{title: 'Ma Flotte'}}
    />
  </Stack.Navigator>
);

export const AppNavigator: React.FC = () => (
  <NavigationContainer>
    <Stack.Navigator initialRouteName="Welcome" screenOptions={{headerShown: false}}>
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="Main" component={MainStack} />
    </Stack.Navigator>
  </NavigationContainer>
);
