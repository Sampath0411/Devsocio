import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme.dart';
import '../../data/ai_client.dart';
import '../../data/message_repository.dart';
import '../../data/social_repository.dart';
import '../../data/user_repository.dart';
import '../../models/idea.dart';
import '../../widgets/avatar.dart';
import '../../widgets/ui.dart';

enum _Sort { newest, invested, score }

class IdeasScreen extends ConsumerStatefulWidget {
  const IdeasScreen({super.key});
  @override
  ConsumerState<IdeasScreen> createState() => _IdeasScreenState();
}

class _IdeasScreenState extends ConsumerState<IdeasScreen> {
  _Sort _sort = _Sort.newest;

  @override
  Widget build(BuildContext context) {
    final ideasAsync = ref.watch(ideasProvider);
    final me = ref.watch(currentUserProvider).value;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Ideas'),
        actions: [
          PopupMenuButton<_Sort>(
            icon: const Icon(Icons.sort),
            color: AppColors.surfaceAlt,
            onSelected: (s) => setState(() => _sort = s),
            itemBuilder: (_) => const [
              PopupMenuItem(value: _Sort.newest, child: Text('Newest')),
              PopupMenuItem(value: _Sort.invested, child: Text('Most invested')),
              PopupMenuItem(value: _Sort.score, child: Text('AI score')),
            ],
          ),
        ],
      ),
      floatingActionButton: me == null
          ? null
          : FloatingActionButton.extended(
              onPressed: () => _composeIdea(context),
              backgroundColor: AppColors.warning,
              icon: const Icon(Icons.lightbulb, color: Colors.black87),
              label: const Text('New idea',
                  style: TextStyle(color: Colors.black87)),
            ),
      body: ideasAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Error: $e')),
        data: (ideas) {
          final sorted = [...ideas];
          switch (_sort) {
            case _Sort.invested:
              sorted.sort((a, b) => b.invested.compareTo(a.invested));
              break;
            case _Sort.score:
              sorted.sort(
                  (a, b) => (b.aiScore ?? 0).compareTo(a.aiScore ?? 0));
              break;
            case _Sort.newest:
              break;
          }
          if (sorted.isEmpty) {
            return const Center(
              child: Padding(
                padding: EdgeInsets.all(40),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.lightbulb_outline,
                        size: 56, color: AppColors.warning),
                    SizedBox(height: 16),
                    Text('No ideas yet',
                        style: TextStyle(
                            fontSize: 18, fontWeight: FontWeight.w700)),
                    SizedBox(height: 8),
                    Text('Share a startup or project idea and get AI feedback.',
                        textAlign: TextAlign.center,
                        style: TextStyle(color: AppColors.textMuted)),
                  ],
                ),
              ),
            );
          }
          return ListView(
            padding: const EdgeInsets.only(bottom: 90),
            children: sorted.map((i) => _IdeaCard(idea: i)).toList(),
          );
        },
      ),
    );
  }

  Future<void> _composeIdea(BuildContext context) async {
    final me = ref.read(currentUserProvider).value;
    if (me == null) return;
    final controller = TextEditingController();
    IdeaScore? score;
    bool analyzing = false;

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheet) => Padding(
          padding: EdgeInsets.only(
              bottom: MediaQuery.of(ctx).viewInsets.bottom,
              left: 20,
              right: 20,
              top: 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Share an idea', style: AppTheme.brandTitle),
              const SizedBox(height: 12),
              TextField(
                controller: controller,
                maxLines: 4,
                minLines: 3,
                autofocus: true,
                decoration: const InputDecoration(
                    hintText: 'Describe your startup or project idea...'),
              ),
              if (score != null) ...[
                const SizedBox(height: 12),
                _AnalysisBox(score: score!),
              ],
              const SizedBox(height: 12),
              Row(
                children: [
                  OutlinedButton.icon(
                    onPressed: analyzing
                        ? null
                        : () async {
                            if (controller.text.trim().isEmpty) return;
                            setSheet(() => analyzing = true);
                            try {
                              final r = await ref
                                  .read(aiClientProvider)
                                  .scoreIdea(controller.text.trim());
                              setSheet(() => score = r);
                            } catch (_) {
                              if (ctx.mounted) {
                                showToast(ctx, 'AI unavailable.', error: true);
                              }
                            } finally {
                              setSheet(() => analyzing = false);
                            }
                          },
                    icon: analyzing
                        ? const SizedBox(
                            width: 14,
                            height: 14,
                            child: CircularProgressIndicator(strokeWidth: 2))
                        : const Icon(Icons.auto_awesome, size: 16),
                    label: const Text('Analyze'),
                    style: OutlinedButton.styleFrom(
                        foregroundColor: AppColors.primary,
                        side: const BorderSide(color: AppColors.primary)),
                  ),
                  const Spacer(),
                  ElevatedButton(
                    onPressed: () async {
                      final text = controller.text.trim();
                      if (text.isEmpty) return;
                      await ref.read(socialRepositoryProvider).createIdea({
                        'description': text,
                        'authorUid': me.uid,
                        'author': me.asAuthor.toMap(),
                        if (score != null) 'aiScore': score!.score,
                        if (score != null) 'strengths': score!.strengths,
                        if (score != null) 'weaknesses': score!.weaknesses,
                        if (score != null) 'competitors': score!.competitors,
                      });
                      if (ctx.mounted) Navigator.pop(ctx);
                    },
                    child: const Text('Post idea'),
                  ),
                ],
              ),
              const SizedBox(height: 12),
            ],
          ),
        ),
      ),
    );
  }
}

