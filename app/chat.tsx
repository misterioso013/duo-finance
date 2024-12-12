import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleGenerativeAI } from '@google/generative-ai';
import ApiKeyModal from './components/ApiKeyModal';
import ChatSettingsModal from './components/ChatSettingsModal';
import { router } from 'expo-router';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../utils/firebase';

type Message = {
  id: string;
  text: string;
  isUser: boolean;
};

type Transaction = {
  amount: number;
  date: Date;
  category?: string;
};

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [context, setContext] = useState('');
  const [transactionsContext, setTransactionsContext] = useState('');

  useEffect(() => {
    loadInitialData();
    loadTransactionsContext();
  }, []);

  async function loadInitialData() {
    try {
      // Carrega a chave API
      const savedApiKey = await AsyncStorage.getItem('gemini_api_key');
      if (savedApiKey) {
        setApiKey(savedApiKey);
      } else {
        setShowApiKeyModal(true);
      }

      // Carrega o contexto
      const savedContext = await AsyncStorage.getItem('chat_context') || '';
      setContext(savedContext);

      // Define a mensagem inicial apenas se não houver mensagens
      if (messages.length === 0) {
        setMessages([
          {
            id: 'welcome',
            text: 'Olá! Sou seu assistente financeiro. Posso ajudar você a entender melhor seus gastos, criar orçamentos e dar dicas para economizar. Como posso ajudar hoje?',
            isUser: false,
          }
        ]);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  }

  async function loadTransactionsContext() {
    try {
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      const q = query(
        collection(db, 'transactions'),
        where('userId', '==', userId)
      );

      const snapshot = await getDocs(q);
      const transactions = snapshot.docs.map(doc => ({
        ...doc.data(),
        date: doc.data().date.toDate(),
      })) as Transaction[];

      // Calcula totais
      const { income, expenses } = transactions.reduce(
        (acc: { income: number; expenses: number }, transaction: Transaction) => {
          if (transaction.amount > 0) {
            acc.income += transaction.amount;
          } else {
            acc.expenses += Math.abs(transaction.amount);
          }
          return acc;
        },
        { income: 0, expenses: 0 }
      );

      // Agrupa transações por categoria
      const categorySummary = transactions.reduce((acc, transaction) => {
        const category = transaction.category || 'Outros';
        if (!acc[category]) {
          acc[category] = 0;
        }
        acc[category] += Math.abs(transaction.amount);
        return acc;
      }, {} as Record<string, number>);

      // Formata o contexto das transações
      const contextText = `
        Resumo financeiro do usuário:
        - Receita total: ${formatCurrency(income)}
        - Despesas totais: ${formatCurrency(expenses)}
        - Saldo atual: ${formatCurrency(income - expenses)}
        
        Principais categorias de gastos:
        ${Object.entries(categorySummary)
          .map(([category, amount]) => `- ${category}: ${formatCurrency(amount)}`)
          .join('\n')}
      `.trim();

      setTransactionsContext(contextText);
    } catch (error) {
      console.error('Erro ao carregar contexto das transações:', error);
    }
  }

  function formatCurrency(value: number) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  }

  async function handleSaveApiKey(key: string) {
    try {
      if (!key.trim()) return;
      
      await AsyncStorage.setItem('gemini_api_key', key);
      setApiKey(key);
      setShowApiKeyModal(false);
    } catch (error) {
      console.error('Erro ao salvar chave API:', error);
    }
  }

  async function handleSaveContext(newContext: string) {
    try {
      await AsyncStorage.setItem('chat_context', newContext || '');
      setContext(newContext);
    } catch (error) {
      console.error('Erro ao salvar contexto:', error);
    }
  }

  async function sendMessage() {
    if (!inputText.trim() || !apiKey) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      isUser: true,
    };

    setMessages(prev => [...prev, newMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-pro",
        systemInstruction: `
          Você é um assistente financeiro especializado em ajudar pessoas a entenderem melhor seus gastos e organizarem suas finanças.
          
          ${transactionsContext}
          
          ${context ? `Contexto pessoal do usuário: ${context}` : ''}
          
          Seja amigável e direto nas respostas, use os dados financeiros do usuário para dar conselhos mais precisos e personalizados.

          Use emojis e quebras de linha para melhorar a legibilidade das respostas.

          Nunca use markdown, HTML ou outras formatações.
        `.trim(),
      });

      const chatHistory = messages
        .filter(msg => msg.id !== 'welcome')
        .map(msg => ({
          role: msg.isUser ? "user" : "model",
          parts: [{ text: msg.text }],
        }));

      const chat = model.startChat({
        history: chatHistory,
      });

      const result = await chat.sendMessage(inputText);
      const response = await result.response;
      const responseText = response.text();

      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        text: responseText,
        isUser: false,
      }]);
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        text: "Desculpe, ocorreu um erro ao processar sua mensagem.",
        isUser: false,
      }]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1e40af" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Assistente Financeiro</Text>
        <TouchableOpacity onPress={() => setShowSettingsModal(true)}>
          <Ionicons name="settings" size={24} color="#1e40af" />
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd()}
      >
        {messages.map(message => (
          <View
            key={message.id}
            style={[
              styles.messageBox,
              message.isUser ? styles.userMessage : styles.assistantMessage
            ]}
          >
            <Text style={
                message.isUser ? styles.userMessageText : styles.assistantMessageText

            }>{message.text}</Text>
          </View>
        ))}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#1e40af" />
          </View>
        )}
      </ScrollView>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Digite sua mensagem..."
          multiline
        />
        <TouchableOpacity
          style={styles.sendButton}
          onPress={sendMessage}
          disabled={isLoading || !inputText.trim()}
        >
          <Ionicons name="send" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <ApiKeyModal
        isVisible={showApiKeyModal}
        onClose={() => setShowApiKeyModal(false)}
        onSaveApiKey={handleSaveApiKey}
        currentApiKey={apiKey || ''}
      />

      <ChatSettingsModal
        isVisible={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        onSaveApiKey={handleSaveApiKey}
        onSaveContext={handleSaveContext}
        currentApiKey={apiKey || ''}
        currentContext={context}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  messagesContainer: {
    flex: 1,
    padding: 16,
  },
  messageBox: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 25,
  },
  userMessage: {
    backgroundColor: '#1e40af',
    alignSelf: 'flex-end',
  },
  assistantMessage: {
    backgroundColor: 'white',
    alignSelf: 'flex-start',
  },
  userMessageText: {
    fontSize: 16,
    color: '#fff',
  },
  assistantMessageText: {
    fontSize: 16,
    color: '#000',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'white',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    padding: 12,
    marginRight: 8,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#1e40af',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    padding: 16,
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e40af',
  },
});
