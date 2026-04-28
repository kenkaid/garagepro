import React, {useState, useEffect} from 'react';
import {View, StyleSheet, ScrollView, Alert} from 'react-native';
import {TextInput, Button, Text} from 'react-native-paper';
import apiIndividualService from '../../services/individual/apiIndividualService';

const EditVehicleScreen = ({navigation, route}: any) => {
  const {vehicle} = route.params;

  const [formData, setFormData] = useState({
    license_plate: vehicle?.license_plate || '',
    brand: vehicle?.brand || '',
    model: vehicle?.model || '',
    year: vehicle?.year?.toString() || '',
    vin: vehicle?.vin || '',
    chassis_number: vehicle?.chassis_number || '',
  });
  const [loading, setLoading] = useState(false);

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({...prev, [field]: value}));
  };

  const handleUpdateVehicle = async () => {
    if (!formData.license_plate || !formData.brand || !formData.model) {
      Alert.alert(
        'Erreur',
        'Veuillez remplir au moins la plaque, la marque et le modèle.',
      );
      return;
    }

    setLoading(true);
    try {
      // Utiliser l'ID du véhicule pour la mise à jour au lieu de la plaque
      // car la plaque peut elle-même être modifiée
      const vehicleId = vehicle.id || vehicle.license_plate;
      await apiIndividualService.updateVehicle(vehicleId, {
        ...formData,
        year: formData.year ? parseInt(formData.year, 10) : null,
      });
      Alert.alert('Succès', 'Les informations du véhicule ont été mises à jour !', [
        {text: 'OK', onPress: () => navigation.goBack()},
      ]);
    } catch (error: any) {
      const errorMsg =
        error.response?.data?.error ||
        "Une erreur est survenue lors de la mise à jour.";
      Alert.alert('Erreur', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text variant="titleLarge" style={styles.title}>Modifier mon véhicule</Text>
      <Text style={styles.subtitle}>
        Mettez à jour les informations de votre véhicule.
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
          placeholder="Entrez le VIN"
          autoCapitalize="characters"
        />
        <TextInput
          label="Numéro de châssis"
          value={formData.chassis_number}
          onChangeText={v => updateField('chassis_number', v)}
          mode="outlined"
          style={styles.input}
          placeholder="Entrez le numéro de châssis"
          autoCapitalize="characters"
        />

        <Button
          mode="contained"
          onPress={handleUpdateVehicle}
          loading={loading}
          disabled={loading}
          style={styles.button}>
          Enregistrer les modifications
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

export default EditVehicleScreen;
