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

    // Direct OpenRouter call if key is available
    if (Env.openRouterKey.isNotEmpty) {
      return _askDirect(messages, admin);
    }

    // Fallback to Vercel proxy
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

  /// Direct OpenRouter call for admin copilot with tool-use prompting.
  Future<AgentReply> _askDirect(
      List<Map<String, String>> messages, AppUser admin) async {
    final systemPrompt = {
      'role': 'system',
      'content':
          'You are the DevSocio Admin Copilot. You help admins manage the platform. '
          'You can propose actions like deleting posts, resolving reports, setting user flags, '
          'and adjusting credits. Respond with JSON containing: '
          '{"reply":"your message","proposedActions":[{"name":"action_name","args":{...}}], '
          '"suggestions":["follow-up question 1","follow-up question 2"]}. '
          'If no action is needed, return an empty proposedActions array. '
          'Action names: delete_post(postId), resolve_report(reportId,status), '
          'set_user_flag(uid,field,value), change_credits(uid,delta), '
          'set_credits(uid,value), resolve_error(errorId).',
    };

    final allMessages = [systemPrompt, ...messages];

    final res = await http.post(
      Uri.parse('https://openrouter.ai/api/v1/chat/completions'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ${Env.openRouterKey}',
        'HTTP-Referer': 'https://devsocio.vercel.app',
        'X-Title': 'DevSocio Admin Copilot',
      },
      body: jsonEncode({
        'model': 'deepseek/deepseek-chat-v3-0324:free',
        'messages': allMessages,
        'temperature': 0.3,
        'max_tokens': 800,
      }),
    );

    if (res.statusCode != 200) {
      throw Exception('Agent request failed (${res.statusCode}): ${res.body}');
    }

    final data = jsonDecode(res.body) as Map<String, dynamic>;
    final choices = data['choices'] as List?;
    if (choices == null || choices.isEmpty) throw Exception('Empty agent response');

    final content = choices[0]['message']?['content'] as String? ?? '';

    // Try to parse as JSON
    try {
      final parsed = _extractJson(content);
      return AgentReply(
        (parsed['reply'] ?? content) as String,
        ((parsed['proposedActions'] ?? const []) as List)
            .map((e) => AgentAction.fromMap(Map<String, dynamic>.from(e as Map)))
            .toList(),
        List<String>.from((parsed['suggestions'] ?? const []) as List),
      );
    } catch (_) {
      // If not JSON, return as plain text reply
      return AgentReply(content, const [], const []);
    }
  }

  Map<String, dynamic> _extractJson(String text) {
    final fenced =
        RegExp(r'```(?:json)?\s*([\s\S]*?)```', caseSensitive: false)
            .firstMatch(text);
    final candidate = (fenced != null ? fenced.group(1)! : text).trim();
    final start = candidate.indexOf(RegExp(r'[\[{]'));
    if (start == -1) throw Exception('No JSON found');
    return jsonDecode(candidate.substring(start)) as Map<String, dynamic>;
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
