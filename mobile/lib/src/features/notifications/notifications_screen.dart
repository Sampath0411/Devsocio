import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:timeago/timeago.dart' as timeago;

import '../../core/theme.dart';
import '../../data/social_repository.dart';
import '../../data/user_repository.dart';
import '../../models/app_notification.dart';
import '../../widgets/avatar.dart';

class NotificationsScreen extends ConsumerStatefulWidget {
  const NotificationsScreen({super.key});
  @override
  ConsumerState<NotificationsScreen> createState() =>
      _NotificationsScreenState();
}

class _NotificationsScreenState extends ConsumerState<NotificationsScreen> {
  @override
  void initState() {
    super.initState();
    // Mark all read shortly after the screen opens (mirrors web behaviour).
    WidgetsBinding.instance.addPostFrameCallback((_) => _markRead());
  }

  void _markRead() {
    final me = ref.read(currentUserProvider).value;
    final items = ref.read(notificationsProvider).value;
    if (me != null && items != null) {
      ref.read(socialRepositoryProvider).markAllRead(me.uid, items);
    }
  }

  IconData _iconFor(String type) {
    switch (type) {
      case 'like':
        return Icons.favorite;
      case 'follow':
        return Icons.person_add;
      case 'comment':
        return Icons.mode_comment;
      case 'mention':
        return Icons.alternate_email;
      case 'collab':
        return Icons.handshake;
      case 'credits':
        return Icons.bolt;
      default:
        return Icons.notifications;
    }
  }

  Color _colorFor(String type) {
    switch (type) {
      case 'like':
        return AppColors.danger;
      case 'collab':
        return AppColors.success;
      case 'credits':
        return AppColors.warning;
      default:
        return AppColors.primary;
    }
  }

  void _onTap(AppNotification n) {
    if (n.postId != null) {
      context.push('/post/${n.postId}');
    } else if (n.convoId != null) {
      context.push('/chat/${n.actorUid}');
    } else if (n.actor.username.isNotEmpty) {
      context.push('/profile/${n.actor.username}');
    }
  }

  @override
  Widget build(BuildContext context) {
    final notifsAsync = ref.watch(notificationsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Activity')),
      body: notifsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Error: $e')),
        data: (notifs) {
          if (notifs.isEmpty) {
            return const Center(
              child: Padding(
                padding: EdgeInsets.all(40),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.notifications_none,
                        size: 56, color: AppColors.primary),
                    SizedBox(height: 16),
                    Text('No activity yet',
                        style: TextStyle(
                            fontSize: 18, fontWeight: FontWeight.w700)),
                    SizedBox(height: 8),
                    Text('Likes, follows, comments and collabs show up here.',
                        textAlign: TextAlign.center,
                        style: TextStyle(color: AppColors.textMuted)),
                  ],
                ),
              ),
            );
          }
          return ListView.builder(
            itemCount: notifs.length,
            itemBuilder: (_, i) {
              final n = notifs[i];
              return ListTile(
                onTap: () => _onTap(n),
                tileColor:
                    n.read ? null : AppColors.primary.withValues(alpha: 0.06),
                leading: Stack(
                  children: [
                    Avatar(url: n.actor.avatar, size: 44),
                    Positioned(
                      right: 0,
                      bottom: 0,
                      child: Container(
                        padding: const EdgeInsets.all(3),
                        decoration: BoxDecoration(
                          color: _colorFor(n.type),
                          shape: BoxShape.circle,
                          border: Border.all(color: AppColors.bg, width: 2),
                        ),
                        child: Icon(_iconFor(n.type),
                            size: 11, color: Colors.white),
                      ),
                    ),
                  ],
                ),
                title: RichText(
                  text: TextSpan(
                    style: const TextStyle(
                        color: AppColors.textPrimary, fontSize: 14),
                    children: [
                      TextSpan(
                          text: n.actor.displayName.isEmpty
                              ? 'Someone '
                              : '${n.actor.displayName} ',
                          style:
                              const TextStyle(fontWeight: FontWeight.w600)),
                      TextSpan(text: n.text),
                    ],
                  ),
                ),
                subtitle: n.createdAtDate == null
                    ? null
                    : Text(timeago.format(n.createdAtDate!),
                        style: const TextStyle(
                            fontSize: 12, color: AppColors.textMuted)),
                trailing: n.read
                    ? null
                    : Container(
                        width: 8,
                        height: 8,
                        decoration: const BoxDecoration(
                            color: AppColors.accent, shape: BoxShape.circle)),
              );
            },
          );
        },
      ),
    );
  }
}
