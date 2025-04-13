import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  numero: number;
  texto: string;
}

export default function CardVersiculo({ numero, texto }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.circulo}>
        <Text style={styles.numero}>{numero}</Text>
      </View>
      <Text style={styles.texto}>{texto}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginVertical: 5,
    marginHorizontal: 10,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  circulo: {
    backgroundColor: '#1E3A8A',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  numero: {
    color: '#fff',
    fontWeight: 'bold',
  },
  texto: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
});
