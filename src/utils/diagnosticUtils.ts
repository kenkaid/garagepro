/**
 * Utilitaires pour le diagnostic automobile
 */

export const getSeverityColor = (severity: string) => {
  switch (severity?.toLowerCase()) {
    case 'critical':
      return '#D32F2F';
    case 'high':
      return '#F57C00';
    case 'medium':
      return '#FBC02D';
    default:
      return '#388E3C';
  }
};

export const getSeverityLabel = (severity: string) => {
  switch (severity?.toLowerCase()) {
    case 'critical':
      return 'CRITIQUE';
    case 'high':
      return 'ÉLEVÉ';
    case 'medium':
      return 'MOYEN';
    default:
      return 'FAIBLE';
  }
};

export const formatPrice = (price: any) => {
  if (price === undefined || price === null) {
    return '0';
  }
  const num = typeof price === 'string' ? parseFloat(price) : price;
  if (isNaN(num)) {
    return '0';
  }
  return Math.floor(num)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
};
