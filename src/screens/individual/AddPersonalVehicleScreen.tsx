import React, {useState} from 'react';
import {View, StyleSheet, ScrollView, Alert} from 'react-native';
import {TextInput, Button, Text} from 'react-native-paper';
import apiIndividualService from '../../services/individual/apiIndividualService';

const AddPersonalVehicleScreen = ({navigation}: any) => {
  const [formData, setFormData] = useState({
    license_plate: '',
    brand: '',
    model: '',
    year: '',
    vin: '',
  });
  const [loading, setLoading] = useState(false);

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({...prev, [field]: value}));
  };

  const handleAddVehicle = async () => {
    if (!formData.license_plate || !formData.brand || !formData.model) {
      Alert.alert(
        'Erreur',
        'Veuillez remplir au moins la plaque, la marque et le modèle.',
      );
      return;
    }

    setLoading(true);
    try {
      await apiIndividualService.addVehicle({
        ...formData,
        year: formData.year ? parseInt(formData.year, 10) : null,
      });
      Alert.alert('Succès', 'Votre véhicule a été ajouté !', [
        {text: 'Super', onPress: () => navigation.goBack()},
      ]);
    } catch (error: any) {
      const errorMsg =
        error.response?.data?.error ||
        "Une erreur est survenue lors de l'ajout.";
      Alert.alert('Erreur', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text variant="titleLarge" style={styles.title}>Mon Véhicule Personnel</Text>
      <Text style={styles.subtitle}>
        Enregistrez votre véhicule pour profiter du diagnostic automatique.
      </Text>

      <View style={styles.form}>
        <TextInput
          label="Plaque d'immatriculation *"
          value={formData.license_plate}
          onChangeText={v => updateField('license_plate', v)}
          mode="outlined"
          style={styles.input}
          placeholder="Ex: 1234 AB 01"
          autoCapitalize="characters"
        />
        <TextInput
          label="Marque *"
          value={formData.brand}
          onChangeText={v => updateField('brand', v)}
          mode="outlined"
          style={styles.input}
          placeholder="Ex: Toyota"
        />
        <TextInput
          label="Modèle *"
          value={formData.model}
          onChangeText={v => updateField('model', v)}
          mode="outlined"
          style={styles.input}
          placeholder="Ex: Corolla"
        />
        <TextInput
          label="Année"
          value={formData.year}
          onChangeText={v => updateField('year', v)}
          mode="outlined"
          style={styles.input}
          keyboardType="numeric"
          placeholder="Ex: 2015"
        />
        <TextInput
          label="Numéro de série (VIN)"
          value={formData.vin}
          onChangeText={v => updateField('vin', v)}
          mode="outlined"
          style={styles.input}
          placeholder="Optionnel"
          autoCapitalize="characters"
        />

        <Button
          mode="contained"
          onPress={handleAddVehicle}
          loading={loading}
          disabled={loading}
          style={styles.button}>
          Ajouter mon véhicule
        </Button>

        <Button
          mode="text"
          onPress={() => navigation.goBack()}
          style={styles.cancelButton}>
          Annuler
        </Button>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#fff',
    flexGrow: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1976D2',
    textAlign: 'center',
    marginTop: 10,
  },
  subtitle: {
    textAlign: 'center',
    color: '#666',
    marginBottom: 30,
    fontSize: 14,
  },
  form: {
    width: '100%',
  },
  input: {
    marginBottom: 15,
  },
  button: {
    marginTop: 20,
    paddingVertical: 6,
    backgroundColor: '#1976D2',
  },
  cancelButton: {
    marginTop: 10,
  },
});

export default AddPersonalVehicleScreen;
