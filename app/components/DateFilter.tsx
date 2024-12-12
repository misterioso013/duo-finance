import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type DateFilterProps = {
  currentFilter: 'day' | 'week' | 'month' | 'year';
  onFilterChange: (filter: 'day' | 'week' | 'month' | 'year') => void;
};

export default function DateFilter({ currentFilter, onFilterChange }: DateFilterProps) {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.filterButton, currentFilter === 'day' && styles.activeFilter]}
        onPress={() => onFilterChange('day')}
      >
        <Text style={[styles.filterText, currentFilter === 'day' && styles.activeText]}>Dia</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.filterButton, currentFilter === 'week' && styles.activeFilter]}
        onPress={() => onFilterChange('week')}
      >
        <Text style={[styles.filterText, currentFilter === 'week' && styles.activeText]}>Semana</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.filterButton, currentFilter === 'month' && styles.activeFilter]}
        onPress={() => onFilterChange('month')}
      >
        <Text style={[styles.filterText, currentFilter === 'month' && styles.activeText]}>Mês</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.filterButton, currentFilter === 'year' && styles.activeFilter]}
        onPress={() => onFilterChange('year')}
      >
        <Text style={[styles.filterText, currentFilter === 'year' && styles.activeText]}>Ano</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeFilter: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  filterText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '500',
  },
  activeText: {
    color: '#1e40af',
  },
}); 