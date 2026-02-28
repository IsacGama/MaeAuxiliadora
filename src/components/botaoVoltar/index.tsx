// src/components/BotaoVoltar.tsx
import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme, getTextColorForBackground } from '../../mobile/theme';

interface BotaoVoltarProps {
  onPress: () => void;
}

export default function BotaoVoltar({ onPress }: BotaoVoltarProps) {
  const theme = useAppTheme();
  const bg = theme.secondary;
  const iconColor = getTextColorForBackground(bg);

  return (
    <TouchableOpacity style={[styles.botao, { backgroundColor: bg }]} onPress={onPress} activeOpacity={0.7}>
      <Ionicons name="arrow-back" size={24} color={iconColor} />
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