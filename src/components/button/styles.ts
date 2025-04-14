import { StyleSheet, Platform } from 'react-native';

export const styles = StyleSheet.create({
    container: {
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        borderRadius: 20,
        width: 100,
        height: 100,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 10,
        paddingHorizontal: 0,

        // Efeito de "vidro flutuante"
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 6,
        },
        shadowOpacity: 0.2,
        shadowRadius: 10,

        elevation: 8, // pro Android

        // Borda levemente visível tipo "vidro"
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.5)',
    },
    text: {
        color: '#000',
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        marginTop: 5,
    },
    image: {
        width: 60,
        height: 40,
    },
});