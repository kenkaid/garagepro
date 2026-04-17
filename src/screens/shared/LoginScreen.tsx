import React, {useState} from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Text as RNText,
} from 'react-native';
import {TextInput, Button, Text, Checkbox} from 'react-native-paper';
import {apiService} from '../../services/apiService';
import {useStore} from '../../store/useStore';
import {Colors, SharedStyles} from '../../styles/theme';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export const LoginScreen: React.FC<{navigation: any}> = ({navigation}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const {setUser} = useStore();
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);
    const userData = await apiService.login(username, password, rememberMe);
    setLoading(false);

    if (userData) {
      setUser(userData);
      navigation.reset({
        index: 0,
        routes: [{name: 'Main'}],
      });
    } else {
      Alert.alert('Erreur', 'Identifiants incorrects ou problème réseau');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.navigate('Welcome')}>
        <Icon name="arrow-left" size={24} color={Colors.primary} />
        <RNText style={styles.backButtonText}>Retour</RNText>
      </TouchableOpacity>

      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Icon name="car-connected" size={64} color={Colors.primary} />
        </View>
        <Text variant="headlineSmall" style={SharedStyles.title}>OBD-CI Connect</Text>
        <RNText style={SharedStyles.subtitle}>
          Votre compagnon de route intelligent
        </RNText>
      </View>

      <View style={styles.card}>
        <TextInput
          label="Nom d'utilisateur"
          value={username}
          onChangeText={setUsername}
          mode="outlined"
          style={SharedStyles.input}
          autoCapitalize="none"
          outlineColor={Colors.border}
          activeOutlineColor={Colors.primary}
          left={<TextInput.Icon icon="account" color={Colors.textSecondary} />}
        />

        <TextInput
          label="Mot de passe"
          value={password}
          onChangeText={setPassword}
          mode="outlined"
          secureTextEntry={!showPassword}
          style={SharedStyles.input}
          outlineColor={Colors.border}
          activeOutlineColor={Colors.primary}
          left={<TextInput.Icon icon="lock" color={Colors.textSecondary} />}
          right={
            <TextInput.Icon
              icon={showPassword ? 'eye-off' : 'eye'}
              onPress={() => setShowPassword(!showPassword)}
              color={Colors.textSecondary}
            />
          }
        />

        <TouchableOpacity
          style={styles.rememberMeContainer}
          onPress={() => setRememberMe(!rememberMe)}>
          <Checkbox
            status={rememberMe ? 'checked' : 'unchecked'}
            onPress={() => setRememberMe(!rememberMe)}
            color={Colors.primary}
          />
          <Text style={styles.rememberMeText}>Rester connecté</Text>
        </TouchableOpacity>

        <Button
          mode="contained"
          onPress={handleLogin}
          loading={loading}
          disabled={loading}
          style={SharedStyles.primaryButton}
          labelStyle={styles.buttonLabel}>
          Se connecter
        </Button>

        <TouchableOpacity
          onPress={() => navigation.navigate('Register')}
          style={styles.registerLink}>
          <RNText style={styles.registerText}>
            Pas encore de compte ?{' '}
            <RNText style={styles.registerTextBold}>S'inscrire</RNText>
          </RNText>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <RNText style={styles.footerText}>OBD-CI Connect v1.2.0</RNText>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: Colors.background,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 15,
    padding: 25,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  buttonLabel: {
    fontWeight: 'bold',
    fontSize: 16,
    paddingVertical: 4,
  },
  registerLink: {
    marginTop: 25,
    alignItems: 'center',
  },
  registerText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  registerTextBold: {
    color: Colors.primary,
    fontWeight: 'bold',
  },
  footer: {
    marginTop: 40,
    alignItems: 'center',
  },
  footerText: {
    color: Colors.disabled,
    fontSize: 12,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
    top: 40,
    left: 20,
    zIndex: 10,
  },
  backButtonText: {
    color: Colors.primary,
    fontSize: 16,
    marginLeft: 5,
    fontWeight: '500',
  },
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    marginLeft: -8, // Pour compenser le padding de la checkbox
  },
  rememberMeText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
});
