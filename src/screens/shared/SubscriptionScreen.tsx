import React, {useState, useEffect} from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Text as RNText,
  Linking,
  Dimensions,
  StatusBar,
} from 'react-native';
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
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const {width} = Dimensions.get('window');

export const SubscriptionScreen: React.FC<{navigation: any}> = ({navigation}) => {
  const {user, setUser} = useStore();
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // États pour le paiement
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
    // Filtrer les plans selon le type d'utilisateur (si applicable)
    const filteredPlans = user?.user_type
      ? data.filter((p: any) => p.target_user_type === user.user_type || p.tier === 'TRIAL')
      : data;
    setPlans(filteredPlans);
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
    if (method === 'WAVE') {
      setPaymentLoading(true);
      const result = await apiService.initWavePayment(
        selectedPlan.id,
        parseInt(durationMonths, 10),
      );
      setPaymentLoading(false);

      if (result && result.test_mode) {
        if (result.payment_id) {
          const confirmResult = await apiService.confirmTestPayment(
            result.payment_id,
            `TEST-CONFIRM-${result.payment_id}`
          );

          if (confirmResult) {
            const updatedUser = await apiService.getCurrentUser();
            if (updatedUser) setUser(updatedUser);
            setShowPaymentMethods(false);
            setShowQuotation(false);
            Alert.alert(
              '✅ Paiement simulé',
              'Mode test actif — aucun débit réel. Votre abonnement a été activé pour les tests.',
            );

            if (user?.user_type === 'MECHANIC') {
              navigation.navigate('ProHome');
            } else if (user?.user_type === 'INDIVIDUAL') {
              navigation.navigate('IndividualHome');
            } else if (user?.user_type === 'FLEET_OWNER') {
              navigation.navigate('FleetHome');
            } else {
              navigation.goBack();
            }
          } else {
            Alert.alert('Erreur', 'Impossible de confirmer le paiement simulé.');
          }
        }
        return;
      }

      if (result && result.wave_launch_url) {
        setShowPaymentMethods(false);
        setShowQuotation(false);
        try {
          await Linking.openURL(result.wave_launch_url);
          Alert.alert(
            'Paiement en cours',
            'Veuillez finaliser le paiement dans l\'application Wave. Votre abonnement sera activé automatiquement une fois terminé.'
          );
          navigation.goBack();
        } catch (err) {
          Alert.alert('Erreur', 'Impossible d\'ouvrir l\'application Wave.');
        }
      } else {
        Alert.alert('Erreur', 'Impossible d\'initier le paiement Wave.');
      }
      return;
    }

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

      if (user?.user_type === 'MECHANIC') {
        navigation.navigate('ProHome');
      } else if (user?.user_type === 'INDIVIDUAL') {
        navigation.navigate('IndividualHome');
      } else if (user?.user_type === 'FLEET_OWNER') {
        navigation.navigate('FleetHome');
      } else {
        navigation.goBack();
      }
    } else {
      Alert.alert('Erreur', 'Le paiement n\'a pas pu être validé.');
    }
  };

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'TRIAL': return 'gift-outline';
      case 'BASIC': case 'PERSONAL_BASIC': return 'shield-check-outline';
      case 'PREMIUM': case 'PERSONAL_PREMIUM': return 'star-outline';
      case 'ULTIMATE': return 'crown-outline';
      case 'FLEET_BASIC': return 'truck-check-outline';
      case 'FLEET_PRO': return 'car-connected';
      default: return 'help-circle-outline';
    }
  };

  const getTierColors = (tier: string) => {
    switch (tier) {
      case 'TRIAL': return ['#FF9800', '#F57C00'];
      case 'ULTIMATE': return ['#9C27B0', '#6A1B9A'];
      case 'PREMIUM': case 'PERSONAL_PREMIUM': return ['#1976D2', '#1565C0'];
      case 'BASIC': case 'PERSONAL_BASIC': return ['#4CAF50', '#388E3C'];
      case 'FLEET_PRO': return ['#D32F2F', '#B71C1C'];
      default: return ['#757575', '#616161'];
    }
  };

  const renderFeatureItem = (feature: any) => (
    <View key={feature.id} style={styles.featureItem}>
      <MaterialCommunityIcons name="check-circle" size={18} color="#4CAF50" />
      <View style={styles.featureTextContainer}>
        <RNText style={styles.featureName}>{feature.name}</RNText>
        {feature.description ? (
          <RNText style={styles.featureDesc}>{feature.description}</RNText>
        ) : null}
      </View>
    </View>
  );

  const renderPlanCard = (plan: any, isCurrent: boolean) => {
    const colors = getTierColors(plan.tier);
    const icon = getTierIcon(plan.tier);

    return (
      <Card
        key={plan.id}
        style={[
          styles.card,
          isCurrent && styles.activeCard,
          { borderLeftColor: colors[0], borderLeftWidth: 5 }
        ]}
      >
        <View style={styles.planHeaderContainer}>
          <View style={[styles.iconContainer, { backgroundColor: colors[0] + '20' }]}>
            <MaterialCommunityIcons name={icon} size={32} color={colors[0]} />
          </View>
          <View style={styles.titleContainer}>
            <Text variant="titleLarge" style={[styles.planTitleText, { color: colors[0] }]}>{plan.name}</Text>
            <RNText style={styles.planBadge}>{plan.tier.replace('_', ' ')}</RNText>
          </View>
          <View style={styles.priceContainer}>
            <RNText style={[styles.planPriceText, { color: colors[0] }]}>
              {formatPrice(plan.price)}
              <RNText style={styles.currencyText}> FCFA</RNText>
            </RNText>
            <RNText style={styles.periodText}>/mois</RNText>
          </View>
        </View>

        <Card.Content style={styles.cardContent}>
          <RNText style={styles.descriptionText}>{plan.description}</RNText>

          <Divider style={styles.divider} />

          <RNText style={styles.featuresTitle}>INCLUS DANS CE PLAN :</RNText>
          <View style={styles.featuresList}>
            {plan.features_details && plan.features_details.length > 0 ? (
              plan.features_details.map(renderFeatureItem)
            ) : (
              <RNText style={styles.noFeatures}>Accès aux fonctionnalités de base</RNText>
            )}
          </View>

          <Button
            mode={isCurrent ? "outlined" : "contained"}
            onPress={() => handleSelectPlan(plan)}
            style={[
              styles.subscribeBtn,
              !isCurrent && { backgroundColor: colors[0] }
            ]}
            labelStyle={styles.btnLabel}
            disabled={isCurrent}
            contentStyle={{ height: 48 }}
          >
            {isCurrent ? "PLAN ACTUEL" : "ACTIVER CE PLAN"}
          </Button>
        </Card.Content>
      </Card>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1976D2" />
        <RNText style={styles.loadingText}>Préparation de vos offres...</RNText>
      </View>
    );
  }

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.headerSection}>
          <RNText style={styles.headerTag}>ABONNEMENT</RNText>
          <Text variant="headlineMedium" style={styles.headerTitleText}>Libérez votre potentiel</Text>
          <RNText style={styles.headerSubText}>Choisissez le plan qui correspond à votre ambition et profitez d'outils experts.</RNText>
        </View>

        {user?.is_trial && (
          <View style={styles.trialContainer}>
            <View style={styles.trialBanner}>
              <MaterialCommunityIcons name="clock-fast" size={20} color="#E65100" />
              <RNText style={styles.trialText}>Vous êtes actuellement en Période d'Essai</RNText>
            </View>
          </View>
        )}

        <View style={styles.plansList}>
          {plans.map((plan) => renderPlanCard(plan, user?.subscription_tier === plan.tier))}
        </View>

        <View style={styles.footerInfo}>
          <MaterialCommunityIcons name="security" size={24} color="#666" />
          <RNText style={styles.footerText}>Paiement 100% sécurisé via Wave et Mobile Money</RNText>
        </View>
      </ScrollView>

      <Portal>
        <Dialog visible={showQuotation} onDismiss={() => setShowQuotation(false)} style={styles.dialog}>
          <Dialog.Title style={styles.dialogTitle}>Validation de l'offre</Dialog.Title>
          <Dialog.Content>
            <RNText style={styles.dialogSub}>Sélectionnez la durée de votre abonnement</RNText>
            <View style={styles.durationSelector}>
              <TextInput
                mode="outlined"
                label="Durée (en mois)"
                value={durationMonths}
                onChangeText={(val) => {
                  setDurationMonths(val);
                  const m = parseInt(val, 10);
                  if (!isNaN(m) && m > 0) fetchQuotation(selectedPlan.id, m);
                }}
                keyboardType="numeric"
                style={styles.durationInput}
                outlineColor="#E0E0E0"
                activeOutlineColor="#1976D2"
              />
            </View>

            {paymentLoading ? (
              <ActivityIndicator style={{ marginVertical: 20 }} />
            ) : quotation ? (
              <View style={styles.devisCard}>
                <View style={styles.devisRow}>
                  <RNText style={styles.devisLabel}>Prix unitaire</RNText>
                  <RNText style={styles.devisVal}>{formatPrice(quotation.price_per_month)} FCFA</RNText>
                </View>
                <View style={styles.devisRow}>
                  <RNText style={styles.devisLabel}>Période</RNText>
                  <RNText style={styles.devisVal}>{durationMonths} mois</RNText>
                </View>

                {quotation.prorata_credit > 0 && (
                  <View style={styles.prorataRow}>
                    <View style={styles.prorataBadge}>
                      <MaterialCommunityIcons name="clock-fast" size={14} color="#43A047" />
                      <RNText style={styles.prorataText}>BONUS PRORATA</RNText>
                    </View>
                    <RNText style={styles.prorataVal}>-{formatPrice(quotation.prorata_credit)} FCFA</RNText>
                  </View>
                )}

                <Divider style={styles.devisDivider} />
                <View style={styles.devisRow}>
                  <RNText style={styles.totalLabel}>TOTAL À PAYER</RNText>
                  <RNText style={styles.totalVal}>{formatPrice(quotation.total_price)} FCFA</RNText>
                </View>

                {quotation.bonus_days > 0 && (
                  <View style={styles.bonusBanner}>
                    <MaterialCommunityIcons name="plus-circle" size={16} color="#1565C0" />
                    <RNText style={styles.bonusText}>
                      Inclus : {quotation.bonus_days} jours bonus de votre ancien plan
                    </RNText>
                  </View>
                )}
              </View>
            ) : null}
          </Dialog.Content>
          <Dialog.Actions style={styles.dialogActions}>
            <Button onPress={() => setShowQuotation(false)} color="#666">ANNULER</Button>
            <Button
              mode="contained"
              disabled={!quotation || paymentLoading}
              onPress={() => {
                setShowQuotation(false);
                setShowPaymentMethods(true);
              }}
              style={styles.confirmBtn}
            >
              PROCÉDER AU PAIEMENT
            </Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={showPaymentMethods} onDismiss={() => setShowPaymentMethods(false)} style={styles.dialog}>
          <Dialog.Title style={styles.dialogTitle}>Moyen de Paiement</Dialog.Title>
          <Dialog.Content>
            <RNText style={styles.dialogSub}>Choisissez votre plateforme préférée</RNText>
            <View style={styles.paymentOptions}>
              <TouchableOpacity style={styles.paymentItem} onPress={() => handlePayment('WAVE')}>
                <View style={[styles.paymentIcon, { backgroundColor: '#1E90FF' }]}>
                  <MaterialCommunityIcons name="water" size={28} color="white" />
                </View>
                <RNText style={styles.paymentName}>Wave</RNText>
                <MaterialCommunityIcons name="chevron-right" size={24} color="#CCC" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.paymentItem} onPress={() => handlePayment('ORANGE')}>
                <View style={[styles.paymentIcon, { backgroundColor: '#FF6600' }]}>
                  <MaterialCommunityIcons name="phone" size={28} color="white" />
                </View>
                <RNText style={styles.paymentName}>Orange Money</RNText>
                <MaterialCommunityIcons name="chevron-right" size={24} color="#CCC" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.paymentItem} onPress={() => handlePayment('MTN')}>
                <View style={[styles.paymentIcon, { backgroundColor: '#FFCC00' }]}>
                  <MaterialCommunityIcons name="contactless-payment" size={28} color="white" />
                </View>
                <RNText style={styles.paymentName}>MTN MoMo</RNText>
                <MaterialCommunityIcons name="chevron-right" size={24} color="#CCC" />
              </TouchableOpacity>
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowPaymentMethods(false)} color="#666">RETOUR</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  headerSection: {
    padding: 25,
    paddingTop: 40,
    backgroundColor: '#fff',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerTag: {
    fontSize: 12,
    fontWeight: '900',
    color: '#1976D2',
    letterSpacing: 2,
    marginBottom: 8,
  },
  headerTitleText: {
    fontWeight: '900',
    color: '#1A237E',
    marginBottom: 10,
  },
  headerSubText: {
    fontSize: 15,
    color: '#546E7A',
    lineHeight: 22,
  },
  trialContainer: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  trialBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  trialText: {
    marginLeft: 10,
    color: '#E65100',
    fontWeight: 'bold',
    fontSize: 14,
  },
  plansList: {
    padding: 15,
  },
  card: {
    marginBottom: 20,
    borderRadius: 20,
    backgroundColor: '#fff',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  activeCard: {
    backgroundColor: '#F1F8E9',
  },
  planHeaderContainer: {
    flexDirection: 'row',
    padding: 20,
    alignItems: 'center',
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    flex: 1,
    marginLeft: 15,
  },
  planTitleText: {
    fontWeight: '900',
    fontSize: 20,
  },
  planBadge: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#78909C',
    backgroundColor: '#ECEFF1',
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  planPriceText: {
    fontSize: 18,
    fontWeight: '900',
  },
  currencyText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  periodText: {
    fontSize: 11,
    color: '#999',
  },
  cardContent: {
    paddingTop: 0,
    paddingBottom: 20,
  },
  descriptionText: {
    fontSize: 14,
    color: '#616161',
    lineHeight: 20,
    marginBottom: 15,
  },
  divider: {
    height: 1,
    backgroundColor: '#F5F5F5',
    marginBottom: 15,
  },
  featuresTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#9E9E9E',
    letterSpacing: 1,
    marginBottom: 12,
  },
  featuresList: {
    marginBottom: 20,
  },
  featureItem: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  featureTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  featureName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  featureDesc: {
    fontSize: 12,
    color: '#757575',
    marginTop: 2,
  },
  noFeatures: {
    fontSize: 13,
    color: '#999',
    fontStyle: 'italic',
  },
  subscribeBtn: {
    borderRadius: 12,
    elevation: 0,
  },
  btnLabel: {
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  footerInfo: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    opacity: 0.6,
  },
  footerText: {
    marginLeft: 10,
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  dialog: {
    borderRadius: 24,
  },
  dialogTitle: {
    fontWeight: 'bold',
    color: '#1A237E',
    textAlign: 'center',
  },
  dialogSub: {
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
    marginBottom: 20,
  },
  durationSelector: {
    marginBottom: 20,
  },
  durationInput: {
    backgroundColor: '#f8f9fa',
  },
  devisCard: {
    backgroundColor: '#F5F7FF',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8EAF6',
  },
  devisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  devisLabel: {
    color: '#7986CB',
    fontSize: 13,
  },
  devisVal: {
    fontWeight: 'bold',
    color: '#3F51B5',
  },
  devisDivider: {
    marginVertical: 12,
    backgroundColor: '#D1D9FF',
  },
  totalLabel: {
    fontWeight: '900',
    color: '#1A237E',
    fontSize: 14,
  },
  totalVal: {
    fontWeight: '900',
    color: '#1976D2',
    fontSize: 18,
  },
  prorataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  prorataBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  prorataText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#2E7D32',
    letterSpacing: 0.5,
  },
  prorataVal: {
    fontWeight: 'bold',
    color: '#2E7D32',
    fontSize: 14,
  },
  bonusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 15,
    padding: 10,
    backgroundColor: '#E3F2FD',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BBDEFB',
    gap: 8,
  },
  bonusText: {
    fontSize: 12,
    color: '#1565C0',
    fontWeight: '700',
    flex: 1,
  },
  dialogActions: {
    paddingHorizontal: 15,
    paddingBottom: 15,
  },
  confirmBtn: {
    borderRadius: 12,
    backgroundColor: '#1976D2',
    paddingHorizontal: 10,
  },
  paymentOptions: {
    gap: 12,
  },
  paymentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    elevation: 1,
  },
  paymentIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentName: {
    flex: 1,
    marginLeft: 15,
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
});
