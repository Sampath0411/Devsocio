import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:timeago/timeago.dart' as timeago;

import '../../core/constants.dart';
import '../../data/social_repository.dart';
import '../../data/user_repository.dart';
import '../../models/story.dart';
import '../../widgets/app_image.dart';
import '../../widgets/avatar.dart';

Future<void> showStoryViewer(BuildContext context, List<Story> stories) {
  return Navigator.of(context).push(PageRouteBuilder(
    fullscreenDialog: true,
    opaque: false,
    pageBuilder: (_, __, ___) => StoryViewer(stories: stories),
    transitionsBuilder: (_, anim, __, child) {
      return FadeTransition(
        opacity: anim,
        child: ScaleTransition(
          scale: Tween<double>(begin: 1.05, end: 1.0).animate(
            CurvedAnimation(parent: anim, curve: Curves.easeOut),
          ),
          child: child,
        ),
      );
    },
  ));
}

class StoryViewer extends ConsumerStatefulWidget {
  final List<Story> stories;
  const StoryViewer({super.key, required this.stories});
  @override
  ConsumerState<StoryViewer> createState() => _StoryViewerState();
}

class _StoryViewerState extends ConsumerState<StoryViewer>
    with TickerProviderStateMixin {
  int _index = 0;
  Timer? _timer;
  late AnimationController _progressController;

  @override
  void initState() {
    super.initState();
    _progressController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 5),
    );
    _markViewed();
    _startProgress();
  }

  void _startProgress() {
    _progressController.reset();
    _progressController.forward();
    _timer?.cancel();
    _timer = Timer(const Duration(seconds: 5), _next);
  }

  void _markViewed() {
    final me = ref.read(currentUserProvider).value;
    if (me == null) return;
    ref
        .read(socialRepositoryProvider)
        .markStoryViewed(widget.stories[_index].storyId, me.uid);
  }

  void _next() {
    if (_index < widget.stories.length - 1) {
      setState(() => _index++);
      _markViewed();
      _startProgress();
    } else {
      Navigator.of(context).maybePop();
    }
  }

  void _prev() {
    if (_index > 0) {
      setState(() => _index--);
      _startProgress();
    }
  }

  Future<void> _react(String emoji) async {
    final me = ref.read(currentUserProvider).value;
    if (me == null) return;
    await ref
        .read(socialRepositoryProvider)
        .reactToStory(widget.stories[_index].storyId, emoji, me.uid);
  }

  @override
  void dispose() {
    _timer?.cancel();
    _progressController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final story = widget.stories[_index];
    return Scaffold(
      backgroundColor: Colors.black,
      body: GestureDetector(
        onTapUp: (d) {
          final w = MediaQuery.of(context).size.width;
          if (d.globalPosition.dx < w / 3) {
            _prev();
          } else {
            _next();
          }
        },
        child: SafeArea(
          child: Column(
            children: [
              // Animated progress segments
              Padding(
                padding: const EdgeInsets.all(8),
                child: Row(
                  children: [
                    for (int i = 0; i < widget.stories.length; i++)
                      Expanded(
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 2),
                          child: i == _index
                              ? AnimatedBuilder(
                                  animation: _progressController,
                                  builder: (_, child) => ClipRRect(
                                    borderRadius: BorderRadius.circular(2),
                                    child: LinearProgressIndicator(
                                      value: _progressController.value,
                                      backgroundColor: Colors.white24,
                                      valueColor: const AlwaysStoppedAnimation<Color>(
                                          Colors.white),
                                      minHeight: 3,
                                    ),
                                  ),
                                )
                              : Container(
                                  height: 3,
                                  decoration: BoxDecoration(
                                    color: i < _index
                                        ? Colors.white
                                        : Colors.white24,
                                    borderRadius: BorderRadius.circular(2),
                                  ),
                                ),
                        ),
                      ),
                  ],
                ),
              ),
              // Header
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                child: Row(
                  children: [
                    Avatar(url: story.author.avatar, size: 36),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(story.author.username,
                              style: const TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.w600,
                                  fontSize: 14)),
                          if (story.createdAtDate != null)
                            Text(timeago.format(story.createdAtDate!),
                                style: const TextStyle(
                                    color: Colors.white54, fontSize: 11)),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close, color: Colors.white),
                      onPressed: () => Navigator.of(context).maybePop(),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 8),
              // Body
              Expanded(
                child: Center(
                  child: SingleChildScrollView(
                    child: Padding(
                      padding: const EdgeInsets.all(24),
                      child: Column(
                        children: [
                          if (story.imageUrl != null && story.imageUrl!.isNotEmpty)
                            Container(
                              constraints: BoxConstraints(
                                maxHeight: MediaQuery.of(context).size.height * 0.5,
                              ),
                              child: ClipRRect(
                                borderRadius: BorderRadius.circular(16),
                                child: SmartImage(
                                  url: story.imageUrl,
                                  fit: BoxFit.contain,
                                  backgroundColor: Colors.transparent,
                                ),
                              ),
                            ),
                          if (story.content != null && story.content!.isNotEmpty)
                            Padding(
                              padding: const EdgeInsets.only(top: 16),
                              child: Text(
                                story.content!,
                                textAlign: TextAlign.center,
                                style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 22,
                                    fontWeight: FontWeight.w600,
                                    height: 1.4),
                              ),
                            ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
              // Reaction row
              Container(
                padding: const EdgeInsets.symmetric(vertical: 16),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      Colors.transparent,
                      Colors.black.withValues(alpha: 0.5),
                    ],
                  ),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    for (final emoji in kStoryReactions)
                      _ReactionButton(
                        emoji: emoji,
                        onTap: () => _react(emoji),
                      ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ReactionButton extends StatefulWidget {
  final String emoji;
  final VoidCallback onTap;
  const _ReactionButton({required this.emoji, required this.onTap});

  @override
  State<_ReactionButton> createState() => _ReactionButtonState();
}

class _ReactionButtonState extends State<_ReactionButton>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scale;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 300),
    );
    _scale = Tween<double>(begin: 1.0, end: 1.3).animate(
      CurvedAnimation(parent: _controller, curve: Curves.elasticOut),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _onTap() {
    _controller.forward().then((_) => _controller.reverse());
    widget.onTap();
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: _onTap,
      child: AnimatedBuilder(
        animation: _scale,
        builder: (_, child) => Transform.scale(
          scale: _scale.value,
          child: child,
        ),
        child: Text(widget.emoji, style: const TextStyle(fontSize: 32)),
      ),
    );
  }
}
