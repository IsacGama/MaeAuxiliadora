import { ImageBackground, StyleSheet, View, Image } from 'react-native';
import Button from '../components/button';
import { Link } from 'expo-router'; // Importe o Link do Expo Router

export default function Index() {
  return (
    <View style={styles.container}>
      {/* Imagem com opacidade menor */}
      <ImageBackground 
        source={require('../../assets/images/Paroquia.jpg')} 
        style={styles.imageBackground} 
        imageStyle={{ opacity: 0.3 }} // Aplica opacidade apenas na imagem
      />

      {/* Conteúdo sobreposto */}
      <View style={styles.content}>
        <Image source={require('../../assets/images/Brasao.jpg')} style={styles.image}/>
        
        {/* Botões lado a lado */}
        <View style={styles.buttonsContainer}>
          <Button href="./liturgiaDiaria" source={require('../../assets/images/Liturgiadiaria.png')}>
            Liturgia
          </Button>
          <Button href="./biblia" source={require('../../assets/images/bible.png')}>
            Bíblia
          </Button>
          <Button href="./horarios" source={require('../../assets/images/clock.png')}>
            Horarios
          </Button>
        </View>
        <View style={styles.buttonsContainer}>
          {/* Botão de Doação */}
          <Button href="./doacao" source={require('../../assets/images/donation.png')}>
            Doação
          </Button>
        </View>
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
    position: 'absolute', // Mantém a imagem fixa no fundo
    width: '100%',
    height: '100%',
  },
  content: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginTop: 50,
  },
  image: {
    width: 125,
    height: 125,
    borderRadius: 20,
  },
  buttonsContainer: {
    flexDirection: 'row', // Botões lado a lado
    justifyContent: 'space-between', // Espaço entre os botões
    width: '90%', // Largura do container dos botões
    marginTop: 20,
  },
});