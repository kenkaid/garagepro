import React, {useState, useEffect} from 'react';
import {View, StyleSheet, ScrollView, Alert, RefreshControl} from 'react-native';
import {
  Title,
  Text,
  Button,
  Card,
  Avatar,
  Divider,
  TextInput,
  Portal,
  Dialog,
  List,
  ActivityIndicator,
} from 'react-native-paper';
import {useStore} from '../store/useStore';
import {apiService} from '../services/apiService';

export const ProfileScreen: React.FC<{navigation: any}> = ({navigation}) => {
  const {mechanic, setMechanic, setScanHistory} = useStore();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // États pour les Dialogs
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [showPasswordEdit, setShowPasswordEdit] = useState(false);
  const [showPlans, setShowPlans] = useState(false);

  // Champs profil
  const [firstName, setFirstName] = useState(mechanic?.first_name || '');
  const [lastName, setLastName] = useState(mechanic?.last_name || '');
  const [shopName, setShopName] = useState(mechanic?.shop_name || '');
  const [location, setLocation] = useState(mechanic?.location || '');
  const [phone, setPhone] = useState(mechanic?.phone || '');

  useEffect(() => {
    if (mechanic) {
      setFirstName(mechanic.first_name || '');
      setLastName(mechanic.last_name || '');
      setShopName(mechanic.shop_name || '');
      setLocation(mechanic.location || '');
      setPhone(mechanic.phone || '');
    }
  }, [mechanic]);

  const isFleetOwner = mechanic?.user_type === 'FLEET_OWNER';
  const entityLabel = isFleetOwner ? 'Ma Flotte' : 'Mon Atelier';
  const nameLabel = isFleetOwner ? 'Nom de la Flotte' : 'Nom du garage';

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
    return Math.floor(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  };

  const handleLogout = async () => {
    await apiService.logout();
    setMechanic(null);
    setScanHistory([]);
    navigation.reset({
      index: 0,
      routes: [{name: 'Login'}],
    });
  };

  const handleUpdateProfile = async () => {
    setLoading(true);
    const result = await apiService.updateMechanicProfile({
      first_name: firstName,
      last_name: lastName,
      shop_name: shopName,
      location: location,
      phone: phone,
    });
    setLoading(false);

    if (result) {
      setMechanic(result);
      setShowProfileEdit(false);
      Alert.alert('Succès', 'Profil mis à jour avec succès');
    } else {
      Alert.alert('Erreur', 'Impossible de mettre à jour le profil');
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 8) {
      Alert.alert('Erreur', 'Le nouveau mot de passe doit faire au moins 8 caractères');
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
    setSelectedPlan(plan);
    setDurationMonths('1');
    setShowPlans(false);
    setShowQuotation(true);
    fetchQuotation(plan.id, 1);
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
    // Simulation d'une transaction ID pour l'exemple
    const transactionId = `${method}_` + Date.now();
    const result = await apiService.changeSubscriptionPlan(
      selectedPlan.id, 
      transactionId, 
      parseInt(durationMonths, 10),
      method
    );
    setLoading(false);

    if (result) {
      const updatedMechanic = await apiService.getCurrentMechanic();
      if (updatedMechanic) setMechanic(updatedMechanic);
      setShowPaymentMethods(false);
      Alert.alert('Succès', `Votre abonnement via ${method} a été activé !`);
    } else {
      Alert.alert('Information', 'Le paiement n\'a pas pu être validé. Si vous avez été débité, veuillez contacter le support avec votre ID de transaction.');
    }
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    const result = await apiService.getCurrentMechanic();
    if (result) {
      setMechanic(result);
    }
    setRefreshing(false);
  }, [setMechanic]);

  const getTierColor = (tier?: string) => {
    switch (tier) {
      case 'ULTIMATE': return '#FFD700'; // Or
      case 'PREMIUM': return '#C0C0C0';  // Argent
      case 'BASIC': return '#CD7F32';   // Bronze
      default: return '#757575';
    }
  };

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Avatar.Text 
          size={80} 
          label={mechanic?.username?.substring(0, 2).toUpperCase() || 'ME'} 
          style={styles.avatar}
        />
        <Title style={styles.name}>{mechanic?.first_name} {mechanic?.last_name || ''}</Title>
        <View style={[styles.tierBadge, {backgroundColor: getTierColor(mechanic?.subscription_tier)}]}>
          <Text style={styles.tierText}>{mechanic?.subscription_tier || 'AUCUN'}</Text>
        </View>
        <Text style={styles.shop}>{mechanic?.shop_name || (isFleetOwner ? 'Ma Flotte' : 'Garagiste Pro')}</Text>
      </View>

      <Card style={styles.card}>
        <Card.Title title="Informations personnelles" />
        <Card.Content>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Utilisateur</Text>
            <Text style={styles.value}>{mechanic?.username}</Text>
          </View>
          <Divider style={styles.divider} />
          
          <View style={styles.infoRow}>
            <Text style={styles.label}>Téléphone</Text>
            <Text style={styles.value}>{mechanic?.phone || 'Non renseigné'}</Text>
          </View>
          <Divider style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.value}>{mechanic?.email || 'Non renseigné'}</Text>
          </View>
          <Divider style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.label}>{entityLabel}</Text>
            <Text style={styles.value}>{mechanic?.shop_name || (isFleetOwner ? 'Ma Flotte' : 'Non précisé')}</Text>
          </View>
          <Divider style={styles.divider} />

          <View style={styles.infoRow}>
            <Text style={styles.label}>Localisation</Text>
            <Text style={styles.value}>{mechanic?.location || 'Non renseignée'}</Text>
          </View>
        </Card.Content>
        <Card.Actions>
          <Button onPress={() => setShowProfileEdit(true)}>Modifier le profil</Button>
        </Card.Actions>
      </Card>

      <Card style={styles.card}>
        <Card.Title title="Abonnement & Sécurité" />
        <Card.Content>
          <List.Item
            title="Plan d'abonnement"
            description={`Actuel: ${mechanic?.subscription_tier || 'Aucun'}`}
            left={props => <List.Icon {...props} icon="card-account-details" />}
            onPress={() => {
              loadPlans();
              setShowPlans(true);
            }}
          />
          <Divider />
          <List.Item
            title="Changer le mot de passe"
            left={props => <List.Icon {...props} icon="lock-reset" />}
            onPress={() => setShowPasswordEdit(true)}
          />
        </Card.Content>
      </Card>

      <Button 
        mode="outlined" 
        onPress={handleLogout} 
        style={styles.logoutBtn}
        color="#F44336"
      >
        Se déconnecter
      </Button>

      <Text style={styles.version}>Version 1.1.0 - GaragistePro Connect</Text>

      {/* DIALOG: MODIFICATION PROFIL */}
      <Portal>
        <Dialog visible={showProfileEdit} onDismiss={() => setShowProfileEdit(false)}>
          <Dialog.Title>Modifier le profil</Dialog.Title>
          <Dialog.Content>
            <TextInput label="Prénom" value={firstName} onChangeText={setFirstName} style={styles.input} />
            <TextInput label="Nom" value={lastName} onChangeText={setLastName} style={styles.input} />
            <TextInput label="Téléphone" value={phone} onChangeText={setPhone} style={styles.input} />
            <TextInput label={nameLabel} value={shopName} onChangeText={setShopName} style={styles.input} />
            <TextInput label="Localisation" value={location} onChangeText={setLocation} style={styles.input} />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowProfileEdit(false)}>Annuler</Button>
            <Button loading={loading} onPress={handleUpdateProfile}>Enregistrer</Button>
          </Dialog.Actions>
        </Dialog>

        {/* DIALOG: CHANGEMENT MOT DE PASSE */}
        <Dialog visible={showPasswordEdit} onDismiss={() => setShowPasswordEdit(false)}>
          <Dialog.Title>Changer le mot de passe</Dialog.Title>
          <Dialog.Content>
            <TextInput 
              label="Ancien mot de passe" 
              value={oldPassword} 
              onChangeText={setOldPassword} 
              secureTextEntry 
              style={styles.input} 
            />
            <TextInput 
              label="Nouveau mot de passe" 
              value={newPassword} 
              onChangeText={setNewPassword} 
              secureTextEntry 
              style={styles.input} 
              placeholder="Min 8 caractères"
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowPasswordEdit(false)}>Annuler</Button>
            <Button loading={loading} onPress={handleChangePassword}>Mettre à jour</Button>
          </Dialog.Actions>
        </Dialog>

        {/* DIALOG: PLANS D'ABONNEMENT */}
        <Dialog visible={showPlans} onDismiss={() => setShowPlans(false)}>
          <Dialog.Title>Choisir un plan</Dialog.Title>
          <Dialog.ScrollArea style={{maxHeight: 400}}>
            <ScrollView>
              {plansLoading ? (
                <ActivityIndicator style={{margin: 20}} />
              ) : (
                plans.map(plan => (
                  <List.Item
                    key={plan.id}
                    title={plan.name}
                    description={`${formatPrice(plan.price)} FCFA - ${plan.tier}`}
                    right={props => (
                      <Button 
                        mode={mechanic?.subscription_tier === plan.tier ? "contained" : "outlined"}
                        disabled={mechanic?.subscription_tier === plan.tier}
                        onPress={() => handleSelectPlan(plan)}
                      >
                        {mechanic?.subscription_tier === plan.tier ? 'Actuel' : 'Choisir'}
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

        {/* DIALOG: DEVIS (QUOTATION) */}
        <Dialog visible={showQuotation} onDismiss={() => setShowQuotation(false)}>
          <Dialog.Title>Votre Devis : {selectedPlan?.name}</Dialog.Title>
          <Dialog.Content>
            <Text style={{marginBottom: 10}}>Choisissez la durée de votre abonnement en mois :</Text>
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
        
            {loading ? (
              <ActivityIndicator />
            ) : quotation ? (
              <View style={styles.quotationBox}>
                <View style={styles.infoRow}>
                  <Text>Prix par mois</Text>
                  <Text style={styles.value}>{formatPrice(quotation.price_per_month)} FCFA</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text>Durée</Text>
                  <Text style={styles.value}>{quotation.months} mois</Text>
                </View>
                <Divider style={{marginVertical: 10}} />
                <View style={styles.infoRow}>
                  <Title>TOTAL</Title>
                  <Title style={{color: '#1976D2'}}>{formatPrice(quotation.total_price)} FCFA</Title>
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
            >
              Valider ce devis
            </Button>
          </Dialog.Actions>
        </Dialog>

        {/* DIALOG: MODE DE PAIEMENT */}
        <Dialog visible={showPaymentMethods} onDismiss={() => setShowPaymentMethods(false)}>
          <Dialog.Title>Choisir un mode de paiement</Dialog.Title>
          <Dialog.Content>
            <Text style={{marginBottom: 15}}>Sélectionnez l'opérateur pour finaliser le paiement de {formatPrice(quotation?.total_price)} FCFA.</Text>
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
            <Divider />
            <List.Item
              title="Moov Money"
              left={props => <Avatar.Icon {...props} icon="signal" style={{backgroundColor: '#006633'}} />}
              onPress={() => handlePayment('MOOV')}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowPaymentMethods(false)}>Annuler</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#1976D2',
    padding: 30,
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  avatar: {
    backgroundColor: 'white',
    marginBottom: 10,
  },
  name: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
  },
  shop: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    marginTop: 5,
  },
  tierBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 5,
  },
  tierText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  card: {
    margin: 15,
    elevation: 4,
    borderRadius: 15,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  label: {
    color: '#757575',
    fontSize: 14,
  },
  value: {
    fontWeight: 'bold',
    fontSize: 14,
    color: '#333',
    maxWidth: '60%',
    textAlign: 'right',
  },
  divider: {
    backgroundColor: '#e0e0e0',
  },
  logoutBtn: {
    marginHorizontal: 15,
    marginTop: 10,
    borderColor: '#F44336',
  },
  version: {
    textAlign: 'center',
    marginTop: 30,
    color: '#bdbdbd',
    fontSize: 12,
    marginBottom: 30,
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
  }
});
