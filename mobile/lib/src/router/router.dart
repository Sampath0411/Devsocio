import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../data/firebase_providers.dart';
import '../features/auth/landing_screen.dart';
import '../features/auth/login_screen.dart';
import '../features/auth/signup_screen.dart';
import '../features/feed/feed_screen.dart';
import '../features/feed/post_detail_screen.dart';
import '../features/explore/explore_screen.dart';
import '../features/ideas/ideas_screen.dart';
import '../features/profile/profile_screen.dart';
import '../features/profile/edit_profile_screen.dart';
import '../features/profile/follow_list_screen.dart';
import '../features/messages/messages_screen.dart';
import '../features/messages/chat_screen.dart';
import '../features/notifications/notifications_screen.dart';
import '../features/credits/credits_screen.dart';
import '../features/settings/settings_screen.dart';
import '../features/admin/admin_screen.dart';
import '../widgets/app_shell.dart';

/// Bridges a Riverpod stream to a Listenable so GoRouter re-evaluates redirects.
class _AuthRefresh extends ChangeNotifier {
  _AuthRefresh(Ref ref) {
    ref.listen(authStateProvider, (_, __) => notifyListeners());
  }
}

final _shellNavKey = GlobalKey<NavigatorState>();

final routerProvider = Provider<GoRouter>((ref) {
  final refresh = _AuthRefresh(ref);

  return GoRouter(
    initialLocation: '/feed',
    refreshListenable: refresh,
    redirect: (context, state) {
      final auth = ref.read(authStateProvider);
      final loggedIn = auth.value != null;
      final loc = state.matchedLocation;
      final authRoutes = {'/', '/login', '/signup'};
      final onAuthRoute = authRoutes.contains(loc);

      if (auth.isLoading) return null;
      if (!loggedIn && !onAuthRoute) return '/';
      if (loggedIn && onAuthRoute) return '/feed';
      return null;
    },
    routes: [
      GoRoute(path: '/', builder: (_, __) => const LandingScreen()),
      GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
      GoRoute(path: '/signup', builder: (_, __) => const SignupScreen()),

      // Main shell with bottom navigation.
      ShellRoute(
        navigatorKey: _shellNavKey,
        builder: (_, __, child) => AppShell(child: child),
        routes: [
          GoRoute(path: '/feed', builder: (_, __) => const FeedScreen()),
          GoRoute(path: '/explore', builder: (_, __) => const ExploreScreen()),
          GoRoute(path: '/ideas', builder: (_, __) => const IdeasScreen()),
          GoRoute(
              path: '/messages', builder: (_, __) => const MessagesScreen()),
        ],
      ),

      // Activity is reached from the top app bar (not a bottom tab).
      GoRoute(
          path: '/notifications',
          builder: (_, __) => const NotificationsScreen()),

      // Full-screen routes (outside the bottom-nav shell).
      GoRoute(
          path: '/post/:id',
          builder: (_, s) =>
              PostDetailScreen(postId: s.pathParameters['id']!)),
      GoRoute(
          path: '/profile/:username',
          builder: (_, s) =>
              ProfileScreen(username: s.pathParameters['username']!)),
      GoRoute(
          path: '/edit-profile', builder: (_, __) => const EditProfileScreen()),
      GoRoute(
          path: '/followers/:uid',
          builder: (_, s) =>
              FollowListScreen(uid: s.pathParameters['uid']!, followers: true)),
      GoRoute(
          path: '/following/:uid',
          builder: (_, s) =>
              FollowListScreen(uid: s.pathParameters['uid']!, followers: false)),
      GoRoute(
          path: '/chat/:uid',
          builder: (_, s) => ChatScreen(otherUid: s.pathParameters['uid']!)),
      GoRoute(path: '/credits', builder: (_, __) => const CreditsScreen()),
      GoRoute(path: '/settings', builder: (_, __) => const SettingsScreen()),
      GoRoute(path: '/admin', builder: (_, __) => const AdminScreen()),
    ],
  );
});
