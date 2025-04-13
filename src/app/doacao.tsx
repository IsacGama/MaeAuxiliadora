import React from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Clipboard,
  Alert,
  ScrollView,
  ImageBackground,
} from 'react-native';
import { useNavigation } from 'expo-router';
import BotaoVoltar from '../components/botaoVoltar';

const pixCode =
  '00020126360014BR.GOV.BCB.PIX0114073866590035165204000053039865802BR5916DIOCESE DO CRATO6014JUAZEIRO DO N.62140510SECRETARIA630439F7';

export default function Doacao() {
  const navigation = useNavigation();

  const copiarPix = () => {
    Clipboard.setString(pixCode);
    Alert.alert('PIX copiado', 'O código PIX foi copiado para a área de transferência.');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ImageBackground
        source={require('../../assets/images/Paroquia.jpg')}
        style={styles.imageBackground}
        imageStyle={{ opacity: 0.2 }}
      />

      <View style={styles.content}>
        <View style={styles.backButton}>
          <BotaoVoltar onPress={() => navigation.goBack()} />
        </View>

        <Text style={styles.title}>Faça uma Doação</Text>

        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.card}>
            <Text style={styles.texto}>
              Contribua com a nossa paróquia através do Pix abaixo:
            </Text>

            <Image
              source={require('../../assets/images/QRCode.png')} // Renomeia a imagem do QR Code se for preciso
              style={styles.qrCode}
              resizeMode="contain"
            />

            <Text selectable style={styles.pixCode}>
              {pixCode}
            </Text>

            <TouchableOpacity style={styles.botaoCopiar} onPress={copiarPix}>
              <Text style={styles.textoBotao}>Copiar Código PIX</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
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
  content: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  title: {
    color: '#FACC15',
    fontSize: 26,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 24,
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  scroll: {
    alignItems: 'center',
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#334155',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    borderLeftWidth: 4,
    borderLeftColor: '#FACC15',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  texto: {
    color: '#E2E8F0',
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'center',
  },
  qrCode: {
    width: 220,
    height: 220,
    alignSelf: 'center',
    marginBottom: 20,
    borderRadius: 12,
  },
  pixCode: {
    color: '#CBD5E1',
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  botaoCopiar: {
    backgroundColor: '#FACC15',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  textoBotao: {
    color: '#1E293B',
    fontSize: 16,
    fontWeight: 'bold',
  },
});