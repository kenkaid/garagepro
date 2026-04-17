// src/screens/UpcomingModulesScreen.tsx
import React, {useState, useEffect} from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  FlatList,
  RefreshControl,
  Text,
  useWindowDimensions,
} from 'react-native';
import {Card, Title, Paragraph, Badge, Chip, ActivityIndicator, Divider} from 'react-native-paper';
import RenderHtml from 'react-native-render-html';
import {apiService} from '../../services/apiService';

export const UpcomingModulesScreen: React.FC = () => {
  const {width} = useWindowDimensions();
  const [modules, setModules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchModules = async () => {
    setLoading(true);
    const data = await apiService.getUpcomingModules();
    setModules(data);
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    const data = await apiService.getUpcomingModules();
    setModules(data);
    setRefreshing(false);
  };

  useEffect(() => {
    fetchModules();
  }, []);

  const getPlanColor = (plans: any[]) => {
    if (!plans || plans.length === 0) return '#757575';
    // On prend la couleur du plan le plus élevé si plusieurs
    const tiers = plans.map(p => p.tier);
    if (tiers.includes('ULTIMATE')) return '#6200EE';
    if (tiers.includes('PREMIUM')) return '#03DAC6';
    if (tiers.includes('BASIC')) return '#2196F3';
    return '#757575';
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Bientôt';
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', {
      month: 'long',
      year: 'numeric'
    });
  };

  const renderModule = ({item}: {item: any}) => (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.headerRow}>
          <Title style={styles.moduleName}>{item.name}</Title>
          <Badge style={styles.dateBadge}>Prévu: {formatDate(item.expectedReleaseDate || item.expected_release_date)}</Badge>
        </View>
        <Divider style={styles.divider} />
        {item.description_html ? (
          <RenderHtml
            contentWidth={width - 64}
            source={{ html: item.description_html }}
            baseStyle={styles.description}
          />
        ) : (
          <Paragraph style={styles.description}>{item.description}</Paragraph>
        )}

        <View style={styles.footer}>
          <Text style={styles.planLabel}>Inclus dans :</Text>
          {item.applicablePlans && item.applicablePlans.length > 0 ? (
            <View style={styles.planChipsContainer}>
              {item.applicablePlans.map((plan: any) => (
                <Chip
                  key={plan.id}
                  style={[styles.planChip, {backgroundColor: getPlanColor([plan]), marginRight: 4, marginBottom: 4}]}
                  textStyle={styles.planChipText}
                >
                  {plan.name}
                </Chip>
              ))}
            </View>
          ) : (
            <Chip
              style={[styles.planChip, {backgroundColor: '#757575'}]}
              textStyle={styles.planChipText}
            >
              Tous les plans
            </Chip>
          )}
        </View>
      </Card.Content>
    </Card>
  );

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1976D2" />
        <Text style={styles.loadingText}>Chargement des nouveautés...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>🚀 Modules en préparation</Text>
        <Text style={styles.infoSubtitle}>
          Découvrez les fonctionnalités sur lesquelles nous travaillons pour améliorer votre quotidien.
        </Text>
      </View>

      <FlatList
        data={modules}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderModule}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1976D2']} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Aucun module prévu pour le moment.</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#757575',
  },
  infoBox: {
    padding: 20,
    backgroundColor: '#1976D2',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    marginBottom: 10,
  },
  infoTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  infoSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    marginTop: 5,
    fontSize: 14,
  },
  listContent: {
    padding: 12,
  },
  card: {
    marginBottom: 16,
    elevation: 3,
    borderRadius: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  moduleName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1976D2',
    flex: 1,
  },
  dateBadge: {
    backgroundColor: '#FFC107',
    color: 'black',
    fontWeight: 'bold',
    paddingHorizontal: 8,
    height: 24,
  },
  divider: {
    marginVertical: 10,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: '#424242',
  },
  footer: {
    marginTop: 15,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  planLabel: {
    fontSize: 13,
    color: '#757575',
    marginRight: 8,
    marginTop: 4,
  },
  planChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    flex: 1,
  },
  planChip: {
    height: 28,
  },
  planChipText: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#757575',
    textAlign: 'center',
  },
});
