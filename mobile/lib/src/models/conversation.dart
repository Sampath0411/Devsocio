import 'timestamp_util.dart';

/// conversations/{cid} where cid = sorted member pair joined by '__'.
class Conversation {
  final String id;
  final List<String> members;
  final String last;
  final String lastFrom;
  final bool isCollab;
  final bool collabAccepted;
  final Map<String, dynamic> typing;
  final dynamic updatedAt;

  const Conversation({
    required this.id,
    required this.members,
    required this.last,
    required this.lastFrom,
    required this.isCollab,
    required this.collabAccepted,
    required this.typing,
    required this.updatedAt,
  });

  DateTime? get updatedAtDate => tsToDate(updatedAt);

  String otherUid(String me) =>
      members.firstWhere((m) => m != me, orElse: () => me);

  /// True if [uid] has typed within the last 4 seconds.
  bool isTyping(String uid) {
    final v = typing[uid];
    if (v is! num) return false;
    return DateTime.now().millisecondsSinceEpoch - v.toInt() < 4000;
  }

  factory Conversation.fromMap(String id, Map<String, dynamic> m) => Conversation(
        id: id,
        members: List<String>.from((m['members'] ?? const []) as List),
        last: (m['last'] ?? '') as String,
        lastFrom: (m['lastFrom'] ?? '') as String,
        isCollab: (m['isCollab'] ?? false) as bool,
        collabAccepted: (m['collabAccepted'] ?? false) as bool,
        typing: Map<String, dynamic>.from((m['typing'] ?? const {}) as Map),
        updatedAt: m['updatedAt'],
      );
}

/// conversations/{cid}/messages/{messageId}
class Message {
  final String id;
  final String from;
  final String text;
  final dynamic createdAt;

  const Message({
    required this.id,
    required this.from,
    required this.text,
    required this.createdAt,
  });

  DateTime? get createdAtDate => tsToDate(createdAt);

  factory Message.fromMap(String id, Map<String, dynamic> m) => Message(
        id: id,
        from: (m['from'] ?? '') as String,
        text: (m['text'] ?? '') as String,
        createdAt: m['createdAt'],
      );
}
