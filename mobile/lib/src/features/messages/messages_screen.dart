import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:timeago/timeago.dart' as timeago;

import '../../core/theme.dart';
import '../../data/message_repository.dart';
import '../../data/user_repository.dart';
import '../../models/app_user.dart';
import '../../models/conversation.dart';
import '../../widgets/avatar.dart';

class MessagesScreen extends ConsumerWidget {
  const MessagesScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final me = ref.watch(currentUserProvider).value;
    final convosAsync = ref.watch(conversationsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Messages')),
      body: me == null
          ? const SizedBox.shrink()
          : convosAsync.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Center(child: Text('Error: $e')),
              data: (convos) {
                if (convos.isEmpty) {
                  return const Center(
                    child: Padding(
                      padding: EdgeInsets.all(40),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.forum_outlined,
                              size: 56, color: AppColors.primary),
                          SizedBox(height: 16),
                          Text('No conversations yet',
                              style: TextStyle(
                                  fontSize: 18, fontWeight: FontWeight.w700)),
                          SizedBox(height: 8),
                          Text(
                              'Message a developer from their profile to start chatting.',
                              textAlign: TextAlign.center,
                              style: TextStyle(color: AppColors.textMuted)),
                        ],
                      ),
                    ),
                  );
                }
                return ListView.builder(
                  itemCount: convos.length,
                  itemBuilder: (_, i) =>
                      _ConvoTile(convo: convos[i], me: me),
                );
              },
            ),
    );
  }
}

class _ConvoTile extends ConsumerWidget {
  final Conversation convo;
  final AppUser me;
  const _ConvoTile({required this.convo, required this.me});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final otherUid = convo.otherUid(me.uid);
    final otherAsync =
        ref.watch(userRepositoryProvider).watchProfile(otherUid);

    return StreamBuilder<AppUser?>(
      stream: otherAsync,
      builder: (context, snap) {
        final other = snap.data;
        return ListTile(
          onTap: () => context.push('/chat/$otherUid'),
          leading: Avatar(
              url: other?.avatar ?? '',
              size: 48,
              online: other?.isOnline ?? false),
          title: Row(
            children: [
              Flexible(
                child: Text(other?.displayName ?? '...',
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontWeight: FontWeight.w600)),
              ),
              if (convo.isCollab) ...[
                const SizedBox(width: 6),
                const Icon(Icons.handshake, size: 14, color: AppColors.success),
              ],
            ],
          ),
          subtitle: Text(
            '${convo.lastFrom == me.uid ? 'You: ' : ''}${convo.last}',
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(color: AppColors.textMuted),
          ),
          trailing: convo.updatedAtDate == null
              ? null
              : Text(timeago.format(convo.updatedAtDate!, locale: 'en_short'),
                  style: const TextStyle(
                      fontSize: 11, color: AppColors.textMuted)),
        );
      },
    );
  }
}
