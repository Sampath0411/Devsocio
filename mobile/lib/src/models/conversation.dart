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
  final Map<String, dynamic> read; // uid -> last-read Timestamp
  final dynamic updatedAt;

  const Conversation({
    required this.id,
    required this.members,
    required this.last,
    required this.lastFrom,
    required this.isCollab,
    required this.collabAccepted,
    required this.typing,
    required this.read,
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

  /// When [uid] last read this conversation (null if never).
  DateTime? readAt(String uid) => tsToDate(read[uid]);

  factory Conversation.fromMap(String id, Map<String, dynamic> m) => Conversation(
        id: id,
        members: List<String>.from((m['members'] ?? const []) as List),
        last: (m['last'] ?? '') as String,
        lastFrom: (m['lastFrom'] ?? '') as String,
        isCollab: (m['isCollab'] ?? false) as bool,
        collabAccepted: (m['collabAccepted'] ?? false) as bool,
        typing: Map<String, dynamic>.from((m['typing'] ?? const {}) as Map),
        read: Map<String, dynamic>.from((m['read'] ?? const {}) as Map),
        updatedAt: m['updatedAt'],
      );
}

/// conversations/{cid}/messages/{messageId}
class Message {
  final String id;
  final String from;
  final String text;
  final bool deleted;
  final Map<String, String> reactions; // uid -> emoji
  final ReplySnapshot? replyTo;
  final dynamic createdAt;

  const Message({
    required this.id,
    required this.from,
    required this.text,
    this.deleted = false,
    this.reactions = const {},
    this.replyTo,
    required this.createdAt,
  });

  DateTime? get createdAtDate => tsToDate(createdAt);

  factory Message.fromMap(String id, Map<String, dynamic> m) {
    // Parse reactions map
    final rawReactions = (m['reactions'] as Map<String, dynamic>?) ?? const {};
    final reactions = rawReactions.map((k, v) => MapEntry(k, v.toString()));

    // Parse replyTo
    ReplySnapshot? replyTo;
    if (m['replyTo'] is Map<String, dynamic>) {
      replyTo = ReplySnapshot.fromMap(
          Map<String, dynamic>.from(m['replyTo'] as Map));
    }

    return Message(
      id: id,
      from: (m['from'] ?? '') as String,
      text: (m['text'] ?? '') as String,
      deleted: (m['deleted'] ?? false) as bool,
      reactions: reactions,
      replyTo: replyTo,
      createdAt: m['createdAt'],
    );
  }
}

/// Snapshot of a message being replied to.
class ReplySnapshot {
  final String from;
  final String text;
  final String fromName;

  const ReplySnapshot({
    required this.from,
    required this.text,
    required this.fromName,
  });

  factory ReplySnapshot.fromMap(Map<String, dynamic> m) => ReplySnapshot(
        from: (m['from'] ?? '') as String,
        text: (m['text'] ?? '') as String,
        fromName: (m['fromName'] ?? '') as String,
      );

  Map<String, dynamic> toMap() => {
        'from': from,
        'text': text,
        'fromName': fromName,
      };
}
