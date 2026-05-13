import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

interface DatePickerModalProps {
  visible: boolean;
  title?: string;
  onConfirm: (date: Date) => void;
  onCancel: () => void;
  minimumDate?: Date;
}

const DAYS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

const DatePickerModal: React.FC<DatePickerModalProps> = ({
  visible,
  title = '📅 Choisir une date',
  onConfirm,
  onCancel,
  minimumDate,
}) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const minDate = minimumDate || today;

  const [currentMonth, setCurrentMonth] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // iOS : utilise le DateTimePicker natif directement
  if (Platform.OS === 'ios') {
    return (
      <Modal visible={visible} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.iosContainer}>
            <Text style={styles.iosTitle}>{title}</Text>
            <DateTimePicker
              value={selectedDate || today}
              mode="date"
              display="spinner"
              minimumDate={minDate}
              onChange={(_, date) => {
                if (date) setSelectedDate(date);
              }}
              locale="fr-FR"
            />
            <View style={styles.iosActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
                <Text style={styles.cancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={() => onConfirm(selectedDate || today)}>
                <Text style={styles.confirmText}>Confirmer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  // Android : calendrier custom en pur React Native
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () =>
    setCurrentMonth(new Date(year, month - 1, 1));
  const nextMonth = () =>
    setCurrentMonth(new Date(year, month + 1, 1));

  const isDisabled = (day: number) => {
    const d = new Date(year, month, day);
    d.setHours(0, 0, 0, 0);
    return d < minDate;
  };

  const isSelected = (day: number) => {
    if (!selectedDate) return false;
    return (
      selectedDate.getFullYear() === year &&
      selectedDate.getMonth() === month &&
      selectedDate.getDate() === day
    );
  };

  const isToday = (day: number) => {
    const t = new Date();
    return (
      t.getFullYear() === year &&
      t.getMonth() === month &&
      t.getDate() === day
    );
  };

  // Construire la grille
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfMonth; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.calendar}>
          <Text style={styles.calTitle}>{title}</Text>

          {/* Navigation mois */}
          <View style={styles.navRow}>
            <TouchableOpacity style={styles.navBtn} onPress={prevMonth}>
              <Text style={styles.navArrow}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.monthLabel}>
              {MONTHS[month]} {year}
            </Text>
            <TouchableOpacity style={styles.navBtn} onPress={nextMonth}>
              <Text style={styles.navArrow}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Jours de la semaine */}
          <View style={styles.weekRow}>
            {DAYS.map(d => (
              <Text key={d} style={styles.dayLabel}>
                {d}
              </Text>
            ))}
          </View>

          {/* Grille des jours */}
          {weeks.map((week, wi) => (
            <View key={wi} style={styles.weekRow}>
              {week.map((day, di) => {
                if (!day) {
                  return <View key={di} style={styles.dayCell} />;
                }
                const disabled = isDisabled(day);
                const selected = isSelected(day);
                const todayDay = isToday(day);
                return (
                  <TouchableOpacity
                    key={di}
                    style={[
                      styles.dayCell,
                      selected && styles.dayCellSelected,
                      todayDay && !selected && styles.dayCellToday,
                      disabled && styles.dayCellDisabled,
                    ]}
                    onPress={() => {
                      if (!disabled) {
                        setSelectedDate(new Date(year, month, day));
                      }
                    }}
                    disabled={disabled}>
                    <Text
                      style={[
                        styles.dayText,
                        selected && styles.dayTextSelected,
                        todayDay && !selected && styles.dayTextToday,
                        disabled && styles.dayTextDisabled,
                      ]}>
                      {day}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}

          {/* Date sélectionnée */}
          {selectedDate && (
            <Text style={styles.selectedLabel}>
              Sélectionné : {selectedDate.toLocaleDateString('fr-FR', {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
              })}
            </Text>
          )}

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
              <Text style={styles.cancelText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmBtn, !selectedDate && styles.confirmBtnDisabled]}
              onPress={() => selectedDate && onConfirm(selectedDate)}
              disabled={!selectedDate}>
              <Text style={styles.confirmText}>Confirmer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // iOS
  iosContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    width: '90%',
  },
  iosTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#1A1C1E',
    textAlign: 'center',
    marginBottom: 12,
  },
  iosActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  // Android calendrier
  calendar: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    width: '92%',
    elevation: 8,
  },
  calTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A1C1E',
    textAlign: 'center',
    marginBottom: 14,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  navBtn: {
    padding: 8,
  },
  navArrow: {
    fontSize: 26,
    color: '#1976D2',
    fontWeight: 'bold',
  },
  monthLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1C1E',
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 4,
  },
  dayLabel: {
    width: 36,
    textAlign: 'center',
    fontSize: 11,
    color: '#9E9E9E',
    fontWeight: '600',
  },
  dayCell: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCellSelected: {
    backgroundColor: '#1976D2',
  },
  dayCellToday: {
    borderWidth: 1.5,
    borderColor: '#1976D2',
  },
  dayCellDisabled: {
    opacity: 0.3,
  },
  dayText: {
    fontSize: 14,
    color: '#1A1C1E',
  },
  dayTextSelected: {
    color: '#fff',
    fontWeight: 'bold',
  },
  dayTextToday: {
    color: '#1976D2',
    fontWeight: 'bold',
  },
  dayTextDisabled: {
    color: '#BDBDBD',
  },
  selectedLabel: {
    textAlign: 'center',
    fontSize: 13,
    color: '#1976D2',
    marginTop: 10,
    marginBottom: 4,
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  cancelText: {
    color: '#757575',
    fontWeight: '600',
    fontSize: 14,
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#1976D2',
    alignItems: 'center',
  },
  confirmBtnDisabled: {
    backgroundColor: '#BDBDBD',
  },
  confirmText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
});

export default DatePickerModal;
