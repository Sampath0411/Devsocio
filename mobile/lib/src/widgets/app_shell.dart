import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../core/theme.dart';
import '../data/auth_repository.dart';
import '../data/user_repository.dart';
import 'avatar.dart';
import 'presence_heartbeat.dart';
import 'ui.dart';

/// Bottom-nav shell. Tabs: Feed, Explore, Ideas, Messages, Profile (last).
/// Activity/Notifications lives in the top app bar (see FeedScreen).
class AppShell extends ConsumerWidget {
  final Widget child;
  const AppShell({super.key, required this.child});

  // route, unselected icon, selected icon, label
  static const _tabs = [
    ('/feed', Icons.home_outlined, Icons.home, 'Feed'),
    ('/explore', Icons.search, Icons.search, 'Explore'),
    ('/ideas', Icons.lightbulb_outline, Icons.lightbulb, 'Ideas'),
    ('/messages', Icons.chat_bubble_outline, Icons.chat_bubble, 'Messages'),
  ];

  int _indexFor(String location) {
    final i = _tabs.indexWhere((t) => location.startsWith(t.$1));
    return i < 0 ? 0 : i;
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final location = GoRouterState.of(context).matchedLocation;
    final index = _indexFor(location);
    final me = ref.watch(currentUserProvider).value;

    // Banned users are signed out on next app interaction (mirrors web).
    ref.listen(currentUserProvider, (_, next) {
      final user = next.value;
      if (user != null && user.banned) {
        ref.read(authRepositoryProvider).logout();
        if (context.mounted) {
          showToast(context, 'Your account has been suspended.', error: true);
        }
      }
    });

    return Scaffold(
      body: PresenceHeartbeat(child: child),
      bottomNavigationBar: NavigationBar(
        selectedIndex: index,
        onDestinationSelected: (i) {
          if (i < _tabs.length) {
            context.go(_tabs[i].$1);
          } else if (me != null) {
            // Last item = Profile.
            context.push('/profile/${me.username}');
          }
        },
        destinations: [
          for (final t in _tabs)
            NavigationDestination(
              icon: Icon(t.$2),
              selectedIcon: Icon(t.$3, color: AppColors.primary),
              label: t.$4,
            ),
          NavigationDestination(
            icon: Avatar(url: me?.avatar ?? '', size: 26),
            selectedIcon: Avatar(url: me?.avatar ?? '', size: 26),
            label: 'Profile',
          ),
        ],
      ),
    );
  }
}
