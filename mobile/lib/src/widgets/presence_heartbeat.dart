import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/firebase_providers.dart';
import '../data/user_repository.dart';

/// Stamps lastActiveAt on the signed-in user's doc every ~60s while mounted,
/// so other clients can show an online indicator (mirrors web touchPresence).
class PresenceHeartbeat extends ConsumerStatefulWidget {
  final Widget child;
  const PresenceHeartbeat({super.key, required this.child});

  @override
  ConsumerState<PresenceHeartbeat> createState() => _PresenceHeartbeatState();
}

class _PresenceHeartbeatState extends ConsumerState<PresenceHeartbeat> {
  Timer? _timer;

  bool _healed = false;
  bool _reconciled = false;

  @override
  void initState() {
    super.initState();
    _beat();
    _timer = Timer.periodic(const Duration(seconds: 60), (_) => _beat());
  }

  void _beat() {
    final uid = ref.read(firebaseAuthProvider).currentUser?.uid;
    if (uid == null) return;
    final repo = ref.read(userRepositoryProvider);
    repo.touchPresence(uid).catchError((_) {});
    // One-shot repair of any negative counters (e.g. postsCount stuck at -2).
    if (!_healed) {
      _healed = true;
      repo.healCounters(uid).catchError((_) {});
    }
    // One-shot reconciliation of follow counters against the real edges (so the
    // signed-in user's own counts self-correct even if they never open their
    // profile — mirrors the web Profile.jsx `heal()` on the logged-in account).
    if (!_reconciled) {
      _reconciled = true;
      repo.reconcileFollowCounts(uid, myUid: uid).catchError((_) {});
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => widget.child;
}
