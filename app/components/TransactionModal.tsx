import { View, Text, Modal, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type TransactionModalProps = {
  isVisible: boolean;
  onClose: () => void;
  transaction: {
    description: string;
    amount: number;
    date: Date;
    category: string;
    detailedDescription?: string;
    items?: Array<{
      name: string;
      price: number;
      quantity: number;
      unit: string;
    }>;
  };
};

export default function TransactionModal({ isVisible, onClose, transaction }: TransactionModalProps) {
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
      year: 'numeric',
    }).format(date);
  }

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent={true}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Detalhes da Transação</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Descrição:</Text>
              <Text style={styles.value}>{transaction.description}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.label}>Valor:</Text>
              <Text style={[
                styles.value,
                { color: transaction.amount > 0 ? '#22c55e' : '#ef4444' }
              ]}>
                {formatCurrency(transaction.amount)}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.label}>Data:</Text>
              <Text style={styles.value}>{formatDate(transaction.date)}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.label}>Categoria:</Text>
              <Text style={styles.value}>{transaction.category}</Text>
            </View>

            {transaction.items && (
              <View style={styles.itemsContainer}>
                <Text style={styles.itemsTitle}>Itens da compra:</Text>
                {transaction.items.map((item, index) => (
                  <View key={index} style={styles.item}>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName}>{item.name}</Text>
                      <Text style={styles.itemDetails}>
                        {item.quantity}{item.unit} x {formatCurrency(item.price)}
                      </Text>
                    </View>
                    <Text style={styles.itemTotal}>
                      {formatCurrency(item.price * item.quantity)}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {transaction.detailedDescription && (
              <View style={styles.detailedDescription}>
                <Text style={styles.label}>Descrição detalhada:</Text>
                <Text style={styles.value}>{transaction.detailedDescription}</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    minHeight: '50%',
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalBody: {
    padding: 20,
  },
  infoRow: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    fontWeight: '500',
  },
  itemsContainer: {
    marginTop: 16,
  },
  itemsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    marginBottom: 8,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
  },
  itemDetails: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 12,
  },
  detailedDescription: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
  },
}); 