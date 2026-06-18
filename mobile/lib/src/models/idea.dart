import 'app_user.dart';
import 'timestamp_util.dart';

/// ideas/{ideaId}
class Idea {
  final String ideaId;
  final String description;
  final String authorUid;
  final AuthorRef author;
  final int invested;
  final int comments;
  final double? aiScore;
  final List<String> strengths;
  final List<String> weaknesses;
  final List<String> competitors;
  final dynamic createdAt;

  const Idea({
    required this.ideaId,
    required this.description,
    required this.authorUid,
    required this.author,
    required this.invested,
    required this.comments,
    required this.aiScore,
    required this.strengths,
    required this.weaknesses,
    required this.competitors,
    required this.createdAt,
  });

  DateTime? get createdAtDate => tsToDate(createdAt);

  factory Idea.fromMap(String id, Map<String, dynamic> m) => Idea(
        ideaId: id,
        description: (m['description'] ?? '') as String,
        authorUid: (m['authorUid'] ?? '') as String,
        author: AuthorRef.fromMap(
            m['author'] == null ? null : Map<String, dynamic>.from(m['author'] as Map)),
        invested: ((m['invested'] ?? 0) as num).toInt(),
        comments: ((m['comments'] ?? 0) as num).toInt(),
        aiScore: m['aiScore'] == null ? null : (m['aiScore'] as num).toDouble(),
        strengths: List<String>.from((m['strengths'] ?? const []) as List),
        weaknesses: List<String>.from((m['weaknesses'] ?? const []) as List),
        competitors: List<String>.from((m['competitors'] ?? const []) as List),
        createdAt: m['createdAt'],
      );
}
