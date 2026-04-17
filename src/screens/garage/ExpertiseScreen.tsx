import React from 'react';
import {View, StyleSheet, ScrollView, TouchableOpacity} from 'react-native';
import {Card, Title, Text, Avatar, List, Surface, Divider, Button} from 'react-native-paper';

export const ExpertiseScreen: React.FC<{navigation: any}> = ({navigation}) => {
  return (
    <ScrollView style={styles.container}>
      <Surface style={styles.header} elevation={4}>
        <Title style={styles.headerTitle}>Expertise Occasion</Title>
        <Text style={styles.headerSubtitle}>Anti-fraude & Sécurité</Text>
      </Surface>

      <View style={styles.content}>
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.row}>
              <Avatar.Icon size={48} icon="speedometer" style={styles.iconBlue} />
              <View style={styles.textContainer}>
                <Title>Certification Kilométrique</Title>
                <Text style={styles.description}>
                  Compare les données du tableau de bord avec les calculateurs ABS et Moteur pour détecter les fraudes.
                </Text>
              </View>
            </View>
          </Card.Content>
          <Divider />
          <Card.Actions>
            <Button
              mode="contained"
              onPress={() => navigation.navigate('Scan', {scanType: 'EXPERT'})}
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
                <Title>Audit de Sécurité (Airbags)</Title>
                <Text style={styles.description}>
                  Analyse profonde du module SRS pour détecter des déploiements passés ou des "Crash Data" masqués.
                </Text>
              </View>
            </View>
          </Card.Content>
          <Divider />
          <Card.Actions>
            <Button
              mode="contained"
              onPress={() => navigation.navigate('Scan', {scanType: 'security'})}
              style={styles.button}>
              Vérifier la sécurité
            </Button>
          </Card.Actions>
        </Card>

        <Card style={styles.infoCard}>
          <Card.Content>
            <Title style={styles.infoTitle}>Note importante</Title>
            <Text style={styles.infoText}>
              L'utilisation d'un adaptateur compatible (vLinker, OBDLink ou ELM327 V1.5 original) est recommandée pour interroger les modules profonds (ABS/SRS). Votre ELM327 V2.1 actuel pourra lire les données moteur mais pourrait être limité pour l'ABS.
            </Text>
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
