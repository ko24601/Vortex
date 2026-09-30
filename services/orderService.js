import { db } from '../firebase';
import { collection, addDoc, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { registerForPushNotifications as registerForPushNotificationsUtil, scheduleLocalNotification as scheduleLocalNotificationUtil } from '../utils/notificationService';
import { Platform } from 'react-native';

// 1. Save Order to Firestore
export const placeOrder = async (orderData, userId) => {
  try {
    const docRef = await addDoc(collection(db, 'orders'), {
      ...orderData,
      userId: userId || 'guest',
      status: 'Pending',
      createdAt: new Date().toISOString()
    });

    await scheduleLocalNotification('Order Placed! 🎉', `Your order #${docRef.id.slice(0, 6)} has been received.`);
    return docRef.id;
  } catch (error) {
    console.error('Error placing order:', error);
    throw error;
  }
};

// 2. Fetch User Orders
export const getUserOrders = async (userId = 'guest') => {
  try {
    const q = query(collection(db, 'orders'), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error fetching orders:', error);
    return [];
  }
};

// 3. Admin Update Order Status
export const updateOrderStatus = async (orderId, newStatus) => {
  try {
    const orderRef = doc(db, 'orders', orderId);
    await updateDoc(orderRef, { status: newStatus });
    await scheduleLocalNotification('Order Status Updated 📦', `Order #${orderId.slice(0, 6)} is now ${newStatus}.`);
  } catch (error) {
    console.error('Error updating order:', error);
  }
};

// 4. Local Push Notifications Config
export const registerForPushNotifications = async () => {
  return await registerForPushNotificationsUtil(); // Call our utility function
};

export const scheduleLocalNotification = async (title, body) => {
  await scheduleLocalNotificationUtil(title, body); // Call our utility function
};