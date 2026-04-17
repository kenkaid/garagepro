// src/screens/DTCBaseScreen.tsx
import React, {useState, useEffect} from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Text,
  ActivityIndicator,
} from 'react-native';
import {Card, Title, Paragraph, List, Divider} from 'react-native-paper';
import {apiService} from '../../services/apiService';

export const DTCBaseScreen: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [dtcs, setDtcs] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [brand, setBrand] = useState('');

  const loadDTCs = async (query?: string, brandFilter?: string) => {
    setLoading(true);
    const data = await apiService.getDTCReferences(query, brandFilter);
    setDtcs(data);
    setLoading(false);
  };

  useEffect(() => {
    loadDTCs();
  }, []);

  const handleSearch = () => {
    loadDTCs(search, brand);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'critical':
      case 'critique':
        return '#F44336';
      case 'high':
      case 'élevé':
        return '#FF9800';
      case 'medium':
      case 'moyen':
        return '#FFEB3B';
      default:
        return '#4CAF50';
    }
  };

  const renderItem = ({item}: {item: any}) => (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.codeRow}>
          <Title style={styles.codeText}>{item.code}</Title>
          <View
            style={[
              styles.severityBadge,
              {backgroundColor: getSeverityColor(item.severity || 'low')},
            ]}>
            <Text style={styles.severityText}>
              {item.brand ? item.brand.toUpperCase() : 'GÉNÉRIQUE'}
            </Text>
          </View>
        </View>
        <Paragraph style={styles.description}>{item.description}</Paragraph>
        <Divider style={styles.divider} />
        <View style={styles.priceRow}>
          <View style={styles.priceItem}>
            <Text style={styles.priceLabel}>Pièce (Local)</Text>
            <Text style={styles.priceValue}>
              {item.est_part_price_local.toLocaleString()} FCFA
            </Text>
          </View>
          <View style={styles.priceItem}>
            <Text style={styles.priceLabel}>Main d'œuvre</Text>
            <Text style={styles.priceValue}>
              {item.est_labor_cost.toLocaleString()} FCFA
            </Text>
          </View>
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher un code (ex: P0130)"
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={handleSearch}
        />
        <TextInput
          style={[styles.searchInput, styles.brandInput]}
          placeholder="Marque (Optionnel)"
          value={brand}
          onChangeText={setBrand}
          onSubmitEditing={handleSearch}
        />
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
          <Text style={styles.searchButtonText}>Filtrer</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#1976D2" style={styles.loader} />
      ) : (
        <FlatList
          data={dtcs}
          renderItem={renderItem}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Aucun code trouvé dans la base.</Text>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#f5f5f5'},
  searchContainer: {
    padding: 16,
    backgroundColor: 'white',
    elevation: 4,
  },
  searchInput: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    marginBottom: 8,
  },
  brandInput: {
    marginBottom: 12,
  },
  searchButton: {
    backgroundColor: '#1976D2',
    borderRadius: 8,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchButtonText: {color: 'white', fontWeight: 'bold'},
  loader: {marginTop: 40},
  listContent: {padding: 12},
  card: {marginBottom: 12, elevation: 2},
  codeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  codeText: {fontSize: 22, fontWeight: 'bold', color: '#1976D2'},
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  severityText: {fontSize: 10, fontWeight: 'bold', color: 'black'},
  description: {fontSize: 14, color: '#424242', marginBottom: 8},
  divider: {marginVertical: 8},
  priceRow: {flexDirection: 'row', justifyContent: 'space-between'},
  priceItem: {flex: 1},
  priceLabel: {fontSize: 12, color: '#757575'},
  priceValue: {fontSize: 14, fontWeight: 'bold', color: '#2E7D32'},
  emptyText: {textAlign: 'center', marginTop: 40, color: '#757575'},
});
