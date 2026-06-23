import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:timeago/timeago.dart' as timeago;

import '../../core/theme.dart';
import '../../data/firebase_providers.dart';
import '../../data/message_repository.dart';
import '../../data/user_repository.dart';
import '../../models/app_user.dart';
import '../../models/conversation.dart';
import '../../widgets/avatar.dart';
import '../../widgets/link_preview_card.dart';
import '../../widgets/ui.dart';

/// Instagram-style emoji reactions for quick message reactions.
const _kReactionEmojis = ['❤️', '😂', '🔥', '😮', '😢', '🙏'];

class ChatScreen extends ConsumerStatefulWidget {
  final String otherUid;
  const ChatScreen({super.key, required this.otherUid});
  @override
  ConsumerState<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends ConsumerState<ChatScreen> {
  final _input = TextEditingController();
  final _scrollController = ScrollController();
  final _focusNode = FocusNode();
  Timer? _typingTimer;
  bool _ensured = false;

  // Reply state
  Message? _replyToMessage;


  String get _myUid => ref.read(firebaseAuthProvider).currentUser?.uid ?? '';
  String get _cid => convoId(_myUid, widget.otherUid);

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _ensure());
  }

  Future<void> _ensure() async {
    if (_ensured || _myUid.isEmpty) return;
    _ensured = true;
    final repo = ref.read(messageRepositoryProvider);
    await repo.ensureConversation(_myUid, widget.otherUid);
    await repo.markRead(_myUid, widget.otherUid);
  }

  @override
  void dispose() {
    _input.dispose();
    _scrollController.dispose();
    _focusNode.dispose();
    _typingTimer?.cancel();
    if (_myUid.isNotEmpty) {
      ref
          .read(messageRepositoryProvider)
          .setTyping(_myUid, widget.otherUid, false);
    }
    super.dispose();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          0,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  void _onChanged(String _) {
    if (_myUid.isEmpty) return;
    final repo = ref.read(messageRepositoryProvider);
    repo.setTyping(_myUid, widget.otherUid, true);
    _typingTimer?.cancel();
    _typingTimer = Timer(
        const Duration(seconds: 3),
        () => repo.setTyping(_myUid, widget.otherUid, false));
  }

  Future<void> _send() async {
    final text = _input.text.trim();
    if (text.isEmpty) return;
    if (_myUid.isEmpty) {
      showToast(context, 'Still signing in — try again in a moment.',
          error: true);
      return;
    }
    if (_myUid == widget.otherUid) {
      showToast(context, 'You can\'t message yourself.', error: true);
      return;
    }

    // Build reply metadata
    Map<String, dynamic>? replyMeta;
    if (_replyToMessage != null && !_replyToMessage!.deleted) {
      final displayName = _replyToMessage!.from == _myUid ? 'You' : 'Other';
      replyMeta = {
        'from': _replyToMessage!.from,
        'text': _replyToMessage!.text.length > 80
            ? '${_replyToMessage!.text.substring(0, 80)}…'
            : _replyToMessage!.text,
        'fromName': displayName,
      };
    }

    _input.clear();
    final replyMsg = _replyToMessage;
    setState(() => _replyToMessage = null);
    try {
      final repo = ref.read(messageRepositoryProvider);
      await repo.ensureConversation(_myUid, widget.otherUid);
      await repo.sendMessage(_myUid, widget.otherUid, text,
          replyTo: replyMeta);
      repo.setTyping(_myUid, widget.otherUid, false);
      _scrollToBottom();
    } catch (e) {
      if (mounted) {
        _input.text = text;
        setState(() => _replyToMessage = replyMsg);
        showToast(context, 'Could not send: $e', error: true);
      }
    }
  }

  void _onReply(Message m) {
    setState(() => _replyToMessage = m);
    _focusNode.requestFocus();
  }

  void _cancelReply() {
    setState(() => _replyToMessage = null);
  }

  Future<void> _onForward(Message m) async {
    final usersAsync = await ref.read(usersProvider.future);
    final me = ref.read(currentUserProvider).value;
    final candidates = usersAsync
        .where((u) => u.uid != me?.uid)
        .take(30)
        .toList();

    if (!mounted) return;
    final target = await showModalBottomSheet<AppUser>(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => _ForwardUserPicker(users: candidates),
    );

    final me_ = me;
    if (target != null && mounted && me_ != null) {
      await ref
          .read(messageRepositoryProvider)
          .forwardMessage(me_, target.uid, m.text);
      if (mounted) {
        showToast(context, 'Forwarded to ${target.displayName}');
      }
    }
  }

  Future<void> _onUnsend(Message m) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surface,
        title: const Text('Unsend message?'),
        content: const Text(
            'This will remove the message for everyone.'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Cancel')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Unsend',
                style: TextStyle(color: AppColors.danger)),
          ),
        ],
      ),
    );
    if (confirm == true && context.mounted) {
      await ref
          .read(messageRepositoryProvider)
          .unsendMessage(_cid, m.id);
    }
  }

  Future<void> _onReact(String cid, String messageId, String emoji) async {
    await ref
        .read(messageRepositoryProvider)
        .reactToMessage(cid, messageId, _myUid, emoji);
  }

  @override
  Widget build(BuildContext context) {
    ref.listen(threadProvider(_cid), (_, __) {
      if (_myUid.isNotEmpty) {
        ref
            .read(messageRepositoryProvider)
            .markRead(_myUid, widget.otherUid);
      }
    });

    final otherStream =
        ref.watch(userRepositoryProvider).watchProfile(widget.otherUid);

    return StreamBuilder<AppUser?>(
      stream: otherStream,
      builder: (context, snap) {
        final other = snap.data;
        return Scaffold(
          appBar: AppBar(
            titleSpacing: 0,
            title: Row(
              children: [
                Avatar(
                    url: other?.avatar ?? '',
                    size: 36,
                    online: other?.isOnline ?? false),
                const SizedBox(width: 10),
                Expanded(
                  child: GestureDetector(
                    onTap: other == null
                        ? null
                        : () =>
                            context.push('/profile/${other.username}'),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(other?.displayName ?? '...',
                            style: const TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.w600)),
                        Text(
                            (other?.isOnline ?? false)
                                ? 'Active now'
                                : 'Offline',
                            style: TextStyle(
                                fontSize: 11,
                                color: (other?.isOnline ?? false)
                                    ? AppColors.success
                                    : AppColors.textMuted)),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
          body: Column(
            children: [
              Expanded(
                  child: _MessageList(
                      cid: _cid,
                      myUid: _myUid,
                      otherUid: widget.otherUid,
                      scrollController: _scrollController,
                      onNewMessages: _scrollToBottom,
                      onReply: _onReply,
                      onForward: _onForward,
                      onUnsend: _onUnsend,
                      onReact: _onReact)),
              _TypingIndicator(cid: _cid, otherUid: widget.otherUid),
              _CollabBanner(cid: _cid, myUid: _myUid),
              // Reply preview bar
              if (_replyToMessage != null && !_replyToMessage!.deleted)
                _ReplyPreview(
                  message: _replyToMessage!,
                  myUid: _myUid,
                  onCancel: _cancelReply,
                ),
              _Composer(
                  controller: _input,
                  focusNode: _focusNode,
                  onChanged: _onChanged,
                  onSend: _send),
            ],
          ),
        );
      },
    );
  }
}

// ─────────────────────────────────────────────
// REPLY PREVIEW BAR
// ─────────────────────────────────────────────
class _ReplyPreview extends StatelessWidget {
  final Message message;
  final String myUid;
  final VoidCallback onCancel;
  const _ReplyPreview({
    required this.message,
    required this.myUid,
    required this.onCancel,
  });

  @override
  Widget build(BuildContext context) {
    final isMine = message.from == myUid;
    return Container(
      padding: const EdgeInsets.fromLTRB(12, 8, 8, 0),
      decoration: BoxDecoration(
        color: AppColors.surface,
        border: Border(
          top: BorderSide(
              color: AppColors.messagesPrimary.withValues(alpha: 0.2)),
        ),
      ),
      child: Row(
        children: [
          Container(
            width: 3,
            height: 40,
            decoration: BoxDecoration(
              gradient: AppColors.gradientMessages,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  isMine ? 'You' : 'Other',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: AppColors.messagesPrimary,
                  ),
                ),
                Text(
                  message.text.length > 50
                      ? '${message.text.substring(0, 50)}…'
                      : message.text,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                      fontSize: 13, color: AppColors.textMuted),
                ),
              ],
            ),
          ),
          IconButton(
            icon: const Icon(Icons.close, size: 18),
            onPressed: onCancel,
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────
// FORWARD USER PICKER
// ─────────────────────────────────────────────
class _ForwardUserPicker extends ConsumerWidget {
  final List<AppUser> users;
  const _ForwardUserPicker({required this.users});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return DraggableScrollableSheet(
      initialChildSize: 0.6,
      minChildSize: 0.3,
      maxChildSize: 0.85,
      expand: false,
      builder: (_, scrollController) => Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
            child: Row(
              children: [
                Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: AppColors.border,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ],
            ),
          ),
          const Padding(
            padding: EdgeInsets.fromLTRB(20, 0, 20, 12),
            child: Text('Forward to…',
                style: TextStyle(
                    fontSize: 18, fontWeight: FontWeight.w700)),
          ),
          Expanded(
            child: ListView.builder(
              controller: scrollController,
              itemCount: users.length,
              itemBuilder: (_, i) {
                final u = users[i];
                return ListTile(
                  leading: Avatar(url: u.avatar, size: 44),
                  title: Text(u.displayName),
                  subtitle: Text('@${u.username}',
                      style: const TextStyle(
                          color: AppColors.textMuted, fontSize: 12)),
                  onTap: () => Navigator.pop(context, u),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────
// COMPOSER
// ─────────────────────────────────────────────
class _Composer extends StatelessWidget {
  final TextEditingController controller;
  final FocusNode focusNode;
  final ValueChanged<String> onChanged;
  final VoidCallback onSend;
  const _Composer({
    required this.controller,
    required this.focusNode,
    required this.onChanged,
    required this.onSend,
  });

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      child: Container(
        padding: const EdgeInsets.fromLTRB(12, 8, 8, 8),
        decoration: BoxDecoration(
          color: AppColors.surface,
          border: Border(
            top: BorderSide(
              color: AppColors.messagesPrimary.withValues(alpha: 0.2),
            ),
          ),
        ),
        child: Row(
          children: [
            Expanded(
              child: TextField(
                controller: controller,
                focusNode: focusNode,
                onChanged: onChanged,
                minLines: 1,
                maxLines: 5,
                textCapitalization: TextCapitalization.sentences,
                decoration: InputDecoration(
                  hintText: 'Message...',
                  filled: true,
                  fillColor: AppColors.surfaceAlt,
                  contentPadding: const EdgeInsets.symmetric(
                      horizontal: 16, vertical: 10),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(24),
                    borderSide: BorderSide(
                      color: AppColors.messagesPrimary
                          .withValues(alpha: 0.3),
                    ),
                  ),
                  focusedBorder: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(24),
                    borderSide: BorderSide(
                      color: AppColors.messagesPrimary,
                      width: 1.5,
                    ),
                  ),
                ),
                onSubmitted: (_) => onSend(),
              ),
            ),
            const SizedBox(width: 6),
            Material(
              color: AppColors.messagesPrimary,
              shape: const CircleBorder(),
              child: InkWell(
                customBorder: const CircleBorder(),
                onTap: onSend,
                child: const Padding(
                  padding: EdgeInsets.all(10),
                  child:
                      Icon(Icons.send, color: Colors.white, size: 22),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────
// MESSAGE LIST
// ─────────────────────────────────────────────
class _MessageList extends ConsumerStatefulWidget {
  final String cid;
  final String myUid;
  final String otherUid;
  final ScrollController scrollController;
  final VoidCallback onNewMessages;
  final void Function(Message) onReply;
  final void Function(Message) onForward;
  final void Function(Message) onUnsend;
  final void Function(String cid, String messageId, String emoji) onReact;

  const _MessageList({
    required this.cid,
    required this.myUid,
    required this.otherUid,
    required this.scrollController,
    required this.onNewMessages,
    required this.onReply,
    required this.onForward,
    required this.onUnsend,
    required this.onReact,
  });

  @override
  ConsumerState<_MessageList> createState() => _MessageListState();
}

class _MessageListState extends ConsumerState<_MessageList> {
  int _prevCount = 0;

  @override
  Widget build(BuildContext context) {
    final thread = ref.watch(threadProvider(widget.cid));
    final convo = ref.watch(conversationProvider(widget.cid)).value;
    final messages = thread.value ?? const [];

    if (messages.length != _prevCount) {
      _prevCount = messages.length;
      widget.onNewMessages();
    }

    if (messages.isEmpty) {
      return ListView(
        controller: widget.scrollController,
        children: [
          const SizedBox(height: 120),
          Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    gradient: AppColors.gradientMessages,
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.messagesPrimary
                            .withValues(alpha: 0.3),
                        blurRadius: 20,
                        spreadRadius: 5,
                      ),
                    ],
                  ),
                  child: const Icon(Icons.chat, color: Colors.white, size: 32),
                ),
                const SizedBox(height: 16),
                const Text('Say hi 👋',
                    style: TextStyle(
                        color: AppColors.textMuted,
                        fontSize: 16,
                        fontWeight: FontWeight.w500)),
              ],
            ),
          ),
        ],
      );
    }

    int lastMineIdx = -1;
    for (var i = 0; i < messages.length; i++) {
      if (messages[i].from == widget.myUid) lastMineIdx = i;
    }
    final otherReadAt = convo?.readAt(widget.otherUid);
    final lastMine = lastMineIdx >= 0 ? messages[lastMineIdx] : null;
    final seen = lastMine != null &&
        otherReadAt != null &&
        lastMine.createdAtDate != null &&
        !otherReadAt.isBefore(lastMine.createdAtDate!);

    return ListView.builder(
      controller: widget.scrollController,
      reverse: true,
      padding: const EdgeInsets.fromLTRB(12, 12, 12, 4),
      itemCount: messages.length,
      itemBuilder: (_, i) {
        final idx = messages.length - 1 - i;
        final m = messages[idx];
        final mine = m.from == widget.myUid;
        final showSeen = mine && idx == lastMineIdx && seen;

        return _MessageBubble(
          key: ValueKey(m.id),
          message: m,
          mine: mine,
          showSeen: showSeen,
          myUid: widget.myUid,
          createdAt: m.createdAtDate,
          onLongPress: () {
            if (m.deleted) return;
            _showBubbleActions(m);
          },
        );
      },
    );
  }

  void _showBubbleActions(Message m) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      barrierColor: Colors.black54,
      builder: (ctx) => _MessageActions(
        message: m,
        mine: m.from == widget.myUid,
        onReply: () {
          Navigator.pop(ctx);
          widget.onReply(m);
        },
        onForward: () {
          Navigator.pop(ctx);
          widget.onForward(m);
        },
        onUnsend: m.from == widget.myUid
            ? () {
                Navigator.pop(ctx);
                widget.onUnsend(m);
              }
            : null,
        onReact: (emoji) {
          widget.onReact(widget.cid, m.id, emoji);
        },
      ),
    );
  }
}

// ─────────────────────────────────────────────
// MESSAGE BUBBLE
// ─────────────────────────────────────────────
class _MessageBubble extends StatefulWidget {
  final Message message;
  final bool mine;
  final bool showSeen;
  final String myUid;
  final DateTime? createdAt;
  final VoidCallback onLongPress;

  const _MessageBubble({
    super.key,
    required this.message,
    required this.mine,
    required this.showSeen,
    required this.myUid,
    required this.createdAt,
    required this.onLongPress,
  });

  @override
  State<_MessageBubble> createState() => _MessageBubbleState();
}

class _MessageBubbleState extends State<_MessageBubble>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 300),
    );
    _controller.forward();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final m = widget.message;

    // Deleted message placeholder
    if (m.deleted) {
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Row(
          mainAxisAlignment:
              widget.mine ? MainAxisAlignment.end : MainAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: AppColors.surfaceAlt.withValues(alpha: 0.4),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.not_interested,
                      size: 14, color: AppColors.textMuted),
                  const SizedBox(width: 6),
                  Text(
                      widget.mine
                          ? 'You unsent this message'
                          : 'Message unsent',
                      style: const TextStyle(
                          fontSize: 12,
                          fontStyle: FontStyle.italic,
                          color: AppColors.textMuted)),
                ],
              ),
            ),
          ],
        ),
      );
    }

    return Column(
      crossAxisAlignment:
          widget.mine ? CrossAxisAlignment.end : CrossAxisAlignment.start,
      children: [
        // Reply preview inside bubble
        if (m.replyTo != null)
          Container(
            margin: const EdgeInsets.only(bottom: 6),
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: (widget.mine
                      ? Colors.white
                      : AppColors.messagesPrimary)
                  .withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(8),
              border: Border(
                left: BorderSide(
                  color: widget.mine
                      ? Colors.white54
                      : AppColors.messagesPrimary,
                  width: 3,
                ),
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  m.replyTo!.fromName,
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: widget.mine
                        ? Colors.white70
                        : AppColors.messagesPrimary,
                  ),
                ),
                Text(
                  m.replyTo!.text,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 12,
                    color: widget.mine
                        ? Colors.white60
                        : AppColors.textMuted,
                  ),
                ),
              ],
            ),
          ),

        // Main bubble
        GestureDetector(
          onLongPress: widget.onLongPress,
          child: Container(
            constraints: BoxConstraints(
                maxWidth: MediaQuery.of(context).size.width * 0.74),
            margin: const EdgeInsets.symmetric(vertical: 2),
            padding:
                const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              gradient: widget.mine
                  ? AppColors.gradientMessages
                  : LinearGradient(
                      colors: [
                        AppColors.surfaceAlt,
                        AppColors.surfaceAlt.withValues(alpha: 0.8),
                      ],
                    ),
              borderRadius: BorderRadius.only(
                topLeft: const Radius.circular(18),
                topRight: const Radius.circular(18),
                bottomLeft: Radius.circular(widget.mine ? 18 : 4),
                bottomRight: Radius.circular(widget.mine ? 4 : 18),
              ),
              boxShadow: widget.mine
                  ? [
                      BoxShadow(
                        color: AppColors.messagesPrimary
                            .withValues(alpha: 0.2),
                        blurRadius: 8,
                        spreadRadius: 1,
                      ),
                    ]
                  : null,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(m.text,
                    style: TextStyle(
                        color: widget.mine
                            ? Colors.white
                            : AppColors.textPrimary,
                        height: 1.3)),
                // Link preview for URLs in messages
                if (m.text.contains('http') && !m.deleted)
                  LinkPreviewCard(text: m.text),
                // Reactions display
                if (m.reactions.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  _ReactionsDisplay(reactions: m.reactions),
                ],
              ],
            ),
          ),
        ),

        // Seen receipt
        if (widget.showSeen)
          Padding(
            padding: const EdgeInsets.only(right: 4, top: 2, bottom: 4),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.check_circle,
                    size: 12, color: AppColors.messagesPrimary),
                const SizedBox(width: 4),
                Text(
                  widget.createdAt == null
                      ? 'Seen'
                      : 'Seen ${timeago.format(widget.createdAt!)}',
                  style: const TextStyle(
                      fontSize: 11, color: AppColors.textMuted),
                ),
              ],
            ),
          ),
      ],
    );
  }
}

