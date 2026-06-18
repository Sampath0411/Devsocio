import 'dart:async';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:timeago/timeago.dart' as timeago;

import '../../core/constants.dart';
import '../../data/social_repository.dart';
import '../../data/user_repository.dart';
import '../../models/story.dart';
import '../../widgets/avatar.dart';

Future<void> showStoryViewer(BuildContext context, List<Story> stories) {
  return Navigator.of(context).push(MaterialPageRoute(
    fullscreenDialog: true,
    builder: (_) => StoryViewer(stories: stories),
  ));
}

class StoryViewer extends ConsumerStatefulWidget {
  final List<Story> stories;
  const StoryViewer({super.key, required this.stories});
  @override
  ConsumerState<StoryViewer> createState() => _StoryViewerState();
}

class _StoryViewerState extends ConsumerState<StoryViewer> {
  int _index = 0;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _markViewed();
    _scheduleNext();
  }

  void _scheduleNext() {
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
      _scheduleNext();
    } else {
      Navigator.of(context).maybePop();
    }
  }

  void _prev() {
    if (_index > 0) {
      setState(() => _index--);
      _scheduleNext();
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
              // Progress segments
              Padding(
                padding: const EdgeInsets.all(8),
                child: Row(
                  children: [
                    for (int i = 0; i < widget.stories.length; i++)
                      Expanded(
                        child: Container(
                          height: 3,
                          margin: const EdgeInsets.symmetric(horizontal: 2),
                          decoration: BoxDecoration(
                            color: i <= _index
                                ? Colors.white
                                : Colors.white24,
                            borderRadius: BorderRadius.circular(2),
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
                    Text(story.author.username,
                        style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w600)),
                    const SizedBox(width: 8),
                    if (story.createdAtDate != null)
                      Text(timeago.format(story.createdAtDate!),
                          style: const TextStyle(
                              color: Colors.white54, fontSize: 12)),
                    const Spacer(),
                    IconButton(
                      icon: const Icon(Icons.close, color: Colors.white),
                      onPressed: () => Navigator.of(context).maybePop(),
                    ),
                  ],
                ),
              ),
              // Body
              Expanded(
                child: Center(
                  child: SingleChildScrollView(
                    child: Padding(
                      padding: const EdgeInsets.all(24),
                      child: Column(
                        children: [
                          if (story.imageUrl != null &&
                              story.imageUrl!.isNotEmpty)
                            ClipRRect(
                              borderRadius: BorderRadius.circular(16),
                              child: CachedNetworkImage(imageUrl: story.imageUrl!),
                            ),
                          if (story.content != null &&
                              story.content!.isNotEmpty)
                            Padding(
                              padding: const EdgeInsets.only(top: 16),
                              child: Text(
                                story.content!,
                                textAlign: TextAlign.center,
                                style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 22,
                                    fontWeight: FontWeight.w600),
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
                padding: const EdgeInsets.symmetric(vertical: 12),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    for (final emoji in kStoryReactions)
                      GestureDetector(
                        onTap: () => _react(emoji),
                        child: Text(emoji,
                            style: const TextStyle(fontSize: 30)),
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
