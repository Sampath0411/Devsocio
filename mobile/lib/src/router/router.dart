import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../data/firebase_providers.dart';
import '../data/user_repository.dart';
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
import '../features/onboarding/onboarding_screen.dart';
import '../features/splash/splash_screen.dart';
import '../widgets/app_shell.dart';

/// Bridges Riverpod streams to a Listenable so GoRouter re-evaluates redirects.
class _AuthRefresh extends ChangeNotifier {
  _AuthRefresh(Ref ref) {
    ref.listen(authStateProvider, (_, __) => notifyListeners());
    ref.listen(currentUserProvider, (_, __) => notifyListeners());
  }
}

final _shellNavKey = GlobalKey<NavigatorState>();

/// Custom page transition: slide up + fade in.
Page<T> _buildPage<T>(Widget child) => CustomTransitionPage<T>(
      child: child,
      transitionsBuilder: (_, animation, secondaryAnimation, child) {
        return SlideTransition(
          position: Tween<Offset>(
            begin: const Offset(0, 0.03),
            end: Offset.zero,
          ).animate(CurvedAnimation(
            parent: animation,
            curve: Curves.easeOut,
            reverseCurve: Curves.easeIn,
          )),
          child: FadeTransition(
            opacity: animation,
            child: child,
          ),
        );
      },
      transitionDuration: const Duration(milliseconds: 300),
      reverseTransitionDuration: const Duration(milliseconds: 200),
    );

/// Scale+fade transition for full-screen modals.
Page<T> _buildModalPage<T>(Widget child) => CustomTransitionPage<T>(
      child: child,
      transitionsBuilder: (_, animation, secondaryAnimation, child) {
        return ScaleTransition(
          scale: Tween<double>(begin: 0.95, end: 1.0).animate(
            CurvedAnimation(parent: animation, curve: Curves.easeOut),
          ),
          child: FadeTransition(opacity: animation, child: child),
        );
      },
      transitionDuration: const Duration(milliseconds: 250),
      reverseTransitionDuration: const Duration(milliseconds: 200),
    );

final routerProvider = Provider<GoRouter>((ref) {
  final refresh = _AuthRefresh(ref);

  return GoRouter(
    // Start at splash screen for the 2-second animation
    initialLocation: '/splash',
    refreshListenable: refresh,
    redirect: (context, state) {
      final auth = ref.read(authStateProvider);
      final me = ref.read(currentUserProvider).value;
      final loggedIn = auth.value != null;
      final loc = state.matchedLocation;

      // Never redirect from the splash screen – it navigates itself after animation.
      if (loc == '/splash') return null;

      final publicRoutes = {'/', '/login', '/signup'};
      final noRedirectRoutes = {'/', '/login', '/signup', '/onboarding', '/splash'};

      if (auth.isLoading) return null;

      if (!loggedIn && !publicRoutes.contains(loc)) return '/';
      if (!loggedIn) return null;

      if (publicRoutes.contains(loc)) return '/feed';

      if (me != null && !me.onboardingDone && !noRedirectRoutes.contains(loc)) {
        return '/onboarding';
      }

      if (me != null && me.onboardingDone && loc == '/onboarding') {
        return '/feed';
      }

      return null;
    },
    routes: [
      // --- Splash screen (initial) ---
      GoRoute(
        path: '/splash',
        pageBuilder: (_, __) => _buildPage(const SplashScreen()),
      ),

      // --- Onboarding ---
      GoRoute(
        path: '/onboarding',
        pageBuilder: (_, __) => _buildPage(const OnboardingScreen()),
      ),

      // --- Auth routes ---
      GoRoute(
        path: '/',
        pageBuilder: (_, __) => _buildPage(const LandingScreen()),
      ),
      GoRoute(
        path: '/login',
        pageBuilder: (_, __) => _buildPage(const LoginScreen()),
      ),
      GoRoute(
        path: '/signup',
        pageBuilder: (_, __) => _buildPage(const SignupScreen()),
      ),

      // --- Main shell with bottom navigation ---
      ShellRoute(
        navigatorKey: _shellNavKey,
        builder: (_, __, child) => AppShell(child: child),
        routes: [
          GoRoute(path: '/feed', pageBuilder: (_, __) => _buildPage(const FeedScreen())),
          GoRoute(path: '/explore', pageBuilder: (_, __) => _buildPage(const ExploreScreen())),
          GoRoute(path: '/ideas', pageBuilder: (_, __) => _buildPage(const IdeasScreen())),
          GoRoute(path: '/messages', pageBuilder: (_, __) => _buildPage(const MessagesScreen())),
        ],
      ),

      // --- Full-screen routes (modal-style) ---
      GoRoute(
        path: '/notifications',
        pageBuilder: (_, __) => _buildModalPage(const NotificationsScreen()),
      ),
      GoRoute(
        path: '/post/:id',
        pageBuilder: (_, s) => _buildModalPage(
          PostDetailScreen(postId: s.pathParameters['id']!),
        ),
      ),
      GoRoute(
        path: '/profile/:username',
        pageBuilder: (_, s) => _buildPage(
          ProfileScreen(username: s.pathParameters['username']!),
        ),
      ),
      GoRoute(
        path: '/edit-profile',
        pageBuilder: (_, __) => _buildModalPage(const EditProfileScreen()),
      ),
      GoRoute(
        path: '/followers/:uid',
        pageBuilder: (_, s) => _buildModalPage(
          FollowListScreen(uid: s.pathParameters['uid']!, followers: true),
        ),
      ),
      GoRoute(
        path: '/following/:uid',
        pageBuilder: (_, s) => _buildModalPage(
          FollowListScreen(uid: s.pathParameters['uid']!, followers: false),
        ),
      ),
      GoRoute(
        path: '/chat/:uid',
        pageBuilder: (_, s) => _buildModalPage(
          ChatScreen(otherUid: s.pathParameters['uid']!),
        ),
      ),
      GoRoute(
        path: '/credits',
        pageBuilder: (_, __) => _buildPage(const CreditsScreen()),
      ),
      GoRoute(
        path: '/settings',
        pageBuilder: (_, __) => _buildModalPage(const SettingsScreen()),
      ),
      GoRoute(
        path: '/admin',
        pageBuilder: (_, __) => _buildModalPage(const AdminScreen()),
      ),
    ],
  );
});
