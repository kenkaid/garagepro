import React, {useState, useEffect} from 'react';
import {View, StyleSheet, ScrollView, Alert, Linking, FlatList} from 'react-native';
import {Card, Button, Text, TextInput, List, Divider, ActivityIndicator, Searchbar} from 'react-native-paper';
import {apiService} from '../../services/apiService';
import {formatPrice} from '../../utils/diagnosticUtils';

export const SendResultsScreen: React.FC<{navigation: any; route: any}> = ({
  navigation,
  route,
}) => {
  const {scan} = route.params;
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);

  // Nouveaux états pour les coûts
  const [laborCost, setLaborCost] = useState(String(scan.actual_labor_cost || ''));
  const [partsCost, setPartsCost] = useState(String(scan.actual_parts_cost || ''));

  // Génération du texte du rapport
  const generateReportText = () => {
    let text = `📋 *RAPPORT DE DIAGNOSTIC OBD*\n`;
    text += `🚗 Véhicule: ${scan.vehicle?.brand} ${scan.vehicle?.model} (${scan.vehicle?.year})\n`;
    text += `🔢 Plaque: ${scan.vehicle?.license_plate}\n`;
    text += `📅 Date: ${new Date(scan.date).toLocaleDateString('fr-FR')}\n\n`;

    if (scan.found_dtcs && scan.found_dtcs.length > 0) {
      text += `❌ *Codes Défauts Trouvés (${scan.found_dtcs.length}):*\n`;
      scan.found_dtcs.forEach((dtc: any, index: number) => {
        text += `${index + 1}. ${dtc.code}: ${dtc.meaning || 'Problème détecté'}\n`;
      });
      text += `\n`;
    } else {
      text += `✅ Aucun code défaut détecté.\n\n`;
    }

    if (scan.ai_predictions?.summary?.verdict) {
      text += `🤖 *Analyse IA:* ${scan.ai_predictions.summary.verdict}\n\n`;
    }

    const lCost = parseInt(laborCost) || 0;
    const pCost = parseInt(partsCost) || 0;
    const totalCost = lCost + pCost;

    if (totalCost > 0) {
      text += `💰 *Estimation financière:*\n`;
      if (lCost > 0) text += `- Main d'œuvre: ${formatPrice(lCost)} FCFA\n`;
      if (pCost > 0) text += `- Pièces: ${formatPrice(pCost)} FCFA\n`;
      text += `*TOTAL: ${formatPrice(totalCost)} FCFA*\n\n`;
    }

    text += `📍 Diagnostic réalisé par votre garage expert.`;
    return text;
  };

  const saveCosts = async () => {
    const lCost = parseInt(laborCost) || 0;
    const pCost = parseInt(partsCost) || 0;
    if (lCost !== scan.actual_labor_cost || pCost !== scan.actual_parts_cost) {
      await apiService.updateScan(scan.id, {
        actual_labor_cost: lCost,
        actual_parts_cost: pCost,
      });
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    const results = await apiService.searchClients(query);
    setSearchResults(results);
    setIsSearching(false);
  };

  const handleSendViaInternal = async () => {
    if (!selectedClient) {
      Alert.alert('Erreur', 'Veuillez sélectionner un client.');
      return;
    }

    setLoading(true);
    await saveCosts();
    const message = generateReportText();
    const result = await apiService.sendMessage(selectedClient.id, message);
    setLoading(false);

    if (result && !result.__error) {
      Alert.alert('Succès', 'Le rapport a été envoyé via la messagerie interne.', [
        {text: 'OK', onPress: () => navigation.goBack()},
      ]);
    } else {
      Alert.alert('Erreur', "L'envoi a échoué. Vérifiez que le client est bien sur la plateforme.");
    }
  };

  const handleSendViaWhatsApp = async () => {
    setLoading(true);
    await saveCosts();
    setLoading(false);
    
    const message = generateReportText();
    const phone = selectedClient?.phone || '';
    // Formatage numéro pour WhatsApp (enlever espaces, ajouter indicatif si besoin)
    // wa.me attend un numéro international sans le + initial
    let cleanPhone = phone.replace(/\D/g, '');
    
    // Si le numéro commence par 0, on suppose que c'est un numéro local (Côte d'Ivoire +225)
    // Note: adapter selon le pays par défaut si nécessaire
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '225' + cleanPhone;
    }
    
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        // Fallback: essayer d'ouvrir l'URL web directement si canOpenURL renvoie false
        // Parfois canOpenURL échoue sur iOS si le schéma n'est pas dans LSApplicationQueriesSchemes
        // mais openURL fonctionne quand même pour les URLs https
        await Linking.openURL(url);
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'ouvrir WhatsApp. Vérifiez que l\'application est installée.');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Title title="Envoyer les résultats" subtitle="Saisie des coûts et destinataire" />
        <Card.Content>
          <View style={styles.costContainer}>
            <TextInput
              label="Montant Main d'œuvre (FCFA)"
              value={laborCost}
              onChangeText={setLaborCost}
              keyboardType="numeric"
              style={styles.costInput}
              mode="outlined"
            />
            <TextInput
              label="Montant Pièces (FCFA)"
              value={partsCost}
              onChangeText={setPartsCost}
              keyboardType="numeric"
              style={styles.costInput}
              mode="outlined"
            />
          </View>

          <Divider style={styles.divider} />

          <Searchbar
            placeholder="Rechercher (Nom, Tel, Plaque...)"
            onChangeText={handleSearch}
            value={searchQuery}
            style={styles.searchBar}
          />

          {isSearching && <ActivityIndicator style={{margin: 10}} />}

          {!selectedClient && searchResults.length > 0 && (
            <View style={styles.resultsContainer}>
              {searchResults.map((item) => (
                <List.Item
                  key={item.id}
                  title={item.name}
                  description={`${item.phone} - ${item.vehicles.join(', ')}`}
                  left={props => <List.Icon {...props} icon="account" />}
                  onPress={() => {
                    setSelectedClient(item);
                    setSearchResults([]);
                  }}
                  style={styles.resultItem}
                />
              ))}
            </View>
          )}

          {selectedClient && (
            <View style={styles.selectedClientBox}>
              <View style={styles.clientInfo}>
                <Text style={styles.selectedLabel}>Client sélectionné :</Text>
                <Text style={styles.clientName}>{selectedClient.name}</Text>
                <Text style={styles.clientSub}>{selectedClient.phone}</Text>
              </View>
              <Button icon="close" onPress={() => setSelectedClient(null)}>Modifier</Button>
            </View>
          )}

          <Divider style={styles.divider} />

          <Text style={styles.previewTitle}>Aperçu du message :</Text>
          <View style={styles.previewBox}>
            <Text style={styles.previewText}>{generateReportText()}</Text>
          </View>

          <View style={styles.buttonContainer}>
            <Button
              mode="contained"
              icon="chat-processing"
              onPress={handleSendViaInternal}
              loading={loading}
              disabled={loading || !selectedClient}
              style={styles.button}>
              Messagerie Interne
            </Button>

            <Button
              mode="contained"
              icon="whatsapp"
              onPress={handleSendViaWhatsApp}
              style={[styles.button, {backgroundColor: '#25D366'}]}>
              WhatsApp
            </Button>

            <Button
              mode="outlined"
              onPress={() => navigation.goBack()}
              style={styles.button}>
              Annuler
            </Button>
          </View>
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 8,
  },
  card: {
    marginVertical: 8,
    borderRadius: 12,
  },
  searchBar: {
    marginBottom: 8,
    elevation: 2,
  },
  costContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 8,
  },
  costInput: {
    flex: 1,
    height: 50,
  },
  resultsContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
    maxHeight: 200,
  },
  resultItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectedClientBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    marginVertical: 10,
  },
  clientInfo: {
    flex: 1,
  },
  selectedLabel: {
    fontSize: 12,
    color: '#1565C0',
  },
  clientName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0D47A1',
  },
  clientSub: {
    fontSize: 13,
    color: '#546E7A',
  },
  divider: {
    marginVertical: 16,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#455A64',
  },
  previewBox: {
    backgroundColor: '#ECEFF1',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CFD8DC',
    marginBottom: 20,
  },
  previewText: {
    fontSize: 13,
    color: '#263238',
    fontFamily: 'System',
  },
  buttonContainer: {
    gap: 12,
  },
  button: {
    borderRadius: 8,
  },
});
