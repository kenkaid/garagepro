import React, {useState, useEffect} from 'react';
import {View, StyleSheet, FlatList, Text, RefreshControl, TouchableOpacity} from 'react-native';
import {Card, Avatar, ProgressBar, Button} from 'react-native-paper';
import {apiService} from '../../services/apiService';

export const FleetPredictionScreen: React.FC<{navigation: any}> = ({navigation}) => {
  const [predictions, setPredictions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadPredictions = async () => {
    setLoading(true);
    // On utilise les alertes prédictives car elles contiennent les scores de probabilité
    const data = await apiService.getPredictiveAlerts();
    if (data) {
      // Pour l'écran de prédiction, on filtre ou on trie par probabilité
      // et on peut imaginer un filtrage spécifique côté backend plus tard
      const sortedData = data.sort((a: any, b: any) => b.probability_score - a.probability_score);
      setPredictions(sortedData);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadPredictions();
  }, []);

  const getProbabilityColor = (score: number) => {
    if (score >= 0.8) return '#F44336'; // Rouge (Critique)
    if (score >= 0.5) return '#FF9800'; // Orange (Attention)
    return '#4CAF50'; // Vert (Faible)
  };

  const getPredictiveIcon = (type: string) => {
    switch (type) {
      case 'BATTERY': return 'battery-alert';
      case 'ENGINE': return 'engine-outline';
      case 'BRAKES': return 'car-brake-alert';
      default: return 'hammer-wrench';
    }
  };

  const renderPredictionItem = ({item}: {item: any}) => (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.cardHeader}>
          <Avatar.Icon
            size={40}
            icon={getPredictiveIcon(item.alert_type)}
            style={{backgroundColor: getProbabilityColor(item.probability_score)}}
          />
          <View style={styles.headerText}>
            <Text style={styles.vehicleInfo}>
              {item.vehicle_plate} - {item.vehicle_brand} {item.vehicle_model}
            </Text>
            <Text style={styles.failureType}>
              Risque détecté: {item.alert_type_display || item.alert_type}
            </Text>
          </View>
        </View>

        <View style={styles.predictionBody}>
          <View style={styles.scoreRow}>
            <Text style={styles.scoreLabel}>Probabilité de panne</Text>
            <Text style={[styles.scoreValue, {color: getProbabilityColor(item.probability_score)}]}>
              {Math.round(item.probability_score * 100)}%
            </Text>
          </View>
          <ProgressBar
            progress={item.probability_score}
            color={getProbabilityColor(item.probability_score)}
            style={styles.progressBar}
          />
          <Text style={styles.recommendation}>
            <Text style={{fontWeight: 'bold'}}>Recommandation: </Text>
            {item.message}
          </Text>
        </View>
      </Card.Content>
      <Card.Actions>
        <Button 
            mode="text" 
            onPress={() => navigation.navigate('FleetLiveMonitor', {vehicleId: item.vehicle})}
        >
            Diagnostic Temps Réel
        </Button>
      </Card.Actions>
    </Card>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Prédiction des pannes</Text>
        <Text style={styles.subtitle}>Analyse IA basée sur la télémétrie</Text>
      </View>

      <FlatList
        data={predictions}
        renderItem={renderPredictionItem}
        keyExtractor={item => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadPredictions} />
        }
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {loading ? 'Analyse en cours...' : 'Aucune panne majeure prédite pour le moment'}
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#f0f2f5'},
  header: {
    padding: 20,
    backgroundColor: '#1A237E', // Bleu encore plus profond pour l'IA
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
  },
  title: {color: 'white', fontSize: 22, fontWeight: 'bold'},
  subtitle: {color: 'rgba(255,255,255,0.8)', fontSize: 14, marginTop: 4},
  listContent: {padding: 12},
  card: {marginBottom: 16, borderRadius: 12, elevation: 3},
  cardHeader: {flexDirection: 'row', alignItems: 'center', marginBottom: 15},
  headerText: {marginLeft: 15, flex: 1},
  vehicleInfo: {fontSize: 15, fontWeight: 'bold', color: '#1A237E'},
  failureType: {fontSize: 13, color: '#666', marginTop: 2},
  predictionBody: {marginTop: 5},
  scoreRow: {flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5},
  scoreLabel: {fontSize: 14, color: '#333'},
  scoreValue: {fontSize: 16, fontWeight: 'bold'},
  progressBar: {height: 8, borderRadius: 4, marginBottom: 10},
  recommendation: {fontSize: 13, color: '#444', fontStyle: 'italic', lineHeight: 18},
  emptyContainer: {marginTop: 100, alignItems: 'center', padding: 20},
  emptyText: {color: '#757575', fontSize: 16, textAlign: 'center'},
});
