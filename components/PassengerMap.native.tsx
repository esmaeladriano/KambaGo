import MapView, { Marker, type Region } from 'react-native-maps';
import { StyleSheet } from 'react-native';

export interface PassengerMapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

export default function PassengerMap({
  region,
  showMarker,
}: {
  region: PassengerMapRegion;
  showMarker: boolean;
}) {
  const nativeRegion: Region = region;

  return (
    <MapView style={StyleSheet.absoluteFill} initialRegion={nativeRegion}>
      {showMarker ? (
        <Marker coordinate={{ latitude: region.latitude, longitude: region.longitude }} />
      ) : null}
    </MapView>
  );
}
