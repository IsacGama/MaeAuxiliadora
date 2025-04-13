import { Text, Image, ImageProps, TextProps } from "react-native";
import { styles } from "./styles";
import { Link, LinkProps } from "expo-router";

export default function Button(props: LinkProps & { source: ImageProps["source"], children: string } & TextProps) {
    return (
        <Link href={props.href} style={styles.link}>
            <Image style={styles.image} source={props.source} resizeMode="contain" />
            <Text style={styles.text} {...props}></Text>
        </Link>
    );
}