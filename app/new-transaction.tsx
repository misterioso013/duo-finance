import { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  Switch,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { addDoc, collection } from 'firebase/firestore';
import { db, auth } from '../utils/firebase';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function NewTransaction() {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isFuturePayment, setIsFuturePayment] = useState(false);
  const [dueDate, setDueDate] = useState(new Date());
  const [showDueDatePicker, setShowDueDatePicker] = useState(false);

  async function handleAddTransaction() {
    if (!description || !amount) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos');
      return;
    }

    if (isFuturePayment) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selectedDate = new Date(dueDate);
      selectedDate.setHours(0, 0, 0, 0);

      if (selectedDate < today) {
        Alert.alert('Erro', 'A data de vencimento não pode ser no passado');
        return;
      }
    }

    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      await addDoc(collection(db, 'transactions'), {
        userId,
        description,
        amount: parseFloat(amount),
        category,
        date,
        isFuturePayment,
        dueDate: isFuturePayment ? dueDate : null,
        status: isFuturePayment ? 'pending' : 'completed',
        createdAt: new Date(),
      });

      Alert.alert(
        'Sucesso',
        'Transação adicionada com sucesso!',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível adicionar a transação');
    }
  }

  function formatDate(date: Date) {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nova Transação</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.contentContainer}>
        <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={24} color="#1e40af" />
            <Text style={styles.infoText}>
              • Para receitas, use valores positivos (ex: 1000){'\n'}
              • Para despesas, use valores negativos (ex: -1000){'\n'}
              • Adicione uma descrição clara para facilitar o controle
            </Text>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Descrição</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Salário, Aluguel, Mercado..."
              placeholderTextColor="#94a3b8"
              value={description}
              onChangeText={setDescription}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Valor</Text>
            <View style={styles.amountInputContainer}>
              <Text style={styles.currencySymbol}>R$</Text>
              <TextInput
                style={[styles.input, styles.amountInput]}
                placeholder="0,00"
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
                value={amount}
                onChangeText={(value) => {
                  const formattedValue = value.replace(',', '.');
                  setAmount(formattedValue);
                }}
              />
              <View style={[
                styles.amountType,
                { backgroundColor: parseFloat(amount || '0') >= 0 ? '#22c55e20' : '#ef444420' }
              ]}>
                <Ionicons
                  name={parseFloat(amount || '0') >= 0 ? "arrow-up" : "arrow-down"}
                  size={20}
                  color={parseFloat(amount || '0') >= 0 ? "#22c55e" : "#ef4444"}
                />
                <Text style={[
                  styles.amountTypeText,
                  { color: parseFloat(amount || '0') >= 0 ? "#22c55e" : "#ef4444" }
                ]}>
                  {parseFloat(amount || '0') >= 0 ? 'Receita' : 'Despesa'}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Categoria</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Alimentação, Transporte..."
              placeholderTextColor="#94a3b8"
              value={category}
              onChangeText={setCategory}
            />
          </View>

          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.dateButtonLabel}>Data da transação</Text>
            <Text style={styles.dateValue}>{formatDate(date)}</Text>
          </TouchableOpacity>

          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>Conta futura?</Text>
            <Switch
              value={isFuturePayment}
              onValueChange={setIsFuturePayment}
              trackColor={{ false: '#cbd5e1', true: '#93c5fd' }}
              thumbColor={isFuturePayment ? '#1e40af' : '#f4f4f5'}
            />
          </View>

          {isFuturePayment && (
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDueDatePicker(true)}
            >
              <Text style={styles.dateButtonLabel}>Data de vencimento</Text>
              <Text style={styles.dateValue}>{formatDate(dueDate)}</Text>
            </TouchableOpacity>
          )}

          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, selectedDate) => {
                setShowDatePicker(false);
                if (selectedDate) {
                  setDate(selectedDate);
                }
              }}
            />
          )}

          {showDueDatePicker && (
            <DateTimePicker
              value={dueDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, selectedDate) => {
                setShowDueDatePicker(false);
                if (selectedDate) {
                  setDueDate(selectedDate);
                }
              }}
            />
          )}
        </ScrollView>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.button} onPress={handleAddTransaction}>
            <Text style={styles.buttonText}>Adicionar transação</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e40af',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 60,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  contentContainer: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 32,
  },
  input: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    fontSize: 16,
  },
  dateButton: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  dateButtonLabel: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  dateValue: {
    fontSize: 16,
    color: '#0f172a',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  switchLabel: {
    fontSize: 16,
    color: '#0f172a',
  },
  buttonContainer: {
    padding: 16,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  button: {
    backgroundColor: '#1e40af',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
    color: '#475569',
    lineHeight: 20,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
    fontWeight: '500',
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencySymbol: {
    fontSize: 16,
    color: '#64748b',
    marginRight: 8,
    fontWeight: '500',
  },
  amountInput: {
    flex: 1,
  },
  amountType: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 12,
  },
  amountTypeText: {
    marginLeft: 4,
    fontWeight: '500',
  },
});
