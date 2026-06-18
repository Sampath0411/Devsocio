import 'app_user.dart';
import 'timestamp_util.dart';

/// users/{uid}/notifications/{notifId}
class AppNotification {
  final String id;
  final String type; // like | follow | comment | collab | save | mention | credits
  final bool read;
  final String actorUid;
  final AuthorRef actor;
  final String text;
  final String? postId;
  final String? convoId;
  final dynamic createdAt;

  const AppNotification({
    required this.id,
    required this.type,
    required this.read,
    required this.actorUid,
    required this.actor,
    required this.text,
    required this.postId,
    required this.convoId,
    required this.createdAt,
  });

  DateTime? get createdAtDate => tsToDate(createdAt);

  factory AppNotification.fromMap(String id, Map<String, dynamic> m) =>
      AppNotification(
        id: id,
        type: (m['type'] ?? '') as String,
        read: (m['read'] ?? false) as bool,
        actorUid: (m['actorUid'] ?? '') as String,
        actor: AuthorRef.fromMap(
            m['actor'] == null ? null : Map<String, dynamic>.from(m['actor'] as Map)),
        text: (m['text'] ?? '') as String,
        postId: m['postId'] as String?,
        convoId: m['convoId'] as String?,
        createdAt: m['createdAt'],
      );
}

/// users/{uid}/credits_log/{logId}
class CreditTx {
  final String id;
  final int amount;
  final String type; // 'earn' | 'spend'
  final String description;
  final dynamic createdAt;

  const CreditTx({
    required this.id,
    required this.amount,
    required this.type,
    required this.description,
    required this.createdAt,
  });

  DateTime? get createdAtDate => tsToDate(createdAt);

  factory CreditTx.fromMap(String id, Map<String, dynamic> m) => CreditTx(
        id: id,
        amount: ((m['amount'] ?? 0) as num).toInt(),
        type: (m['type'] ?? 'earn') as String,
        description: (m['description'] ?? '') as String,
        createdAt: m['createdAt'],
      );
}

/// reports/{reportId}
class Report {
  final String id;
  final String status;
  final String reporterUid;
  final String type;
  final String targetId;
  final String reason;
  final String description;
  final dynamic createdAt;

  const Report({
    required this.id,
    required this.status,
    required this.reporterUid,
    required this.type,
    required this.targetId,
    required this.reason,
    required this.description,
    required this.createdAt,
  });

  DateTime? get createdAtDate => tsToDate(createdAt);

  factory Report.fromMap(String id, Map<String, dynamic> m) => Report(
        id: id,
        status: (m['status'] ?? 'pending') as String,
        reporterUid: (m['reporterUid'] ?? '') as String,
        type: (m['type'] ?? '') as String,
        targetId: (m['targetId'] ?? '') as String,
        reason: (m['reason'] ?? '') as String,
        description: (m['description'] ?? '') as String,
        createdAt: m['createdAt'],
      );
}

/// errors/{errorId}
class AppError {
  final String id;
  final String status;
  final String message;
  final String stack;
  final String url;
  final dynamic createdAt;

  const AppError({
    required this.id,
    required this.status,
    required this.message,
    required this.stack,
    required this.url,
    required this.createdAt,
  });

  DateTime? get createdAtDate => tsToDate(createdAt);

  factory AppError.fromMap(String id, Map<String, dynamic> m) => AppError(
        id: id,
        status: (m['status'] ?? 'open') as String,
        message: (m['message'] ?? '') as String,
        stack: (m['stack'] ?? '') as String,
        url: (m['url'] ?? '') as String,
        createdAt: m['createdAt'],
      );
}
