import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  Text,
  StyleSheet,
  TextInput,
  RefreshControl,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {apiService} from '../../services/apiService';

const POLL_INTERVAL = 15000; // 15 secondes

const IndividualNotificationsScreen = ({navigation}: any) => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'ALL' | 'UNREAD' | 'CHAT'>('ALL');
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchNotifications = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await apiService.getNotifications();
      console.log('[IndividualNotifications] data reçue:', data?.length, JSON.stringify(data?.slice(0,2)));
      setNotifications(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('[IndividualNotifications] ERREUR fetchNotifications:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Polling en temps réel
  useEffect(() => {
    fetchNotifications();
    pollingRef.current = setInterval(() => fetchNotifications(true), POLL_INTERVAL);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  // Filtrage
  useEffect(() => {
    let result = [...notifications];
    if (search) {
      result = result.filter(
        n =>
          n.title?.toLowerCase().includes(search.toLowerCase()) ||
          n.message?.toLowerCase().includes(search.toLowerCase()),
      );
    }
    if (filter === 'UNREAD') {
      result = result.filter(n => !n.is_read);
    } else if (filter === 'CHAT') {
      result = result.filter(n => n.notification_type === 'CHAT');
    }
    setFilteredNotifications(result);
  }, [search, filter, notifications]);

  const handleMarkRead = async (id: number) => {
    try {
      await apiService.markNotificationRead(id);
      setNotifications(prev =>
        prev.map(n => (n.id === id ? {...n, is_read: true} : n)),
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleOpenChat = (item: any) => {
    // Côté Individual : le destinataire est le mécanicien
    const receiverId = item.mechanic_id;
    const title = item.mechanic_name || 'Mécanicien';
    if (!receiverId) {
      Alert.alert('Erreur', 'Impossible d\'identifier le mécanicien pour ce chat.');
      return;
    }
    navigation.navigate('Chat', {
      appointmentId: item.appointment,
      receiverId,
      title,
    });
    if (!item.is_read) handleMarkRead(item.id);
  };

  const renderItem = ({item}: {item: any}) => {
    const isChat = item.notification_type === 'CHAT';
    const isAppointment = item.notification_type === 'APPOINTMENT';

    return (
      <TouchableOpacity
        style={[styles.notificationCard, !item.is_read && styles.unreadCard]}
        onPress={() => {
          if (isChat) {
            handleOpenChat(item);
            return;
          }
          Alert.alert(item.title, item.message);
          if (!item.is_read) handleMarkRead(item.id);
        }}>
        <View style={styles.iconContainer}>
          <Icon
            name={
              isAppointment
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

          {(isAppointment || isChat) && (
            <View style={styles.appointmentDetails}>
              {item.vehicle_details && (
                <View style={styles.detailRow}>
                  <Icon name="car" size={14} color="#666" />
                  <Text style={styles.detailText}>{item.vehicle_details}</Text>
                </View>
              )}
              {item.mechanic_name && (
                <View style={styles.detailRow}>
                  <Icon name="wrench" size={14} color="#666" />
                  <Text style={styles.detailText}>{item.mechanic_name}</Text>
                </View>
              )}
              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={styles.chatAction}
                  onPress={() => handleOpenChat(item)}>
                  <Icon name="message-text-outline" size={14} color="#FFF" />
                  <Text style={styles.chatActionText}>
                    {isChat ? 'Répondre' : 'Contacter le mécanicien'}
                  </Text>
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
          {(['ALL', 'UNREAD', 'CHAT'] as const).map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
              onPress={() => setFilter(f)}>
              <Text
                style={[
                  styles.filterText,
                  filter === f && styles.filterTextActive,
                ]}>
                {f === 'ALL' ? 'Toutes' : f === 'UNREAD' ? 'Non lues' : 'Messages'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={filteredNotifications}
        renderItem={renderItem}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => fetchNotifications()}
          />
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
        }}>
        <Text style={styles.markAllText}>Tout marquer comme lu</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#F5F5F5'},
  header: {backgroundColor: '#FFF', padding: 12, elevation: 2},
  searchBar: {
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    marginBottom: 8,
  },
  filterRow: {flexDirection: 'row', gap: 8},
  filterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F0F0F0',
  },
  filterBtnActive: {backgroundColor: '#1976D2'},
  filterText: {fontSize: 12, color: '#666'},
  filterTextActive: {color: '#FFF', fontWeight: 'bold'},
  list: {padding: 12, gap: 10},
  notificationCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  unreadCard: {borderLeftWidth: 4, borderLeftColor: '#1976D2'},
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  content: {flex: 1},
  row: {flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4},
  title: {fontSize: 14, fontWeight: '600', color: '#333', flex: 1},
  unreadText: {color: '#1976D2'},
  date: {fontSize: 11, color: '#999', marginLeft: 8},
  message: {fontSize: 13, color: '#666', lineHeight: 18},
  appointmentDetails: {marginTop: 10},
  detailRow: {flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4},
  detailText: {fontSize: 12, color: '#555'},
  actionsRow: {flexDirection: 'row', gap: 8, marginTop: 8},
  chatAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1976D2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  chatActionText: {color: '#FFF', fontSize: 12, fontWeight: '600'},
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#1976D2',
    marginLeft: 8,
    marginTop: 4,
  },
  emptyContainer: {alignItems: 'center', paddingTop: 60},
  emptyText: {color: '#999', marginTop: 12, fontSize: 15},
  markAllBtn: {
    margin: 12,
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  markAllText: {color: '#1976D2', fontWeight: '600', fontSize: 13},
});

export default IndividualNotificationsScreen;
