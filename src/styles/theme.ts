import {StyleSheet} from 'react-native';

export const Colors = {
  primary: '#1976D2',
  secondary: '#90CAF9',
  background: '#F5F5F5',
  surface: '#FFFFFF',
  text: '#212121',
  textSecondary: '#757575',
  border: '#E0E0E0',
  error: '#D32F2F',
  success: '#388E3C',
  warning: '#FBC02D',
  disabled: '#BDBDBD',
  divider: '#F0F0F0',
};

export const SharedStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  contentContainer: {
    padding: 20,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 24,
  },
  input: {
    backgroundColor: Colors.surface,
    marginBottom: 16,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 8,
    marginTop: 8,
  },
  outlineButton: {
    borderColor: Colors.primary,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    marginTop: 8,
  },
  textButton: {
    marginTop: 8,
  },
  section: {
    backgroundColor: Colors.surface,
    marginTop: 20,
    paddingHorizontal: 15,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.border,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.primary,
    marginTop: 15,
    marginBottom: 5,
    textTransform: 'uppercase',
  },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
});
