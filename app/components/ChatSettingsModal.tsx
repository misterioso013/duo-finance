import React, { useState, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type ChatSettingsModalProps = {
  isVisible: boolean;
  onClose: () => void;
  onSaveApiKey: (apiKey: string) => void;
  onSaveContext: (context: string) => void;
  currentApiKey: string;
  currentContext: string;
};

export default function ChatSettingsModal({
  isVisible,
  onClose,
  onSaveApiKey,
  onSaveContext,
  currentApiKey,
  currentContext,
}: ChatSettingsModalProps) {
  const [apiKey, setApiKey] = useState(currentApiKey);
  const [context, setContext] = useState(currentContext);

  useEffect(() => {
    setApiKey(currentApiKey);
    setContext(currentContext);
  }, [currentApiKey, currentContext, isVisible]);

  const handleSave = () => {
    if (apiKey.trim() !== currentApiKey) {
      onSaveApiKey(apiKey.trim());
    }
    if (context !== currentContext) {
      onSaveContext(context);
    }
    onClose();
  };

  return (
    <Modal visible={isVisible} animationType="slide" transparent>
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>Configurações do Chat</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.form}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Chave API do Gemini</Text>
              <TextInput
                style={styles.input}
                value={apiKey}
                onChangeText={setApiKey}
                placeholder="Cole sua chave API aqui"
                secureTextEntry
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Contexto Pessoal</Text>
              <Text style={styles.description}>
                Adicione informações sobre sua situação financeira para respostas mais personalizadas
              </Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={context}
                onChangeText={setContext}
                placeholder="Ex: Sou casado(a), tenho uma renda mensal de R$ 5.000, meus principais gastos são..."
                multiline
                numberOfLines={4}
              />
            </View>

            <TouchableOpacity style={styles.button} onPress={handleSave}>
              <Text style={styles.buttonText}>Salvar Configurações</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  form: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: '#1e40af',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
}); 