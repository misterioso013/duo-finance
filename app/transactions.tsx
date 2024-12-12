import { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../utils/firebase';
import DateFilter from './components/DateFilter';
import TransactionModal from './components/TransactionModal';

type Transaction = {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: Date;
  userId: string;
  dueDate?: Date;
  isFuturePayment?: boolean;
  status?: 'pending' | 'completed';
};

export default function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [futureTransactions, setFutureTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<'day' | 'week' | 'month' | 'year'>('month');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);

  function getDateRange(filter: 'day' | 'week' | 'month' | 'year') {
    const now = new Date();
    const start = new Date(now);
    
    switch (filter) {
      case 'day':
        start.setHours(0, 0, 0, 0);
        return { start, end: now };
      case 'week':
        start.setDate(now.getDate() - 7);
        return { start, end: now };
      case 'month':
        start.setMonth(now.getMonth() - 1);
        return { start, end: now };
      case 'year':
        start.setFullYear(now.getFullYear() - 1);
        return { start, end: now };
    }
  }

  async function loadTransactions() {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      const { start, end } = getDateRange(dateFilter);

      const q = query(
        collection(db, 'transactions'),
        where('userId', '==', userId)
      );

      const futureQ = query(
        collection(db, 'transactions'),
        where('userId', '==', userId),
        where('isFuturePayment', '==', true),
        where('status', '==', 'pending')
      );

      const [transactionsSnapshot, futureSnapshot] = await Promise.all([
        getDocs(q),
        getDocs(futureQ)
      ]);

      const transactionsData = transactionsSnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
          date: doc.data().date.toDate(),
        })) as Transaction[];

      // Filtrar por data no cliente
      const filteredTransactions = transactionsData.filter(transaction => {
        const transactionDate = transaction.date;
        return transactionDate >= start && transactionDate <= end;
      });

      const futureData = futureSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date.toDate(),
        dueDate: doc.data().dueDate?.toDate(),
      })) as Transaction[];

      setTransactions(filteredTransactions);
      setFutureTransactions(futureData);
      setLoading(false);
    } catch (error) {
      console.error('Erro ao carregar transações:', error);
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTransactions();
  }, [dateFilter]);

  function formatCurrency(value: number) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  }

  function formatDate(date: Date) {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'long',
    }).format(date);
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transações</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <DateFilter
          currentFilter={dateFilter}
          onFilterChange={setDateFilter}
        />

        {futureTransactions.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contas Futuras</Text>
            {futureTransactions.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.transaction}
                onPress={() => {
                  setSelectedTransaction(item);
                  setIsModalVisible(true);
                }}
              >
                <View style={styles.transactionLeft}>
                  <View style={[styles.transactionAvatar, { backgroundColor: '#ef4444' }]}>
                    <Ionicons name="calendar" size={20} color="#fff" />
                  </View>
                  <View style={styles.transactionInfo}>
                    <Text style={styles.transactionTitle}>{item.description}</Text>
                    <Text style={styles.dueDate}>Vence em: {formatDate(item.dueDate!)}</Text>
                  </View>
                </View>
                <Text style={[styles.transactionValue, { color: '#ef4444' }]}>
                  {formatCurrency(item.amount)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Transações do Período</Text>
          {transactions.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.transaction}
              onPress={() => {
                setSelectedTransaction(item);
                setIsModalVisible(true);
              }}
            >
              <View style={styles.transactionLeft}>
                <View style={[styles.transactionAvatar, { 
                  backgroundColor: item.amount > 0 ? '#22c55e' : '#ef4444' 
                }]}>
                  <Ionicons 
                    name={item.amount > 0 ? "arrow-up" : "arrow-down"}
                    size={20} 
                    color="#fff" 
                  />
                </View>
                <View style={styles.transactionInfo}>
                  <Text style={styles.transactionTitle}>{item.description}</Text>
                  <Text style={styles.transactionDate}>{formatDate(item.date)}</Text>
                </View>
              </View>
              <Text style={[styles.transactionValue, { 
                color: item.amount > 0 ? '#22c55e' : '#ef4444' 
              }]}>
                {formatCurrency(item.amount)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {selectedTransaction && (
        <TransactionModal
          isVisible={isModalVisible}
          onClose={() => {
            setIsModalVisible(false);
            setSelectedTransaction(null);
          }}
          transaction={selectedTransaction}
        />
      )}
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
  content: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 16,
  },
  transactionsList: {
    paddingBottom: 24,
  },
  transaction: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  transactionInfo: {
    flex: 1,
    marginLeft: 16,
  },
  transactionAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transactionTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  transactionCategory: {
    color: '#64748b',
    fontSize: 14,
    marginTop: 2,
  },
  transactionDate: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    padding: 24,
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  dueDate: {
    color: '#64748b',
    fontSize: 14,
    marginTop: 4,
  },
  transactionValue: {
    fontSize: 16,
    fontWeight: '500',
    minWidth: 90,
    textAlign: 'right',
  },
});
