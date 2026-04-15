// src/screens/HomeScreen.tsx
import React, {useEffect} from 'react';
import {View, StyleSheet, ScrollView, TouchableOpacity} from 'react-native';
import {Text, Card, Button, Avatar, Badge} from 'react-native-paper';
import {useStore} from '../store/useStore';
import {obdService} from '../services/obdService';

export const HomeScreen: React.FC<{navigation: any}> = ({navigation}) => {
  const {mechanic, scanHistory, vehicleInfo, setCurrentScreen} = useStore();

  useEffect(() => {
    setCurrentScreen('home');
  }, []);

  const renderConnectionStatus = () => (
    <Card style={styles.statusCard}>
      <Card.Content>
        <View style={styles.statusRow}>
          <Avatar.Icon
            size={40}
            icon={vehicleInfo.connected ? 'bluetooth-connect' : 'bluetooth-off'}
            style={{
              backgroundColor: vehicleInfo.connected ? '#4CAF50' : '#F44336',
            }}
          />
          <View style={styles.statusText}>
            <Text variant="titleMedium">
              {vehicleInfo.connected ? 'Connecté au véhicule' : 'Non connecté'}
            </Text>
            <Text variant="bodySmall">
              {vehicleInfo.connected
                ? `Protocole: ${vehicleInfo.protocol || 'Auto'}`
                : 'Appuyez pour scanner les adaptateurs OBD'}
            </Text>
          </View>
        </View>
      </Card.Content>
      {!vehicleInfo.connected && (
        <Card.Actions>
          <Button
            mode="contained"
            onPress={() => navigation.navigate('Scan')}
            icon="bluetooth-search">
            Connecter OBD
          </Button>
        </Card.Actions>
      )}
    </Card>
  );

  const renderQuickActions = () => (
    <View style={styles.actionsGrid}>
      <TouchableOpacity
        style={styles.actionCard}
        onPress={() => navigation.navigate('Scan')}>
        <Avatar.Icon size={50} icon="magnify" style={styles.actionIcon} />
        <Text style={styles.actionText}>Nouveau Diagnostic</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.actionCard}
        onPress={() => navigation.navigate('History')}>
        <Avatar.Icon size={50} icon="history" style={styles.actionIcon} />
        <Text style={styles.actionText}>Historique</Text>
        {scanHistory.length > 0 && (
          <Badge style={styles.badge}>{scanHistory.length}</Badge>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.actionCard}>
        <Avatar.Icon size={50} icon="book-open" style={styles.actionIcon} />
        <Text style={styles.actionText}>Base DTC</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.actionCard}>
        <Avatar.Icon size={50} icon="account" style={styles.actionIcon} />
        <Text style={styles.actionText}>Mon Profil</Text>
      </TouchableOpacity>
    </View>
  );

  const renderRecentActivity = () => (
    <Card style={styles.activityCard}>
      <Card.Title title="Activité Récente" />
      <Card.Content>
        {scanHistory.length === 0 ? (
          <Text variant="bodyMedium" style={styles.emptyText}>
            Aucun diagnostic récent. Commencez par connecter un véhicule.
          </Text>
        ) : (
          scanHistory.slice(0, 3).map((scan, index) => (
            <View key={scan.id} style={styles.activityItem}>
              <Text variant="bodyMedium">
                {new Date(scan.date).toLocaleDateString('fr-FR')}
              </Text>
              <Text variant="bodySmall" style={styles.dtcCount}>
                {scan.dtcs.length} code(s) défaut
              </Text>
            </View>
          ))
        )}
      </Card.Content>
    </Card>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.welcome}>
          Bonjour, {mechanic?.name?.split(' ')[0] || 'Mécanicien'}
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          {mechanic?.shopName || 'Garagiste Pro'}
        </Text>
      </View>

      {renderConnectionStatus()}
      {renderQuickActions()}
      {renderRecentActivity()}
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
    backgroundColor: '#1976D2',
  },
  welcome: {
    color: 'white',
    fontWeight: 'bold',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  statusCard: {
    margin: 16,
    elevation: 2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    marginLeft: 12,
    flex: 1,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
    justifyContent: 'space-between',
  },
  actionCard: {
    width: '48%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    elevation: 2,
    position: 'relative',
  },
  actionIcon: {
    backgroundColor: '#E3F2FD',
  },
  actionText: {
    marginTop: 8,
    textAlign: 'center',
    fontSize: 12,
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  activityCard: {
    margin: 16,
    marginTop: 8,
  },
  emptyText: {
    color: '#757575',
    fontStyle: 'italic',
  },
  activityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  dtcCount: {
    color: '#F44336',
  },
});
