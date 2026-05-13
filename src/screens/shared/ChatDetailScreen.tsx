import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  TextInput,
  IconButton,
  Text,
  Surface,
  ActivityIndicator,
} from 'react-native-paper';
import {apiService} from '../../services/apiService';
import {useStore} from '../../store/useStore';
import {notificationSoundService} from '../../services/NotificationSoundService';

export const ChatDetailScreen: React.FC<{route: any; navigation: any}> = ({
  route,
  navigation,
}) => {
  const {appointmentId, receiverId, title} = route.params;
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const {user} = useStore();

  const loadMessages = async () => {
    try {
      const data = await apiService.getMessages(appointmentId, receiverId);

      // Trier par date pour garantir l'ordre chronologique (du plus ancien au plus récent)
      const sortedData = data.sort((a: any, b: any) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

      // Si on a de nouveaux messages (venant de l'autre), on joue un son
      if (messages.length > 0 && sortedData.length > messages.length) {
          const lastNew = sortedData[sortedData.length - 1];
          if (!lastNew.is_me) {
              notificationSoundService.play();
          }
      }

      setMessages(sortedData);
      if (loading) setLoading(false);
      
      // Forcer le scroll à la fin après le chargement des données
      setTimeout(() => {
          flatListRef.current?.scrollToEnd({animated: loading ? false : true});
      }, 150);

      // Si on a des messages non lus, on les marque comme lus
      const hasUnread = sortedData.some((m: any) => !m.is_me && !m.is_read);
      if (hasUnread) {
          markAsRead();
      }
    } catch (error) {
      console.error('loadMessages error:', error);
    }
  };

  const markAsRead = async () => {
      try {
          await apiService.markChatAsRead({
              appointment_id: appointmentId,
              other_user_id: receiverId
          });
      } catch (e) {
          console.error("Erreur markAsRead:", e);
      }
  };

  useEffect(() => {
    navigation.setOptions({title: title || 'Chat'});
    loadMessages();
    markAsRead();

    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, [appointmentId, receiverId]);

  const handleSend = async () => {
    if (!newMessage.trim()) return;

    setSending(true);
    try {
      const result = await apiService.sendMessage(
        receiverId,
        newMessage,
        appointmentId,
      );
      if (result) {
        setNewMessage('');
        loadMessages();
        // Scroll to bottom
        setTimeout(() => flatListRef.current?.scrollToEnd(), 200);
      }
    } catch (error) {
      console.error('handleSend error:', error);
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({item, index}: {item: any; index: number}) => {
    const isMe = item.is_me;

    // Groupement des messages (si même expéditeur que le précédent)
    const prevMsg = index > 0 ? messages[index - 1] : null;
    const isSameSender = prevMsg && prevMsg.sender === item.sender;

    // Date separator
    const showDate = !prevMsg ||
        new Date(prevMsg.created_at).toDateString() !== new Date(item.created_at).toDateString();

    const date = new Date(item.created_at);
    const dateStr = date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    const timeStr = date.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});

    return (
      <View>
        {showDate && (
            <View style={styles.dateSeparator}>
                <Surface style={styles.dateBadge} elevation={1}>
                    <Text style={styles.dateText}>{dateStr}</Text>
                </Surface>
            </View>
        )}
        <View
            style={[
            styles.messageWrapper,
            isMe ? styles.myMessageWrapper : styles.otherMessageWrapper,
            isSameSender && { marginTop: 2 }
            ]}>
            <Surface
            style={[
                styles.messageBubble,
                isMe ? styles.myBubble : styles.otherBubble,
            ]}
            elevation={1}>
            <Text style={[styles.messageText, isMe ? styles.myText : styles.otherText]}>
                {item.message}
            </Text>
            <Text style={[styles.timeText, isMe ? styles.myTime : styles.otherTime]}>
                {timeStr} {isMe && (item.is_read ? '✓✓' : '✓')}
            </Text>
            </Surface>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
      {loading ? (
        <ActivityIndicator style={styles.loader} />
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id.toString()}
          renderItem={renderMessage}
          contentContainerStyle={styles.listContent}
          initialNumToRender={20}
          onContentSizeChange={() => {
              if (messages.length > 0) {
                  flatListRef.current?.scrollToEnd({animated: true});
              }
          }}
          onLayout={() => {
              if (messages.length > 0) {
                  flatListRef.current?.scrollToEnd({animated: false});
              }
          }}
        />
      )}

      <Surface style={styles.inputContainer} elevation={4}>
        <TextInput
          placeholder="Écrivez votre message..."
          value={newMessage}
          onChangeText={setNewMessage}
          style={styles.input}
          multiline
        />
        <IconButton
          icon="send"
          iconColor="#1976D2"
          size={28}
          onPress={handleSend}
          disabled={sending || !newMessage.trim()}
        />
      </Surface>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F2F5', // Couleur fond WhatsApp
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 10,
    paddingBottom: 20,
  },
  dateSeparator: {
    alignItems: 'center',
    marginVertical: 15,
  },
  dateBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#FFF',
  },
  dateText: {
    fontSize: 12,
    color: '#546E7A',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  messageWrapper: {
    flexDirection: 'row',
    marginBottom: 4,
    maxWidth: '85%',
  },
  myMessageWrapper: {
    alignSelf: 'flex-end',
  },
  otherMessageWrapper: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 15,
  },
  myBubble: {
    backgroundColor: '#DCF8C6',
    borderTopRightRadius: 2,
  },
  otherBubble: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 2,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  myText: {
    color: '#000',
  },
  otherText: {
    color: '#000',
  },
  timeText: {
    fontSize: 10,
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  myTime: {
    color: '#667781',
  },
  otherTime: {
    color: '#667781',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#FFF',
  },
  input: {
    flex: 1,
    maxHeight: 100,
    backgroundColor: 'transparent',
    fontSize: 16,
  },
});
