import { ImageBackground, StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from 'expo-router';
import BotaoVoltar from '../components/botaoVoltar';

// Dados de exemplo para os horários das missas
const horariosMissas = [
    { dia: "Domingo", horarios: ["08:00", "10:00", "18:00"] },
    { dia: "Segunda-feira", horarios: ["07:00", "19:00"] },
    { dia: "Terça-feira", horarios: ["07:00", "19:00"] },
    { dia: "Quarta-feira", horarios: ["07:00", "19:00"] },
    { dia: "Quinta-feira", horarios: ["07:00", "19:00"] },
    { dia: "Sexta-feira", horarios: ["07:00", "19:00"] },
    { dia: "Sábado", horarios: ["08:00", "17:00"] },
];

export default function Horarios() {
    const navigation = useNavigation();

    return (
        <View style={styles.container}>
            {/* Imagem de fundo com opacidade reduzida */}
            <ImageBackground 
                source={require('../../assets/images/Paroquia.jpg')} 
                style={styles.imageBackground} 
                imageStyle={{ opacity: 0.3 }} // Aplica opacidade apenas na imagem
            />

            {/* Conteúdo sobreposto */}
            <View style={styles.content}>
                <View style={styles.backButton}>
                    {/* Botão de voltar */}
                    <BotaoVoltar onPress={() => {
                        navigation.goBack();
                    }}></BotaoVoltar>
                </View>

                {/* Título da tela */}
                <Text style={styles.title}>Horários das Missas</Text>

                {/* Lista de horários */}
                <ScrollView 
                style={styles.horariosContainer}
                showsVerticalScrollIndicator={false}
                >
                    {horariosMissas.map((item, index) => (
                        <View key={index} style={styles.card}>
                            <Text style={styles.dia}>{item.dia}</Text>
                            {item.horarios.map((horario, idx) => (
                                <Text key={idx} style={styles.horario}>
                                    {horario}
                                </Text>
                            ))}
                        </View>
                    ))}
                </ScrollView>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#1E293B', // Fundo escuro elegante
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
      color: '#FACC15', // Amarelo destaque
      fontSize: 26,
      fontWeight: 'bold',
      textAlign: 'center',
      marginBottom: 24,
      textShadowColor: '#000',
      textShadowOffset: { width: 1, height: 1 },
      textShadowRadius: 2,
    },
    horariosContainer: {
      flex: 1,
    },
    card: {
      backgroundColor: '#334155', // Cartão escuro estiloso
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      borderLeftWidth: 4,
      borderLeftColor: '#FACC15',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 3,
    },
    dia: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 8,
      color: '#E2E8F0', // Título claro
    },
    horario: {
      fontSize: 16,
      color: '#CBD5E1', // Texto claro
      marginBottom: 4,
      paddingLeft: 10,
      borderLeftWidth: 2,
      borderLeftColor: '#94A3B8', // Detalhezinho
    },
  });  