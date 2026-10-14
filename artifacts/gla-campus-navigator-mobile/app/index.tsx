import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView, type WebView as WebViewHandle } from 'react-native-webview';
import { useColors } from '@/hooks/useColors';

const rawDomain = process.env.EXPO_PUBLIC_DOMAIN?.trim();
const appUrl = rawDomain
  ? `${rawDomain.startsWith('http') ? rawDomain.replace(/\/+$/, '') : `https://${rawDomain}`}/?native=1`
  : null;

export default function CampusNavigatorScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const webViewRef = useRef<WebViewHandle>(null);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'android') return undefined;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!canGoBack) return false;
      webViewRef.current?.goBack();
      return true;
    });
    return () => subscription.remove();
  }, [canGoBack]);

  function retry() {
    setHasError(false);
    setLoading(true);
    webViewRef.current?.reload();
  }

  const previewOnWeb = Platform.OS === 'web' && appUrl
    ? React.createElement('iframe', {
        src: appUrl,
        title: 'GLA Campus Navigator',
        onLoad: () => { setLoading(false); setHasError(false); },
        style: { width: '100%', height: '100%', border: 0, backgroundColor: colors.background },
        allow: 'geolocation',
      })
    : null;

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={[
        styles.safeArea,
        { backgroundColor: colors.navy },
        Platform.OS === 'web' && styles.webSafeArea,
        Platform.OS === 'web' && { paddingTop: Math.max(insets.top, 67), paddingBottom: 34 },
      ]}
    >
      <StatusBar style="light" />
      <View style={[styles.header, { backgroundColor: colors.navy }]}>
        <View style={[styles.brandMark, { backgroundColor: colors.primary }]}>
          <Ionicons name="navigate" size={19} color={colors.primaryForeground} />
        </View>
        <View style={styles.brandCopy}>
          <Text style={[styles.brandTitle, { color: '#ffffff' }]}>GLA Campus Navigator</Text>
          <Text style={[styles.brandSubtitle, { color: '#9eb1cf' }]}>CAMPUS WAYFINDING</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Refresh campus map"
          disabled={!appUrl}
          onPress={retry}
          style={({ pressed }) => [styles.refreshButton, pressed && styles.pressed]}
        >
          <Ionicons name="refresh" size={20} color="#e9f1ff" />
        </Pressable>
      </View>

      <View style={[styles.webContent, { backgroundColor: colors.background }]}>
        {appUrl && Platform.OS !== 'web' && (
          <WebView
            ref={webViewRef}
            source={{ uri: appUrl }}
            style={styles.webView}
            originWhitelist={['https://*']}
            javaScriptEnabled
            domStorageEnabled
            geolocationEnabled
            allowsBackForwardNavigationGestures
            onLoadStart={() => { setLoading(true); setHasError(false); }}
            onLoadEnd={() => { setLoading(false); }}
            onError={() => { setLoading(false); setHasError(true); }}
            onHttpError={event => {
              if (event.nativeEvent.statusCode >= 500) {
                setLoading(false);
                setHasError(true);
              }
            }}
            onNavigationStateChange={state => setCanGoBack(state.canGoBack)}
          />
        )}
        {previewOnWeb}

        {!appUrl && (
          <View style={styles.statePanel}>
            <Ionicons name="globe-outline" size={36} color={colors.primary} />
            <Text style={[styles.stateTitle, { color: colors.foreground }]}>Preview address unavailable</Text>
            <Text style={[styles.stateBody, { color: colors.mutedForeground }]}>
              Open this mobile preview from the Replit workspace so it can connect to the campus website.
            </Text>
          </View>
        )}

        {loading && appUrl && (
          <View pointerEvents="none" style={[styles.loadingOverlay, { backgroundColor: colors.background }]}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.stateBody, { color: colors.mutedForeground }]}>Connecting to the campus map…</Text>
          </View>
        )}

        {hasError && appUrl && (
          <View style={styles.errorOverlay}>
            <View style={[styles.errorCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="cloud-offline-outline" size={34} color={colors.primary} />
              <Text style={[styles.stateTitle, { color: colors.foreground }]}>Couldn’t load the map</Text>
              <Text style={[styles.stateBody, { color: colors.mutedForeground }]}>
                Check your internet connection, then try opening the campus navigator again.
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={retry}
                style={({ pressed }) => [styles.retryButton, { backgroundColor: colors.primary }, pressed && styles.pressed]}
              >
                <Text style={[styles.retryText, { color: colors.primaryForeground }]}>Retry connection</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  webSafeArea: { flex: 1, minHeight: '100vh' as unknown as number },
  header: { minHeight: 60, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 11 },
  brandMark: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  brandCopy: { flex: 1, justifyContent: 'center', gap: 2 },
  brandTitle: { fontFamily: 'Manrope_700Bold', fontSize: 15, letterSpacing: -0.2 },
  brandSubtitle: { fontFamily: 'DM_Sans_700Bold', fontSize: 9, letterSpacing: 1.6 },
  refreshButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.68 },
  webContent: { flex: 1, overflow: 'hidden' },
  webView: { flex: 1, backgroundColor: 'transparent' },
  statePanel: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 28 },
  stateTitle: { fontFamily: 'Manrope_700Bold', fontSize: 19, textAlign: 'center' },
  stateBody: { fontFamily: 'DM_Sans_400Regular', fontSize: 13, textAlign: 'center', lineHeight: 20 },
  loadingOverlay: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', gap: 14 },
  errorOverlay: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', padding: 22 },
  errorCard: { width: '100%', maxWidth: 400, alignItems: 'center', gap: 12, padding: 24, borderWidth: 1, borderRadius: 18 },
  retryButton: { minHeight: 44, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', borderRadius: 11, marginTop: 5 },
  retryText: { fontFamily: 'DM_Sans_700Bold', fontSize: 13 },
});