// ─────────────────────────────────────────────
// REACTIONS DISPLAY (emoji pills on messages)
// ─────────────────────────────────────────────
class _ReactionsDisplay extends StatelessWidget {
  final Map<String, String> reactions;
  const _ReactionsDisplay({required this.reactions});

  @override
  Widget build(BuildContext context) {
    final uniqueEmojis = reactions.values.toSet().toList();
    if (uniqueEmojis.isEmpty) return const SizedBox.shrink();

    return Align(
      alignment: Alignment.centerRight,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
        decoration: BoxDecoration(
          color: AppColors.bg.withValues(alpha: 0.5),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
              color: AppColors.border.withValues(alpha: 0.3)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            for (final emoji in uniqueEmojis.take(3))
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 1),
                child: Text(emoji, style: const TextStyle(fontSize: 14)),
              ),
            if (uniqueEmojis.length > 3)
              Text('+${uniqueEmojis.length - 3}',
                  style: TextStyle(
                      fontSize: 10, color: AppColors.textMuted)),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────
// MESSAGE CONTEXT MENU (Reply, Forward, Unsend)
// ─────────────────────────────────────────────
class _MessageActions extends StatelessWidget {
  final Message message;
  final bool mine;
  final VoidCallback onReply;
  final VoidCallback onForward;
  final VoidCallback? onUnsend;
  final void Function(String) onReact;

  const _MessageActions({
    required this.message,
    required this.mine,
    required this.onReply,
    required this.onForward,
    required this.onUnsend,
    required this.onReact,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 24),
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 16),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.3),
              blurRadius: 20,
              spreadRadius: 2,
            ),
          ],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Quick reactions row
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  for (final emoji in _kReactionEmojis)
                    GestureDetector(
                      onTap: () {
                        Navigator.pop(context);
                        onReact(emoji);
                      },
                      child: Text(emoji,
                          style: const TextStyle(fontSize: 32)),
                    ),
                ],
              ),
            ),
            const Divider(color: AppColors.border),
            ListTile(
              leading: const Icon(Icons.reply, color: AppColors.messagesPrimary),
              title: const Text('Reply'),
              onTap: onReply,
            ),
            ListTile(
              leading: const Icon(Icons.forward, color: AppColors.messagesPrimary),
              title: const Text('Forward'),
              onTap: onForward,
            ),
            if (mine)
              ListTile(
                leading:
                    const Icon(Icons.delete_outline, color: AppColors.danger),
                title: const Text('Unsend',
                    style: TextStyle(color: AppColors.danger)),
                onTap: onUnsend,
              ),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────
