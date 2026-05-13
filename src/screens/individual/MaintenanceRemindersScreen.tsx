import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as ReactNavigation from '@react-navigation/native';
const { useFocusEffect } = ReactNavigation;
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import apiIndividualService from '../../services/individual/apiIndividualService';

const MaintenanceRemindersScreen = ({navigation}: any) => {
  const [reminders, setReminders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchReminders = async () => {
    try {
      const data = await apiIndividualService.getReminders();
      setReminders(data);
    } catch (error) {
      console.error(error);
      Alert.alert('Erreur', 'Impossible de charger les rappels.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchReminders();
    }, []),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchReminders();
  };

  const handleMarkCompleted = async (id: number) => {
    try {
      await apiIndividualService.markReminderCompleted(id);
      fetchReminders();
      Alert.alert('Succès', 'Rappel marqué comme effectué.');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de mettre à jour le rappel.');
    }
  };

  const renderItem = ({item}: {item: any}) => (
    <View style={[styles.card, item.is_completed && styles.cardCompleted]}>
      <View style={styles.cardHeader}>
        <View
          style={[
            styles.iconContainer,
            {backgroundColor: item.reminder_type === 'KM' ? '#E3F2FD' : '#FFF3E0'},
          ]}>
          <Icon
            name={item.reminder_type === 'KM' ? 'wrench' : 'weather-cloudy'}
            size={24}
            color={item.reminder_type === 'KM' ? '#1976D2' : '#F57C00'}
          />
        </View>
        <View style={{flex: 1, marginLeft: 15}}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.description}>{item.description}</Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.infoRow}>
          <Icon name="calendar-clock" size={16} color="#666" />
          <Text style={styles.infoText}>
            Échéance : {new Date(item.due_date).toLocaleDateString('fr-FR')}
          </Text>
        </View>
        {!item.is_completed && (
          <TouchableOpacity
            style={styles.doneButton}
            onPress={() => handleMarkCompleted(item.id)}>
            <Icon name="check-circle-outline" size={20} color="#4CAF50" />
            <Text style={styles.doneButtonText}>Fait</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1976D2" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={reminders}
        keyExtractor={item => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="bell-off-outline" size={60} color="#ccc" />
            <Text style={styles.emptyText}>Aucun rappel pour le moment</Text>
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
  listContent: {
    padding: 15,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardCompleted: {
    opacity: 0.6,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 15,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 5,
  },
  doneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  doneButtonText: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 50,
  },
  emptyText: {
    marginTop: 10,
    fontSize: 16,
    color: '#999',
  },
});

export default MaintenanceRemindersScreen;
