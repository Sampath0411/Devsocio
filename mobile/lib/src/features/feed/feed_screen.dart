import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme.dart';
import '../../data/post_repository.dart';
import '../../data/social_repository.dart';
import '../../data/user_repository.dart';
import '../../widgets/post_card.dart';
import '../../widgets/ui.dart';
import '../stories/stories_bar.dart';
import 'create_post_sheet.dart';

class FeedScreen extends ConsumerWidget {
  const FeedScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final feed = ref.watch(feedProvider);
    final me = ref.watch(currentUserProvider).value;
    final unread = ref.watch(unreadCountProvider).value ?? 0;

    return Scaffold(
      appBar: AppBar(
        titleSpacing: 16,
        title: const BrandMark(size: 18),
        actions: [
          // Activity / notifications — top app bar with unread badge.
          IconButton(
            tooltip: 'Activity',
            icon: unread > 0
                ? Badge(
                    label: Text('$unread'),
                    child: const Icon(Icons.notifications_outlined),
                  )
                : const Icon(Icons.notifications_outlined),
            onPressed: () => context.push('/notifications'),
          ),
          // Credits — new icon (coins).
          IconButton(
            icon: const Icon(Icons.monetization_on_outlined,
                color: AppColors.warning),
            tooltip: 'Credits',
            onPressed: () => context.push('/credits'),
          ),
          const SizedBox(width: 4),
        ],
      ),
      floatingActionButton: me == null
          ? null
          : FloatingActionButton(
              onPressed: () => showCreatePostSheet(context, me),
              backgroundColor: AppColors.primary,
              child: const Icon(Icons.add, color: Colors.white),
            ),
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(feedProvider),
        child: feed.when(
          loading: () =>
              const Center(child: CircularProgressIndicator()),
          error: (e, _) => ListView(children: [
            const SizedBox(height: 120),
            Center(child: Text('Could not load feed.\n$e',
                textAlign: TextAlign.center,
                style: const TextStyle(color: AppColors.textMuted))),
          ]),
          data: (posts) {
            return ListView(
              children: [
                const StoriesBar(),
                const Divider(height: 1, color: AppColors.border),
                if (posts.isEmpty)
                  const _EmptyFeed()
                else
                  ...posts.map((p) => PostCard(post: p)),
                const SizedBox(height: 80),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _EmptyFeed extends StatelessWidget {
  const _EmptyFeed();
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 80, horizontal: 24),
      child: Column(
        children: [
          const Icon(Icons.dynamic_feed,
              size: 56, color: AppColors.primary),
          const SizedBox(height: 16),
          Text('Your feed is empty', style: AppTheme.brandTitle),
          const SizedBox(height: 8),
          const Text(
            'Be the first to post, or follow some developers from Explore.',
            textAlign: TextAlign.center,
            style: TextStyle(color: AppColors.textMuted),
          ),
        ],
      ),
    );
  }
}
