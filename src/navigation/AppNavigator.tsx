import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import {HomeNavigator} from './HomeNavigator';
import {LoginScreen} from '../screens/shared/LoginScreen';
import {RegisterScreen} from '../screens/shared/RegisterScreen';
import {WelcomeScreen} from '../screens/shared/WelcomeScreen';
import {useStore} from '../store/useStore';

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

export const AppNavigator: React.FC = () => {
  const {isTestMode} = useStore();
  return (
    <View style={styles.container}>
      {isTestMode && (
        <View style={styles.testBanner}>
          <Text style={styles.testBannerText}>⚠️ MODE TEST — Aucun débit réel</Text>
        </View>
      )}
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  testBanner: {
    backgroundColor: '#FF6F00',
    paddingVertical: 6,
    alignItems: 'center',
    zIndex: 999,
  },
  testBannerText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
  },
});
