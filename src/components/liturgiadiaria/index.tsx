import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, ImageBackground } from 'react-native';
import { salvarLiturgia, carregarLiturgia } from './liturgiaStorage';
import BotaoFlutuante from '../../components/botaoFlutuante';
import { Link } from 'expo-router';

const LiturgiaDiaria = () => {
  const [liturgia, setLiturgia] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const carregarDados = async () => {
      try {
        const liturgiaSalva = await carregarLiturgia();
        if (liturgiaSalva) {
          setLiturgia(liturgiaSalva);
          setLoading(false);
          return;
        }

        const response = await fetch('https://liturgia.up.railway.app/v2/');
        const data = await response.json();
        if (response.ok) {
          setLiturgia(data);
          await salvarLiturgia(data);
        } else {
          setError(data.erro || 'Erro ao carregar a liturgia');
        }
      } catch (err) {
        setError('Erro de conexão');
      } finally {
        setLoading(false);
      }
    };

    carregarDados();
  }, []);

  const renderSalmoComRefrao = (salmo: any) => {
    const versiculos = salmo.texto.split('—').filter((v: string) => v.trim() !== '');

    return (
      <View key={salmo.referencia} style={styles.leituraContainer}>
        <Text style={styles.bold}>Salmo ({salmo.referencia}):</Text>
        {versiculos.map((verso: string, idx: number) => (
          <View key={idx} style={{ marginBottom: 12 }}>
            <Text style={styles.text}>— {verso.trim()}</Text>
            <Text style={styles.refrao}>R: {salmo.refrao}</Text>
          </View>
        ))}
      </View>
    );
  };

  if (loading) {
    return <ActivityIndicator size="large" color="#0000ff" />;
  }

  if (error) {
    return <Text style={styles.errorText}>{error}</Text>;
  }

  return (
    <View style={styles.container}>
      <ImageBackground 
        source={require('../../../assets/images/Paroquia.jpg')} 
        style={styles.imageBackground} 
        imageStyle={{ opacity: 0.1 }} 
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>{liturgia.liturgia}</Text>
        <Text style={styles.subtitle}>{liturgia.data} - {liturgia.cor}</Text>
        
        <Text style={styles.sectionTitle}>Orações</Text>
        <Text style={styles.text}><Text style={styles.bold}>Coleta:</Text> {liturgia.oracoes.coleta}</Text>
        <Text style={styles.text}><Text style={styles.bold}>Oferendas:</Text> {liturgia.oracoes.oferendas}</Text>
        <Text style={styles.text}><Text style={styles.bold}>Comunhão:</Text> {liturgia.oracoes.comunhao}</Text>

        {liturgia.oracoes.extras && liturgia.oracoes.extras.map((extra: any, index: number) => (
          <View key={index} style={styles.extraContainer}>
            <Text style={styles.bold}>{extra.titulo}:</Text>
            <Text style={styles.text}>{extra.texto}</Text>
          </View>
        ))}

        <Text style={styles.sectionTitle}>Leituras</Text>
        {liturgia.leituras.primeiraLeitura && liturgia.leituras.primeiraLeitura.map((leitura: any, index: number) => (
          <View key={index} style={styles.leituraContainer}>
            <Text style={styles.bold}>{leitura.titulo} ({leitura.referencia}):</Text>
            <Text style={styles.text}>{leitura.texto}</Text>
          </View>
        ))}

        {liturgia.leituras.salmo && liturgia.leituras.salmo.map((salmo: any) => renderSalmoComRefrao(salmo))}

        {liturgia.leituras.segundaLeitura && liturgia.leituras.segundaLeitura.map((leitura: any, index: number) => (
          <View key={index} style={styles.leituraContainer}>
            <Text style={styles.bold}>{leitura.titulo} ({leitura.referencia}):</Text>
            <Text style={styles.text}>{leitura.texto}</Text>
          </View>
        ))}

        {liturgia.leituras.evangelho && liturgia.leituras.evangelho.map((evangelho: any, index: number) => (
          <View key={index} style={styles.leituraContainer}>
            <Text style={styles.bold}>{evangelho.titulo} ({evangelho.referencia}):</Text>
            <Text style={styles.text}>{evangelho.texto}</Text>
          </View>
        ))}

        {liturgia.leituras.extras && liturgia.leituras.extras.map((extra: any, index: number) => (
          <View key={index} style={styles.leituraContainer}>
            <Text style={styles.bold}>{extra.titulo} ({extra.referencia}):</Text>
            <Text style={styles.text}>{extra.texto}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={{ marginHorizontal: 30, marginBottom: 15 }}>
        <Link href="/" asChild>
          <BotaoFlutuante titulo="Voltar" cor="#B91C1C" />
        </Link>
      </View>
    </View>
  );
};

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
  scrollContent: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 5,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#FACC15',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#CBD5E1',
    fontStyle: 'italic',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 24,
    marginBottom: 12,
    color: '#EAB308',
    borderBottomWidth: 1,
    borderBottomColor: '#EAB308',
    paddingBottom: 4,
  },
  text: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 4,
    color: '#F1F5F9',
  },
  refrao: {
    fontSize: 15,
    fontStyle: 'italic',
    color: '#93C5FD',
    marginBottom: 8,
  },
  bold: {
    fontWeight: 'bold',
    color: '#FACC15',
  },
  errorText: {
    fontSize: 18,
    color: '#F87171',
    textAlign: 'center',
    marginTop: 20,
  },
  extraContainer: {
    marginBottom: 16,
    backgroundColor: '#334155',
    padding: 12,
    borderRadius: 8,
  },
  leituraContainer: {
    marginBottom: 16,
    backgroundColor: '#475569',
    padding: 12,
    borderRadius: 8,
  },
});

export default LiturgiaDiaria;