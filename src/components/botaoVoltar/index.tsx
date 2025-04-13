// src/components/BotaoVoltar.tsx
import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface BotaoVoltarProps {
  onPress: () => void;
}

export default function BotaoVoltar({ onPress }: BotaoVoltarProps) {
  return (
    <TouchableOpacity style={styles.botao} onPress={onPress} activeOpacity={0.7}>
      <Ionicons name="arrow-back" size={24} color="#fff" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  botao: {
    backgroundColor: '#B91C1C',
    width: 45,
    height: 45,
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  },
});