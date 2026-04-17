// src/components/VehicleInfo.tsx
import React from 'react';
import {View, StyleSheet, Text} from 'react-native'; // Text natif
import {Card, Chip, IconButton} from 'react-native-paper'; // Sans Text
import {useStore} from '../store/useStore';
import {obdService} from '../services/obdService';

interface VehicleInfoProps {
  onDisconnect?: () => void;
  compact?: boolean;
}

export const VehicleInfoComponent: React.FC<VehicleInfoProps> = ({
  onDisconnect,
  compact = false,
}) => {
  const {vehicleInfo, setVehicleInfo, setConnectedDevice} = useStore();

  const handleDisconnect = async () => {
    await obdService.disconnect();
    setConnectedDevice(null);
    setVehicleInfo({connected: false, protocol: ''});
    onDisconnect?.();
  };

  if (!vehicleInfo.connected) {
    return (
      <Card style={[styles.card, styles.disconnectedCard]}>
        <Card.Content style={styles.centerContent}>
          <Text style={styles.disconnectedIcon}>🔌</Text>
          <Text style={styles.disconnectedText}>Aucun véhicule connecté</Text>
        </Card.Content>
      </Card>
    );
  }

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <Chip
          icon="check-circle"
          style={styles.connectedChip}
          /* eslint-disable-next-line react-native/no-inline-styles */
          textStyle={{color: 'white'}}>
          Connecté
        </Chip>
        <Text style={styles.compactText}>
          {vehicleInfo.deviceName || 'ELM327'}
        </Text>
      </View>
    );
  }

  return (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.header}>
          <View style={styles.statusSection}>
            {/* eslint-disable-next-line react-native/no-inline-styles */}
            <View style={[styles.statusDot, {backgroundColor: '#4CAF50'}]} />
            <Text style={styles.title}>Véhicule Connecté</Text>
          </View>

          {onDisconnect && (
            <IconButton
              icon="close-circle"
              size={24}
              iconColor="#F44336"
              onPress={handleDisconnect}
            />
          )}
        </View>

        <View style={styles.infoGrid}>
          <InfoItem
            label="Adaptateur"
            value={vehicleInfo.deviceName || 'ELM327'}
          />

          <InfoItem
            label="Protocole"
            value={vehicleInfo.protocol || 'Auto-détection'}
          />

          {vehicleInfo.vin && (
            <InfoItem label="VIN" value={vehicleInfo.vin} monospace />
          )}

          <InfoItem label="État" value="Communication active" highlight />
        </View>
      </Card.Content>
    </Card>
  );
};

const InfoItem: React.FC<{
  label: string;
  value: string;
  monospace?: boolean;
  highlight?: boolean;
}> = ({label, value, monospace, highlight}) => (
  <View style={styles.infoItem}>
    <Text style={styles.label}>{label}</Text>
    <Text
      style={[
        styles.value,
        monospace && styles.monospace,
        highlight && styles.highlight,
      ]}>
      {value}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  card: {
    margin: 16,
    elevation: 2,
  },
  disconnectedCard: {
    backgroundColor: '#FFEBEE',
  },
  centerContent: {
    alignItems: 'center',
    padding: 20,
  },
  disconnectedIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  disconnectedText: {
    color: '#D32F2F',
    fontSize: 16,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  connectedChip: {
    backgroundColor: '#4CAF50',
  },
  compactText: {
    color: '#757575',
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  title: {
    fontWeight: 'bold',
    color: '#1976D2',
    fontSize: 18,
  },
  infoGrid: {
    gap: 12,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  label: {
    color: '#757575',
    flex: 1,
    fontSize: 14,
  },
  value: {
    flex: 2,
    textAlign: 'right',
    fontWeight: '500',
    fontSize: 16,
  },
  monospace: {
    fontFamily: 'monospace',
    fontSize: 12,
  },
  highlight: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
});
