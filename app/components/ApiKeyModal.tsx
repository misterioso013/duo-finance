import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, TextInput, Linking } from 'react-native';

type ApiKeyModalProps = {
  isVisible: boolean;
  onClose: () => void;
  onSaveApiKey: (apiKey: string) => void;
  currentApiKey: string;
};

export default function ApiKeyModal({ isVisible, onClose, onSaveApiKey, currentApiKey }: ApiKeyModalProps) {
  const [apiKey, setApiKey] = React.useState(currentApiKey);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    setApiKey(currentApiKey);
  }, [currentApiKey]);

  const handleSave = () => {
    if (!apiKey.trim()) {
      setError('A chave API é obrigatória');
      return;
    }
    onSaveApiKey(apiKey);
    onClose();
  };

  return (
    <Modal visible={isVisible} animationType="slide" transparent>
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Bem-vindo ao Assistente Financeiro!</Text>
          
          <Text style={styles.description}>
            Este é seu assistente pessoal de finanças alimentado pela IA do Google (Gemini).
            Ele irá ajudar você a entender seus gastos e organizar melhor suas finanças.
          </Text>

          <Text style={styles.apiKeyInstructions}>
            Para começar, você precisará de uma chave API do Gemini.
            Você pode obtê-la em: <Text style={styles.link} onPress={() => Linking.openURL('https://aistudio.google.com/apikey')}>aistudio.google.com/apikey</Text>
          </Text>

          <TextInput
            style={[styles.input, error ? styles.inputError : null]}
            placeholder="Cole sua chave API aqui"
            value={apiKey}
            onChangeText={(text) => {
              setApiKey(text);
              setError('');
            }}
            secureTextEntry
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity 
            style={[styles.button, !apiKey.trim() ? styles.buttonDisabled : null]}
            onPress={handleSave}
            disabled={!apiKey.trim()}
          >
            <Text style={styles.buttonText}>Começar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  content: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    marginBottom: 20,
    lineHeight: 24,
  },
  apiKeyInstructions: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#1e40af',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    marginBottom: 10,
  },
  buttonDisabled: {
    backgroundColor: '#94a3b8',
  },
  link: {
    color: '#1e40af',
    textDecorationLine: 'underline',
  },
}); 