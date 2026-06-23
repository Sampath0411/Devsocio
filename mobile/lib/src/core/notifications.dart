import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

/// Top-level background message handler (required by FCM).
/// Must be a top-level function, not a method.
@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
  debugPrint('FCM background: ${message.messageId}');
}

/// Initialize FCM: request permissions, set up handlers, and save the token
/// to the user's Firestore document. Call once at app startup after Firebase
/// is initialized.
Future<void> initFcm() async {
  final messaging = FirebaseMessaging.instance;

  // Register background handler (returns void, not a Future).
  FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);

  // Request notification permissions (iOS + Android 13+).
  final settings = await messaging.requestPermission(
    alert: true,
    badge: true,
    sound: true,
    provisional: false,
  );

  if (settings.authorizationStatus == AuthorizationStatus.authorized ||
      settings.authorizationStatus == AuthorizationStatus.provisional) {
    debugPrint('FCM: notification permission granted');
  } else {
    debugPrint('FCM: notification permission denied');
  }

  // Get FCM token.
  final token = await messaging.getToken();
  if (token != null) {
    debugPrint('FCM token: $token');
  }
}

/// Save (or refresh) the FCM token on the user's Firestore document.
Future<void> saveFcmToken(String uid, String? token) async {
  if (token == null || token.isEmpty) return;
  try {
    await FirebaseFirestore.instance
        .collection('users')
        .doc(uid)
        .update({'fcmToken': token}).catchError((_) {});
  } catch (_) {
    // Best-effort: never block UX for token saving.
  }
}

/// Listen to FCM token refreshes and update Firestore.
void listenTokenRefreshes(String uid) {
  FirebaseMessaging.instance.onTokenRefresh.listen((token) {
    saveFcmToken(uid, token);
  });
}

/// A widget that sets up FCM listeners and handles notification routing.
/// Wrap this near the root of the app (e.g. in AppShell or a top-level widget).
class FcmHandler extends StatefulWidget {
  final Widget child;
  const FcmHandler({super.key, required this.child});

  @override
  State<FcmHandler> createState() => _FcmHandlerState();
}

class _FcmHandlerState extends State<FcmHandler> {
  @override
  void initState() {
    super.initState();
    _setup();
  }

  void _setup() async {
    final messaging = FirebaseMessaging.instance;

    // Handle notification that opened the app from terminated state.
    final initialMessage = await messaging.getInitialMessage();
    if (initialMessage != null && mounted) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _handleNotification(initialMessage.data);
      });
    }

    // Handle notification tapped while app is in background.
    FirebaseMessaging.onMessageOpenedApp.listen((message) {
      if (mounted) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (mounted) _handleNotification(message.data);
        });
      }
    });

    // Handle notifications received while app is in foreground.
    FirebaseMessaging.onMessage.listen((message) {
      debugPrint('FCM foreground: ${message.notification?.title}');
    });
  }

  void _handleNotification(Map<String, dynamic> data) {
    if (!mounted) return;
    final postId = data['postId'] as String?;
    final convoId = data['convoId'] as String?;
    final actorUid = data['actorUid'] as String?;
    final route = data['route'] as String?;

    if (route != null) {
      context.go(route);
    } else if (postId != null) {
      context.go('/post/$postId');
    } else if (convoId != null) {
      // convoId format: uid1__uid2, navigate to chat with the other user.
      final parts = convoId.split('__');
      final currentUid = FirebaseAuth.instance.currentUser?.uid ?? '';
      if (parts.length == 2) {
        final otherUid = parts[0] == currentUid ? parts[1] : parts[0];
        context.go('/chat/$otherUid');
      }
    } else if (actorUid != null) {
      context.go('/notifications');
    }
  }

  @override
  Widget build(BuildContext context) => widget.child;
}


