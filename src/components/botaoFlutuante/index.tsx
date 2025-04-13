import React, { forwardRef, ElementRef } from 'react';
import {
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableOpacityProps,
  View,
} from 'react-native';

export interface BotaoFlutuanteProps extends TouchableOpacityProps {
  titulo: string;
  cor?: string;
}

type TouchableOpacityRef = ElementRef<typeof TouchableOpacity>;

const BotaoFlutuante = forwardRef<TouchableOpacityRef, BotaoFlutuanteProps>(
  ({ titulo, cor = '#2563EB', style, ...rest }, ref) => {
    return (
      <TouchableOpacity
        ref={ref}
        activeOpacity={0.8}
        style={[styles.botao, { backgroundColor: cor }, style]}
        {...rest}
      >
        <Text style={styles.texto}>{titulo}</Text>
      </TouchableOpacity>
    );
  }
);

export default BotaoFlutuante;

const styles = StyleSheet.create({
  botao: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  texto: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});