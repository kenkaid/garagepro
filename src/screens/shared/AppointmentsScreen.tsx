import React, {useState, useEffect, useCallback} from 'react';
import {View, StyleSheet, FlatList, RefreshControl} from 'react-native';
import {
  Text,
  Card,
  Badge,
  Button,
  IconButton,
  Divider,
  useTheme,
  ActivityIndicator,
} from 'react-native-paper';
import {apiService} from '../../services/apiService';
import {useNavigation} from '@react-navigation/native';
import {useStore} from '../../store/useStore';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

export const AppointmentsScreen = () => {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation<any>();
  const {user} = useStore();
  const theme = useTheme();

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    const data = await apiService.getAppointments();
    // Trier par date la plus proche (les rdv futurs en premier)
    // Mais ici l'utilisateur semble parler de l'affichage chronologique inverse (le plus récent créé d'abord ?)
    // En général pour les rendez-vous, on veut voir les plus proches dans le futur en premier.
    const sorted = data.sort(
      (a: any, b: any) =>
        new Date(b.appointment_date).getTime() -
        new Date(a.appointment_date).getTime(),
    );
    setAppointments(sorted);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAppointments();
    setRefreshing(false);
  };

  const handleStatusChange = async (id: number, status: string) => {
    const result = await apiService.updateAppointmentStatus(id, status);
    if (result) {
      // Mettre à jour localement pour feedback immédiat
      setAppointments(prev =>
        prev.map(apt => (apt.id === id ? {...apt, status} : apt)),
      );
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return '#4CAF50';
      case 'CANCELLED':
        return '#F44336';
      case 'COMPLETED':
        return '#2196F3';
      default:
        return '#FF9800'; // PENDING
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'En attente';
      case 'CONFIRMED':
        return 'Confirmé';
      case 'CANCELLED':
        return 'Annulé';
      case 'COMPLETED':
        return 'Terminé';
      default:
        return status;
    }
  };

  const renderItem = ({item}: {item: any}) => {
    const isPro = user?.user_type === 'MECHANIC';
    const otherParty = isPro
      ? item.client_name || 'Client'
      : item.mechanic_name || 'Garage';
    const date = new Date(item.appointment_date);
    const formattedDate = date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <View style={styles.headerInfo}>
              <Text variant="titleMedium" style={styles.otherPartyName}>
                {otherParty}
              </Text>
              <Text variant="bodySmall" style={styles.dateText}>
                {formattedDate}
              </Text>
            </View>
            <Badge
              style={[
                styles.statusBadge,
                {backgroundColor: getStatusColor(item.status)},
              ]}>
              {getStatusLabel(item.status)}
            </Badge>
          </View>

          <Divider style={styles.divider} />

          <View style={styles.detailsRow}>
            <MaterialCommunityIcons
              name="car"
              size={20}
              color={theme.colors.primary}
            />
            <Text variant="bodyMedium" style={styles.detailText}>
              {item.vehicle_name || 'Véhicule non précisé'}
            </Text>
          </View>

          {item.reason && (
            <View style={styles.detailsRow}>
              <MaterialCommunityIcons
                name="information-outline"
                size={20}
                color={theme.colors.primary}
              />
              <Text variant="bodyMedium" style={styles.detailText}>
                {item.reason}
              </Text>
            </View>
          )}

          <View style={styles.actions}>
            <Button
              mode="outlined"
              onPress={() =>
                navigation.navigate('ChatDetail', {
                  appointmentId: item.id,
                  receiverId: isPro ? item.client : item.mechanic_user_id,
                  title: otherParty,
                })
              }
              icon="chat-outline"
              style={styles.actionButton}>
              Chat
            </Button>

            {isPro && item.status === 'PENDING' && (
              <>
                <Button
                  mode="contained"
                  onPress={() => handleStatusChange(item.id, 'CONFIRMED')}
                  style={[styles.actionButton, {backgroundColor: '#4CAF50'}]}>
                  Confirmer
                </Button>
                <IconButton
                  icon="close-circle-outline"
                  iconColor="#F44336"
                  onPress={() => handleStatusChange(item.id, 'CANCELLED')}
                />
              </>
            )}

            {!isPro && item.status === 'PENDING' && (
              <Button
                mode="text"
                textColor="#F44336"
                onPress={() => handleStatusChange(item.id, 'CANCELLED')}
                style={styles.actionButton}>
                Annuler
              </Button>
            )}
          </View>
        </Card.Content>
      </Card>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={appointments}
        renderItem={renderItem}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons
              name="calendar-blank"
              size={80}
              color="#CCC"
            />
            <Text variant="titleMedium" style={styles.emptyText}>
              Aucun rendez-vous trouvé
            </Text>
            <Text variant="bodyMedium" style={styles.emptySubtext}>
              Vos rendez-vous s'afficheront ici.
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
    backgroundColor: '#FFF',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  headerInfo: {
    flex: 1,
  },
  otherPartyName: {
    fontWeight: 'bold',
    color: '#333',
  },
  dateText: {
    color: '#666',
    marginTop: 2,
  },
  statusBadge: {
    color: '#FFF',
    paddingHorizontal: 8,
  },
  divider: {
    marginVertical: 12,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    marginLeft: 12,
    color: '#444',
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 8,
  },
  actionButton: {
    marginLeft: 8,
  },
  emptyContainer: {
    marginTop: 100,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 16,
    color: '#666',
    fontWeight: 'bold',
  },
  emptySubtext: {
    color: '#999',
    marginTop: 8,
  },
});
