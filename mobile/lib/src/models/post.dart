import 'app_user.dart';
import 'timestamp_util.dart';

/// Embedded snapshot of a quoted/reposted original.
class RepostSnapshot {
  final String postId;
  final String type;
  final String content;
  final AuthorRef? author;
  final String? imageUrl;

  const RepostSnapshot({
    required this.postId,
    required this.type,
    required this.content,
    required this.author,
    required this.imageUrl,
  });

  factory RepostSnapshot.fromMap(Map<String, dynamic> m) => RepostSnapshot(
        postId: (m['postId'] ?? '') as String,
        type: (m['type'] ?? '') as String,
        content: (m['content'] ?? '') as String,
        author:
            m['author'] == null ? null : AuthorRef.fromMap(Map<String, dynamic>.from(m['author'] as Map)),
        imageUrl: m['imageUrl'] as String?,
      );
}

/// posts/{postId}
class Post {
  final String postId;
  final String type;
  final String content;
  final String authorUid;
  final AuthorRef author;
  final String? imageUrl;
  final List<String> tags;
  final List<String> hashtags;
  final int likes;
  final int commentsCount;
  final RepostSnapshot? repostOf;
  final dynamic createdAt;

  const Post({
    required this.postId,
    required this.type,
    required this.content,
    required this.authorUid,
    required this.author,
    required this.imageUrl,
    required this.tags,
    required this.hashtags,
    required this.likes,
    required this.commentsCount,
    required this.repostOf,
    required this.createdAt,
  });

  DateTime? get createdAtDate => tsToDate(createdAt);

  factory Post.fromMap(String id, Map<String, dynamic> m) => Post(
        postId: id,
        type: (m['type'] ?? 'Opinion / Take') as String,
        content: (m['content'] ?? '') as String,
        authorUid: (m['authorUid'] ?? '') as String,
        author: AuthorRef.fromMap(
            m['author'] == null ? null : Map<String, dynamic>.from(m['author'] as Map)),
        imageUrl: m['imageUrl'] as String?,
        tags: List<String>.from((m['tags'] ?? const []) as List),
        hashtags: List<String>.from((m['hashtags'] ?? const []) as List),
        likes: ((m['likes'] ?? 0) as num).toInt(),
        commentsCount: ((m['commentsCount'] ?? 0) as num).toInt(),
        repostOf: m['repostOf'] == null
            ? null
            : RepostSnapshot.fromMap(Map<String, dynamic>.from(m['repostOf'] as Map)),
        createdAt: m['createdAt'],
      );
}

/// posts/{postId}/comments/{commentId}
class Comment {
  final String id;
  final String authorUid;
  final AuthorRef author;
  final String content;
  final int likesCount;
  final String? parentId;
  final dynamic createdAt;

  const Comment({
    required this.id,
    required this.authorUid,
    required this.author,
    required this.content,
    required this.likesCount,
    required this.parentId,
    required this.createdAt,
  });

  DateTime? get createdAtDate => tsToDate(createdAt);

  factory Comment.fromMap(String id, Map<String, dynamic> m) => Comment(
        id: id,
        authorUid: (m['authorUid'] ?? '') as String,
        author: AuthorRef.fromMap(
            m['author'] == null ? null : Map<String, dynamic>.from(m['author'] as Map)),
        content: (m['content'] ?? '') as String,
        likesCount: ((m['likesCount'] ?? 0) as num).toInt(),
        parentId: m['parentId'] as String?,
        createdAt: m['createdAt'],
      );
}
