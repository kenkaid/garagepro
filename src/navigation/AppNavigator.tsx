import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import {HomeNavigator} from './HomeNavigator';
import {LoginScreen} from '../screens/shared/LoginScreen';
import {RegisterScreen} from '../screens/shared/RegisterScreen';
import {WelcomeScreen} from '../screens/shared/WelcomeScreen';

export type RootStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  Main: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

const MainStack = () => (
  <HomeNavigator />
);

export const AppNavigator: React.FC = () => (
  <NavigationContainer>
    <Stack.Navigator
      initialRouteName="Welcome"
      screenOptions={{headerShown: false}}>
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="Main" component={MainStack} />
    </Stack.Navigator>
  </NavigationContainer>
);
