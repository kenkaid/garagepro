import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const TripsScreen = ({navigation}: any) => {
  // Mock data pour la démo
  const trips = [
    {
      id: '1',
      date: '24 Avril 2026',
      duration: '45 min',
      distance: '12.5 km',
      avgConsumption: '6.8 L/100',
      start: 'Cocody, Abidjan',
      end: 'Plateau, Abidjan',
      score: 92,
    },
    {
      id: '2',
      date: '23 Avril 2026',
      duration: '1h 10 min',
      distance: '32.0 km',
      avgConsumption: '7.2 L/100',
      start: 'Yopougon, Abidjan',
      end: 'Bingerville',
      score: 85,
    },
    {
      id: '3',
      date: '22 Avril 2026',
      duration: '15 min',
      distance: '4.2 km',
      avgConsumption: '9.5 L/100',
      start: 'Marcory, Abidjan',
      end: 'Koumassi, Abidjan',
      score: 78,
    },
  ];

  const renderTripItem = ({item}: {item: any}) => (
    <TouchableOpacity style={styles.tripCard}>
      <View style={styles.tripHeader}>
        <View style={styles.dateContainer}>
          <Icon name="calendar" size={16} color="#666" />
          <Text style={styles.dateText}>{item.date}</Text>
        </View>
        <View style={[styles.scoreBadge, {backgroundColor: item.score > 85 ? '#E8F5E9' : '#FFF3E0'}]}>
          <Text style={[styles.scoreText, {color: item.score > 85 ? '#2E7D32' : '#E65100'}]}>
            Score: {item.score}%
          </Text>
        </View>
      </View>

      <View style={styles.routeContainer}>
        <View style={styles.routeVisual}>
          <View style={styles.dot} />
          <View style={styles.line} />
          <Icon name="map-marker" size={16} color="#F44336" />
        </View>
        <View style={styles.routeDetails}>
          <Text style={styles.locationText} numberOfLines={1}>{item.start}</Text>
          <Text style={styles.locationText} numberOfLines={1}>{item.end}</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Icon name="map-marker-distance" size={18} color="#1976D2" />
          <Text style={styles.statValue}>{item.distance}</Text>
        </View>
        <View style={styles.stat}>
          <Icon name="clock-outline" size={18} color="#1976D2" />
          <Text style={styles.statValue}>{item.duration}</Text>
        </View>
        <View style={styles.stat}>
          <Icon name="gas-station" size={18} color="#1976D2" />
          <Text style={styles.statValue}>{item.avgConsumption}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Résumé de la semaine</Text>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Distance</Text>
            <Text style={styles.summaryValue}>48.7 km</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Temps</Text>
            <Text style={styles.summaryValue}>2h 10m</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Conso Moy.</Text>
            <Text style={styles.summaryValue}>7.1 L</Text>
          </View>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Historique des trajets</Text>

      <FlatList
        data={trips}
        renderItem={renderTripItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
    padding: 16,
  },
  summaryCard: {
    backgroundColor: '#1976D2',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  summaryTitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 16,
    textTransform: 'uppercase',
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginBottom: 4,
  },
  summaryValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  listContainer: {
    paddingBottom: 20,
  },
  tripCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    marginLeft: 6,
    color: '#666',
    fontSize: 13,
  },
  scoreBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  scoreText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  routeContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    paddingLeft: 4,
  },
  routeVisual: {
    alignItems: 'center',
    marginRight: 12,
    paddingVertical: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1976D2',
  },
  line: {
    width: 1,
    flex: 1,
    backgroundColor: '#ddd',
    marginVertical: 2,
  },
  routeDetails: {
    flex: 1,
    justifyContent: 'space-between',
  },
  locationText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 12,
    justifyContent: 'space-between',
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statValue: {
    marginLeft: 6,
    fontSize: 13,
    color: '#555',
    fontWeight: '600',
  },
});

export default TripsScreen;
