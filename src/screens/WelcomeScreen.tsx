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
import {Text, Title, Button, ActivityIndicator, Surface} from 'react-native-paper';
import {apiService} from '../services/apiService';

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

  useEffect(() => {
    loadWelcomeContent();
  }, []);

  const loadWelcomeContent = async () => {
    setLoading(true);
    try {
      const data = await apiService.getWelcomeContent();
      console.log('Données reçues WelcomeContent:', JSON.stringify(data, null, 2));
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
        <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <ActivityIndicator size="large" color="#1976D2" />
        <Text style={styles.loadingText}>Préparation de l'expérience...</Text>
      </View>
    );
  }

  const displayItems = items.length > 0 ? items : [
    {
      id: 0,
      title: "Bienvenue sur Garagiste Pro",
      description: "La solution n°1 pour les mécaniciens modernes d'Afrique. Diagnostiquez, gérez et développez votre activité.",
      imageUrl: null,
      videoUrl: null
    }
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      <View style={styles.header}>
        <Title style={styles.brandTitle}>Garagiste<Text style={styles.brandPro}>Pro</Text></Title>
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
            <Surface style={styles.card}>
              <View style={styles.imageContainer}>
                {item.imageUrl ? (
                  <Image
                    source={{uri: item.imageUrl}}
                    style={styles.image}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.placeholderContainer}>
                    <Text style={styles.placeholderLogo}>👨‍🔧</Text>
                  </View>
                )}
              </View>
              
              <View style={styles.textContainer}>
                <Title style={styles.title}>{item.title}</Title>
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
            </Surface>
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
            style={styles.loginButton}
            contentStyle={styles.buttonContent}
            labelStyle={styles.buttonLabel}>
            Se connecter / S'abonner
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
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  header: {
    paddingTop: 20,
    alignItems: 'center',
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#333',
    letterSpacing: -0.5,
  },
  brandPro: {
    color: '#1976D2',
  },
  loadingText: {
    marginTop: 20,
    color: '#757575',
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  slide: {
    width: width,
    flex: 1,
    padding: 25,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
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
    backgroundColor: '#F5F5F5',
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
  placeholderLogo: {
    fontSize: 100,
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
    color: '#1976D2',
    lineHeight: 28,
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    color: '#616161',
    marginBottom: 20,
  },
  videoButton: {
    marginTop: 5,
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
    backgroundColor: '#1976D2',
  },
  inactiveDot: {
    width: 8,
    backgroundColor: '#E0E0E0',
  },
  buttonContainer: {
    width: '100%',
  },
  loginButton: {
    backgroundColor: '#1976D2',
    borderRadius: 16,
    elevation: 2,
  },
  buttonContent: {
    height: 56,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    textTransform: 'none',
  },
  registerLinkContainer: {
    marginTop: 20,
    paddingVertical: 5,
  },
  registerText: {
    textAlign: 'center',
    color: '#757575',
    fontSize: 14,
  },
  registerHighlight: {
    color: '#1976D2',
    fontWeight: 'bold',
  },
});
