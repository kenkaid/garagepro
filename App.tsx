// App.tsx (remplacez le fichier existant)
import React from 'react';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {PaperProvider} from 'react-native-paper';
import {AppNavigator} from './src/navigation/AppNavigator';

const theme = {
  colors: {
    primary: '#1976D2',
    secondary: '#424242',
  },
};

export default function App() {
  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <AppNavigator />
      </PaperProvider>
    </SafeAreaProvider>
  );
}
