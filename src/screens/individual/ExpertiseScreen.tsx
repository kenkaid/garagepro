import React from 'react';
import {View, StyleSheet, ScrollView, Text as RNText} from 'react-native';
import {Card, Avatar, Surface, Divider, Button, Text} from 'react-native-paper';

export const ExpertiseScreen: React.FC<{navigation: any; route: any}> = ({
  navigation,
  route,
}) => {
  const vehicle = route.params?.vehicle;

  const handleLaunchScan = (type: string) => {
    navigation.navigate('Scan', {
      scanType: type,
      autoRun: true,
      vehicleData: vehicle
        ? {
            licensePlate: vehicle.license_plate,
            brand: vehicle.brand,
            model: vehicle.model,
            year: vehicle.year,
          }
        : undefined,
    });
  };

  return (
    <ScrollView style={styles.container}>
      <Surface style={styles.header} elevation={4}>
        <Text variant="titleLarge" style={styles.headerTitle}>Expertise Occasion</Text>
        <RNText style={styles.headerSubtitle}>Anti-fraude & Sécurité</RNText>
      </Surface>

      <View style={styles.content}>
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.row}>
              <Avatar.Icon size={48} icon="speedometer" style={styles.iconBlue} />
              <View style={styles.textContainer}>
                <Text variant="titleMedium">Certification Kilométrique</Text>
                <RNText style={styles.description}>
                  Compare les données du tableau de bord avec les calculateurs ABS et Moteur pour détecter les fraudes.
                </RNText>
              </View>
            </View>
          </Card.Content>
          <Divider />
          <Card.Actions>
            <Button
              mode="contained"
              onPress={() => handleLaunchScan('EXPERT')}
              style={styles.button}>
              Lancer un scan expert
            </Button>
          </Card.Actions>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.row}>
              <Avatar.Icon size={48} icon="shield-check" style={styles.iconGreen} />
              <View style={styles.textContainer}>
                <Text variant="titleMedium">Audit de Sécurité (Airbags)</Text>
                <RNText style={styles.description}>
                  Analyse profonde du module SRS pour détecter des déploiements passés ou des "Crash Data" masqués.
                </RNText>
              </View>
            </View>
          </Card.Content>
          <Divider />
          <Card.Actions>
            <Button
              mode="contained"
              onPress={() => handleLaunchScan('security')}
              style={styles.button}>
              Vérifier la sécurité
            </Button>
          </Card.Actions>
        </Card>

        <Card style={styles.infoCard}>
          <Card.Content>
            <Text variant="titleSmall" style={styles.infoTitle}>Note importante</Text>
            <RNText style={styles.infoText}>
              L'utilisation d'un adaptateur compatible (vLinker, OBDLink ou ELM327 V1.5 original) est recommandée pour interroger les modules profonds (ABS/SRS).
            </RNText>
          </Card.Content>
        </Card>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: '#004BA0',
    alignItems: 'center',
  },
  headerTitle: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.8)',
  },
  content: {
    padding: 15,
  },
  card: {
    marginBottom: 15,
    borderRadius: 12,
    elevation: 3,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textContainer: {
    marginLeft: 15,
    flex: 1,
  },
  description: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  iconBlue: {
    backgroundColor: '#E3F2FD',
  },
  iconGreen: {
    backgroundColor: '#E8F5E9',
  },
  button: {
    borderRadius: 8,
  },
  infoCard: {
    marginTop: 10,
    backgroundColor: '#FFF9C4',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FBC02D',
  },
  infoTitle: {
    fontSize: 16,
    color: '#F57F17',
  },
  infoText: {
    fontSize: 13,
    color: '#5D4037',
    fontStyle: 'italic',
  },
});
