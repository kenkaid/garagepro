import React, {useEffect, useState} from 'react';
import {View, StyleSheet, ScrollView, RefreshControl, Dimensions, Platform, Text as RNText} from 'react-native';
import {Card, Avatar, List, Surface, Text} from 'react-native-paper';
import {apiService} from '../../services/apiService';
import {useStore} from '../../store/useStore';

const {width} = Dimensions.get('window');

export const DashboardScreen: React.FC = () => {
  const {user} = useStore();
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchReport = async () => {
    setLoading(true);
    const data = await apiService.getMyReport();
    if (data) {
      setReport(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchReport();
  }, []);

  // Calcul pour le graphique en barres
  const maxRevenue = report?.monthly_history
    ? Math.max(...report.monthly_history.map((h: any) => h.revenue), 1000)
    : 1000;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={fetchReport} />
      }
    >
      <Surface style={styles.header} elevation={4}>
        <Text variant="titleLarge" style={styles.headerTitle}>Bilan Financier</Text>
        <RNText style={styles.headerSubtitle}>{user?.shop_name || 'Mon Garage'}</RNText>
      </Surface>

      <View style={styles.statsGrid}>
        <Card style={styles.mainCard}>
          <Card.Content style={styles.mainCardContent}>
            <RNText style={styles.label}>CHIFFRE D'AFFAIRES TOTAL</RNText>
            <Text variant="headlineMedium" style={styles.revenue}>
              {report?.total_revenue?.toLocaleString() || '0'} {report?.currency || 'FCFA'}
            </Text>
          </Card.Content>
        </Card>

        <View style={styles.row}>
          <Card style={styles.smallCard}>
            <Card.Content style={styles.centered}>
              <Avatar.Icon size={40} icon="check-circle" style={styles.iconBlue} />
              <RNText style={styles.smallLabel}>TRAVAUX FINIS</RNText>
              <Text variant="titleLarge" style={styles.smallValue}>{report?.total_scans_completed || 0}</Text>
            </Card.Content>
          </Card>

          <Card style={styles.smallCard}>
            <Card.Content style={styles.centered}>
              <Avatar.Icon size={40} icon="trending-up" style={styles.iconGreen} />
              <RNText style={styles.smallLabel}>MOYENNE / SCAN</RNText>
              <Text variant="titleLarge" style={styles.smallValue}>
                {report?.total_scans_completed > 0
                  ? Math.round(report.total_revenue / report.total_scans_completed).toLocaleString()
                  : '0'}
              </Text>
            </Card.Content>
          </Card>
        </View>
      </View>

      <Text variant="titleMedium" style={styles.sectionTitle}>Évolution (6 derniers mois)</Text>
      <Card style={styles.chartCard}>
        <View style={styles.chartContainer}>
          {report?.monthly_history?.map((item: any, index: number) => (
            <View key={index} style={styles.barWrapper}>
              <View
                style={[
                  styles.bar,
                  { height: (item.revenue / maxRevenue) * 100 + 5 }
                ]}
              />
              <RNText style={styles.barLabel}>{item.month}</RNText>
            </View>
          ))}
        </View>
      </Card>

      <Text variant="titleMedium" style={styles.sectionTitle}>Détails des gains</Text>
      <Card style={styles.listCard}>
        <List.Item
          title="Main d'œuvre"
          description="Total cumulé sur vos diagnostics terminés"
          left={props => <List.Icon {...props} icon="account-hard-hat" />}
          right={() => (
            <RNText style={styles.listValue}>
              {report?.total_labor?.toLocaleString() || '0'} {report?.currency}
            </RNText>
          )}
        />
        <List.Item
          title="Pièces détachées"
          description="Total des pièces facturées via l'app"
          left={props => <List.Icon {...props} icon="cog" />}
          right={() => (
            <RNText style={styles.listValue}>
              {report?.total_parts?.toLocaleString() || '0'} {report?.currency}
            </RNText>
          )}
        />
      </Card>

      <RNText style={styles.info}>
        * Ce bilan est calculé sur la base des diagnostics marqués comme "Terminés" sur le serveur.
      </RNText>
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
    paddingTop: Platform.OS === 'ios' ? 20 : 10,
    backgroundColor: '#1976D2',
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
  statsGrid: {
    padding: 15,
  },
  mainCard: {
    marginBottom: 15,
    backgroundColor: 'white',
    elevation: 2,
    borderRadius: 12,
  },
  mainCardContent: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  label: {
    color: '#757575',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
  },
  revenue: {
    fontSize: 28,
    color: '#4CAF50',
    textAlign: 'center',
    fontWeight: 'bold',
    minHeight: 40,
    lineHeight: 35,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  smallCard: {
    width: '48%',
    backgroundColor: 'white',
    elevation: 2,
    borderRadius: 12,
  },
  centered: {
    alignItems: 'center',
  },
  smallLabel: {
    fontSize: 10,
    color: '#757575',
    marginTop: 10,
    fontWeight: 'bold',
  },
  smallValue: {
    fontSize: 18,
    color: '#1976D2',
    fontWeight: 'bold',
  },
  iconBlue: {
    backgroundColor: '#E3F2FD',
  },
  iconGreen: {
    backgroundColor: '#E8F5E9',
  },
  sectionTitle: {
    marginLeft: 20,
    fontSize: 18,
    color: '#333',
    marginTop: 10,
    fontWeight: 'bold',
  },
  chartCard: {
    margin: 15,
    padding: 15,
    borderRadius: 12,
    backgroundColor: 'white',
    elevation: 2,
  },
  chartContainer: {
    flexDirection: 'row',
    height: 150,
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    paddingTop: 20,
  },
  barWrapper: {
    alignItems: 'center',
    flex: 1,
  },
  bar: {
    width: 25,
    backgroundColor: '#1976D2',
    borderRadius: 5,
  },
  barLabel: {
    fontSize: 10,
    color: '#757575',
    marginTop: 5,
  },
  listCard: {
    margin: 15,
    borderRadius: 12,
  },
  listValue: {
    alignSelf: 'center',
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  info: {
    padding: 20,
    textAlign: 'center',
    color: '#9e9e9e',
    fontSize: 12,
    fontStyle: 'italic',
  },
});
