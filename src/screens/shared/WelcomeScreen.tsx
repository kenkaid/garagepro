import React, {useState, useEffect} from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Dimensions,
  Image,
  TouchableOpacity,
  Linking,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import {Text, Button, ActivityIndicator} from 'react-native-paper';
import {apiService} from '../../services/apiService';
import {useStore} from '../../store/useStore';
import {Colors, SharedStyles} from '../../styles/theme';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const {width, height} = Dimensions.get('window');

interface WelcomeItem {
  id: number;
  title: string;
  description: string;
  imageUrl: string | null;
  videoUrl: string | null;
}

export const WelcomeScreen: React.FC<{navigation: any}> = ({navigation}) => {
  const [items, setItems] = useState<WelcomeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const {isAuthenticated} = useStore();

  useEffect(() => {
    if (isAuthenticated) {
      navigation.reset({
        index: 0,
        routes: [{name: 'Main'}],
      });
      return;
    }
    loadWelcomeContent();
  }, [isAuthenticated, navigation]);

  const loadWelcomeContent = async () => {
    setLoading(true);
    try {
      const data = await apiService.getWelcomeContent();
      setItems(data);
    } catch (error) {
      console.error('Erreur chargement contenu accueil:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleScroll = (event: any) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / width);
    setActiveIndex(index);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Préparation de l'expérience...</Text>
      </View>
    );
  }

  const displayItems = items.length > 0 ? items : [
    {
      id: 0,
      title: "Bienvenue sur OBD-CI Connect",
      description: "Votre compagnon de route intelligent en Côte d'Ivoire. Suivez votre consommation, anticipez les pannes et gérez votre véhicule en toute simplicité.",
      imageUrl: null,
      videoUrl: null
    }
  ];

  return (
    <SafeAreaView style={SharedStyles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.background} />

      <View style={styles.header}>
        <Text variant="headlineSmall" style={styles.brandTitle}>
          OBD-CI
          <Text variant="headlineSmall" style={styles.brandPro}>
            Connect
          </Text>
        </Text>
      </View>

      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={styles.scrollView}>
        {displayItems.map((item, index) => (
          <View key={item.id || index} style={styles.slide}>
            <View style={styles.card}>
              <View style={styles.imageContainer}>
                {item.imageUrl ? (
                  <Image
                    source={{uri: item.imageUrl}}
                    style={styles.image}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.placeholderContainer}>
                    <Icon name="car-connected" size={100} color={Colors.secondary} />
                  </View>
                )}
              </View>

              <View style={styles.textContainer}>
                <Text variant="titleLarge" style={styles.title}>{item.title}</Text>
                <Text style={styles.description}>{item.description}</Text>

                {item.videoUrl && (
                  <Button
                    icon="play-circle"
                    mode="contained-tonal"
                    onPress={() => Linking.openURL(item.videoUrl!)}
                    style={styles.videoButton}
                    labelStyle={styles.videoButtonLabel}>
                    Découvrir en vidéo
                  </Button>
                )}
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.pagination}>
          {displayItems.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === activeIndex ? styles.activeDot : styles.inactiveDot,
              ]}
            />
          ))}
        </View>

        <View style={styles.buttonContainer}>
          <Button
            mode="contained"
            onPress={() => navigation.navigate('Login')}
            style={SharedStyles.primaryButton}
            contentStyle={styles.buttonContent}
            labelStyle={styles.buttonLabel}>
            Commencer
          </Button>

          <TouchableOpacity
            onPress={() => navigation.navigate('Register')}
            activeOpacity={0.7}
            style={styles.registerLinkContainer}>
            <Text style={styles.registerText}>
              Nouveau ici ? <Text style={styles.registerHighlight}>Créer un compte</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  header: {
    paddingTop: 20,
    alignItems: 'center',
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
  },
  brandPro: {
    color: Colors.primary,
  },
  loadingText: {
    marginTop: 20,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  slide: {
    width: width,
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 10},
    shadowOpacity: 0.1,
    shadowRadius: 15,
    overflow: 'hidden',
    paddingBottom: 25,
  },
  imageContainer: {
    width: '100%',
    height: height * 0.35,
    backgroundColor: Colors.divider,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
  },
  textContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    color: Colors.primary,
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    color: Colors.textSecondary,
    marginBottom: 20,
  },
  videoButton: {
    borderRadius: 12,
  },
  videoButtonLabel: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  footer: {
    paddingHorizontal: 25,
    paddingBottom: 30,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 25,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  activeDot: {
    width: 24,
    backgroundColor: Colors.primary,
  },
  inactiveDot: {
    width: 8,
    backgroundColor: Colors.border,
  },
  buttonContainer: {
    width: '100%',
  },
  buttonContent: {
    height: 56,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  registerLinkContainer: {
    marginTop: 20,
    paddingVertical: 5,
  },
  registerText: {
    textAlign: 'center',
    color: Colors.textSecondary,
    fontSize: 14,
  },
  registerHighlight: {
    color: Colors.primary,
    fontWeight: 'bold',
  },
});
