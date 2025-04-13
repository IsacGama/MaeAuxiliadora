import React, { useState, useEffect } from 'react';
import { View, Text, Button, StyleSheet, ActivityIndicator } from 'react-native';

// Defina a estrutura do JSON
interface Versiculo {
  versiculo: number;
  texto: string;
}

interface Capitulo {
  capitulo: number;
  versiculos: Versiculo[];
}

interface Livro {
  nome: string;
  capitulos: Capitulo[];
}

interface Biblia {
  [testamento: string]: Livro[]; // Permite indexação por string
}

// Importe o JSON e use uma afirmação de tipo para garantir a estrutura
import bibliaData from '../../data/biblia.json';
const biblia = bibliaData as Biblia; // Afirmação de tipo

export default function RandomVerse() {
  const [verse, setVerse] = useState<Versiculo | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [livro, setLivro] = useState<string>('');
  const [capitulo, setCapitulo] = useState<number>(0);

  const carregarVersiculoAleatorio = () => {
    setLoading(true);

    try {
      // Escolher um testamento aleatório (Antigo ou Novo)
      const testamentos = Object.keys(biblia);
      const testamentoAleatorio = testamentos[Math.floor(Math.random() * testamentos.length)];

      // Escolher um livro aleatório
      const livros: Livro[] = biblia[testamentoAleatorio];
      const livroAleatorio = livros[Math.floor(Math.random() * livros.length)];

      // Escolher um capítulo aleatório
      const capituloAleatorio = livroAleatorio.capitulos[Math.floor(Math.random() * livroAleatorio.capitulos.length)];

      // Escolher um versículo aleatório
      const versiculoAleatorio = capituloAleatorio.versiculos[Math.floor(Math.random() * capituloAleatorio.versiculos.length)];

      // Atualizar o estado
      setVerse(versiculoAleatorio);
      setLivro(livroAleatorio.nome);
      setCapitulo(capituloAleatorio.capitulo);
    } catch (error) {
      console.error('Erro ao carregar versículo:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarVersiculoAleatorio();
  }, []);

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : verse ? (
        <View style={styles.verseContainer}>
          <Text style={styles.verseText}>
            {livro} {capitulo}:{verse.versiculo}
          </Text>
          <Text style={styles.verseText}>{verse.texto}</Text>
        </View>
      ) : (
        <Text>Nenhum versículo encontrado.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  verseContainer: {
    marginVertical: 20,
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
    maxWidth: '90%',
  },
  verseText: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 10,
  },
});