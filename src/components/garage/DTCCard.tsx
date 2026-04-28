import React, {useState} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, Linking, Image} from 'react-native';
import {Card, Divider, Chip} from 'react-native-paper';

interface DTCCardProps {
  dtc: any;
  isHistoryView?: boolean;
  historyScan?: any;
  vehicleBrand?: string;
  vehicleModel?: string;
  children?: React.ReactNode;
}

const getSeverityColor = (severity: string) => {
  switch (severity?.toLowerCase()) {
    case 'high':
    case 'critical':
      return '#D32F2F';
    case 'medium':
      return '#F57C00';
    case 'low':
      return '#388E3C';
    default:
      return '#757575';
  }
};

const getSeverityLabel = (severity: string) => {
  switch (severity?.toLowerCase()) {
    case 'high':
    case 'critical':
      return '🔴 Élevée';
    case 'medium':
      return '🟠 Moyenne';
    case 'low':
      return '🟢 Faible';
    default:
      return '⚪ Inconnue';
  }
};

const getStatusBadge = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'confirmed':
      return { label: 'CONFIRMÉ', color: '#D32F2F', bgColor: '#FFEBEE' };
    case 'pending':
      return { label: 'EN ATTENTE', color: '#F57C00', bgColor: '#FFF3E0' };
    case 'permanent':
      return { label: 'PERMANENT', color: '#455A64', bgColor: '#ECEFF1' };
    default:
      return null;
  }
};

