import React, { memo } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Marker, Callout } from 'react-native-maps';
import { Client } from '../../types';
import { COLORS, FONTS, RADIUS } from '../../constants/colors';

type Props = {
  cityCode: string;
  cityName: string;
  latitude: number;
  longitude: number;
  clients: Client[];
  onPress: () => void;
};

function ClientPinComponent({ cityCode, cityName, latitude, longitude, clients, onPress }: Props) {
  if (clients.length === 0) return null;

  return (
    <Marker
      coordinate={{ latitude, longitude }}
      onPress={onPress}
      tracksViewChanges={false}
    >
      <View style={styles.pinContainer}>
        <View style={styles.pin}>
          <Text style={styles.pinCount}>{clients.length}</Text>
        </View>
        <View style={styles.pinTip} />
      </View>
    </Marker>
  );
}

export const ClientPin = memo(ClientPinComponent);

const styles = StyleSheet.create({
  pinContainer: {
    alignItems: 'center',
  },
  pin: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
    minWidth: 28,
    height: 28,
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  pinCount: {
    color: '#fff',
    fontWeight: '700',
    fontSize: FONTS.sizes.xs,
  },
  pinTip: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 7,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: COLORS.primary,
    marginTop: -1,
  },
});
