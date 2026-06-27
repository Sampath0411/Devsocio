import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme.dart';
import '../../data/social_repository.dart';
import '../../data/user_repository.dart';
import '../../models/story.dart';
import '../../widgets/avatar.dart';
import '../../widgets/ui.dart';
import 'story_viewer.dart';

/// Horizontal stories rail atop the feed. Groups live (<24h) stories by author.
class StoriesBar extends ConsumerWidget {
  const StoriesBar({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final storiesAsync = ref.watch(storiesProvider);
    final me = ref.watch(currentUserProvider).value;

    return storiesAsync.maybeWhen(
      orElse: () => const SizedBox(height: 100),
      data: (stories) {
        final byAuthor = <String, List<Story>>{};
        for (final s in stories) {
          byAuthor.putIfAbsent(s.authorUid, () => []).add(s);
        }
        final authorUids = byAuthor.keys.toList();

        return SizedBox(
          height: 100,
          child: ListView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            children: [
              if (me != null)
                _StoryBubble(
                  avatar: me.avatar,
                  label: 'Your story',
                  isAdd: true,
                  onTap: () => _composeStory(context, ref),
                ),
              for (final uid in authorUids)
                _StoryBubble(
                  avatar: byAuthor[uid]!.first.author.avatar,
                  label: byAuthor[uid]!.first.author.username,
                  onTap: () => showStoryViewer(context, byAuthor[uid]!),
                ),
            ],
          ),
        );
      },
    );
  }

  Future<void> _composeStory(BuildContext context, WidgetRef ref) async {
    final me = ref.read(currentUserProvider).value;
    if (me == null) return;
    final controller = TextEditingController();
    final text = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(
            bottom: MediaQuery.of(ctx).viewInsets.bottom,
            left: 20,
            right: 20,
            top: 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('New story', style: AppTheme.brandTitle(22)),
            const SizedBox(height: 4),
            const Text('Disappears in 24 hours',
                style: TextStyle(color: AppColors.textMuted)),
            const SizedBox(height: 16),
            TextField(
              controller: controller,
              maxLines: 4,
              minLines: 2,
              autofocus: true,
              decoration:
                  const InputDecoration(hintText: 'What are you building?'),
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: Container(
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(12),
                  gradient: AppColors.gradientBrand,
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.primary.withValues(alpha: 0.3),
                      blurRadius: 12,
                      spreadRadius: 1,
                    ),
                  ],
                ),
                child: ElevatedButton(
                  onPressed: () => Navigator.pop(ctx, controller.text.trim()),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.transparent,
                    shadowColor: Colors.transparent,
                  ),
                  child: const Text('Share story'),
                ),
              ),
            ),
            const SizedBox(height: 12),
          ],
        ),
      ),
    );
    if (text == null || text.isEmpty) return;
    await ref.read(socialRepositoryProvider).createStory({
      'authorUid': me.uid,
      'author': me.asAuthor.toMap(),
      'content': text,
      'imageUrl': null,
      'viewers': <String>[],
    });
    if (context.mounted) showToast(context, 'Story shared!');
  }
}

class _StoryBubble extends StatelessWidget {
  final String avatar;
  final String label;
  final bool isAdd;
  final VoidCallback onTap;
  const _StoryBubble({
    required this.avatar,
    required this.label,
    required this.onTap,
    this.isAdd = false,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 72,
        margin: const EdgeInsets.only(right: 8),
        child: Column(
          children: [
            Stack(
              children: [
                Container(
                  padding: const EdgeInsets.all(2.5),
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: isAdd
                        ? null
                        : const LinearGradient(
                            colors: [AppColors.primary, AppColors.accent]),
                    border: isAdd
                        ? Border.all(
                            color: AppColors.borderLight, width: 2.5)
                        : null,
                  ),
                  child: Avatar(url: avatar, size: 56),
                ),
                if (isAdd)
                  Positioned(
                    right: 0,
                    bottom: 0,
                    child: Container(
                      decoration: BoxDecoration(
                        gradient: AppColors.gradientBrand,
                        shape: BoxShape.circle,
                        border:
                            Border.all(color: AppColors.bg, width: 2.5),
                        boxShadow: [
                          BoxShadow(
                            color: AppColors.primary.withValues(alpha: 0.4),
                            blurRadius: 6,
                          ),
                        ],
                      ),
                      child: const Icon(Icons.add,
                          size: 18, color: Colors.white),
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 4),
            Text(label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                    fontSize: 11, color: AppColors.textMuted)),
          ],
        ),
      ),
    );
  }
}
