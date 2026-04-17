import React, {useState, useEffect} from 'react';
import {View, StyleSheet, ScrollView, TouchableOpacity, Image, Alert, Text as RNText} from 'react-native';
import {
  Button,
  Card,
  List,
  ActivityIndicator,
  IconButton,
  Divider,
  Portal,
  Dialog,
  Avatar,
  TextInput,
  Text,
} from 'react-native-paper';
import {apiService} from '../../services/apiService';
import {useStore} from '../../store/useStore';

export const FleetSubscriptionScreen: React.FC<{navigation: any}> = ({navigation}) => {
  const {user, setUser} = useStore();
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // États pour le paiement (réutilisé de ProfileScreen)
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [showQuotation, setShowQuotation] = useState(false);
  const [durationMonths, setDurationMonths] = useState('1');
  const [quotation, setQuotation] = useState<any>(null);
  const [showPaymentMethods, setShowPaymentMethods] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    setLoading(true);
    const data = await apiService.getSubscriptionPlans();
    setPlans(data);
    setLoading(false);
  };

  const formatPrice = (price: any) => {
    if (price === undefined || price === null) return '0';
    const num = typeof price === 'string' ? parseFloat(price) : price;
    return Math.floor(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  };

  const handleSelectPlan = async (plan: any) => {
    setSelectedPlan(plan);
    setDurationMonths('1');
    setShowQuotation(true);
    fetchQuotation(plan.id, 1);
  };

  const fetchQuotation = async (planId: number, months: number) => {
    setPaymentLoading(true);
    const result = await apiService.getSubscriptionQuotation(planId, months);
    setQuotation(result);
    setPaymentLoading(false);
  };

  const handlePayment = async (method: string) => {
    setPaymentLoading(true);
    const transactionId = `${method}_` + Date.now();
    const result = await apiService.changeSubscriptionPlan(
      selectedPlan.id,
      transactionId,
      parseInt(durationMonths, 10),
      method
    );
    setPaymentLoading(false);

    if (result) {
      const updatedUser = await apiService.getCurrentUser();
      if (updatedUser) setUser(updatedUser);
      setShowPaymentMethods(false);
      setShowQuotation(false);
      Alert.alert('Succès', `Votre abonnement via ${method} a été activé !`);
      navigation.goBack();
    } else {
      Alert.alert('Erreur', 'Le paiement n\'a pas pu être validé.');
    }
  };

  const renderScanExample = (tier: string) => {
    switch (tier) {
      case 'FLEET_BASIC':
        return (
          <View style={styles.exampleContainer}>
            <RNText style={styles.exampleTitle}>Fonctionnalités Flotte Basique :</RNText>
            <View style={styles.scanBox}>
              <RNText style={styles.scanCode}>Suivi GPS Simple</RNText>
              <RNText style={styles.scanDesc}>Localisation en temps réel de vos véhicules</RNText>
              <RNText style={styles.scanLimit}>❌ Pas d'historique de trajet</RNText>
              <RNText style={styles.scanLimit}>❌ Pas de rapports de consommation</RNText>
            </View>
          </View>
        );
      case 'FLEET_PRO':
        return (
          <View style={styles.exampleContainer}>
            <RNText style={styles.exampleTitle}>Fonctionnalités Flotte Pro :</RNText>
            <View style={[styles.scanBox, {borderColor: '#1A237E', backgroundColor: '#E8EAF6'}]}>
              <View style={styles.aiBadge}>
                <RNText style={styles.aiBadgeText}>PREMIUM</RNText>
              </View>
              <RNText style={styles.scanCode}>Maintenance Prédictive</RNText>
              <RNText style={styles.scanDesc}>Alertes avant les pannes et suivi d'usure</RNText>
              <Divider style={{marginVertical: 5}} />
              <RNText style={styles.aiTitle}>Inclus dans l'offre :</RNText>
              <RNText style={styles.aiText}>• Géofencing & Rapports détaillés</RNText>
              <RNText style={styles.aiText}>• Analyse du comportement conducteur</RNText>
              <Divider style={{marginVertical: 5}} />
              <RNText style={styles.aiTitle}>Économies estimées :</RNText>
              <RNText style={styles.aiPrice}>Jusqu'à -20% sur les coûts de carburant</RNText>
            </View>
          </View>
        );
      default:
        return (
          <View style={styles.exampleContainer}>
            <RNText style={styles.exampleTitle}>Fonctionnalités Standards :</RNText>
            <RNText style={styles.scanDesc}>Accès aux outils de monitoring de base pour votre flotte.</RNText>
          </View>
        );
    }
  };

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'FLEET_BASIC': return 'map-marker';
      case 'FLEET_PRO': return 'shield-car';
      default: return 'car-connected';
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'FLEET_PRO': return '#1A237E'; // Bleu nuit (Flotte Pro)
      case 'FLEET_BASIC': return '#3949AB'; // Bleu Indigo (Flotte Basique)
      default: return '#004BA0';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1976D2" />
        <RNText style={{marginTop: 10}}>Chargement des offres...</RNText>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineSmall" style={styles.headerTitle}>Gestion de Flotte</Text>
        <RNText style={styles.headerSub}>Des solutions pour optimiser vos opérations</RNText>
      </View>

      {user?.is_trial && (
        <Card style={[styles.card, styles.activeCard, {borderColor: '#FF9800'}]}>
          <View style={[styles.planHeader, {backgroundColor: '#FF9800'}]}>
            <View style={styles.planTitleRow}>
              <IconButton icon="gift" color="white" size={24} />
              <Text variant="titleLarge" style={styles.planTitle}>Essai Flotte Gratuit</Text>
            </View>
            <RNText style={styles.planPrice}>ACTIF <RNText style={{fontSize: 14}}>(Offert)</RNText></RNText>
          </View>
          <Card.Content style={styles.cardContent}>
            <RNText style={styles.description}>Vous bénéficiez actuellement de votre période d'essai gratuite pour la gestion de flotte.</RNText>
            <View style={styles.exampleContainer}>
              <RNText style={styles.exampleTitle}>Période d'essai gratuite :</RNText>
              <View style={[styles.scanBox, {borderColor: '#FF9800', backgroundColor: '#FFF3E0'}]}>
                <View style={styles.aiBadge}>
                  <RNText style={styles.aiBadgeText}>OFFERT</RNText>
                </View>
                <RNText style={styles.scanCode}>ACCÈS TOTAL</RNText>
                <RNText style={styles.scanDesc}>Testez toutes les fonctionnalités Premium de gestion de flotte pendant 14 jours.</RNText>
                <Divider style={{marginVertical: 5}} />
                <RNText style={styles.aiTitle}>Inclus :</RNText>
                <RNText style={styles.aiText}>• Suivi GPS en temps réel</RNText>
                <RNText style={styles.aiText}>• Maintenance prédictive</RNText>
                <RNText style={styles.aiText}>• Rapports de consommation</RNText>
              </View>
            </View>
            <Button
              mode="outlined"
              onPress={() => {}}
              style={styles.subscribeBtn}
              color="#FF9800"
              disabled={true}
            >
              PLAN ACTUEL
            </Button>
          </Card.Content>
        </Card>
      )}

      {plans.map((plan) => (
        <Card key={plan.id} style={[styles.card, user?.subscription_tier === plan.tier && styles.activeCard]}>
          <View style={[styles.planHeader, {backgroundColor: getTierColor(plan.tier)}]}>
            <View style={styles.planTitleRow}>
              <IconButton icon={getTierIcon(plan.tier)} color="white" size={24} />
              <Text variant="titleLarge" style={styles.planTitle}>{plan.name}</Text>
            </View>
            <RNText style={styles.planPrice}>{formatPrice(plan.price)} FCFA <RNText style={{fontSize: 14}}>/ mois</RNText></RNText>
          </View>

          <Card.Content style={styles.cardContent}>
            <RNText style={styles.description}>{plan.description}</RNText>

            {renderScanExample(plan.tier)}

            <Button
              mode={user?.subscription_tier === plan.tier ? "outlined" : "contained"}
              onPress={() => handleSelectPlan(plan)}
              style={styles.subscribeBtn}
              color={getTierColor(plan.tier)}
              disabled={user?.subscription_tier === plan.tier}
            >
              {user?.subscription_tier === plan.tier ? "PLAN ACTUEL" : "SOUSCRIRE MAINTENANT"}
            </Button>
          </Card.Content>
        </Card>
      ))}

      <View style={{height: 40}} />

      {/* DIALOGS POUR LE PAIEMENT */}
      <Portal>
        <Dialog visible={showQuotation} onDismiss={() => setShowQuotation(false)}>
          <Dialog.Title>Votre Devis : {selectedPlan?.name}</Dialog.Title>
          <Dialog.Content>
            <RNText style={{marginBottom: 10}}>Choisissez la durée (mois) :</RNText>
            <TextInput
              label="Nombre de mois"
              value={durationMonths}
              onChangeText={(val) => {
                setDurationMonths(val);
                const m = parseInt(val, 10);
                if (!isNaN(m) && m > 0) fetchQuotation(selectedPlan.id, m);
              }}
              keyboardType="numeric"
              style={styles.input}
            />

            {paymentLoading ? (
              <ActivityIndicator />
            ) : quotation ? (
              <View style={styles.quotationBox}>
                <View style={styles.infoRow}>
                  <RNText>Prix mensuel</RNText>
                  <RNText style={styles.value}>{formatPrice(quotation.price_per_month)} FCFA</RNText>
                </View>
                <Divider style={{marginVertical: 10}} />
                <View style={styles.infoRow}>
                  <Text variant="titleLarge">TOTAL</Text>
                  <Text variant="titleLarge" style={{color: '#1976D2'}}>{formatPrice(quotation.total_price)} FCFA</Text>
                </View>
              </View>
            ) : null}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowQuotation(false)}>Annuler</Button>
            <Button
              mode="contained"
              disabled={!quotation || paymentLoading}
              onPress={() => {
                setShowQuotation(false);
                setShowPaymentMethods(true);
              }}
            >
              Confirmer
            </Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={showPaymentMethods} onDismiss={() => setShowPaymentMethods(false)}>
          <Dialog.Title>Paiement Mobile</Dialog.Title>
          <Dialog.Content>
            <List.Item
              title="Wave"
              left={props => <Avatar.Icon {...props} icon="water" style={{backgroundColor: '#1E90FF'}} />}
              onPress={() => handlePayment('WAVE')}
            />
            <Divider />
            <List.Item
              title="Orange Money"
              left={props => <Avatar.Icon {...props} icon="phone" style={{backgroundColor: '#FF6600'}} />}
              onPress={() => handlePayment('ORANGE')}
            />
            <Divider />
            <List.Item
              title="MTN Mobile Money"
              left={props => <Avatar.Icon {...props} icon="cellphone" style={{backgroundColor: '#FFCC00'}} />}
              onPress={() => handlePayment('MTN')}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowPaymentMethods(false)}>Retour</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 30,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1976D2',
    textAlign: 'center',
  },
  headerSub: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 5,
  },
  card: {
    margin: 15,
    borderRadius: 15,
    overflow: 'hidden',
    elevation: 5,
  },
  activeCard: {
    borderColor: '#4CAF50',
    borderWidth: 2,
  },
  planHeader: {
    padding: 20,
    alignItems: 'center',
  },
  planTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  planTitle: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
  },
  planPrice: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 5,
  },
  cardContent: {
    paddingTop: 20,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: '#444',
    textAlign: 'center',
    marginBottom: 20,
  },
  exampleContainer: {
    backgroundColor: '#f0f4f8',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  exampleTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#555',
    marginBottom: 10,
  },
  scanBox: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  scanCode: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#E53935',
  },
  scanDesc: {
    fontSize: 14,
    color: '#333',
    marginBottom: 5,
  },
  scanLimit: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: -10,
  },
  aiBadge: {
    position: 'absolute',
    right: 5,
    top: 5,
    backgroundColor: '#FFD700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  aiBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#000',
  },
  aiTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#9C27B0',
    marginTop: 5,
  },
  aiText: {
    fontSize: 12,
    color: '#444',
  },
  aiPrice: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#43A047',
    marginTop: 2,
  },
  subscribeBtn: {
    paddingVertical: 5,
    borderRadius: 10,
  },
  input: {
    marginBottom: 10,
    backgroundColor: 'transparent',
  },
  quotationBox: {
    backgroundColor: '#E3F2FD',
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  value: {
    fontWeight: 'bold',
  }
});
