import React, { useState } from 'react';
import { Image, ImageStyle, StyleProp, Text, TextStyle, View, ViewStyle } from 'react-native';

type Props = {
  uri?: string | null;
  name: string;
  imageStyle: StyleProp<ImageStyle>;
  fallbackStyle: StyleProp<ViewStyle>;
  fallbackTextStyle: StyleProp<TextStyle>;
};

/**
 * Fotos de perfil salvas antes do upload para o Storage do Supabase apontam
 * para URIs locais (blob:/file://) que não existem em outras sessões — em
 * vez de mostrar uma imagem quebrada, cai para o círculo de iniciais.
 */
export function Avatar({ uri, name, imageStyle, fallbackStyle, fallbackTextStyle }: Props) {
  const [failed, setFailed] = useState(false);

  if (uri && !failed) {
    return <Image source={{ uri }} style={imageStyle} onError={() => setFailed(true)} />;
  }

  return (
    <View style={fallbackStyle}>
      <Text style={fallbackTextStyle}>{name.charAt(0).toUpperCase()}</Text>
    </View>
  );
}
