import 'app_user.dart';
import 'timestamp_util.dart';

/// stories/{storyId} — 24h ephemeral.
class Story {
  final String storyId;
  final String authorUid;
  final AuthorRef author;
  final String? imageUrl;
  final String? content;
  final Map<String, dynamic> reactions; // uid -> emoji
  final List<String> viewers;
  final dynamic createdAt;

  const Story({
    required this.storyId,
    required this.authorUid,
    required this.author,
    required this.imageUrl,
    required this.content,
    required this.reactions,
    required this.viewers,
    required this.createdAt,
  });

  DateTime? get createdAtDate => tsToDate(createdAt);

  factory Story.fromMap(String id, Map<String, dynamic> m) => Story(
        storyId: id,
        authorUid: (m['authorUid'] ?? '') as String,
        author: AuthorRef.fromMap(
            m['author'] == null ? null : Map<String, dynamic>.from(m['author'] as Map)),
        imageUrl: m['imageUrl'] as String?,
        content: m['content'] as String?,
        reactions: Map<String, dynamic>.from((m['reactions'] ?? const {}) as Map),
        viewers: List<String>.from((m['viewers'] ?? const []) as List),
        createdAt: m['createdAt'],
      );
}
