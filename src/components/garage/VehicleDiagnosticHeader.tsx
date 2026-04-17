import React from 'react';
import {StyleSheet, View, Text} from 'react-native';
import {Card} from 'react-native-paper';

interface VehicleDiagnosticHeaderProps {
  brand: string;
  model: string;
  year: number | string;
  plate: string;
  date?: string;
  isHistoryView?: boolean;
}

export const VehicleDiagnosticHeader: React.FC<VehicleDiagnosticHeaderProps> = ({
  brand,
  model,
  year,
  plate,
  date,
  isHistoryView,
}) => {
  return (
    <Card style={styles.vehicleHeader}>
      <Card.Content>
        <Text style={styles.vehicleTitle}>
          🚗 {brand} {model} ({year})
        </Text>
        <Text style={styles.licensePlate}>Plaque : {plate}</Text>
        {isHistoryView && date && (
          <Text style={styles.historyDate}>
            Scan du {new Date(date).toLocaleDateString('fr-FR')}
          </Text>
        )}
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  vehicleHeader: {
    margin: 16,
    elevation: 4,
    backgroundColor: '#fff',
  },
  vehicleTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  licensePlate: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  historyDate: {
    fontSize: 14,
    color: '#888',
    marginTop: 8,
    fontStyle: 'italic',
  },
});