// TYPING INDICATOR (unchanged)
// ─────────────────────────────────────────────
class _TypingIndicator extends ConsumerWidget {
  final String cid;
  final String otherUid;
  const _TypingIndicator({required this.cid, required this.otherUid});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final convo = ref.watch(conversationProvider(cid)).value;
    if (convo == null || !convo.isTyping(otherUid)) {
      return const SizedBox.shrink();
    }
    return Container(
      alignment: Alignment.centerLeft,
      padding: const EdgeInsets.only(left: 18, bottom: 6),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(
          color: AppColors.surfaceAlt,
          borderRadius: BorderRadius.circular(18),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            _TypingDot(delay: 0),
            const SizedBox(width: 4),
            _TypingDot(delay: 200),
            const SizedBox(width: 4),
            _TypingDot(delay: 400),
          ],
        ),
      ),
    );
  }
}

class _TypingDot extends StatefulWidget {
  final int delay;
  const _TypingDot({required this.delay});

  @override
  State<_TypingDot> createState() => _TypingDotState();
}

class _TypingDotState extends State<_TypingDot>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    );
    _animation = Tween<double>(begin: 0.4, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
    Future.delayed(Duration(milliseconds: widget.delay),
        () => _controller.repeat(reverse: true));
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _animation,
      builder: (_, child) => Opacity(
        opacity: _animation.value,
        child: child,
      ),
      child: Container(
        width: 6,
        height: 6,
        decoration: const BoxDecoration(
          color: AppColors.textMuted,
          shape: BoxShape.circle,
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────
// COLLAB BANNER (unchanged)
// ─────────────────────────────────────────────
class _CollabBanner extends ConsumerWidget {
  final String cid;
  final String myUid;
  const _CollabBanner({required this.cid, required this.myUid});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final convo = ref.watch(conversationProvider(cid)).value;
    if (convo == null || !convo.isCollab || convo.collabAccepted) {
      return const SizedBox.shrink();
    }
    final iAmInitiator = convo.lastFrom == myUid;
    if (iAmInitiator) {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.all(10),
        color: AppColors.surfaceAlt,
        child: const Text('Collab request sent — awaiting response.',
            textAlign: TextAlign.center,
            style: TextStyle(color: AppColors.textMuted, fontSize: 13)),
      );
    }
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            AppColors.success.withValues(alpha: 0.15),
            AppColors.success.withValues(alpha: 0.05),
          ],
        ),
      ),
      child: Row(
        children: [
          const Icon(Icons.handshake, color: AppColors.success, size: 18),
          const SizedBox(width: 8),
          const Expanded(child: Text('Collab request')),
          ElevatedButton(
            onPressed: () =>
                ref.read(messageRepositoryProvider).acceptCollab(cid),
            style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.success,
                padding: const EdgeInsets.symmetric(horizontal: 16)),
            child: const Text('Accept'),
          ),
        ],
      ),
    );
  }
}
