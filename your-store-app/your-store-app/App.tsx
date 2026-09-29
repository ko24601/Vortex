import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, StatusBar, Animated, FlatList, Image, Dimensions, TouchableOpacity } from 'react-native';
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
      Animated.delay(2000),
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
            <Ionicons name="notifications-outline" size={18} color="#ffffff" />
          </TouchableOpacity>

          {/* Account / Settings Header Button */}
          <TouchableOpacity
            style={styles.settingsHeaderIcon}
            onPress={() => setCurrentScreen(user ? 'account' : 'auth')}
          >
            <Text style={{ fontSize: 16 }}>{user ? '👤' : '🔐'}</Text>
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

      {/* Safe Area Bottom Navigation Bar */}
      {currentScreen !== 'confirmation' && currentScreen !== 'checkout' && (
        <View style={[styles.navBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
          <TouchableOpacity
            style={styles.navItem}
            activeOpacity={0.7}
            onPress={() => setCurrentScreen('home')}
          >
            <Text style={styles.navIcon}>🏠</Text>
            <Text style={[styles.navText, currentScreen === 'home' && styles.navTextActive]}>Shop</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navItem}
            activeOpacity={0.7}
            onPress={() => setCurrentScreen('catalog')}
          >
            <Text style={styles.navIcon}>📖</Text>
            <Text style={[styles.navText, currentScreen === 'catalog' && styles.navTextActive]}>Catalog</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navItem}
            activeOpacity={0.7}
            onPress={() => setCurrentScreen('basket')}
          >
            <View style={{ position: 'relative' }}>
              <Text style={styles.navIcon}>🛍️</Text>
              {totalBasketCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{totalBasketCount}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.navText, currentScreen === 'basket' && styles.navTextActive]}>Basket</Text>
          </TouchableOpacity>

          {/* DYNAMIC ADMIN NAV TAB: Appears automatically when user is logged in & isAdminUser is true */}
          {user && isAdminUser && (
            <TouchableOpacity
              style={styles.navItem}
              activeOpacity={0.7}
              onPress={() => setCurrentScreen('admin')}
            >
              <Text style={styles.navIcon}>⚙️</Text>
              <Text style={[styles.navText, currentScreen === 'admin' && styles.navTextActive]}>Admin</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.navItem}
            activeOpacity={0.7}
            onPress={() => setCurrentScreen(user ? 'account' : 'auth')}
          >
            <Text style={styles.navIcon}>👤</Text>
            <Text style={[styles.navText, (currentScreen === 'account' || currentScreen === 'auth' || currentScreen === 'settings') && styles.navTextActive]}>
              {user ? 'Account' : 'Sign In'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
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
        maxWidth: 720,
        width: '100%',
        marginHorizontal: 'auto',
        minHeight: '100vh',
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
    paddingBottom: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#171717',
    borderBottomWidth: 1,
    borderColor: '#262626'
  },
  headerTitle: { fontSize: 22, fontWeight: '900', color: '#ffffff', letterSpacing: 2 },
  settingsHeaderIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#262626',
    justifyContent: 'center',
    alignItems: 'center'
  },
  screenContainer: { flex: 1 },

  catalogContainer: { flex: 1, padding: 16 },
  catalogHeaderRow: { marginBottom: 16 },
  catalogTitle: { fontSize: 20, fontWeight: '900', color: '#ffffff' },
  catalogSubtitle: { fontSize: 12, color: '#737373', fontWeight: '600', marginTop: 2 },
  gridRow: { justifyContent: 'space-between', marginBottom: 16 },
  gridCard: { width: '48%', backgroundColor: '#171717', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#262626' },
  gridImage: { width: '100%', height: 140, backgroundColor: '#262626' },
  gridInfo: { padding: 10 },
  gridBrand: { color: '#d97706', fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  gridName: { color: '#ffffff', fontSize: 13, fontWeight: '800', marginVertical: 2 },
  gridPrice: { color: '#ffffff', fontSize: 14, fontWeight: '900' },
  gridStockTag: { color: '#10b981', fontSize: 10, fontWeight: '700', marginTop: 2, marginBottom: 8 },
  gridAddBtn: { backgroundColor: '#262626', height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  gridAddBtnText: { color: '#ffffff', fontSize: 11, fontWeight: '800' },
  emptyCatalogContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyCatalogText: { color: '#a3a3a3', fontSize: 14, fontWeight: '700' },

  navBar: {
    backgroundColor: '#171717',
    borderTopWidth: 1,
    borderColor: '#262626',
    flexDirection: 'row',
    justifyContent: 'around',
    alignItems: 'center',
    paddingTop: 10,
  },
  navItem: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  navIcon: { fontSize: 18, marginBottom: 2 },
  navText: { fontSize: 10, fontWeight: '600', color: '#737373' },
  navTextActive: { color: '#ffffff', fontWeight: '800' },
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
  badgeText: { color: '#ffffff', fontSize: 10, fontWeight: '900' }
});