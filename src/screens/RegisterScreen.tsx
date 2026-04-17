import React, {useState} from 'react';
import {View, StyleSheet, ScrollView, Alert, TouchableOpacity} from 'react-native';
import {TextInput, Button, Text, Title, HelperText, SegmentedButtons} from 'react-native-paper';
import {apiService} from '../services/apiService';
import {useStore} from '../store/useStore';

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
  const {setMechanic} = useStore();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({...prev, [field]: value}));
  };

  const handleRegister = async () => {
    const isMechanic = formData.user_type === 'MECHANIC';
    
    if (!formData.username || !formData.password || !formData.phone) {
      Alert.alert('Erreur', 'Veuillez remplir les champs obligatoires (Username, Password, Phone)');
      return;
    }

    if (isMechanic && !formData.shop_name) {
      Alert.alert('Erreur', 'Veuillez renseigner le nom de votre garage.');
      return;
    }

    if (!isMechanic && !formData.shop_name) {
      Alert.alert('Erreur', 'Veuillez renseigner le nom de votre flotte ou entreprise.');
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
      setMechanic(userData);
      Alert.alert('Succès', 'Compte créé avec succès !', [
        {text: 'Continuer', onPress: () => navigation.replace('Main')},
      ]);
    } else {
      // Les erreurs détaillées sont maintenant gérées par l'apiService qui pourrait renvoyer null en cas d'erreur réseau
      // Mais on peut essayer d'afficher un message plus précis si possible
      Alert.alert('Erreur', "L'inscription a échoué. Vérifiez que le nom d'utilisateur ou le téléphone ne sont pas déjà utilisés.");
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Title style={styles.title}>Inscription OBD-CI</Title>

      <View style={styles.form}>
        <Text style={styles.section}>Je suis un :</Text>
        <SegmentedButtons
          value={formData.user_type}
          onValueChange={v => updateField('user_type', v)}
          buttons={[
            {value: 'MECHANIC', label: 'Mécanicien', icon: 'wrench'},
            {value: 'FLEET_OWNER', label: 'Propriétaire', icon: 'car-connected'},
          ]}
          style={styles.segmented}
        />

        <Text style={styles.section}>Compte</Text>
        <TextInput
          label="Nom d'utilisateur *"
          value={formData.username}
          onChangeText={v => updateField('username', v)}
          mode="outlined"
          style={styles.input}
        />
        <TextInput
          label="Mot de passe *"
          value={formData.password}
          onChangeText={v => updateField('password', v)}
          mode="outlined"
          secureTextEntry={!showPassword}
          style={styles.input}
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
          style={styles.input}
          right={
            <TextInput.Icon
              icon={showConfirmPassword ? "eye-off" : "eye"}
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            />
          }
        />

        <Text style={styles.section}>Personnel</Text>
        <TextInput
          label="Email"
          value={formData.email}
          onChangeText={v => updateField('email', v)}
          mode="outlined"
          keyboardType="email-address"
          style={styles.input}
        />
        <TextInput
          label="Téléphone *"
          value={formData.phone}
          onChangeText={v => updateField('phone', v)}
          mode="outlined"
          keyboardType="phone-pad"
          style={styles.input}
        />
        <TextInput
          label="Prénom"
          value={formData.first_name}
          onChangeText={v => updateField('first_name', v)}
          mode="outlined"
          style={styles.input}
        />
        <TextInput
          label="Nom"
          value={formData.last_name}
          onChangeText={v => updateField('last_name', v)}
          mode="outlined"
          style={styles.input}
        />

        {formData.user_type === 'MECHANIC' ? (
          <>
            <Text style={styles.section}>Garage</Text>
            <TextInput
              label="Nom du Garage *"
              value={formData.shop_name}
              onChangeText={v => updateField('shop_name', v)}
              mode="outlined"
              style={styles.input}
            />
            <TextInput
              label="Localisation (Ville/Quartier)"
              value={formData.location}
              onChangeText={v => updateField('location', v)}
              mode="outlined"
              style={styles.input}
            />
          </>
        ) : (
          <>
            <Text style={styles.section}>Flotte</Text>
            <TextInput
              label="Nom de la Flotte / Entreprise *"
              value={formData.shop_name}
              onChangeText={v => updateField('shop_name', v)}
              mode="outlined"
              style={styles.input}
            />
            <TextInput
              label="Ville / Zone"
              value={formData.location}
              onChangeText={v => updateField('location', v)}
              mode="outlined"
              style={styles.input}
            />
          </>
        )}

        <Button
          mode="contained"
          onPress={handleRegister}
          loading={loading}
          disabled={loading}
          style={styles.button}>
          {formData.user_type === 'MECHANIC' ? 'Créer mon compte Pro' : 'Créer mon compte Client'}
        </Button>

        <Button
          mode="text"
          onPress={() => navigation.goBack()}
          style={styles.textButton}>
          Déjà inscrit ? Se connecter
        </Button>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: 'white',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1976D2',
    textAlign: 'center',
    marginBottom: 20,
  },
  form: {
    width: '100%',
  },
  section: {
    marginTop: 15,
    marginBottom: 5,
    fontWeight: 'bold',
    color: '#1976D2',
    fontSize: 14,
  },
  input: {
    marginBottom: 10,
  },
  segmented: {
    marginBottom: 15,
  },
  button: {
    marginTop: 20,
    paddingVertical: 6,
    backgroundColor: '#1976D2',
  },
  textButton: {
    marginTop: 10,
    marginBottom: 20,
  },
});
