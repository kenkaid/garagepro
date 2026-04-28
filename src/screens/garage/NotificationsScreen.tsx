import React, {useState, useEffect} from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  Text,
  StyleSheet,
  TextInput,
  RefreshControl,
  Alert,
  Linking,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {apiService} from '../../services/apiService';

const NotificationsScreen = ({navigation}: any) => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'ALL' | 'UNREAD' | 'APPOINTMENT'>('ALL');

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const data = await apiService.getNotifications();
      setNotifications(data);
      applyFilters(data, search, filter);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const applyFilters = (data: any[], query: string, activeFilter: string) => {
    let result = [...data];

    if (query) {
      result = result.filter(
        n =>
          n.title.toLowerCase().includes(query.toLowerCase()) ||
          n.message.toLowerCase().includes(query.toLowerCase()),
      );
    }

    if (activeFilter === 'UNREAD') {
      result = result.filter(n => !n.is_read);
    } else if (activeFilter === 'APPOINTMENT') {
      result = result.filter(n => n.notification_type === 'APPOINTMENT');
    }

    setFilteredNotifications(result);
  };

  useEffect(() => {
    applyFilters(notifications, search, filter);
  }, [search, filter, notifications]);

  const handleMarkRead = async (id: number) => {
    try {
      await apiService.markNotificationRead(id);
      fetchNotifications();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleCall = (phone: string) => {
    if (phone && phone !== 'Non renseigné') {
      Linking.openURL(`tel:${phone}`);
    } else {
      Alert.alert('Erreur', 'Numéro de téléphone non disponible');
    }
  };

  const renderItem = ({item}: {item: any}) => {
    const isChat = item.notification_type === 'CHAT';
    
    return (
      <TouchableOpacity
        style={[styles.notificationCard, !item.is_read && styles.unreadCard]}
        onPress={() => {
          if (isChat) {
            navigation.navigate('Chat', {
              appointmentId: item.appointment,
              receiverId: item.client_id,
              title: item.client_name || 'Chat'
            });
            if (!item.is_read) handleMarkRead(item.id);
            return;
          }
          
          Alert.alert(item.title, item.message);
          if (!item.is_read) {
            handleMarkRead(item.id);
          }
        }}>
        <View style={styles.iconContainer}>
          <Icon
            name={
              item.notification_type === 'APPOINTMENT'
                ? 'calendar-clock'
                : isChat
                ? 'chat-processing-outline'
                : 'information'
            }
            size={24}
            color={item.is_read ? '#666' : '#1976D2'}
          />
        </View>
        <View style={styles.content}>
          <View style={styles.row}>
            <Text style={[styles.title, !item.is_read && styles.unreadText]}>
              {item.title}
            </Text>
            <Text style={styles.date}>
              {new Date(item.created_at).toLocaleDateString()}
            </Text>
          </View>
          <Text style={styles.message} numberOfLines={2}>
            {item.message}
          </Text>

          {(item.notification_type === 'APPOINTMENT' || isChat) && (
            <View style={styles.appointmentDetails}>
              {item.vehicle_details && (
                <View style={styles.detailRow}>
                  <Icon name="car" size={14} color="#666" />
                  <Text style={styles.detailText}>{item.vehicle_details}</Text>
                </View>
              )}
              <View style={styles.actionsRow}>
                {item.client_phone && (
                  <TouchableOpacity
                    style={styles.phoneAction}
                    onPress={() => handleCall(item.client_phone)}>
                    <Icon name="phone" size={14} color="#1976D2" />
                    <Text style={styles.phoneText}>{item.client_phone}</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.chatAction}
                  onPress={() => navigation.navigate('Chat', {
                    appointmentId: item.appointment,
                    receiverId: item.client_id,
                    title: item.client_name || 'Chat'
                  })}>
                  <Icon name="message-text-outline" size={14} color="#FFF" />
                  <Text style={styles.chatActionText}>{isChat ? 'Répondre' : 'Chat'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
        {!item.is_read && <View style={styles.dot} />}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TextInput
          style={styles.searchBar}
          placeholder="Rechercher une notification..."
          value={search}
          onChangeText={setSearch}
        />
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterBtn, filter === 'ALL' && styles.filterBtnActive]}
            onPress={() => setFilter('ALL')}>
            <Text style={[styles.filterText, filter === 'ALL' && styles.filterTextActive]}>Toutes</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterBtn, filter === 'UNREAD' && styles.filterBtnActive]}
            onPress={() => setFilter('UNREAD')}>
            <Text style={[styles.filterText, filter === 'UNREAD' && styles.filterTextActive]}>Non lues</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterBtn, filter === 'APPOINTMENT' && styles.filterBtnActive]}
            onPress={() => setFilter('APPOINTMENT')}>
            <Text style={[styles.filterText, filter === 'APPOINTMENT' && styles.filterTextActive]}>Rdv</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={filteredNotifications}
        renderItem={renderItem}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchNotifications} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="bell-off-outline" size={60} color="#ccc" />
            <Text style={styles.emptyText}>Aucune notification</Text>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.markAllBtn}
        onPress={async () => {
            await apiService.markNotificationsRead();
            fetchNotifications();
        }}
      >
          <Text style={styles.markAllText}>Tout marquer comme lu</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#f5f5f5'},
  header: {padding: 15, backgroundColor: '#fff', elevation: 2},
  searchBar: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginBottom: 10,
  },
  filterRow: {flexDirection: 'row'},
  filterBtn: {
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: '#eee',
  },
  filterBtnActive: {backgroundColor: '#1976D2'},
  filterText: {color: '#666', fontSize: 12},
  filterTextActive: {color: '#fff', fontWeight: 'bold'},
  list: {padding: 10},
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    alignItems: 'center',
    elevation: 1,
  },
  unreadCard: {backgroundColor: '#E3F2FD'},
  iconContainer: {marginRight: 15},
  content: {flex: 1},
  row: {flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5},
  title: {fontSize: 14, color: '#333', fontWeight: '500'},
  unreadText: {fontWeight: 'bold', color: '#000'},
  date: {fontSize: 10, color: '#999'},
  message: {fontSize: 12, color: '#666'},
  appointmentDetails: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  detailRow: {flexDirection: 'row', alignItems: 'center', marginBottom: 4},
  detailText: {fontSize: 12, color: '#666', marginLeft: 5},
  phoneAction: {flexDirection: 'row', alignItems: 'center'},
  phoneText: {
    fontSize: 12,
    color: '#1976D2',
    marginLeft: 5,
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 5,
  },
  chatAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1976D2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  chatActionText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  dot: {width: 8, height: 8, borderRadius: 4, backgroundColor: '#1976D2', marginLeft: 10},
  emptyContainer: {alignItems: 'center', marginTop: 100},
  emptyText: {marginTop: 10, color: '#999'},
  markAllBtn: {
      backgroundColor: '#fff',
      padding: 15,
      alignItems: 'center',
      borderTopWidth: 1,
      borderTopColor: '#eee'
  },
  markAllText: {color: '#1976D2', fontWeight: 'bold'}
});

export default NotificationsScreen;
