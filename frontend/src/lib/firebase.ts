import { initializeApp, getApps } from 'firebase/app';
import { getAnalytics, logEvent, setUserId, setUserProperties, Analytics } from 'firebase/analytics';
import {
  getFirestore,
  collection,
  doc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  Firestore,
  Unsubscribe,
} from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';

// ─── PayVia360 Firebase Configuration ────────────────────────────────────────
const firebaseConfig = {
  apiKey: 'AIzaSyBc8XrFpQsnYGYvt-V6QX_yIvN9nn1KxTY',
  authDomain: 'payvia360.firebaseapp.com',
  projectId: 'payvia360',
  storageBucket: 'payvia360.firebasestorage.app',
  messagingSenderId: '772820567847',
  appId: '1:772820567847:web:efd8a2ec0ee33c46988b02',
  measurementId: 'G-NY0GPRQ4TY',
};

// ─── Initialize App (singleton — safe for HMR in dev) ─────────────────────────
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// ─── Analytics ────────────────────────────────────────────────────────────────
let analytics: Analytics | null = null;
try {
  if (typeof window !== 'undefined') {
    analytics = getAnalytics(app);
  }
} catch (_) {}

// ─── Firestore ────────────────────────────────────────────────────────────────
let db: Firestore | null = null;
try {
  db = getFirestore(app);
} catch (_) {}

// ─── Storage ──────────────────────────────────────────────────────────────────
let storage: FirebaseStorage | null = null;
try {
  storage = getStorage(app);
} catch (_) {}

// ─── FCM Messaging ────────────────────────────────────────────────────────────
let messaging: Messaging | null = null;
try {
  if (typeof window !== 'undefined' && 'Notification' in window) {
    messaging = getMessaging(app);
  }
} catch (_) {}

// ─── Analytics Helpers ────────────────────────────────────────────────────────
export const firebaseAnalytics = {
  track: (eventName: string, params?: Record<string, any>) => {
    if (!analytics) return;
    try { logEvent(analytics, eventName, params); } catch (_) {}
  },
  identify: (userId: string, properties?: Record<string, any>) => {
    if (!analytics) return;
    try {
      setUserId(analytics, userId);
      if (properties) setUserProperties(analytics, properties);
    } catch (_) {}
  },
  events: {
    LOGIN: 'login',
    REGISTER: 'sign_up',
    ORDER_CREATED: 'order_created',
    ORDER_SETTLED: 'order_settled',
    PLAN_PURCHASE_INITIATED: 'plan_purchase_initiated',
    PLAN_ACTIVATED: 'plan_activated',
    PAYMENT_LINK_CREATED: 'payment_link_created',
    MERCHANT_CONNECTED: 'merchant_connected',
    DEVICE_PAIRED: 'device_paired',
    PAGE_VIEW: 'page_view',
  },
};

// ─── Firestore Real-Time Subscriptions ───────────────────────────────────────
export const firebaseFirestore = {
  db,
  subscribeToOrders: (
    tenantId: string,
    callback: (orders: any[]) => void,
    statusFilter?: string
  ): Unsubscribe | null => {
    if (!db) return null;
    try {
      const q = statusFilter && statusFilter !== 'ALL'
        ? query(
            collection(db, 'orders'),
            where('tenant_id', '==', tenantId),
            where('status', '==', statusFilter),
            orderBy('created_at', 'desc'),
            limit(50)
          )
        : query(
            collection(db, 'orders'),
            where('tenant_id', '==', tenantId),
            orderBy('created_at', 'desc'),
            limit(50)
          );
      return onSnapshot(q, (snap) => {
        const orders = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        callback(orders);
      });
    } catch (_) { return null; }
  },
  subscribeToSubscription: (
    tenantId: string,
    callback: (sub: any) => void
  ): Unsubscribe | null => {
    if (!db) return null;
    try {
      return onSnapshot(doc(db, 'subscriptions', tenantId), (snap) => {
        if (snap.exists()) callback({ id: snap.id, ...snap.data() });
      });
    } catch (_) { return null; }
  },
};

// ─── FCM Push Notifications ───────────────────────────────────────────────────
export const firebaseMessaging = {
  messaging,
  requestPermissionAndGetToken: async (): Promise<string | null> => {
    if (!messaging) return null;
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return null;
      const token = await getToken(messaging, {
        vapidKey: 'BKagOny0M--r0c3_3bRW1U9ggL7fmTbHjhRfMLvVT1oBhQGqMu4QTvR5V4MO_TtdUUHfVEFBqCYVkFoiE4kDak',
      });
      return token || null;
    } catch (_) { return null; }
  },
  onForegroundMessage: (callback: (payload: any) => void) => {
    if (!messaging) return () => {};
    return onMessage(messaging, callback);
  },
};

export { storage, analytics, db };
export { app as firebaseApp };
export default app;
