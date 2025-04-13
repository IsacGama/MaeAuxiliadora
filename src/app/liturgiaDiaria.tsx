import React from 'react';
import { View, StyleSheet, ImageBackground } from 'react-native';
import LiturgiaDiaria from '../components/liturgiadiaria'; 
export default function LiturgiaDiariaPage() {
  return (
    <View style={styles.container}>
      <ImageBackground 
      source={require('../../assets/images/Paroquia.jpg')} 
      style={styles.imageBackground} 
      imageStyle={{ opacity: 0.1 }} // Aplica opacidade apenas na imagem
      />
      <LiturgiaDiaria />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  imageBackground: {
    flex: 1,
    position: 'absolute', 
    width: '100%',
    height: '100%',
  },
});