class _IdeaCard extends ConsumerWidget {
  final Idea idea;
  const _IdeaCard({required this.idea});

  Future<void> _invest(WidgetRef ref, BuildContext context) async {
    final me = ref.read(currentUserProvider).value;
    if (me == null) return;
    if (me.credits < 50) {
      showToast(context, 'Need 50 credits to invest.', error: true);
      return;
    }
    await ref.read(socialRepositoryProvider).investInIdea(idea.ideaId, 50);
    await ref.read(userRepositoryProvider).changeCredits(me.uid, -50);
    if (context.mounted) showToast(context, 'Invested 50 credits 🚀');
  }

  Future<void> _collab(WidgetRef ref, BuildContext context) async {
    final me = ref.read(currentUserProvider).value;
    if (me == null || me.uid == idea.authorUid) return;
    final target =
        await ref.read(userRepositoryProvider).fetchByUid(idea.authorUid);
    if (target == null) return;
    final cid = await ref
        .read(messageRepositoryProvider)
        .requestCollab(me, target, context: idea.description);
    if (context.mounted && cid != null) {
      showToast(context, 'Collab request sent!');
      context.push('/chat/${idea.authorUid}');
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final me = ref.watch(currentUserProvider).value;
    final isMine = me?.uid == idea.authorUid;
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                GestureDetector(
                  onTap: () =>
                      context.push('/profile/${idea.author.username}'),
                  child: Avatar(url: idea.author.avatar, size: 36),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(idea.author.displayName,
                          style:
                              const TextStyle(fontWeight: FontWeight.w600)),
                      Text('@${idea.author.username}',
                          style: const TextStyle(
                              fontSize: 12, color: AppColors.textMuted)),
                    ],
                  ),
                ),
                if (idea.aiScore != null) _ScoreRing(score: idea.aiScore!),
              ],
            ),
            const SizedBox(height: 10),
            Text(idea.description, style: const TextStyle(height: 1.4)),
            if (idea.strengths.isNotEmpty || idea.weaknesses.isNotEmpty) ...[
              const SizedBox(height: 10),
              _AnalysisBox(
                score: IdeaScore(
                  score: idea.aiScore ?? 0,
                  strengths: idea.strengths,
                  weaknesses: idea.weaknesses,
                  competitors: idea.competitors,
                ),
              ),
            ],
            const SizedBox(height: 10),
            Row(
              children: [
                Icon(Icons.trending_up,
                    size: 16, color: AppColors.success),
                const SizedBox(width: 4),
                Text('${idea.invested} invested',
                    style: const TextStyle(
                        fontSize: 13, color: AppColors.textMuted)),
                const Spacer(),
                if (!isMine) ...[
                  TextButton(
                    onPressed: () => _collab(ref, context),
                    child: const Text('Collab'),
                  ),
                  ElevatedButton(
                    onPressed: () => _invest(ref, context),
                    style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(horizontal: 14)),
                    child: const Text('Invest 50'),
                  ),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _ScoreRing extends StatelessWidget {
  final double score;
  const _ScoreRing({required this.score});
  @override
  Widget build(BuildContext context) {
    final color = score >= 7
        ? AppColors.success
        : (score >= 4 ? AppColors.warning : AppColors.danger);
    return Container(
      width: 44,
      height: 44,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        border: Border.all(color: color, width: 2.5),
      ),
      child: Text(score.toStringAsFixed(1),
          style: TextStyle(
              fontWeight: FontWeight.w700, color: color, fontSize: 13)),
    );
  }
}

class _AnalysisBox extends StatelessWidget {
  final IdeaScore score;
  const _AnalysisBox({required this.score});
  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.surfaceAlt,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            const Icon(Icons.auto_awesome, size: 14, color: AppColors.primary),
            const SizedBox(width: 6),
            Text('AI market score: ${score.score.toStringAsFixed(1)}/10',
                style: const TextStyle(
                    fontWeight: FontWeight.w600, fontSize: 13)),
          ]),
          for (final s in score.strengths)
            _row(Icons.check_circle, AppColors.success, s),
          for (final w in score.weaknesses)
            _row(Icons.warning_amber, AppColors.warning, w),
          if (score.competitors.isNotEmpty) ...[
            const SizedBox(height: 6),
            Text('Competitors: ${score.competitors.join(', ')}',
                style: const TextStyle(
                    fontSize: 12, color: AppColors.textMuted)),
          ],
        ],
      ),
    );
  }

  Widget _row(IconData icon, Color color, String text) => Padding(
        padding: const EdgeInsets.only(top: 4),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, size: 14, color: color),
            const SizedBox(width: 6),
            Expanded(
                child: Text(text, style: const TextStyle(fontSize: 12))),
          ],
        ),
      );
}
