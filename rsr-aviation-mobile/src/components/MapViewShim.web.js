import React from 'react';
import { View, Text } from 'react-native';

const MapView = ({ children, style, initialRegion, ref }) => {
  return (
    <View style={[{ backgroundColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center' }, style]}>
      <Text style={{ color: '#475569', fontWeight: 'bold' }}>Map View (Web)</Text>
      {children}
    </View>
  );
};

const Marker = ({ children, coordinate, title, description, pinColor }) => <View>{children}</View>;
const Circle = ({ center, radius }) => <View />;
const Polyline = ({ coordinates }) => <View />;
const Callout = ({ children }) => <View>{children}</View>;

export { Marker, Circle, Polyline, Callout };
export default MapView;
