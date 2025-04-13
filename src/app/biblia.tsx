import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, ImageBackground } from 'react-native';
import { Link } from 'expo-router';

import BotaoFlutuante from '../components/botaoFlutuante';
import BotaoVoltar from '../components/botaoVoltar';
import CardVersiculo from '../components/cardVersiculo';
import bibliaData from '../data/biblia.json';

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
  [testamento: string]: Livro[];
}

const biblia = bibliaData as Biblia;

export default function Biblia() {
  const [testamentoSelecionado, setTestamentoSelecionado] = useState<string | null>(null);
  const [livroSelecionado, setLivroSelecionado] = useState<Livro | null>(null);
  const [capituloSelecionado, setCapituloSelecionado] = useState<Capitulo | null>(null);

  const selecionarTestamento = (testamento: string) => {
    setTimeout(() => {
      setTestamentoSelecionado(testamento);
      setLivroSelecionado(null);
      setCapituloSelecionado(null);
    }, 100);
  };

  const selecionarLivro = (livro: Livro) => {
    setTimeout(() => {
      setLivroSelecionado(livro);
      setCapituloSelecionado(null);
    }, 100);
  };

  const selecionarCapitulo = (capitulo: Capitulo) => {
    setTimeout(() => {
      setCapituloSelecionado(capitulo);
    }, 100);
  };

  const voltarParaLivros = () => {
    setTimeout(() => {
      setLivroSelecionado(null);
      setCapituloSelecionado(null);
    }, 100);
  };

  const voltarParaCapitulos = () => {
    setTimeout(() => {
      setCapituloSelecionado(null);
    }, 100);
  };

  return (
    <View style={styles.container}>
      <ImageBackground
        source={require('../../assets/images/Paroquia.jpg')}
        style={styles.imageBackground}
        imageStyle={{ opacity: 0.1 }}
      />

      {(testamentoSelecionado || livroSelecionado || capituloSelecionado) && (
        <View style={styles.headerFixo}>
          <BotaoVoltar
            onPress={() => {
              if (capituloSelecionado) {
                voltarParaCapitulos();
              } else if (livroSelecionado) {
                voltarParaLivros();
              } else {
                setTestamentoSelecionado(null);
              }
            }}
          />
          <Text style={styles.tituloFixo}>
            {capituloSelecionado
              ? `${livroSelecionado?.nome} ${capituloSelecionado.capitulo}`
              : livroSelecionado
              ? 'Selecione um Capítulo:'
              : 'Selecione um Livro:'}
          </Text>
        </View>
      )}

      <View style={styles.content}>
        {/* Seleção de Testamento */}
        {!testamentoSelecionado && (
          <View style={styles.telaTestamento}>
            <View style={styles.selecaoContainer}>
              <Text style={styles.titulo}>Selecione um Testamento:</Text>
              <BotaoFlutuante titulo="Antigo Testamento" onPress={() => selecionarTestamento('antigoTestamento')} />
              <BotaoFlutuante titulo="Novo Testamento" onPress={() => selecionarTestamento('novoTestamento')} />
            </View>
            <Link href="/" asChild>
              <BotaoFlutuante titulo="Voltar" cor="#B91C1C" />
            </Link>
          </View>
        )}

        {/* Seleção de Livro */}
        {testamentoSelecionado && !livroSelecionado && (
          <FlatList
            data={biblia[testamentoSelecionado]}
            keyExtractor={(item) => item.nome}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <BotaoFlutuante titulo={item.nome} onPress={() => selecionarLivro(item)} />
            )}
            ListHeaderComponent={<View style={{ height: 100 }} />}
            ListFooterComponent={
              <BotaoFlutuante titulo="Voltar" onPress={() => setTestamentoSelecionado(null)} cor="#B91C1C" />
            }
            contentContainerStyle={styles.scrollContent}
          />
        )}

        {/* Seleção de Capítulo */}
        {livroSelecionado && !capituloSelecionado && (
          <FlatList
            data={livroSelecionado.capitulos}
            keyExtractor={(item) => item.capitulo.toString()}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <BotaoFlutuante titulo={`Capítulo ${item.capitulo}`} onPress={() => selecionarCapitulo(item)} />
            )}
            ListHeaderComponent={<View style={{ height: 100 }} />}
            ListFooterComponent={
              <BotaoFlutuante titulo="Voltar" onPress={voltarParaLivros} cor="#B91C1C" />
            }
            contentContainerStyle={styles.scrollContent}
          />
        )}

        {/* Exibição de Versículos */}
        {capituloSelecionado && (
          <FlatList
            data={capituloSelecionado.versiculos}
            keyExtractor={(item) => item.versiculo.toString()}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <CardVersiculo numero={item.versiculo} texto={item.texto} />
            )}
            ListHeaderComponent={<View style={{ height: 100 }} />}
            ListFooterComponent={
              <BotaoFlutuante titulo="Voltar" onPress={voltarParaCapitulos} cor="#B91C1C" />
            }
            contentContainerStyle={styles.scrollContent}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E293B',
  },
  imageBackground: {
    flex: 1,
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  headerFixo: {
    position: 'absolute',
    top: 40,
    left: 20,
    right: 20,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: 8,
    borderRadius: 12,
  },
  tituloFixo: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: 'bold',
    flexShrink: 1,
  },
  content: {
    flex: 1,
    marginTop: 50,
    paddingHorizontal: 20,
  },
  telaTestamento: {
    flex: 1,
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  selecaoContainer: {
    width: '100%',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  titulo: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#FFD700',
  },
});