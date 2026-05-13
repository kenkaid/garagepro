import React, {useState, useEffect} from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Linking,
  Alert,
  TouchableOpacity,
} from 'react-native';
import {
  Card,
  Title,
  Paragraph,
  Button,
  Searchbar,
  ActivityIndicator,
  Text,
  IconButton,
  Chip,
} from 'react-native-paper';
import {apiService} from '../../services/apiService';

export const TowTrucksScreen: React.FC<{navigation: any}> = ({navigation}) => {
  const [loading, setLoading] = useState(true);
  const [trucks, setTrucks] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const fetchTrucks = async (city?: string) => {
    setLoading(true);
    const data = await apiService.getTowTrucks(city);
    setTrucks(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchTrucks();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTrucks(searchQuery);
    setRefreshing(false);
  };

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`).catch(() => {
      Alert.alert('Erreur', 'Impossible de lancer l\'appel.');
    });
  };

  const renderItem = ({item}: {item: any}) => (
    <Card style={styles.truckCard}>
      <Card.Content style={styles.cardContent}>
        <View style={styles.infoSection}>
          <Title style={styles.truckName}>{item.name}</Title>
          <View style={styles.locationRow}>
            <IconButton icon="map-marker" size={16} iconColor="#757575" style={styles.markerIcon} />
            <Paragraph style={styles.locationText}>
              {item.city}{item.district ? `, ${item.district}` : ''}
            </Paragraph>
          </View>
          <Chip
            icon={item.is_available ? 'check-circle' : 'close-circle'}
            style={[styles.statusChip, {backgroundColor: item.is_available ? '#E8F5E9' : '#FFEBEE'}]}
            textStyle={{color: item.is_available ? '#2E7D32' : '#C62828', fontSize: 11}}
          >
            {item.is_available ? 'Disponible' : 'Indisponible'}
          </Chip>
        </View>

        <TouchableOpacity
          style={styles.callButton}
          onPress={() => handleCall(item.phone)}
        >
          <IconButton icon="phone" iconColor="#fff" size={24} />
          <Text style={styles.callText}>Appeler</Text>
        </TouchableOpacity>
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Title style={styles.headerTitle}>🚀 Service de Remorquage</Title>
        <Paragraph style={styles.headerSub}>Trouvez un dépanneur à proximité</Paragraph>
      </View>

      <Searchbar
        placeholder="Rechercher par ville (ex: Adjamé)"
        onChangeText={(query) => {
          setSearchQuery(query);
          if (query === '') fetchTrucks();
        }}
        onIconPress={() => fetchTrucks(searchQuery)}
        onSubmitEditing={() => fetchTrucks(searchQuery)}
        value={searchQuery}
        style={styles.searchBar}
      />

      {loading ? (
        <ActivityIndicator style={styles.loader} size="large" color="#1976D2" />
      ) : (
        <FlatList
          data={trucks}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshing={refreshing}
          onRefresh={onRefresh}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <IconButton icon="truck-off" size={60} iconColor="#ccc" />
              <Text style={styles.emptyText}>Aucun remorqueur trouvé dans cette zone.</Text>
              <Button mode="outlined" onPress={() => fetchTrucks()} style={styles.resetBtn}>
                Voir tous les remorqueurs
              </Button>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 4,
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1976D2',
  },
  headerSub: {
    color: '#666',
    marginTop: 2,
  },
  searchBar: {
    margin: 16,
    borderRadius: 12,
    elevation: 2,
    backgroundColor: '#fff',
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  truckCard: {
    marginBottom: 12,
    borderRadius: 15,
    elevation: 3,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  infoSection: {
    flex: 1,
  },
  truckName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: -8,
  },
  markerIcon: {
    margin: 0,
  },
  locationText: {
    fontSize: 14,
    color: '#666',
  },
  statusChip: {
    marginTop: 8,
    alignSelf: 'flex-start',
    height: 28,
  },
  callButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  callText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: -10,
    marginBottom: 5,
  },
  loader: {
    marginTop: 50,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 100,
    paddingHorizontal: 40,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 16,
  },
  resetBtn: {
    marginTop: 20,
  },
});
