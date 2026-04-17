import React, {useState, useEffect} from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  RefreshControl,
  TouchableOpacity,
  Text as RNText,
} from 'react-native';
import {
  Button,
  Avatar,
  Divider,
  TextInput,
  Portal,
  Dialog,
  List,
  ActivityIndicator,
  Text,
} from 'react-native-paper';
import {useStore} from '../../store/useStore';
import {apiService} from '../../services/apiService';
import {obdService} from '../../services/obdService';
import {Colors, SharedStyles} from '../../styles/theme';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export const ProfileScreen: React.FC<{navigation: any}> = ({navigation}) => {
  const {user, setUser, setScanHistory} = useStore();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // États pour les Dialogs
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [showPasswordEdit, setShowPasswordEdit] = useState(false);
  const [showPlans, setShowPlans] = useState(false);

  // Champs profil
  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [shopName, setShopName] = useState(user?.shop_name || '');
  const [location, setLocation] = useState(user?.location || '');
  const [phone, setPhone] = useState(user?.phone || '');

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || '');
      setLastName(user.last_name || '');
      setShopName(user.shop_name || '');
      setLocation(user.location || '');
      setPhone(user.phone || '');
    }
  }, [user]);

  const isFleetOwner = user?.user_type === 'FLEET_OWNER';
  const isIndividual = user?.user_type === 'INDIVIDUAL';

  const entityLabel = isIndividual
    ? 'Mon Véhicule'
    : isFleetOwner
    ? 'Ma Flotte'
    : 'Mon Atelier';
  const nameLabel = isIndividual
    ? 'Nom du véhicule'
    : isFleetOwner
    ? 'Nom de la Flotte'
    : 'Nom du garage';

  // Champs mot de passe
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Plans d'abonnement
  const [plans, setPlans] = useState<any[]>([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [durationMonths, setDurationMonths] = useState('1');
  const [quotation, setQuotation] = useState<any>(null);
  const [showQuotation, setShowQuotation] = useState(false);
  const [showPaymentMethods, setShowPaymentMethods] = useState(false);

  const formatPrice = (price: any) => {
    if (price === undefined || price === null) return '0';
    const num = typeof price === 'string' ? parseFloat(price) : price;
    return Math.floor(num)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  };

  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Voulez-vous vraiment vous déconnecter ?',
      [
        {
          text: 'Annuler',
          style: 'cancel',
        },
        {
          text: 'Se déconnecter',
          onPress: async () => {
            await apiService.logout();
            setUser(null);
            setScanHistory([]);
            navigation.reset({
              index: 0,
              routes: [{name: 'Welcome'}],
            });
          },
          style: 'destructive',
        },
      ],
      {cancelable: true},
    );
  };

  const handleUpdateProfile = async () => {
    setLoading(true);
    const result = await apiService.updateUserProfile({
      first_name: firstName,
      last_name: lastName,
      shop_name: shopName,
      location: location,
      phone: phone,
    });
    setLoading(false);

    if (result) {
      setUser(result);
      setShowProfileEdit(false);
      Alert.alert('Succès', 'Profil mis à jour avec succès');
    } else {
      Alert.alert('Erreur', 'Impossible de mettre à jour le profil');
    }
  };

  const handleTestBluetooth = async () => {
    console.log('[DEBUG_LOG] handleTestBluetooth appelé');
    setLoading(true);
    try {
      console.log('[DEBUG_LOG] Appel obdService.ensureBluetoothEnabled()...');
      // Étape 1 : Vérifier les permissions et tenter l'activation (automatique + redirection réglages si besoin)
      const success = await obdService.ensureBluetoothEnabled();
      console.log('[DEBUG_LOG] Résultat success:', success);
      setLoading(false);

      if (success) {
        console.log('[DEBUG_LOG] Affichage Alerte Succès');
        Alert.alert('Succès', 'Le Bluetooth est maintenant activé !');
      } else {
        console.log('[DEBUG_LOG] Affichage Alerte Échec');
        Alert.alert(
          'Activation requise',
          "Le Bluetooth n'est toujours pas actif.\n\n" +
            'Pourriez-vous :\n' +
            "1. L'activer manuellement dans les réglages qui viennent de s'ouvrir.\n" +
            "2. Revenir ensuite dans l'application pour continuer.",
        );
      }
    } catch (err: any) {
      console.error('[DEBUG_LOG] Erreur capturée:', err);
      setLoading(false);
      Alert.alert(
        'Erreur',
        `Une erreur est survenue : ${err.message || 'Erreur inconnue'}`,
      );
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 8) {
      Alert.alert(
        'Erreur',
        'Le nouveau mot de passe doit faire au moins 8 caractères',
      );
      return;
    }

    setLoading(true);
    const result = await apiService.changePassword({
      old_password: oldPassword,
      new_password: newPassword,
    });
    setLoading(false);

    if (result.success) {
      setShowPasswordEdit(false);
      setOldPassword('');
      setNewPassword('');
      Alert.alert('Succès', result.message);
    } else {
      Alert.alert('Erreur', result.message);
    }
  };

  const loadPlans = async () => {
    setPlansLoading(true);
    const data = await apiService.getSubscriptionPlans();
    setPlans(data);
    setPlansLoading(false);
  };

  const handleSelectPlan = async (plan: any) => {
    if (user?.is_trial) {
      Alert.alert(
        "Période d'essai",
        `Vous êtes actuellement en période d'essai (${user.trial_days_remaining} jours restants). Si vous vous abonnez maintenant, ces jours seront ajoutés à votre nouvel abonnement.`,
        [
          {text: 'Annuler', style: 'cancel'},
          {
            text: 'Continuer',
            onPress: () => {
              setSelectedPlan(plan);
              setDurationMonths('1');
              setShowPlans(false);
              setShowQuotation(true);
              fetchQuotation(plan.id, 1);
            },
          },
        ],
      );
    } else {
      setSelectedPlan(plan);
      setDurationMonths('1');
      setShowPlans(false);
      setShowQuotation(true);
      fetchQuotation(plan.id, 1);
    }
  };

  const fetchQuotation = async (planId: number, months: number) => {
    setLoading(true);
    const result = await apiService.getSubscriptionQuotation(planId, months);
    setQuotation(result);
    setLoading(false);
  };

  const handleConfirmQuotation = () => {
    setShowQuotation(false);
    setShowPaymentMethods(true);
  };

  const handlePayment = async (method: string) => {
    setLoading(true);
    const transactionId = `${method}_` + Date.now();
    const result = await apiService.changeSubscriptionPlan(
      selectedPlan.id,
      transactionId,
      parseInt(durationMonths, 10),
      method,
    );
    setLoading(false);

    if (result) {
      const updatedUser = await apiService.getCurrentUser();
      if (updatedUser) {
        setUser(updatedUser);
      }
      setShowPaymentMethods(false);
      Alert.alert(
        'Succès',
        result.message || `Votre abonnement via ${method} a été activé !`,
      );
    } else {
      Alert.alert('Information', "Le paiement n'a pas pu être validé.");
    }
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    const result = await apiService.getCurrentUser();
    if (result) {
      setUser(result);
    }
    setRefreshing(false);
  }, [setUser]);

  const getTierColor = (tier?: string) => {
    if (user?.is_trial) return Colors.primary;
    switch (tier) {
      case 'ULTIMATE':
        return '#FFD700';
      case 'PREMIUM':
        return Colors.secondary;
      case 'BASIC':
        return '#CD7F32';
      default:
        return Colors.disabled;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const renderInfoItem = (icon: string, label: string, value: string) => (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <Icon name={icon} size={22} color={Colors.primary} />
      </View>
      <View style={styles.infoText}>
        <RNText style={styles.label}>{label}</RNText>
        <RNText style={styles.value}>{value || 'Non renseigné'}</RNText>
      </View>
    </View>
  );

  return (
    <ScrollView
      style={SharedStyles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[Colors.primary]}
        />
      }>
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <Avatar.Text
            size={90}
            label={user?.username?.substring(0, 2).toUpperCase() || 'ME'}
            style={styles.avatar}
            labelStyle={styles.avatarLabel}
          />
          <TouchableOpacity style={styles.editAvatarBtn}>
            <Icon name="camera" size={20} color="white" />
          </TouchableOpacity>
        </View>

        <RNText style={styles.name}>
          {user?.first_name} {user?.last_name || ''}
        </RNText>
        <RNText style={styles.username}>@{user?.username}</RNText>

        <View
          style={[
            styles.tierBadge,
            {backgroundColor: getTierColor(user?.subscription_tier)},
          ]}>
          <Icon
            name={user?.is_trial ? 'clock-outline' : 'medal'}
            size={14}
            color="white"
            style={{marginRight: 5}}
          />
          <RNText style={styles.tierText}>
            {user?.is_trial
              ? `ESSAI GRATUIT (${user?.trial_days_remaining}j)`
              : user?.subscription_tier || 'AUCUN'}
          </RNText>
        </View>
      </View>

      <View style={styles.content}>
        {user?.is_trial && (
          <View style={[SharedStyles.section, styles.trialBanner]}>
            <View style={styles.trialHeader}>
              <Icon
                name="information-outline"
                size={24}
                color={Colors.primary}
              />
              <RNText style={styles.trialTitle}>Période d'essai active</RNText>
            </View>
            <RNText style={styles.trialDescription}>
              Vous profitez actuellement de toutes les fonctionnalités de
              l'application gratuitement.
            </RNText>
            <RNText style={styles.trialExpiry}>
              Prend fin le : {formatDate(user?.active_subscription?.end_date)} (
              {user?.trial_days_remaining} jours restants)
            </RNText>
            <TouchableOpacity
              style={styles.subscribeNowBtn}
              onPress={() => {
                loadPlans();
                setShowPlans(true);
              }}>
              <RNText style={styles.subscribeNowText}>
                S'abonner maintenant
              </RNText>
            </TouchableOpacity>
          </View>
        )}
        <View style={SharedStyles.section}>
          <RNText style={SharedStyles.sectionTitle}>
            Informations personnelles
          </RNText>
          {renderInfoItem('phone', 'Téléphone', user?.phone || '')}
          {renderInfoItem('email', 'Email', user?.email || '')}
          {renderInfoItem('map-marker', 'Localisation', user?.location || '')}
          {renderInfoItem(
            'office-building',
            entityLabel,
            user?.shop_name || '',
          )}

          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => setShowProfileEdit(true)}>
            <RNText style={styles.editBtnText}>Modifier le profil</RNText>
          </TouchableOpacity>
        </View>

        <View style={SharedStyles.section}>
          <RNText style={SharedStyles.sectionTitle}>
            Abonnement & Sécurité
          </RNText>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              loadPlans();
              setShowPlans(true);
            }}>
            <Icon
              name="card-account-details"
              size={24}
              color={Colors.primary}
            />
            <View style={styles.menuItemText}>
              <RNText style={styles.menuItemTitle}>Plan d'abonnement</RNText>
              <RNText style={styles.menuItemSubtitle}>
                {user?.is_trial
                  ? `Essai gratuit (${user?.trial_days_remaining}j restants)`
                  : `Actuel: ${user?.subscription_tier || 'Aucun'}`}
              </RNText>
            </View>
            <Icon name="chevron-right" size={24} color={Colors.disabled} />
          </TouchableOpacity>

          <Divider style={styles.divider} />

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => setShowPasswordEdit(true)}>
            <Icon name="lock-reset" size={24} color={Colors.primary} />
            <View style={styles.menuItemText}>
              <RNText style={styles.menuItemTitle}>
                Changer le mot de passe
              </RNText>
              <RNText style={styles.menuItemSubtitle}>
                Sécurisez votre compte
              </RNText>
            </View>
            <Icon name="chevron-right" size={24} color={Colors.disabled} />
          </TouchableOpacity>
        </View>

        <View style={SharedStyles.section}>
          <RNText style={SharedStyles.sectionTitle}>
            Paramètres Matériels (Debug)
          </RNText>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleTestBluetooth}>
            <Icon name="bluetooth" size={24} color={Colors.primary} />
            <View style={styles.menuItemText}>
              <RNText style={styles.menuItemTitle}>
                Vérifier/Activer Bluetooth
              </RNText>
              <RNText style={styles.menuItemSubtitle}>
                Force l'activation du Bluetooth sur Android
              </RNText>
            </View>
            {loading ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <Icon
                name="play-circle-outline"
                size={24}
                color={Colors.primary}
              />
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Icon name="logout" size={22} color={Colors.error} />
          <RNText style={styles.logoutText}>Se déconnecter</RNText>
        </TouchableOpacity>

        <RNText style={styles.version}>OBD-CI Connect v1.2.0</RNText>
      </View>

      {/* DIALOGS */}
      <Portal>
        <Dialog
          visible={showProfileEdit}
          onDismiss={() => setShowProfileEdit(false)}
          style={styles.dialog}>
          <Dialog.Title>Modifier le profil</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Prénom"
              value={firstName}
              onChangeText={setFirstName}
              mode="outlined"
              style={styles.dialogInput}
            />
            <TextInput
              label="Nom"
              value={lastName}
              onChangeText={setLastName}
              mode="outlined"
              style={styles.dialogInput}
            />
            <TextInput
              label="Téléphone"
              value={phone}
              onChangeText={setPhone}
              mode="outlined"
              style={styles.dialogInput}
            />
            <TextInput
              label={nameLabel}
              value={shopName}
              onChangeText={setShopName}
              mode="outlined"
              style={styles.dialogInput}
            />
            <TextInput
              label="Localisation"
              value={location}
              onChangeText={setLocation}
              mode="outlined"
              style={styles.dialogInput}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => setShowProfileEdit(false)}
              color={Colors.textSecondary}>
              Annuler
            </Button>
            <Button
              loading={loading}
              onPress={handleUpdateProfile}
              color={Colors.primary}>
              Enregistrer
            </Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog
          visible={showPasswordEdit}
          onDismiss={() => setShowPasswordEdit(false)}
          style={styles.dialog}>
          <Dialog.Title>Changer le mot de passe</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Ancien mot de passe"
              value={oldPassword}
              onChangeText={setOldPassword}
              secureTextEntry
              mode="outlined"
              style={styles.dialogInput}
            />
            <TextInput
              label="Nouveau mot de passe"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              mode="outlined"
              style={styles.dialogInput}
              placeholder="Min 8 caractères"
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => setShowPasswordEdit(false)}
              color={Colors.textSecondary}>
              Annuler
            </Button>
            <Button
              loading={loading}
              onPress={handleChangePassword}
              color={Colors.primary}>
              Mettre à jour
            </Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog
          visible={showPlans}
          onDismiss={() => setShowPlans(false)}
          style={styles.dialog}>
          <Dialog.Title>Choisir un plan</Dialog.Title>
          <Dialog.ScrollArea style={{maxHeight: 400, paddingHorizontal: 0}}>
            <ScrollView>
              {plansLoading ? (
                <ActivityIndicator
                  style={{margin: 20}}
                  color={Colors.primary}
                />
              ) : (
                plans.map(plan => (
                  <List.Item
                    key={plan.id}
                    title={plan.name}
                    titleStyle={{fontWeight: 'bold'}}
                    description={`${formatPrice(plan.price)} FCFA - ${
                      plan.tier
                    }`}
                    right={() => (
                      <Button
                        mode={
                          user?.subscription_tier === plan.tier
                            ? 'contained'
                            : 'outlined'
                        }
                        disabled={user?.subscription_tier === plan.tier}
                        onPress={() => handleSelectPlan(plan)}
                        style={{alignSelf: 'center'}}>
                        {user?.subscription_tier === plan.tier
                          ? 'Actuel'
                          : 'Choisir'}
                      </Button>
                    )}
                  />
                ))
              )}
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setShowPlans(false)}>Fermer</Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog
          visible={showQuotation}
          onDismiss={() => setShowQuotation(false)}
          style={styles.dialog}>
          <Dialog.Title>Devis : {selectedPlan?.name}</Dialog.Title>
          <Dialog.Content>
            <RNText style={{marginBottom: 15, color: Colors.textSecondary}}>
              Durée de l'abonnement (mois) :
            </RNText>
            <TextInput
              label="Nombre de mois"
              value={durationMonths}
              onChangeText={val => {
                setDurationMonths(val);
                const m = parseInt(val, 10);
                if (!isNaN(m) && m > 0) fetchQuotation(selectedPlan.id, m);
              }}
              keyboardType="numeric"
              mode="outlined"
              style={styles.dialogInput}
            />

            {loading ? (
              <ActivityIndicator color={Colors.primary} />
            ) : quotation ? (
              <View style={styles.quotationBox}>
                <View style={styles.quoteRow}>
                  <RNText style={styles.quoteLabel}>Prix / mois</RNText>
                  <RNText style={styles.quoteValue}>
                    {formatPrice(quotation.price_per_month)} FCFA
                  </RNText>
                </View>
                <View style={styles.quoteRow}>
                  <RNText style={styles.quoteLabel}>Durée</RNText>
                  <RNText style={styles.quoteValue}>
                    {quotation.months} mois
                  </RNText>
                </View>
                <Divider style={{marginVertical: 10}} />
                <View style={styles.quoteRow}>
                  <RNText
                    style={[
                      styles.quoteLabel,
                      {fontWeight: 'bold', fontSize: 18},
                    ]}>
                    TOTAL
                  </RNText>
                  <RNText
                    style={[
                      styles.quoteValue,
                      {color: Colors.primary, fontSize: 18},
                    ]}>
                    {formatPrice(quotation.total_price)} FCFA
                  </RNText>
                </View>
              </View>
            ) : null}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowQuotation(false)}>Annuler</Button>
            <Button
              mode="contained"
              disabled={!quotation}
              onPress={handleConfirmQuotation}
              style={SharedStyles.primaryButton}>
              Valider
            </Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog
          visible={showPaymentMethods}
          onDismiss={() => setShowPaymentMethods(false)}
          style={styles.dialog}>
          <Dialog.Title>Mode de paiement</Dialog.Title>
          <Dialog.Content>
            <RNText style={{marginBottom: 15}}>
              Montant :{' '}
              <RNText style={{fontWeight: 'bold'}}>
                {formatPrice(quotation?.total_price)} FCFA
              </RNText>
            </RNText>
            <List.Item
              title="Wave"
              left={props => (
                <Avatar.Icon
                  {...props}
                  icon="water"
                  style={{backgroundColor: '#1E90FF'}}
                />
              )}
              onPress={() => handlePayment('WAVE')}
            />
            <Divider />
            <List.Item
              title="Orange Money"
              left={props => (
                <Avatar.Icon
                  {...props}
                  icon="phone"
                  style={{backgroundColor: '#FF6600'}}
                />
              )}
              onPress={() => handlePayment('ORANGE')}
            />
            <Divider />
            <List.Item
              title="MTN Mobile Money"
              left={props => (
                <Avatar.Icon
                  {...props}
                  icon="cellphone"
                  style={{backgroundColor: '#FFCC00'}}
                />
              )}
              onPress={() => handlePayment('MTN')}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowPaymentMethods(false)}>
              Annuler
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: Colors.primary,
    paddingVertical: 40,
    alignItems: 'center',
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
    elevation: 8,
    shadowColor: Colors.primary,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 15,
  },
  avatar: {
    backgroundColor: Colors.surface,
    elevation: 4,
  },
  avatarLabel: {
    color: Colors.primary,
    fontWeight: 'bold',
  },
  editAvatarBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.secondary,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  name: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  username: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginBottom: 10,
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  tierText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  content: {
    paddingBottom: 40,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  infoIcon: {
    width: 40,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
  },
  label: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  value: {
    fontWeight: '500',
    fontSize: 15,
    color: Colors.text,
  },
  editBtn: {
    marginTop: 15,
    paddingVertical: 10,
    alignItems: 'center',
  },
  editBtnText: {
    color: Colors.primary,
    fontWeight: 'bold',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
  },
  menuItemText: {
    flex: 1,
    marginLeft: 15,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
  },
  menuItemSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  divider: {
    backgroundColor: Colors.divider,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFEBEE',
    paddingVertical: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFCDD2',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  logoutText: {
    color: '#D32F2F',
    fontWeight: 'bold',
    fontSize: 16,
  },
  version: {
    textAlign: 'center',
    marginTop: 30,
    color: Colors.disabled,
    fontSize: 12,
  },
  dialog: {
    borderRadius: 15,
  },
  trialBanner: {
    backgroundColor: 'rgba(52, 152, 219, 0.1)',
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
    padding: 15,
  },
  trialHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  trialTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary,
    marginLeft: 10,
  },
  trialDescription: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
    marginBottom: 10,
  },
  trialExpiry: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textSecondary,
    marginBottom: 15,
    fontStyle: 'italic',
  },
  subscribeNowBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    elevation: 2,
  },
  subscribeNowText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  dialogInput: {
    marginBottom: 10,
    backgroundColor: Colors.surface,
  },
  quotationBox: {
    backgroundColor: Colors.background,
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quoteRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  quoteLabel: {
    color: Colors.textSecondary,
  },
  quoteValue: {
    fontWeight: 'bold',
  },
});
