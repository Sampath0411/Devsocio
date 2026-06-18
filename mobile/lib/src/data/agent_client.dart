import 'dart:convert';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http/http.dart' as http;

import '../core/env.dart';
import '../models/app_user.dart';
import 'firebase_providers.dart';
import 'post_repository.dart';
import 'social_repository.dart';
import 'user_repository.dart';

class AgentAction {
  final String name;
  final Map<String, dynamic> args;
  const AgentAction(this.name, this.args);
  factory AgentAction.fromMap(Map<String, dynamic> m) => AgentAction(
        (m['name'] ?? '') as String,
        Map<String, dynamic>.from((m['args'] ?? const {}) as Map),
      );
}

class AgentReply {
  final String reply;
  final List<AgentAction> proposedActions;
  final List<String> suggestions;
  const AgentReply(this.reply, this.proposedActions, this.suggestions);
}

/// Client bridge to the Admin Copilot backend (api/agent.js). Proposed actions
/// are NOT auto-run — the UI approves each, then executeAction() performs it via
/// the same repositories the admin already uses (Firestore rules permit admin).
class AgentClient {
  final FirebaseAuth _auth;
  final SocialRepository _social;
  final UserRepository _users;
  final PostRepository _posts;
  AgentClient(this._auth, this._social, this._users, this._posts);

  Future<AgentReply> ask(
      List<Map<String, String>> messages, AppUser admin) async {
    final user = _auth.currentUser;
    if (user == null) throw Exception('Not signed in');
    final token = await user.getIdToken();
    final res = await http.post(
      Uri.parse(Env.agentUrl),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $token',
      },
      body: jsonEncode({
        'messages': messages,
        'admin': {
          'uid': admin.uid,
          'username': admin.username,
          'displayName': admin.displayName,
          'email': admin.email,
          'credits': admin.credits,
        },
      }),
    );
    final data = jsonDecode(res.body) as Map<String, dynamic>;
    if (res.statusCode != 200) {
      throw Exception(data['error'] ?? 'Agent request failed (${res.statusCode})');
    }
    return AgentReply(
      (data['reply'] ?? '(no response)') as String,
      ((data['proposedActions'] ?? const []) as List)
          .map((e) => AgentAction.fromMap(Map<String, dynamic>.from(e as Map)))
          .toList(),
      List<String>.from((data['suggestions'] ?? const []) as List),
    );
  }

  String describe(AgentAction a) {
    final args = a.args;
    switch (a.name) {
      case 'delete_post':
        return 'Delete post ${args['postId']}';
      case 'resolve_report':
        return 'Mark report ${args['reportId']} as "${args['status'] ?? 'reviewed'}"';
      case 'set_user_flag':
        return '${args['value'] == true ? 'Grant' : 'Remove'} "${args['field']}" for user ${args['uid']}';
      case 'change_credits':
        final d = (args['delta'] as num?)?.toInt() ?? 0;
        return '${d >= 0 ? 'Add' : 'Remove'} ${d.abs()} credits ${d >= 0 ? 'to' : 'from'} ${args['uid']}';
      case 'set_credits':
        return 'Set ${args['uid']} credits to ${args['value']}';
      case 'resolve_error':
        return 'Mark error ${args['errorId']} resolved';
      default:
        return '${a.name} ${jsonEncode(args)}';
    }
  }

  Future<String> execute(AgentAction a) async {
    final args = a.args;
    switch (a.name) {
      case 'delete_post':
        await _posts.deletePost(args['postId'] as String);
        return 'Post deleted.';
      case 'resolve_report':
        await _social.resolveReport(
            args['reportId'] as String, (args['status'] ?? 'reviewed') as String);
        return 'Report resolved.';
      case 'set_user_flag':
        final uid = await _resolveUid(args['uid']?.toString() ?? '');
        await _users.setFlag(uid, args['field'] as String, args['value'] == true);
        return 'Flag updated.';
      case 'change_credits':
        final uid = await _resolveUid(args['uid']?.toString() ?? '');
        await _users.changeCredits(uid, (args['delta'] as num).toInt());
        return 'Credits changed.';
      case 'set_credits':
        final uid = await _resolveUid(args['uid']?.toString() ?? '');
        await _users.setCredits(uid, (args['value'] as num).toInt());
        return 'Credits set.';
      case 'resolve_error':
        await _social.resolveError(args['errorId'] as String);
        return 'Error resolved.';
      default:
        throw Exception('Unknown action: ${a.name}');
    }
  }

  /// Resolve a uid / username / email to a uid (mirrors findUserUid).
  Future<String> _resolveUid(String idOrName) async {
    final key = idOrName.trim();
    if (key.isEmpty) throw Exception('No user specified.');
    final direct = await _users.fetchByUid(key);
    if (direct != null) return key;
    final byName = await _users.fetchByUsername(key);
    if (byName != null) return byName.uid;
    throw Exception('Could not find user "$idOrName". Ask the Copilot to look them up first.');
  }
}

final agentClientProvider = Provider<AgentClient>((ref) => AgentClient(
      ref.watch(firebaseAuthProvider),
      ref.watch(socialRepositoryProvider),
      ref.watch(userRepositoryProvider),
      ref.watch(postRepositoryProvider),
    ));
