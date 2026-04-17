import React, {useState} from 'react';
import {View, StyleSheet, ScrollView, Alert, TouchableOpacity, Text as RNText} from 'react-native';
import {TextInput, Button, Text, SegmentedButtons} from 'react-native-paper';
import {apiService} from '../../services/apiService';
import {useStore} from '../../store/useStore';
import {Colors, SharedStyles} from '../../styles/theme';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export const RegisterScreen: React.FC<{navigation: any}> = ({navigation}) => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirm_password: '',
    email: '',
    phone: '',
    first_name: '',
    last_name: '',
    shop_name: '',
    location: '',
    user_type: 'MECHANIC',
  });
  const {setUser} = useStore();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({...prev, [field]: value}));
  };

  const handleRegister = async () => {
    const isMechanic = formData.user_type === 'MECHANIC';
    const isFleet = formData.user_type === 'FLEET_OWNER';

    if (!formData.username || !formData.password || !formData.phone) {
      Alert.alert('Erreur', 'Veuillez remplir les champs obligatoires');
      return;
    }

    if (isMechanic && !formData.shop_name) {
      Alert.alert('Erreur', 'Veuillez renseigner le nom de votre garage.');
      return;
    }

    if (isFleet && !formData.shop_name) {
      Alert.alert('Erreur', 'Veuillez renseigner le nom de votre flotte.');
      return;
    }

    if (formData.password !== formData.confirm_password) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas.');
      return;
    }

    if (formData.password.length < 8) {
      Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }

    setLoading(true);
    const userData = await apiService.register(formData, formData.password);
    setLoading(false);

    if (userData) {
      setUser(userData);
      Alert.alert('Succès', 'Compte créé avec succès !', [
        {text: 'Continuer', onPress: () => navigation.replace('Main')},
      ]);
    } else {
      Alert.alert('Erreur', "L'inscription a échoué. Vérifiez vos informations.");
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
        <Text variant="headlineSmall" style={SharedStyles.title}>Créer un compte</Text>
        <RNText style={SharedStyles.subtitle}>Rejoignez l'écosystème OBD-CI</RNText>
      </View>

      <View style={styles.card}>
        <RNText style={styles.label}>Je suis un :</RNText>
        <SegmentedButtons
          value={formData.user_type}
          onValueChange={v => updateField('user_type', v)}
          buttons={[
            {value: 'MECHANIC', label: 'Pro', icon: 'wrench'},
            {value: 'FLEET_OWNER', label: 'Flotte', icon: 'car-connected'},
            {value: 'INDIVIDUAL', label: 'Personnel', icon: 'account-outline'},
          ]}
          style={styles.segmented}
          theme={{colors: {secondaryContainer: Colors.secondary}}}
        />

        <View style={styles.sectionHeader}>
          <Icon name="account-key" size={20} color={Colors.primary} />
          <RNText style={styles.sectionTitle}>Identifiants</RNText>
        </View>

        <TextInput
          label="Nom d'utilisateur *"
          value={formData.username}
          onChangeText={v => updateField('username', v)}
          mode="outlined"
          style={SharedStyles.input}
          outlineColor={Colors.border}
          activeOutlineColor={Colors.primary}
        />
        <TextInput
          label="Mot de passe *"
          value={formData.password}
          onChangeText={v => updateField('password', v)}
          mode="outlined"
          secureTextEntry={!showPassword}
          style={SharedStyles.input}
          outlineColor={Colors.border}
          activeOutlineColor={Colors.primary}
          right={
            <TextInput.Icon
              icon={showPassword ? "eye-off" : "eye"}
              onPress={() => setShowPassword(!showPassword)}
            />
          }
        />
        <TextInput
          label="Confirmer le mot de passe *"
          value={formData.confirm_password}
          onChangeText={v => updateField('confirm_password', v)}
          mode="outlined"
          secureTextEntry={!showConfirmPassword}
          style={SharedStyles.input}
          outlineColor={Colors.border}
          activeOutlineColor={Colors.primary}
          right={
            <TextInput.Icon
              icon={showConfirmPassword ? "eye-off" : "eye"}
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            />
          }
        />

        <View style={styles.sectionHeader}>
          <Icon name="card-account-details" size={20} color={Colors.primary} />
          <RNText style={styles.sectionTitle}>Informations Personnelles</RNText>
        </View>

        <TextInput
          label="Email"
          value={formData.email}
          onChangeText={v => updateField('email', v)}
          mode="outlined"
          keyboardType="email-address"
          style={SharedStyles.input}
          outlineColor={Colors.border}
          activeOutlineColor={Colors.primary}
        />
        <TextInput
          label="Téléphone *"
          value={formData.phone}
          onChangeText={v => updateField('phone', v)}
          mode="outlined"
          keyboardType="phone-pad"
          style={SharedStyles.input}
          outlineColor={Colors.border}
          activeOutlineColor={Colors.primary}
        />

        <View style={styles.row}>
          <TextInput
            label="Prénom"
            value={formData.first_name}
            onChangeText={v => updateField('first_name', v)}
            mode="outlined"
            style={[SharedStyles.input, {flex: 1, marginRight: 8}]}
            outlineColor={Colors.border}
            activeOutlineColor={Colors.primary}
          />
          <TextInput
            label="Nom"
            value={formData.last_name}
            onChangeText={v => updateField('last_name', v)}
            mode="outlined"
            style={[SharedStyles.input, {flex: 1}]}
            outlineColor={Colors.border}
            activeOutlineColor={Colors.primary}
          />
        </View>

        <View style={styles.sectionHeader}>
          <Icon name="map-marker-radius" size={20} color={Colors.primary} />
          <RNText style={styles.sectionTitle}>
            {formData.user_type === 'MECHANIC' ? 'Garage' : formData.user_type === 'FLEET_OWNER' ? 'Flotte' : 'Véhicule'}
          </RNText>
        </View>

        <TextInput
          label={formData.user_type === 'MECHANIC' ? 'Nom du Garage *' : formData.user_type === 'FLEET_OWNER' ? 'Nom de la Flotte *' : 'Nom du véhicule'}
          value={formData.shop_name}
          onChangeText={v => updateField('shop_name', v)}
          mode="outlined"
          style={SharedStyles.input}
          outlineColor={Colors.border}
          activeOutlineColor={Colors.primary}
        />
        <TextInput
          label="Localisation (Ville/Commune)"
          value={formData.location}
          onChangeText={v => updateField('location', v)}
          mode="outlined"
          style={SharedStyles.input}
          outlineColor={Colors.border}
          activeOutlineColor={Colors.primary}
        />

        <Button
          mode="contained"
          onPress={handleRegister}
          loading={loading}
          disabled={loading}
          style={[SharedStyles.primaryButton, {marginTop: 20}]}
          labelStyle={styles.buttonLabel}>
          Créer mon compte
        </Button>

        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.loginLink}>
          <RNText style={styles.loginText}>
            Déjà inscrit ? <RNText style={styles.loginTextBold}>Se connecter</RNText>
          </RNText>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: Colors.background,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 15,
    padding: 20,
    marginBottom: 30,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.textSecondary,
    marginBottom: 10,
  },
  segmented: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 15,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary,
    marginLeft: 8,
  },
  row: {
    flexDirection: 'row',
  },
  buttonLabel: {
    fontWeight: 'bold',
    fontSize: 16,
    paddingVertical: 4,
  },
  loginLink: {
    marginTop: 25,
    alignItems: 'center',
    marginBottom: 10,
  },
  loginText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  loginTextBold: {
    color: Colors.primary,
    fontWeight: 'bold',
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
});
