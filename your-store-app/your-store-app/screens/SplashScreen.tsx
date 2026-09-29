import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ImageBackground, StatusBar, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

interface SplashScreenProps {
  onExplore: () => void;
  onLogoTap: () => void;
}

export default function SplashScreen({ onExplore, onLogoTap }: SplashScreenProps) {
  const handlePress = () => {
    console.log("EXPLORE BUTTON PRESSED EXPLICITLY");
    onExplore();
  };

  return (
    <ImageBackground 
      source={require('../assets/splash.png')} 
      style={styles.container}
      resizeMode="cover"
    >
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <View style={styles.overlay}>
        <View style={styles.card}>
          <TouchableOpacity activeOpacity={0.9} onPress={onLogoTap} style={styles.logoCircle}>
            <Text style={{ fontSize: 36 }}>⚡</Text>
          </TouchableOpacity>
          <Text style={styles.brand}>VORTEX<Text style={{ color: '#d97706' }}>.</Text></Text>
          <Text style={styles.tagline}>Dark Luxury Designer Footwear & Apparel</Text>
          
          <TouchableOpacity 
            style={styles.button} 
            activeOpacity={0.7}
            onPress={handlePress}
          >
            <Text style={styles.buttonText}>Explore Collection →</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#0a0a0a',
    justifyContent: 'center', 
    alignItems: 'center',
  },
  overlay: { 
    flex: 1, 
    width: '100%', 
    height: '100%',
    backgroundColor: 'rgba(10, 10, 10, 0.85)', 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 20 
  },
  card: { width: '100%', maxWidth: 360, backgroundColor: '#171717', borderRadius: 24, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: '#262626', shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 15, elevation: 8 },
  logoCircle: { width: 80, height: 80, borderRadius: 24, backgroundColor: '#262626', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  brand: { color: '#ffffff', fontSize: 28, fontWeight: '900', letterSpacing: 3, marginBottom: 8 },
  tagline: { color: '#a3a3a3', fontSize: 12, textAlign: 'center', marginBottom: 32, lineHeight: 18, textTransform: 'uppercase', letterSpacing: 1 },
  button: { width: '100%', backgroundColor: '#ffffff', borderRadius: 12, height: 48, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#000000', fontWeight: '700', fontSize: 14 },
});