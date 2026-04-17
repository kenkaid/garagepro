import React from 'react';
import {View, StyleSheet, Image, Text} from 'react-native';
import {Card, Divider, List} from 'react-native-paper';
import {getSeverityColor, getSeverityLabel} from '../../utils/diagnosticUtils';

export interface DTCData {
  code: string;
  severity?: string;
  description?: string;
  meaning?: string;
  partImageUrl?: string;
  part_image_url?: string;
  partLocation?: string;
  part_location?: string;
  possibleCauses?: string[];
  probable_causes?: string[];
  probable_causes_list?: string[];
  suggestedFixes?: string[];
  suggested_solutions?: string[];
  suggested_solutions_list?: string[];
}

interface DTCCardProps {
  dtc: string | DTCData;
  isHistoryView?: boolean;
  historyScan?: any;
  children?: React.ReactNode;
}

export const DTCCard: React.FC<DTCCardProps> = ({
  dtc,
  isHistoryView,
  historyScan,
  children,
}) => {
  // Si dtc est une chaîne de caractères (code brut), on essaie de le résoudre
  const dtcData: DTCData = typeof dtc === 'string' ? {code: dtc} : dtc;
  const severity = (dtcData?.severity || 'medium').toString();
  const code = (dtcData?.code || 'INCONNU').toString();

  // Détection si c'est un code "expert" (ABS/SRS/Châssis)
  const isExpertCode =
    code &&
    typeof code === 'string' &&
    (code.startsWith('C') || code.startsWith('B') || code.startsWith('U'));

  return (
    <Card
      key={code}
      style={[styles.dtcCard, isExpertCode && styles.expertDtcCard]}>
      <Card.Content>
        <View style={styles.dtcHeader}>
          <View>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <Text style={styles.dtcCode}>{code}</Text>
              {isExpertCode && (
                <View style={styles.expertBadge}>
                  <Text style={styles.expertBadgeText}>EXPERT</Text>
                </View>
              )}
            </View>
            {isHistoryView &&
              historyScan?.ai_predictions?.summary?.confidence_score && (
                <Text style={styles.confidenceScore}>
                  Fiabilité :{' '}
                  {Math.round(
                    historyScan.ai_predictions.summary.confidence_score * 100,
                  )}
                  %
                </Text>
              )}
          </View>
          <View
            style={[
              styles.severityBadge,
              {backgroundColor: getSeverityColor(severity)},
            ]}>
            <Text style={styles.severityText}>{getSeverityLabel(severity)}</Text>
          </View>
        </View>
        <Text style={styles.description}>
          {dtcData.description || 'Pas de description disponible'}
        </Text>

        {!!dtcData.meaning && (
          <View style={styles.meaningContainer}>
            <Text style={styles.meaningTitle}>💡 Explication :</Text>
            <Text style={styles.meaningText}>{dtcData.meaning}</Text>
          </View>
        )}

        <Divider style={styles.divider} />

        {!!(dtcData.partImageUrl || dtcData.part_image_url) && (
          <View style={styles.visualAide}>
            <Text style={styles.sectionTitle}>📸 À quoi ça ressemble ?</Text>
            <Image
              source={{uri: dtcData.partImageUrl || dtcData.part_image_url}}
              style={styles.partImage}
              resizeMode="cover"
            />
            <Text style={styles.locationText}>
              📍 Emplacement :{' '}
              {String(
                dtcData.partLocation || dtcData.part_location || 'Non spécifié',
              )}
            </Text>
          </View>
        )}

        {!!(
          dtcData.possibleCauses ||
          dtcData.suggestedFixes ||
          dtcData.probable_causes ||
          dtcData.suggested_solutions ||
          dtcData.probable_causes_list ||
          dtcData.suggested_solutions_list
        ) && (
          <List.Accordion
            title="Causes & Solutions"
            left={props => <List.Icon {...props} icon="wrench" />}>
            {(dtcData.possibleCauses ||
              dtcData.probable_causes ||
              dtcData.probable_causes_list) &&
              Array.isArray(
                dtcData.possibleCauses ||
                  dtcData.probable_causes ||
                  dtcData.probable_causes_list,
              ) && (
                <View style={{paddingLeft: 16}}>
                  <Text style={styles.subTitle}>Causes probables :</Text>
                  {(
                    dtcData.possibleCauses ||
                    dtcData.probable_causes ||
                    dtcData.probable_causes_list
                  ).map((cause: string, i: number) => (
                    <Text key={i}>• {String(cause)}</Text>
                  ))}
                </View>
              )}
            {(dtcData.possibleCauses ||
              dtcData.probable_causes ||
              dtcData.probable_causes_list) &&
              Array.isArray(
                dtcData.possibleCauses ||
                  dtcData.probable_causes ||
                  dtcData.probable_causes_list,
              ) &&
              (dtcData.suggestedFixes ||
                dtcData.suggested_solutions ||
                dtcData.suggested_solutions_list) &&
              Array.isArray(
                dtcData.suggestedFixes ||
                  dtcData.suggested_solutions ||
                  dtcData.suggested_solutions_list,
              ) && <Divider style={{marginVertical: 5}} />}
            {(dtcData.suggestedFixes ||
              dtcData.suggested_solutions ||
              dtcData.suggested_solutions_list) &&
              Array.isArray(
                dtcData.suggestedFixes ||
                  dtcData.suggested_solutions ||
                  dtcData.suggested_solutions_list,
              ) && (
                <View style={{paddingLeft: 16}}>
                  <Text style={styles.subTitle}>Solutions suggérées :</Text>
                  {(
                    dtcData.suggestedFixes ||
                    dtcData.suggested_solutions ||
                    dtcData.suggested_solutions_list
                  ).map((fix: string, i: number) => (
                    <Text key={i}>• {String(fix)}</Text>
                  ))}
                </View>
              )}
          </List.Accordion>
        )}

      {children}
    </Card.Content>
  </Card>
  );
};

const styles = StyleSheet.create({
  dtcCard: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 4,
    backgroundColor: '#fff',
    borderLeftWidth: 4,
    borderLeftColor: '#6200ee',
  },
  expertDtcCard: {
    borderLeftColor: '#FF9800',
    backgroundColor: '#FFFDE7',
  },
  dtcHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  dtcCode: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  expertBadge: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  expertBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  confidenceScore: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  severityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  severityText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  description: {
    fontSize: 16,
    color: '#333',
    marginBottom: 12,
    lineHeight: 22,
  },
  meaningContainer: {
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  meaningTitle: {
    fontWeight: 'bold',
    color: '#6200ee',
    marginBottom: 4,
  },
  meaningText: {
    fontSize: 14,
    color: '#444',
    fontStyle: 'italic',
  },
  divider: {
    marginVertical: 12,
  },
  visualAide: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#666',
  },
  partImage: {
    width: '100%',
    height: 180,
    borderRadius: 8,
    marginBottom: 8,
  },
  locationText: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
  },
  subTitle: {
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 4,
    color: '#444',
  },
});
