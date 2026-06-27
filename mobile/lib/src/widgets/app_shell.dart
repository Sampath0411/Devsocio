import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../core/theme.dart';
import '../data/auth_repository.dart';
import '../data/user_repository.dart';
import 'avatar.dart';
import 'presence_heartbeat.dart';
import '../core/notifications.dart';
import '../features/about/about_sheet.dart';
import 'ui.dart';

/// Bottom-nav shell with animated tab transitions.
class AppShell extends ConsumerWidget {
  final Widget child;
  const AppShell({super.key, required this.child});

  static const _tabs = [
    ('/feed', Icons.home_outlined, Icons.home, 'Feed', AppColors.feedPrimary),
    ('/explore', Icons.search, Icons.search, 'Explore', AppColors.explorePrimary),
    ('/ideas', Icons.lightbulb_outline, Icons.lightbulb, 'Ideas', AppColors.ideasPrimary),
    ('/messages', Icons.chat_bubble_outline, Icons.chat_bubble, 'Messages', AppColors.messagesPrimary),
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
      body: FcmHandler(child: PresenceHeartbeat(child: child)),
      bottomNavigationBar: NavigationBar(
        selectedIndex: index,
        animationDuration: const Duration(milliseconds: 400),
        onDestinationSelected: (i) {
          if (i < _tabs.length) {
            context.go(_tabs[i].$1);
          } else if (me != null) {
            context.push('/profile/${me.username}');
          }
        },
        destinations: [
          for (int i = 0; i < _tabs.length; i++)
            NavigationDestination(
              icon: GestureDetector(
                onLongPress: i == 0
                    ? () => _showAbout(context)
                    : null,
                child: Icon(_tabs[i].$2, color: AppColors.textMuted),
              ),
              selectedIcon: GestureDetector(
                onLongPress: i == 0
                    ? () => _showAbout(context)
                    : null,
                child: Icon(_tabs[i].$3, color: _tabs[i].$5),
              ),
              label: _tabs[i].$4,
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

  void _showAbout(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const AboutSheet(),
    );
  }
}
