import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, StatusBar, Animated, FlatList, Image, Dimensions, TouchableOpacity, Modal, Platform, Linking } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { storage } from './utils/storage';
import { auth, db } from './firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { collection, onSnapshot, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';

// Modular Screens & Modals
import SplashScreen from './screens/SplashScreen';
import HomeScreen from './screens/HomeScreen';
import BasketScreen from './screens/BasketScreen';
import CheckoutScreen from './screens/CheckoutScreen';
import ConfirmationScreen from './screens/ConfirmationScreen';
import AdminScreen from './screens/AdminScreen';
import AuthScreen from './screens/AuthScreen';
import SettingsScreen from './screens/SettingsModal';
import NotificationsModal from './screens/NotificationsModal';
import AccountScreen from './screens/AccountScreen';

const { width } = Dimensions.get('window');
const GRID_ITEM_WIDTH = (width - 48) / 2;

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  image: string;
  images?: string[];
  sizes?: string[];
  description?: string;
  stockQuantity?: number;
  stock?: number;
  inStockCount?: number;
  inStock?: boolean;
  brand?: string;
}

export interface Coupon {
  id: string;
  code: string;
  discountPercent: number;
}

interface MainAppProps {
  onLeaveSplash: () => void;
}

function MainApp({ onLeaveSplash }: MainAppProps) {
  const insets = useSafeAreaInsets();
  const [currentScreen, setCurrentScreen] = useState<'home' | 'catalog' | 'basket' | 'checkout' | 'confirmation' | 'admin' | 'auth' | 'settings' | 'account'>('home');
  const [basket, setBasket] = useState<{ [key: string]: number }>({});
  const [favorites, setFavorites] = useState<string[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);

  // Modal visibility state
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  // PWA Install prompt state
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);

  // Toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastAnim] = useState(new Animated.Value(-100));

  // Auth / User state
  const [user, setUser] = useState<any>(null);
  const [isAdminUser, setIsAdminUser] = useState<boolean>(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  // Hidden admin tap counter
  const [logoTapCount, setLogoTapCount] = useState(0);

  // Listen for PWA install prompt (web only)
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    // Check if already installed as standalone
    const isInstalled = window.matchMedia?.('(display-mode: standalone)')?.matches
      || (window.navigator as any)?.standalone === true;
    setIsStandalone(isInstalled);

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        showToast('App installed! 🎉');
        setIsStandalone(true);
      }
      setDeferredPrompt(null);
    } else {
      showToast('Tap browser menu ⠇ then "Add to Home screen"');
    }
  };

  const handleIOSInstallInstructions = () => {
    showToast('Tap Share ⎋ then "Add to Home Screen" ➕');
  };

  useEffect(() => {
    loadLocalData();

    // Real-time Firestore sync for Products
    const unsubscribeProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      const prodList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      setProducts(prodList);
    }, (error) => console.error("Products listener error:", error));

    // Real-time Firestore sync for Coupons
    const unsubscribeCoupons = onSnapshot(collection(db, 'coupons'), (snapshot) => {
      const couponList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Coupon));
      setCoupons(couponList);
    }, (error) => console.error("Coupons listener error:", error));

    const unsubscribeAuth = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          const userDocRef = doc(db, 'users', u.uid);
          const userSnap = await getDoc(userDocRef);
          if (userSnap.exists()) {
            setIsAdminUser(userSnap.data().isAdmin === true);
          } else {
            // Create default user doc if missing
            await setDoc(userDocRef, {
              email: u.email,
              isAdmin: false,
              createdAt: serverTimestamp()
            }, { merge: true });
            setIsAdminUser(false);
          }
        } catch (err) {
          console.error("Error verifying admin status:", err);
          setIsAdminUser(false);
        }
      } else {
        setIsAdminUser(false);
      }
    });

    return () => {
      unsubscribeProducts();
      unsubscribeCoupons();
      unsubscribeAuth();
    };
  }, []);

  // Check for payment success from PayPal redirect
  useEffect(() => {
    (async () => {
      try {
        const paymentSuccess = await storage.getItem('@store_payment_success_v2');
        if (paymentSuccess === 'true') {
          await storage.removeItem('@store_payment_success_v2');
          await storage.setItem('@store_basket_v2', JSON.stringify({}));
          setCurrentScreen('confirmation');
        }
      } catch (e) {
        console.error('Error checking payment success:', e);
      }
    })();
  }, []);

  const loadLocalData = async () => {
    try {
      const savedBasket = await storage.getItem('@store_basket_v2');
      if (savedBasket) {
        const parsed = JSON.parse(savedBasket);
        const clean: { [key: string]: number } = {};
        Object.keys(parsed).forEach((k) => {
          if (parsed[k] > 0) clean[k] = parsed[k];
        });
        setBasket(clean);
      }

      const savedFavs = await storage.getItem('@store_favorites_v1');
      if (savedFavs) setFavorites(JSON.parse(savedFavs));
    } catch (e) {
      console.error('Failed to load local storage', e);
    }
  };

  const saveBasket = async (newBasket: { [key: string]: number }) => {
    try {
      const cleanedBasket: { [key: string]: number } = {};
      Object.keys(newBasket).forEach((key) => {
        const val = Number(newBasket[key]);
        if (!isNaN(val) && val > 0) {
          cleanedBasket[key] = val;
        }
      });

      setBasket(cleanedBasket);
      await storage.setItem('@store_basket_v2', JSON.stringify(cleanedBasket));
    } catch (e) {
      console.error('Failed to save basket', e);
    }
  };

  const toggleFavorite = async (productId: string) => {
    const updated = favorites.includes(productId)
      ? favorites.filter(id => id !== productId)
      : [...favorites, productId];

    setFavorites(updated);
    await storage.setItem('@store_favorites_v1', JSON.stringify(updated));
    showToast(favorites.includes(productId) ? 'Removed from Wishlist' : 'Added to Wishlist ❤️');
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: insets.top + 10, duration: 250, useNativeDriver: false }),
      Animated.delay(3000),
      Animated.timing(toastAnim, { toValue: -100, duration: 200, useNativeDriver: false })
    ]).start(() => setToastMessage(null));
  };

  const handleAuthSubmit = async () => {
    try {
      let userCredential;
      if (isSignUp) {
        userCredential = await createUserWithEmailAndPassword(auth, authEmail, authPassword);
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          email: authEmail,
          isAdmin: false,
          createdAt: serverTimestamp()
        }, { merge: true });
        showToast('Account created successfully! 🎉');
      } else {
        userCredential = await signInWithEmailAndPassword(auth, authEmail, authPassword);
        const userRef = doc(db, 'users', userCredential.user.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          await setDoc(userRef, {
            email: authEmail,
            isAdmin: false,
            createdAt: serverTimestamp()
          });
        }
        showToast('Logged in successfully!');
      }
      setCurrentScreen('account');
    } catch (e: any) {
      showToast(`Auth error: ${e.message}`);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setIsAdminUser(false);
      showToast('Signed out successfully');
      setCurrentScreen('home');
    } catch (e: any) {
      showToast(`Error signing out: ${e.message}`);
    }
  };

  const handleLogoTap = async () => {
    const nextCount = logoTapCount + 1;
    setLogoTapCount(nextCount);
    if (nextCount >= 5) {
      setLogoTapCount(0);

      if (auth.currentUser) {
        const userDocRef = doc(db, 'users', auth.currentUser.uid);
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists() && userSnap.data().isAdmin === true) {
          setIsAdminUser(true);
          setCurrentScreen('admin');
          showToast('Developer mode unlocked ⚙️');
          return;
        }
      }

      showToast('Developer mode: Admin sign-in required ⚙️');
      setCurrentScreen('admin');
    }
  };

  const handleSelectProduct = (p: Product & { quantity?: number }) => {
    const maxAvailable = typeof p.stockQuantity === 'number'
      ? p.stockQuantity
      : typeof p.stock === 'number'
        ? p.stock
        : typeof p.inStockCount === 'number'
          ? p.inStockCount
          : (p.inStock !== false ? 10 : 0);

    const currentQty = basket[p.id] || 0;
    const addedQty = p.quantity || 1;
    const targetQty = currentQty + addedQty;

    if (maxAvailable <= 0 || p.inStock === false) {
      showToast('Item is out of stock ⚠️');
      return;
    }

    if (targetQty > maxAvailable) {
      showToast(`Stock limit reached! Only ${maxAvailable} available.`);
      return;
    }

    saveBasket({ ...basket, [p.id]: targetQty });
    showToast(`Added ${p.name} to basket 🛍️`);
  };

  const totalBasketCount = Object.keys(basket).reduce((sum, key) => {
    const qty = Number(basket[key]) || 0;
    return sum + (qty > 0 ? qty : 0);
  }, 0);

  const inStockProducts = products.filter((p) => {
    const stockQty = p.stockQuantity ?? p.stock ?? p.inStockCount;
    if (stockQty !== undefined) return stockQty > 0;
    return p.inStock !== false;
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#171717" />

      {/* Dynamic Toast Notification Banner */}
      {toastMessage && (
        <Animated.View style={[styles.toastContainer, { top: toastAnim }]}>
          <Text style={styles.toastText}>{toastMessage}</Text>
        </Animated.View>
      )}

      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) + 8 }]}>
        <TouchableOpacity onPress={handleLogoTap} activeOpacity={0.8}>
          <Text style={styles.headerTitle}>VORTEX<Text style={{ color: '#d97706' }}>.</Text></Text>
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {/* Notifications Button */}
          <TouchableOpacity
            style={styles.settingsHeaderIcon}
            onPress={() => setNotificationsVisible(true)}
          >
            <Text style={{ fontSize: 16 }}>🔔</Text>
          </TouchableOpacity>

          {/* Account / Settings Header Button */}
          <TouchableOpacity
            style={styles.settingsHeaderIcon}
            onPress={() => setCurrentScreen(user ? 'account' : 'auth')}
          >
            <Text style={{ fontSize: 16 }}>{user ? '👤' : '🔐'}</Text>
          </TouchableOpacity>

          {/* Hamburger Menu Button */}
          <TouchableOpacity
            style={styles.settingsHeaderIcon}
            onPress={() => setMenuVisible(true)}
          >
            <Text style={{ fontSize: 20, color: '#ffffff' }}>☰</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Screen Routing Container */}
      <View style={styles.screenContainer}>
        {currentScreen === 'home' && (
          <HomeScreen
            products={products}
            loading={products.length === 0}
            selectedCategory="All"
            onSelectCategory={() => {}}
            onSelectProduct={handleSelectProduct}
            onNavigate={(screen) => setCurrentScreen(screen as any)}
            searchQuery=""
            setSearchQuery={() => {}}
            handleLogoTap={handleLogoTap}
            user={user}
            totalBasketItems={totalBasketCount}
            favorites={favorites}
            onToggleFavorite={toggleFavorite}
          />
        )}

        {/* CATALOG SCREEN */}
        {currentScreen === 'catalog' && (
          <View style={styles.catalogContainer}>
            <View style={styles.catalogHeaderRow}>
              <Text style={styles.catalogTitle}>In-Stock Inventory</Text>
              <Text style={styles.catalogSubtitle}>{inStockProducts.length} Available Items</Text>
            </View>

            {inStockProducts.length === 0 ? (
              <View style={styles.emptyCatalogContainer}>
                <Text style={{ fontSize: 36, marginBottom: 10 }}>📦</Text>
                <Text style={styles.emptyCatalogText}>No items currently in stock.</Text>
              </View>
            ) : (
              <FlatList
                data={inStockProducts}
                keyExtractor={(item) => item.id}
                numColumns={2}
                columnWrapperStyle={styles.gridRow}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 30 }}
                renderItem={({ item }) => {
                  const stockQty = item.stockQuantity ?? item.stock ?? item.inStockCount ?? 10;
                  return (
                    <View style={styles.gridCard}>
                      <Image source={{ uri: item.image }} style={styles.gridImage} />
                      <View style={styles.gridInfo}>
                        <Text style={styles.gridBrand}>{item.brand || 'VORTEX'}</Text>
                        <Text numberOfLines={1} style={styles.gridName}>{item.name}</Text>
                        <Text style={styles.gridPrice}>€{parseFloat(item.price.toString()).toFixed(2)}</Text>
                        <Text style={styles.gridStockTag}>In Stock ({stockQty} left)</Text>

                        <TouchableOpacity
                          style={styles.gridAddBtn}
                          onPress={() => handleSelectProduct(item)}
                        >
                          <Text style={styles.gridAddBtnText}>+ Add to Basket</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                }}
              />
            )}
          </View>
        )}

        {currentScreen === 'basket' && (
          <BasketScreen
            basket={basket}
            products={products}
            coupons={coupons}
            onUpdateBasket={saveBasket}
            onProceedToCheckout={() => setCurrentScreen('checkout')}
          />
        )}
        {currentScreen === 'checkout' && (
          <CheckoutScreen
            basket={basket}
            products={products}
            user={user}
            onOrderPlaced={() => {
              saveBasket({});
              setCurrentScreen('confirmation');
            }}
            onBackToBasket={() => setCurrentScreen('basket')}
          />
        )}
        {currentScreen === 'confirmation' && (
          <ConfirmationScreen
            onReturnHome={() => setCurrentScreen('home')}
          />
        )}
        {currentScreen === 'auth' && (
          <AuthScreen
            email={authEmail}
            setEmail={setAuthEmail}
            password={authPassword}
            setPassword={setAuthPassword}
            isSignUp={isSignUp}
            setIsSignUp={setIsSignUp}
            onSubmit={handleAuthSubmit}
            onReturnHome={() => setCurrentScreen('home')}
          />
        )}
        {currentScreen === 'settings' && (
          <SettingsScreen
            user={user}
            isAdminUser={isAdminUser}
            onSignOut={handleSignOut}
            onNavigateAdmin={() => setCurrentScreen('admin')}
            onReturnHome={() => setCurrentScreen('home')}
          />
        )}
        {currentScreen === 'account' && (
          <AccountScreen
            user={user}
            isAdminUser={isAdminUser}
            onSignOut={handleSignOut}
            onNavigateSettings={() => setCurrentScreen('settings')}
            onNavigateAdmin={() => setCurrentScreen('admin')}
            onReturnHome={() => setCurrentScreen('home')}
          />
        )}
        {currentScreen === 'admin' && (
          <AdminScreen
            user={user}
            adminEmail={authEmail}
            setAdminEmail={setAuthEmail}
            adminPassword={authPassword}
            setAdminPassword={setAuthPassword}
            onLogin={handleAuthSubmit}
            onLogout={handleSignOut}
            products={products}
            coupons={coupons}
            onRefreshData={() => {}}
            onReturnHome={() => setCurrentScreen('home')}
          />
        )}
      </View>

      {/* Notifications Modal Overlay */}
      <NotificationsModal
        visible={notificationsVisible}
        onClose={() => setNotificationsVisible(false)}
      />

      {/* Full Screen Burger Menu Modal */}
      <Modal visible={menuVisible} animationType="fade" transparent={true} onRequestClose={() => setMenuVisible(false)}>
        <View style={styles.menuOverlay}>
          <View style={[styles.menuContent, { paddingTop: Math.max(insets.top, 20) }]}>
            <View style={styles.menuHeader}>
              <Text style={styles.menuTitle}>Menu</Text>
              <TouchableOpacity onPress={() => setMenuVisible(false)}>
                <Text style={{ fontSize: 24, color: '#ffffff' }}>✕</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.menuItem} onPress={() => { setCurrentScreen('home'); setMenuVisible(false); }}>
              <Text style={styles.menuItemIcon}>🏠</Text>
              <Text style={[styles.menuItemText, currentScreen === 'home' && styles.menuItemTextActive]}>Shop</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => { setCurrentScreen('catalog'); setMenuVisible(false); }}>
              <Text style={styles.menuItemIcon}>📖</Text>
              <Text style={[styles.menuItemText, currentScreen === 'catalog' && styles.menuItemTextActive]}>Catalog</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => { setCurrentScreen('basket'); setMenuVisible(false); }}>
              <View style={{ position: 'relative' }}>
                <Text style={styles.menuItemIcon}>🛍️</Text>
                {totalBasketCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{totalBasketCount}</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.menuItemText, currentScreen === 'basket' && styles.menuItemTextActive]}>Basket</Text>
            </TouchableOpacity>

            {user && isAdminUser && (
              <TouchableOpacity style={styles.menuItem} onPress={() => { setCurrentScreen('admin'); setMenuVisible(false); }}>
                <Text style={styles.menuItemIcon}>⚙️</Text>
                <Text style={[styles.menuItemText, currentScreen === 'admin' && styles.menuItemTextActive]}>Admin</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.menuItem} onPress={() => { setCurrentScreen(user ? 'account' : 'auth'); setMenuVisible(false); }}>
              <Text style={styles.menuItemIcon}>👤</Text>
              <Text style={[styles.menuItemText, (currentScreen === 'account' || currentScreen === 'auth' || currentScreen === 'settings') && styles.menuItemTextActive]}>
                {user ? 'Account' : 'Sign In'}
              </Text>
            </TouchableOpacity>

            {/* Install App Section */}
            {Platform.OS === 'web' && !isStandalone && (
              <View style={styles.installSection}>
                <View style={styles.installDivider} />
                <Text style={styles.installLabel}>GET THE APP</Text>

                <TouchableOpacity 
                  style={styles.installButton} 
                  onPress={() => { handleIOSInstallInstructions(); setMenuVisible(false); }} 
                  testID="action-btn"
                >
                  <Text style={styles.installButtonIcon}>🍎</Text>
                  <Text style={styles.installButtonText}>Add to iOS Home Screen</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.installButton, { marginTop: 10 }]} 
                  onPress={() => { handleInstallPWA(); setMenuVisible(false); }} 
                  testID="action-btn"
                >
                  <Text style={styles.installButtonIcon}>🤖</Text>
                  <Text style={styles.installButtonText}>Install App / Shortcut</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <SafeAreaProvider>
      {showSplash ? (
        <SplashScreen
          onExplore={() => {
            console.log("-> Transitioning away from splash screen");
            setShowSplash(false);
          }}
          onLogoTap={() => {}}
        />
      ) : (
        <MainApp onLeaveSplash={() => setShowSplash(true)} />
      )}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    ...Platform.select({
      web: {
        maxWidth: 768,
        width: '100%',
        marginHorizontal: 'auto',
        minHeight: '100vh',
        backgroundColor: '#121214',
        boxShadow: '0px 0px 40px rgba(0,0,0,0.8)',
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderColor: '#1e1e1e',
      }
    })
  },
  toastContainer: {
    position: 'absolute',
    left: 20,
    right: 20,
    zIndex: 9999,
    backgroundColor: '#d97706',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  toastText: { color: '#ffffff', fontWeight: '800', fontSize: 13, letterSpacing: 0.5 },
  header: {
    paddingBottom: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#121214',
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    ...Platform.select({
      web: {
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backgroundColor: 'rgba(18, 18, 20, 0.65)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        boxShadow: '0 4px 30px rgba(0,0,0,0.5)',
      }
    })
  },
  headerTitle: { fontSize: 24, fontWeight: '900', color: '#ffffff', letterSpacing: 2 },
  settingsHeaderIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
    ...Platform.select({ web: { cursor: 'pointer' } })
  },
  screenContainer: { flex: 1 },

  catalogContainer: { flex: 1, padding: 16 },
  catalogHeaderRow: { marginBottom: 16 },
  catalogTitle: { fontSize: 20, fontWeight: '900', color: '#ffffff' },
  catalogSubtitle: { fontSize: 12, color: '#737373', fontWeight: '600', marginTop: 2 },
  gridRow: { justifyContent: 'space-between', marginBottom: 20 },
  gridCard: { 
    width: '48%', 
    backgroundColor: '#1e1e20', 
    borderRadius: 20, 
    overflow: 'hidden', 
    borderWidth: 1, 
    borderColor: '#2c2c2e',
    ...Platform.select({
      web: {
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
      }
    })
  },
  gridImage: { width: '100%', height: 160, backgroundColor: '#262626' },
  gridInfo: { padding: 12 },
  gridBrand: { color: '#d97706', fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  gridName: { color: '#ffffff', fontSize: 13, fontWeight: '800', marginVertical: 2 },
  gridPrice: { color: '#ffffff', fontSize: 14, fontWeight: '900' },
  gridStockTag: { color: '#10b981', fontSize: 10, fontWeight: '700', marginTop: 2, marginBottom: 8 },
  gridAddBtn: { backgroundColor: '#262626', height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  gridAddBtnText: { color: '#ffffff', fontSize: 11, fontWeight: '800' },
  emptyCatalogContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyCatalogText: { color: '#a3a3a3', fontSize: 14, fontWeight: '700' },

  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    ...Platform.select({
      web: {
        backdropFilter: 'blur(4px)',
      }
    })
  },
  menuContent: {
    backgroundColor: '#171717',
    width: 280,
    height: '100%',
    padding: 30,
    borderLeftWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    ...Platform.select({
      web: {
        backgroundColor: 'rgba(18, 18, 20, 0.75)',
        backdropFilter: 'blur(30px)',
        WebkitBackdropFilter: 'blur(30px)',
        boxShadow: '-10px 0 40px rgba(0,0,0,0.8)',
      }
    })
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 40,
  },
  menuTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '900',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
    paddingVertical: 8,
    ...Platform.select({ web: { cursor: 'pointer' } })
  },
  menuItemIcon: {
    fontSize: 26,
    marginRight: 16,
  },
  menuItemText: {
    color: '#a3a3a3',
    fontSize: 18,
    fontWeight: '600',
  },
  menuItemTextActive: {
    color: '#ffffff',
    fontWeight: '800',
  },
  badge: {
    position: 'absolute',
    right: -10,
    top: -4,
    backgroundColor: '#d97706',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4
  },
  badgeText: { color: '#ffffff', fontSize: 10, fontWeight: '900' },

  // Install App Section
  installSection: {
    marginTop: 'auto',
    paddingTop: 20,
  },
  installDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginBottom: 20,
  },
  installLabel: {
    color: '#737373',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 16,
  },
  installButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  installButtonIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  installButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});