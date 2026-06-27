import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme.dart';
import '../../data/post_repository.dart';
import '../../data/social_repository.dart';
import '../../data/user_repository.dart';
import '../../widgets/post_card.dart';
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
        title: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [AppColors.primary, AppColors.accent],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(12),
          ),
          child: const Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.terminal, color: Colors.white, size: 20),
              SizedBox(width: 8),
              Text('DevSocio',
                  style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w800,
                      fontSize: 18)),
            ],
          ),
        ),
        actions: [
          IconButton(
            tooltip: 'Activity',
            icon: unread > 0
                ? Badge(
                    label: Text('$unread',
                        style: const TextStyle(fontSize: 10)),
                    child: const Icon(Icons.notifications_outlined),
                  )
                : const Icon(Icons.notifications_outlined),
            onPressed: () => context.push('/notifications'),
          ),
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
          loading: () => const _FeedShimmer(),
          error: (_, __) => ListView(children: [
            const SizedBox(height: 120),
            Center(
              child: Column(
                children: [
                  const Icon(Icons.cloud_off,
                      size: 48, color: AppColors.textMuted),
                  const SizedBox(height: 16),
                  const Text(
                    'Could not load feed.\nPull down to try again.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: AppColors.textMuted),
                  ),
                ],
              ),
            ),
          ]),
          data: (posts) {
            return ListView(
              children: [
                const StoriesBar(),
                Container(
                  height: 1,
                  color: AppColors.border.withValues(alpha: 0.5),
                ),
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
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                  colors: [AppColors.primary, AppColors.accent]),
              borderRadius: BorderRadius.circular(24),
              boxShadow: [
                BoxShadow(
                  color: AppColors.primary.withValues(alpha: 0.3),
                  blurRadius: 30,
                  spreadRadius: 5,
                ),
              ],
            ),
            child: const Icon(Icons.dynamic_feed, size: 48, color: Colors.white),
          ),
          const SizedBox(height: 20),
          Text('Your feed is empty',
              style: AppTheme.brandTitle(22)),
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

/// Shimmer loading skeleton for the feed.
class _FeedShimmer extends StatelessWidget {
  const _FeedShimmer();

  @override
  Widget build(BuildContext context) {
    return ListView(
      children: [
        const StoriesBar(),
        const SizedBox(height: 8),
        for (int i = 0; i < 4; i++)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            child: Container(
              height: 200,
              decoration: BoxDecoration(
                color: AppColors.surfaceCard,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.border.withValues(alpha: 0.3)),
              ),
              child: const Center(
                child: CircularProgressIndicator(strokeWidth: 2),
              ),
            ),
          ),
      ],
    );
  }
}
