import React, {useState, useCallback} from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import {
  Text,
  Avatar,
  Badge,
  Divider,
  ActivityIndicator,
} from 'react-native-paper';
import * as ReactNavigation from '@react-navigation/native';
const { useFocusEffect } = ReactNavigation;
import {apiService} from '../../services/apiService';
import {Colors} from '../../styles/theme';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export const ChatScreen: React.FC<{navigation: any}> = ({navigation}) => {
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadConversations = async () => {
    try {
      const data = await apiService.getConversations();
      setConversations(data);
    } catch (error) {
      console.error('loadConversations error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadConversations();
    }, []),
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadConversations();
  };

  const renderItem = ({item}: {item: any}) => {
    const lastDate = new Date(item.last_message_date);
    const timeStr = lastDate.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    // Si la date n'est pas aujourd'hui, on met la date
    const isToday = lastDate.toDateString() === new Date().toDateString();
    const displayTime = isToday ? timeStr : lastDate.toLocaleDateString();

    return (
      <TouchableOpacity
        onPress={() => {
          // Marquer comme lu immédiatement pour feedback visuel
          apiService.markChatAsRead({
            appointment_id: item.appointment_id,
            other_user_id: item.other_user_id,
          });

          navigation.navigate('ChatDetail', {
            appointmentId: item.appointment_id,
            receiverId: item.other_user_id,
            title: item.title,
          });
        }}>
        <View style={styles.convCard}>
          <View style={styles.avatarContainer}>
            <Avatar.Text
              size={50}
              label={item.title?.substring(0, 2).toUpperCase() || '?'}
              style={styles.avatar}
            />
            {item.unread_count > 0 && (
              <Badge style={styles.badge} size={22}>
                {item.unread_count}
              </Badge>
            )}
          </View>
          <View style={styles.content}>
            <View style={styles.row}>
              <Text style={styles.title} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={styles.time}>{displayTime}</Text>
            </View>
            <View style={styles.row}>
              <Text
                style={[
                  styles.lastMessage,
                  item.unread_count > 0 && styles.unreadText,
                ]}
                numberOfLines={1}>
                {item.last_message}
              </Text>
              {item.appointment_id && (
                <Icon name="calendar-check" size={16} color="#999" style={{marginLeft: 5}} />
              )}
            </View>
          </View>
        </View>
        <Divider />
      </TouchableOpacity>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={conversations}
        keyExtractor={item => item.other_user_id.toString()}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="chat-sleep-outline" size={80} color="#CCC" />
            <Text style={styles.emptyText}>Aucune discussion pour le moment.</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  convCard: {
    flexDirection: 'row',
    padding: 15,
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    backgroundColor: Colors.primary,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#F44336',
  },
  content: {
    flex: 1,
    marginLeft: 15,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 10,
  },
  time: {
    fontSize: 12,
    color: '#999',
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  unreadText: {
    color: '#000',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 100,
    padding: 20,
  },
  emptyText: {
    marginTop: 15,
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
});
