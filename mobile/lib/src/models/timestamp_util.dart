import 'package:cloud_firestore/cloud_firestore.dart';

/// Convert a Firestore value (Timestamp, int millis, or null) to DateTime.
DateTime? tsToDate(dynamic v) {
  if (v == null) return null;
  if (v is Timestamp) return v.toDate();
  if (v is DateTime) return v;
  if (v is int) return DateTime.fromMillisecondsSinceEpoch(v);
  return null;
}

int tsToMillis(dynamic v) => tsToDate(v)?.millisecondsSinceEpoch ?? 0;

/// Mirrors web isOnline(): active within the last 2 minutes.
bool isOnlineFrom(dynamic lastActiveAt) {
  final ms = tsToMillis(lastActiveAt);
  if (ms == 0) return false;
  return DateTime.now().millisecondsSinceEpoch - ms < 2 * 60 * 1000;
}
