import { Text, Image, ImageProps, TextProps, Pressable, Animated, View } from "react-native";
import { useRef } from "react";
import { styles } from "./styles";
import { Link, LinkProps } from "expo-router";

export default function Button(
  props: LinkProps & { source: ImageProps["source"], children: string } & TextProps
) {
  const opacity = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.timing(opacity, {
      toValue: 0.6,
      duration: 120, // Diminui a opacidade suavemente ao pressionar
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 250, // Volta com fade mais lento
      useNativeDriver: true,
    }).start();
  };

  return (
    <Link href={props.href} asChild>
      <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut}>
        <Animated.View style={[styles.container, { opacity }]}>
          <Image style={styles.image} source={props.source} resizeMode="contain" />
          <Text style={styles.text} {...props}></Text>
        </Animated.View>
      </Pressable>
    </Link>
  );
}