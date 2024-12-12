import { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  Alert,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { 
  addDoc, 
  collection, 
  doc, 
  onSnapshot, 
  updateDoc, 
  serverTimestamp,
  deleteDoc,
} from 'firebase/firestore';
import { db, auth } from '../utils/firebase';
import CartModal from './components/CartModal';

type ShoppingItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
  unit: string;
};

type ShoppingList = {
  id: string;
  title: string;
  budget: number;
  items: ShoppingItem[];
  total: number;
  status: 'active' | 'completed';
  createdBy: string;
  createdAt: Date;
};

export default function Shopping() {
  const [title, setTitle] = useState('');
  const [budget, setBudget] = useState('');
  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemQuantity, setItemQuantity] = useState('1');
  const [itemUnit, setItemUnit] = useState('un');
  const [shoppingList, setShoppingList] = useState<ShoppingList | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCartModalVisible, setIsCartModalVisible] = useState(false);

  function formatCurrency(value: number) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  }

  function handleNumberInput(value: string, setter: (value: string) => void) {
    const formattedValue = value.replace(',', '.');
    setter(formattedValue);
  }

  useEffect(() => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    // Busca lista ativa ou cria uma nova
    const unsubscribe = onSnapshot(
      collection(db, 'shopping_lists'),
      (snapshot) => {
        const activeList = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as ShoppingList))
          .find(list => list.status === 'active');

        setShoppingList(activeList || null);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  async function handleCreateList() {
    if (!title || !budget) {
      Alert.alert('Erro', 'Preencha o título e o orçamento');
      return;
    }

    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      await addDoc(collection(db, 'shopping_lists'), {
        title,
        budget: parseFloat(budget),
        items: [],
        total: 0,
        status: 'active',
        createdBy: userId,
        createdAt: serverTimestamp(),
      });

      setTitle('');
      setBudget('');
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível criar a lista');
    }
  }

  async function handleAddItem() {
    if (!itemName || !itemPrice || !itemQuantity) {
      Alert.alert('Erro', 'Preencha todos os campos do item');
      return;
    }

    try {
      if (!shoppingList) return;

      const newItem = {
        id: Date.now().toString(),
        name: itemName,
        price: parseFloat(itemPrice),
        quantity: parseFloat(itemQuantity),
        unit: itemUnit,
      };

      const newTotal = shoppingList.total + (newItem.price * newItem.quantity);

      if (newTotal > shoppingList.budget) {
        Alert.alert(
          'Atenção',
          'Este item irá ultrapassar o orçamento. Deseja adicionar mesmo assim?',
          [
            { text: 'Cancelar', style: 'cancel' },
            { 
              text: 'Adicionar', 
              style: 'destructive',
              onPress: () => updateShoppingList([...shoppingList.items, newItem], newTotal)
            }
          ]
        );
      } else {
        updateShoppingList([...shoppingList.items, newItem], newTotal);
      }

      setItemName('');
      setItemPrice('');
      setItemQuantity('1');
      setItemUnit('un');
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível adicionar o item');
    }
  }

  async function updateShoppingList(items: ShoppingItem[], total: number) {
    if (!shoppingList) return;

    await updateDoc(doc(db, 'shopping_lists', shoppingList.id), {
      items,
      total,
    });
  }

  async function handleRemoveItem(item: ShoppingItem) {
    try {
      if (!shoppingList) return;

      const newItems = shoppingList.items.filter(i => i.id !== item.id);
      const newTotal = shoppingList.total - (item.price * item.quantity);

      await updateShoppingList(newItems, newTotal);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível remover o item');
    }
  }

  async function handleFinishShopping() {
    try {
      if (!shoppingList) return;

      const itemsDescription = shoppingList.items
        .map(item => `${item.quantity}${item.unit} ${item.name}`)
        .join(', ');

      // Cria a transação
      await addDoc(collection(db, 'transactions'), {
        userId: auth.currentUser?.uid,
        description: shoppingList.title,
        detailedDescription: itemsDescription,
        amount: -shoppingList.total,
        category: 'Compras',
        date: new Date(),
        items: shoppingList.items,
        status: 'completed',
        createdAt: new Date(),
      });

      // Finaliza a lista de compras
      await updateDoc(doc(db, 'shopping_lists', shoppingList.id), {
        status: 'completed',
      });

      router.back();
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível finalizar as compras');
    }
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
        <Text style={styles.headerTitle}>Lista de Compras</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        {!shoppingList ? (
          <View style={styles.createList}>
            <View style={styles.createListHeader}>
              <Ionicons name="cart" size={48} color="#1e40af" />
              <Text style={styles.createListTitle}>Nova Lista de Compras</Text>
              <Text style={styles.createListSubtitle}>
                Defina um título e orçamento para sua lista
              </Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Título da lista</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Compras do mês"
                value={title}
                onChangeText={setTitle}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Orçamento disponível</Text>
              <TextInput
                style={styles.input}
                placeholder="R$ 0,00"
                keyboardType="numeric"
                value={budget}
                onChangeText={setBudget}
              />
            </View>

            <TouchableOpacity style={styles.button} onPress={handleCreateList}>
              <Text style={styles.buttonText}>Criar Lista</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.listHeader}>
              <View>
                <Text style={styles.listTitle}>{shoppingList.title}</Text>
                <View style={styles.budgetContainer}>
                  <Text style={styles.budgetLabel}>Orçamento:</Text>
                  <Text style={[
                    styles.budgetValue,
                    shoppingList.total > shoppingList.budget && styles.overBudget
                  ]}>
                    {formatCurrency(shoppingList.budget)}
                  </Text>
                </View>
              </View>
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View style={[
                    styles.progressFill,
                    { 
                      width: `${Math.min((shoppingList.total / shoppingList.budget) * 100, 100)}%`,
                      backgroundColor: shoppingList.total > shoppingList.budget ? '#ef4444' : '#22c55e'
                    }
                  ]} />
                </View>
                <Text style={styles.progressText}>
                  {((shoppingList.total / shoppingList.budget) * 100).toFixed(0)}% utilizado
                </Text>
              </View>
            </View>

            <View style={styles.addItemSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Adicionar Item</Text>
                {shoppingList?.items.length > 0 && (
                  <TouchableOpacity 
                    style={styles.cartButton}
                    onPress={() => setIsCartModalVisible(true)}
                  >
                    <Ionicons name="cart" size={24} color="#1e40af" />
                    <View style={styles.cartBadge}>
                      <Text style={styles.cartBadgeText}>
                        {shoppingList.items.length}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.addItemForm}>
                <View style={styles.formRow}>
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Nome do item</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Ex: Arroz"
                      value={itemName}
                      onChangeText={setItemName}
                    />
                  </View>
                </View>

                <View style={styles.formRow}>
                  <View style={[styles.formGroup, { flex: 2 }]}>
                    <Text style={styles.label}>Preço unitário</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="R$ 0,00"
                      keyboardType="numeric"
                      value={itemPrice}
                      onChangeText={(value) => handleNumberInput(value, setItemPrice)}
                    />
                  </View>
                  <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                    <Text style={styles.label}>Qtd</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="1"
                      keyboardType="numeric"
                      value={itemQuantity}
                      onChangeText={(value) => handleNumberInput(value, setItemQuantity)}
                    />
                  </View>
                  <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                    <Text style={styles.label}>Un</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="un"
                      value={itemUnit}
                      onChangeText={setItemUnit}
                    />
                  </View>
                </View>

                <TouchableOpacity style={styles.addButton} onPress={handleAddItem}>
                  <Ionicons name="add" size={24} color="#fff" />
                  <Text style={styles.addButtonText}>Adicionar Item</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.itemsList}>
              <Text style={styles.sectionTitle}>Itens da Lista</Text>
              <FlatList
                data={shoppingList.items}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                  <View style={styles.item}>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName}>{item.name}</Text>
                      <Text style={styles.itemDetails}>
                        {item.quantity}{item.unit} x {formatCurrency(item.price)}
                      </Text>
                    </View>
                    <View style={styles.itemActions}>
                      <Text style={styles.itemTotal}>
                        {formatCurrency(item.price * item.quantity)}
                      </Text>
                      <TouchableOpacity
                        style={styles.removeButton}
                        onPress={() => handleRemoveItem(item)}
                      >
                        <Ionicons name="trash" size={20} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              />
            </View>

            <View style={styles.footer}>
              <View style={styles.totalContainer}>
                <Text style={styles.totalLabel}>Total da Lista:</Text>
                <Text style={[
                  styles.totalValue,
                  shoppingList.total > shoppingList.budget && styles.overBudget
                ]}>
                  {formatCurrency(shoppingList.total)}
                </Text>
              </View>
              <TouchableOpacity 
                style={styles.finishButton}
                onPress={handleFinishShopping}
              >
                <Ionicons name="checkmark-circle" size={24} color="#fff" />
                <Text style={styles.buttonText}>Finalizar Compras</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      <CartModal
        isVisible={isCartModalVisible}
        onClose={() => setIsCartModalVisible(false)}
        items={shoppingList?.items || []}
        onRemoveItem={handleRemoveItem}
        formatCurrency={formatCurrency}
      />
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
    padding: 24,
  },
  createList: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
  createListHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  createListTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  createListSubtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
  },
  formGroup: {
    flex: 1,
  },
  formRow: {
    flexDirection: 'row',
    gap: 8,
  },
  label: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
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
  listHeader: {
    marginBottom: 24,
  },
  listTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  budgetContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  budgetLabel: {
    fontSize: 16,
    color: '#64748b',
    marginRight: 8,
  },
  budgetValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#22c55e',
  },
  overBudget: {
    color: '#ef4444',
  },
  progressContainer: {
    marginTop: 16,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    textAlign: 'right',
  },
  addItemSection: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  addItemForm: {
    gap: 16,
  },
  flex1: {
    flex: 1,
    marginRight: 8,
  },
  flex05: {
    flex: 0.5,
    marginRight: 8,
  },
  addButton: {
    backgroundColor: '#22c55e',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  itemsList: {
    flex: 1,
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '500',
  },
  itemDetails: {
    color: '#64748b',
    marginTop: 4,
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 16,
  },
  removeButton: {
    padding: 8,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 16,
    marginTop: 16,
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
  },
  totalValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#22c55e',
  },
  finishButton: {
    backgroundColor: '#1e40af',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cartButton: {
    position: 'relative',
    padding: 8,
  },
  cartBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
}); 