import AsyncStorage from '@react-native-async-storage/async-storage';

const LITURGIA_KEY = 'liturgiaDiaria';

// Salvar a liturgia no AsyncStorage
export const salvarLiturgia = async (liturgia: any) => {
  try {
    const hoje = new Date().toISOString().split('T')[0]; // Data no formato YYYY-MM-DD
    const liturgiaComData = {
      data: hoje,
      liturgia,
    };
    await AsyncStorage.setItem(LITURGIA_KEY, JSON.stringify(liturgiaComData));
  } catch (error) {
    console.error('Erro ao salvar a liturgia:', error);
  }
};

// Carregar a liturgia do AsyncStorage
export const carregarLiturgia = async () => {
  try {
    const liturgiaSalva = await AsyncStorage.getItem(LITURGIA_KEY);
    if (liturgiaSalva) {
      const { data, liturgia } = JSON.parse(liturgiaSalva);
      const hoje = new Date().toISOString().split('T')[0];
      if (data === hoje) {
        return liturgia; // Retorna a liturgia se for do mesmo dia
      }
    }
    return null; // Retorna null se não houver liturgia salva ou se for de outro dia
  } catch (error) {
    console.error('Erro ao carregar a liturgia:', error);
    return null;
  }
};