export const DTCCard: React.FC<DTCCardProps> = ({
  dtc,
  vehicleBrand,
  vehicleModel,
  children,
}) => {
  const [expanded, setExpanded] = useState(true);

  const dtcData = typeof dtc === 'string' ? {code: dtc} : dtc;

  // Si c'est un objet ScanSessionDTC, les données réelles du code sont dans dtc_details
  const effectiveDtc = dtcData.dtc_details || dtcData;

  const code = dtcData.code || effectiveDtc.code || dtcData;
  const description = dtcData.description || effectiveDtc.description || '';
  const meaning = dtcData.meaning || effectiveDtc.meaning || '';
  const severity = dtcData.severity || effectiveDtc.severity || '';
  const status = dtcData.status || '';

  // Symptômes : commonSymptoms (camelCase backend) ou symptoms
  const symptoms: string[] =
    dtcData.commonSymptoms ||
    effectiveDtc.commonSymptoms ||
    dtcData.symptoms ||
    effectiveDtc.symptoms ||
    [];

  // Causes : possibleCauses (camelCase) ou probable_causes (si déjà parsé)
  const causes: string[] =
    dtcData.possibleCauses ||
    effectiveDtc.possibleCauses ||
    dtcData.probable_causes ||
    effectiveDtc.probable_causes ||
    [];

  // Solutions : suggestedFixes (camelCase) ou suggested_solutions
  const solutions: string[] =
    dtcData.suggestedFixes ||
    effectiveDtc.suggestedFixes ||
    dtcData.suggested_solutions ||
    effectiveDtc.suggested_solutions ||
    [];

  const tips: string = dtcData.tips || effectiveDtc.tips || '';
  const warnings: string = dtcData.warnings || effectiveDtc.warnings || '';

  // Pièces recommandées (Drive-to-Store)
  const recommendedParts: any[] =
    dtcData.recommended_spare_parts ||
    dtcData.recommendedSpareParts ||
    effectiveDtc.recommended_spare_parts ||
    effectiveDtc.recommendedSpareParts ||
    [];

  const severityColor = getSeverityColor(severity);
  const statusInfo = getStatusBadge(status);

  return (
    <Card style={styles.card}>
      <TouchableOpacity onPress={() => setExpanded(!expanded)} activeOpacity={0.8}>
        <View style={[styles.header, {borderLeftColor: severityColor}]}>
          <View style={styles.headerTop}>
            <TouchableOpacity
              onPress={() => {
                const vehiclePart = vehicleBrand || vehicleModel
                  ? `+${encodeURIComponent((vehicleBrand || '') + ' ' + (vehicleModel || '')).trim()}`
                  : '';
                Linking.openURL(`https://www.google.com/search?q=code+erreur+OBD+${code}${vehiclePart}`);
              }}
              activeOpacity={0.7}>
              <Text style={[styles.code, {color: severityColor}]}>
                {code} <Text style={styles.googleLink}>🔍</Text>
              </Text>
            </TouchableOpacity>

            <View style={styles.badgesContainer}>
              {statusInfo && (
                <View style={[styles.statusBadge, { backgroundColor: statusInfo.bgColor }]}>
                  <Text style={[styles.statusText, { color: statusInfo.color }]}>
                    {statusInfo.label}
                  </Text>
                </View>
              )}
              {severity ? (
                <Text style={[styles.severityBadge, {color: severityColor}]}>
                  {getSeverityLabel(severity)}
                </Text>
              ) : null}
            </View>
          </View>
          <Text style={styles.googleHint}>Appuyez sur le code pour rechercher sur Google</Text>
          {description ? (
            <Text style={styles.description}>{description}</Text>
          ) : null}
          <Text style={styles.expandHint}>{expanded ? '▲ Réduire' : '▼ Voir détails'}</Text>
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.body}>
          {meaning ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📋 Explication</Text>
              <Text style={styles.bodyText}>{meaning}</Text>
            </View>
          ) : null}

          {symptoms.length > 0 && (
            <>
              <Divider style={styles.divider} />
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>⚠️ Symptômes Communs</Text>
                {symptoms.map((s, i) => (
                  <Text key={i} style={styles.listItem}>• {s}</Text>
                ))}
              </View>
            </>
          )}

          {causes.length > 0 && (
            <>
              <Divider style={styles.divider} />
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>🔍 Causes Possibles</Text>
                {causes.map((c, i) => (
                  <Text key={i} style={styles.listItem}>• {c}</Text>
                ))}
              </View>
            </>
          )}

          {solutions.length > 0 && (
            <>
              <Divider style={styles.divider} />
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>🔧 Diagnostics et Solutions</Text>
                {solutions.map((s, i) => (
                  <Text key={i} style={styles.listItem}>• {s}</Text>
                ))}
              </View>
            </>
          )}

          {tips ? (
            <>
              <Divider style={styles.divider} />
              <View style={[styles.section, styles.tipsBox]}>
                <Text style={styles.tipsText}>💡 Conseil : {tips}</Text>
              </View>
            </>
          ) : null}

          {warnings ? (
            <>
              <Divider style={styles.divider} />
              <View style={[styles.section, styles.warningBox]}>
                <Text style={styles.warningText}>⚠️ Avertissement : {warnings}</Text>
              </View>
            </>
          ) : null}

          {recommendedParts.length > 0 ? (
            <>
              <Divider style={styles.divider} />
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, {color: '#1A237E'}]}>🛒 Pièces disponibles (Drive-to-Store)</Text>
                {recommendedParts.map((part, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.partCard}
                    onPress={() => {
                      if (part.store_details?.phone) {
                        Linking.openURL(`tel:${part.store_details.phone}`);
                      }
                    }}
                  >
                    <View style={styles.partInfo}>
                      <Text style={styles.partName}>{part.name}</Text>
                      <Text style={styles.partBrand}>{part.brand} • {part.store_details?.name}</Text>
                      <View style={styles.locationRow}>
                        <Text style={styles.locationText}>📍 {part.store_details?.location_name}</Text>
                        <Chip style={styles.priceChip} textStyle={styles.priceText}>{part.price} FCFA</Chip>
                      </View>
                    </View>
                    <Text style={styles.callIcon}>📞</Text>
                  </TouchableOpacity>
                ))}
                <Text style={styles.storeInfoHint}>Cliquez sur une pièce pour appeler le magasin.</Text>
              </View>
            </>
          ) : null}

          {children ? (
            <>
              <Divider style={styles.divider} />
              {children}
            </>
          ) : null}
        </View>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
    elevation: 3,
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
  },
  header: {
    padding: 16,
    borderLeftWidth: 5,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  code: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  googleLink: {
    fontSize: 16,
  },
  googleHint: {
    fontSize: 11,
    color: '#1565C0',
    marginTop: 2,
    textDecorationLine: 'underline',
  },
  severityBadge: {
    fontSize: 13,
    fontWeight: '600',
  },
  badgesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  description: {
    fontSize: 14,
    color: '#333',
    marginTop: 4,
    fontStyle: 'italic',
  },
  expandHint: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
    textAlign: 'right',
  },
  body: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  section: {
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
  },
  bodyText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  listItem: {
    fontSize: 14,
    color: '#555',
    lineHeight: 22,
    marginLeft: 4,
  },
  divider: {
    marginTop: 12,
    backgroundColor: '#eee',
  },
  tipsBox: {
    backgroundColor: '#E3F2FD',
    borderRadius: 6,
    padding: 10,
  },
  tipsText: {
    fontSize: 13,
    color: '#1565C0',
    lineHeight: 20,
  },
  warningBox: {
    backgroundColor: '#FFF3E0',
    borderRadius: 6,
    padding: 10,
  },
  warningText: {
    fontSize: 13,
    color: '#E65100',
    lineHeight: 20,
  },
  partCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E8EAF6',
  },
  partInfo: {
    flex: 1,
  },
  partName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
  },
  partBrand: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  locationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  locationText: {
    fontSize: 12,
    color: '#1A237E',
    lineHeight: 20,
  },
  priceChip: {
    height: 24,
    backgroundColor: '#E8EAF6',
  },
  priceText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1A237E',
    marginVertical: 0,
  },
  callIcon: {
    fontSize: 20,
    marginLeft: 10,
  },
  storeInfoHint: {
    fontSize: 11,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 8,
  },
});
