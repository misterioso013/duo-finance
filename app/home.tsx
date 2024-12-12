import { useState, useEffect, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Image, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../utils/firebase';
import TransactionModal from './components/TransactionModal';
import DateFilter from './components/DateFilter';

type Transaction = {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: Date;
  userId: string;
  dueDate?: Date;
};

export default function Home() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [dateFilter, setDateFilter] = useState<'day' | 'week' | 'month' | 'year'>('month');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadTransactions();
  }, [dateFilter]);

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

      // Consulta simplificada
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

      setTransactions(filteredTransactions);

      // Calcula totais apenas das transações filtradas
      const { income, expenses } = filteredTransactions.reduce(
        (acc, transaction) => {
          if (transaction.amount > 0) {
            acc.income += transaction.amount;
          } else {
            acc.expenses += Math.abs(transaction.amount);
          }
          return acc;
        },
        { income: 0, expenses: 0 }
      );

      setTotalIncome(income);
      setTotalExpenses(expenses);
    } catch (error) {
      console.error('Erro ao carregar transações:', error);
    }
  }

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

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadTransactions();
    } catch (error) {
      console.error('Erro ao atualizar:', error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Cabeçalho */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.profileSection}>
            <View style={styles.avatarsContainer}>
              <Image
                style={styles.avatar}
                source={{ uri: 'https://via.placeholder.com/150' }}
              />
              <View style={styles.plusBadge}>
                <Ionicons name="heart" size={12} color="#fff" />
              </View>
              <Image
                style={[styles.avatar, styles.secondAvatar]}
                source={{ uri: 'https://via.placeholder.com/150' }}
              />
            </View>
            <Text style={styles.headerTitle}>Duo Finance</Text>
          </View>
          <View style={styles.headerActions}>
            <Link href="/chat" asChild>
              <TouchableOpacity style={styles.headerButton}>
                <Ionicons name="chatbubble-ellipses" size={24} color="#fff" />
              </TouchableOpacity>
            </Link>
            <Link href="/add-partner" asChild>
              <TouchableOpacity style={styles.headerButton}>
                <Ionicons name="person-add" size={24} color="#fff" />
              </TouchableOpacity>
            </Link>
            <Link href="/shopping" asChild>
              <TouchableOpacity style={styles.headerButton}>
                <Ionicons name="cart" size={24} color="#fff" />
              </TouchableOpacity>
            </Link>
          </View>
        </View>
        <Text style={styles.balance}>{formatCurrency(totalIncome - totalExpenses)}</Text>
        <Text style={styles.balanceSubtitle}>Saldo conjunto</Text>
      </View>

      {/* Cards de Resumo */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <View style={styles.cardHeader}>
            <Ionicons name="arrow-up-circle" size={24} color="#22c55e" />
            <Text style={styles.cardOwner}>Receitas</Text>
          </View>
          <View style={styles.cardContent}>
            <Text style={[styles.summaryValue, { color: '#22c55e' }]}>
              {formatCurrency(totalIncome)}
            </Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.cardHeader}>
            <Ionicons name="arrow-down-circle" size={24} color="#ef4444" />
            <Text style={styles.cardOwner}>Despesas</Text>
          </View>
          <View style={styles.cardContent}>
            <Text style={[styles.summaryValue, { color: '#ef4444' }]}>
              {formatCurrency(totalExpenses)}
            </Text>
          </View>
        </View>
      </View>

      <DateFilter
        currentFilter={dateFilter}
        onFilterChange={setDateFilter}
      />

      {/* Lista de Transações */}
      <View style={styles.transactionsContainer}>
        <View style={styles.transactionsHeader}>
          <Text style={styles.transactionsTitle}>Transações Recentes</Text>
          <Link href="/transactions" asChild>
            <TouchableOpacity>
              <Text style={styles.seeAllButton}>Ver todas</Text>
            </TouchableOpacity>
          </Link>
        </View>
        
        <ScrollView
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#1e40af']}
              tintColor="#1e40af"
            />
          }
        >
          {transactions.slice(0, 5).map((item) => (
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
        </ScrollView>
      </View>

      {/* Botão de Nova Transação */}
      <View style={styles.actionButtons}>
        <Link href="/new-transaction" asChild>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </Link>
      </View>

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
    backgroundColor: '#f3f4f6',
  },
  header: {
    backgroundColor: '#1e40af',
    padding: 20,
    paddingTop: 60,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 4,
  },
  balance: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 8,
  },
  balanceSubtitle: {
    color: '#cbd5e1',
    fontSize: 14,
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    marginTop: -30,
  },
  summaryCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    width: '48%',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  summaryTitle: {
    color: '#64748b',
    fontSize: 14,
    marginTop: 8,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 4,
  },
  transactionsContainer: {
    flex: 1,
    padding: 16,
  },
  transactionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  transaction: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  transactionInfo: {
    flex: 1,
    marginRight: 16,
  },
  transactionTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  transactionDate: {
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
  addButton: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    backgroundColor: '#1e40af',
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  profileSection: {
    flex: 1,
    marginBottom: 0,
  },
  avatarsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#fff',
  },
  secondAvatar: {
    marginLeft: -10,
  },
  plusBadge: {
    position: 'absolute',
    left: 25,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    zIndex: 1000,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardUser: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  cardContent: {
    marginTop: 4,
  },
  cardOwner: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  transactionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  seeAllButton: {
    color: '#1e40af',
    fontSize: 14,
    fontWeight: '500',
  },
  transactionAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  transactionInitial: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  actionButtons: {
    position: 'absolute',
    bottom: 24,
    right: 24,
  },
  actionButton: {
    backgroundColor: '#1e40af',
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
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
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 16,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
});
