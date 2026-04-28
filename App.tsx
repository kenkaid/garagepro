// App.tsx
import React, {useEffect} from 'react';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {PaperProvider, MD3LightTheme} from 'react-native-paper';
import {AppNavigator} from './src/navigation/AppNavigator';
import {useStore} from './src/store/useStore';
import {apiService} from './src/services/apiService';
import {obdService} from './src/services/obdService';

// Thème complet obligatoire pour Paper
const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#1976D2',
    secondary: '#424242',
    background: '#f5f5f5',
    surface: '#ffffff',
    onSurface: '#000000',
    onSurfaceVariant: '#757575',
    outline: '#e0e0e0',
    error: '#D32F2F',
  },
};

const AppInitializer: React.FC<{children: React.ReactNode}> = ({children}) => {
  const {setUser, setIsTestMode} = useStore();
  const [isInitializing, setIsInitializing] = React.useState(true);
  useEffect(() => {
    const initAuth = async () => {
      try {
        const [user, config] = await Promise.all([
          apiService.getCurrentUser(),
          apiService.getAppConfig(),
        ]);
        if (user) {
          setUser(user);
        }
        if (config) {
          setIsTestMode(config.is_test_mode);
          obdService.setMockMode(config.is_test_mode);
        }
      } catch (e) {
        console.error('Erreur lors de l\'initialisation de l\'auth:', e);
      } finally {
        setIsInitializing(false);
      }
    };
    initAuth();
  }, [setUser, setIsTestMode]);

  if (isInitializing) {
    return null; // Ou un écran de splash si disponible
  }

  return <>{children}</>;
};

export default function App() {
  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <AppInitializer>
          <AppNavigator />
        </AppInitializer>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
