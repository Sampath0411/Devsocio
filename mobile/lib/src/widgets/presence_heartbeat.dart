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

  @override
  void initState() {
    super.initState();
    _beat();
    _timer = Timer.periodic(const Duration(seconds: 60), (_) => _beat());
  }

  void _beat() {
    final uid = ref.read(firebaseAuthProvider).currentUser?.uid;
    if (uid == null) return;
    ref.read(userRepositoryProvider).touchPresence(uid).catchError((_) {});
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => widget.child;
}
