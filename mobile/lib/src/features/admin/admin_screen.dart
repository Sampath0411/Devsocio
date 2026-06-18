import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme.dart';
import '../../data/agent_client.dart';
import '../../data/post_repository.dart';
import '../../data/social_repository.dart';
import '../../data/user_repository.dart';
import '../../models/app_user.dart';
import '../../widgets/avatar.dart';
import '../../widgets/badges.dart';
import '../../widgets/ui.dart';

class AdminScreen extends ConsumerWidget {
  const AdminScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final me = ref.watch(currentUserProvider).value;
    if (me == null || !me.isAdmin) {
      return Scaffold(
        appBar: AppBar(title: const Text('Admin')),
        body: const Center(
          child: Text('Admins only.',
              style: TextStyle(color: AppColors.textMuted)),
        ),
      );
    }

    final digest = ref.watch(_digestProvider).value;

    return DefaultTabController(
      length: 4,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Admin'),
          bottom: const TabBar(
            isScrollable: true,
            labelColor: AppColors.primary,
            unselectedLabelColor: AppColors.textMuted,
            indicatorColor: AppColors.primary,
            tabs: [
              Tab(text: 'Copilot'),
              Tab(text: 'Users'),
              Tab(text: 'Reports'),
              Tab(text: 'Errors'),
            ],
          ),
        ),
        body: Column(
          children: [
            if (digest != null)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(10),
                color: (digest['health'] == 'all clear')
                    ? AppColors.success.withValues(alpha: 0.15)
                    : AppColors.warning.withValues(alpha: 0.15),
                child: Text(
                  'Health: ${digest['health'] ?? 'unknown'} · '
                  'errors(24h): ${digest['errors24h'] ?? 0} · '
                  'pending reports: ${digest['pendingReports'] ?? 0}',
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 12),
                ),
              ),
            const Expanded(
              child: TabBarView(
                children: [
                  _CopilotTab(),
                  _UsersTab(),
                  _ReportsTab(),
                  _ErrorsTab(),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

final _digestProvider = StreamProvider<Map<String, dynamic>?>(
    (ref) => ref.watch(socialRepositoryProvider).watchAdminDigest());

// ---------------- Users ----------------
class _UsersTab extends ConsumerWidget {
  const _UsersTab();
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final usersAsync = ref.watch(usersProvider);
    return usersAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => Center(child: Text('$e')),
      data: (users) => ListView.builder(
        itemCount: users.length,
        itemBuilder: (_, i) => _AdminUserTile(user: users[i]),
      ),
    );
  }
}

class _AdminUserTile extends ConsumerWidget {
  final AppUser user;
  const _AdminUserTile({required this.user});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final repo = ref.read(userRepositoryProvider);
    return ExpansionTile(
      leading: Avatar(url: user.avatar, size: 40),
      title: NameWithBadges.fromUser(user),
      subtitle: Text('@${user.username} · ${user.credits} credits'),
      childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
      children: [
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            _flagChip('Verified', user.verified,
                (v) => repo.setFlag(user.uid, 'verified', v)),
            _flagChip('Moderator', user.moderator,
                (v) => repo.setFlag(user.uid, 'moderator', v)),
            _flagChip('Banned', user.banned,
                (v) => repo.setFlag(user.uid, 'banned', v),
                danger: true, disabled: user.founder),
          ],
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            OutlinedButton(
                onPressed: () => repo.changeCredits(user.uid, 50),
                child: const Text('+50')),
            const SizedBox(width: 8),
            OutlinedButton(
                onPressed: () => repo.changeCredits(user.uid, -50),
                child: const Text('-50')),
            const SizedBox(width: 8),
            OutlinedButton(
                onPressed: () => _setExact(context, ref, user),
                child: const Text('Set…')),
          ],
        ),
      ],
    );
  }

  Widget _flagChip(String label, bool value, void Function(bool) onChanged,
      {bool danger = false, bool disabled = false}) {
    return FilterChip(
      label: Text(label),
      selected: value,
      onSelected: disabled ? null : onChanged,
      selectedColor:
          (danger ? AppColors.danger : AppColors.primary).withValues(alpha: 0.3),
      checkmarkColor: danger ? AppColors.danger : AppColors.primary,
      backgroundColor: AppColors.surfaceAlt,
    );
  }

  Future<void> _setExact(
      BuildContext context, WidgetRef ref, AppUser user) async {
    final controller = TextEditingController(text: '${user.credits}');
    final value = await showDialog<int>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.surface,
        title: const Text('Set credits'),
        content: TextField(
          controller: controller,
          keyboardType: TextInputType.number,
          autofocus: true,
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
              onPressed: () =>
                  Navigator.pop(ctx, int.tryParse(controller.text.trim())),
              child: const Text('Set')),
        ],
      ),
    );
    if (value != null) {
      await ref.read(userRepositoryProvider).setCredits(user.uid, value);
    }
  }
}

// ---------------- Reports ----------------
class _ReportsTab extends ConsumerWidget {
  const _ReportsTab();
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final reportsAsync = ref.watch(_reportsProvider);
    final social = ref.read(socialRepositoryProvider);
    return reportsAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => Center(child: Text('$e')),
      data: (reports) => reports.isEmpty
          ? const Center(
              child: Text('No reports.',
                  style: TextStyle(color: AppColors.textMuted)))
          : ListView(
              children: reports
                  .map((r) => Card(
                        margin: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 6),
                        child: ListTile(
                          title: Text('${r.type} · ${r.reason}'),
                          subtitle: Text(
                              'target: ${r.targetId}\nstatus: ${r.status}'),
                          isThreeLine: true,
                          trailing: r.status == 'pending'
                              ? Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    IconButton(
                                      icon: const Icon(Icons.delete_outline,
                                          color: AppColors.danger),
                                      onPressed: () async {
                                        if (r.type == 'post') {
                                          await ref
                                              .read(postRepositoryProvider)
                                              .deletePost(r.targetId);
                                        }
                                        await social.resolveReport(
                                            r.id, 'removed');
                                      },
                                    ),
                                    IconButton(
                                      icon: const Icon(Icons.check,
                                          color: AppColors.success),
                                      onPressed: () =>
                                          social.resolveReport(r.id, 'reviewed'),
                                    ),
                                  ],
                                )
                              : null,
                        ),
                      ))
                  .toList(),
            ),
    );
  }
}

final _reportsProvider = StreamProvider(
    (ref) => ref.watch(socialRepositoryProvider).watchReports());

// ---------------- Errors ----------------
class _ErrorsTab extends ConsumerWidget {
  const _ErrorsTab();
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final errorsAsync = ref.watch(_errorsProvider);
    final social = ref.read(socialRepositoryProvider);
    return errorsAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => Center(child: Text('$e')),
      data: (errors) => errors.isEmpty
          ? const Center(
              child: Text('No errors captured.',
                  style: TextStyle(color: AppColors.textMuted)))
          : ListView(
              children: errors
                  .map((e) => Card(
                        margin: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 6),
                        child: ListTile(
                          title: Text(e.message,
                              maxLines: 2, overflow: TextOverflow.ellipsis),
                          subtitle: Text('${e.url} · ${e.status}'),
                          trailing: e.status == 'open'
                              ? IconButton(
                                  icon: const Icon(Icons.check,
                                      color: AppColors.success),
                                  onPressed: () => social.resolveError(e.id),
                                )
                              : null,
                        ),
                      ))
                  .toList(),
            ),
    );
  }
}

final _errorsProvider =
    StreamProvider((ref) => ref.watch(socialRepositoryProvider).watchErrors());

// ---------------- AI Copilot ----------------
class _CopilotTab extends ConsumerStatefulWidget {
  const _CopilotTab();
  @override
  ConsumerState<_CopilotTab> createState() => _CopilotTabState();
}

class _CopilotTabState extends ConsumerState<_CopilotTab> {
  final _input = TextEditingController();
  final List<Map<String, String>> _history = [];
  List<AgentAction> _pending = [];
  List<String> _suggestions = [];
  bool _busy = false;

  @override
  void dispose() {
    _input.dispose();
    super.dispose();
  }

  Future<void> _send(String text) async {
    final me = ref.read(currentUserProvider).value;
    if (me == null || text.trim().isEmpty) return;
    setState(() {
      _history.add({'role': 'user', 'content': text.trim()});
      _busy = true;
      _input.clear();
      _suggestions = [];
    });
    try {
      final reply = await ref.read(agentClientProvider).ask(_history, me);
      setState(() {
        _history.add({'role': 'assistant', 'content': reply.reply});
        _pending = reply.proposedActions;
        _suggestions = reply.suggestions;
      });
    } catch (e) {
      setState(() => _history
          .add({'role': 'assistant', 'content': 'Error: $e'}));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _run(AgentAction a) async {
    try {
      final msg = await ref.read(agentClientProvider).execute(a);
      if (mounted) {
        showToast(context, msg);
        setState(() => _pending = _pending.where((x) => x != a).toList());
      }
    } catch (e) {
      if (mounted) showToast(context, '$e', error: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final agent = ref.read(agentClientProvider);
    return Column(
      children: [
        Expanded(
          child: ListView(
            padding: const EdgeInsets.all(12),
            children: [
              if (_history.isEmpty)
                const Padding(
                  padding: EdgeInsets.all(24),
                  child: Column(
                    children: [
                      Icon(Icons.smart_toy_outlined,
                          size: 48, color: AppColors.primary),
                      SizedBox(height: 12),
                      Text('Admin Copilot',
                          style: TextStyle(
                              fontSize: 18, fontWeight: FontWeight.w700)),
                      SizedBox(height: 6),
                      Text(
                          'Ask it to investigate users, posts, reports and errors. '
                          'It proposes moderation actions you approve here.',
                          textAlign: TextAlign.center,
                          style: TextStyle(color: AppColors.textMuted)),
                    ],
                  ),
                ),
              for (final m in _history)
                Align(
                  alignment: m['role'] == 'user'
                      ? Alignment.centerRight
                      : Alignment.centerLeft,
                  child: Container(
                    constraints: BoxConstraints(
                        maxWidth: MediaQuery.of(context).size.width * 0.8),
                    margin: const EdgeInsets.symmetric(vertical: 4),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: m['role'] == 'user'
                          ? AppColors.primary
                          : AppColors.surfaceAlt,
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: Text(m['content'] ?? '',
                        style: TextStyle(
                            color: m['role'] == 'user'
                                ? Colors.white
                                : AppColors.textPrimary)),
                  ),
                ),
              // Proposed action cards
              for (final a in _pending)
                Card(
                  color: AppColors.warning.withValues(alpha: 0.12),
                  child: ListTile(
                    leading: const Icon(Icons.gavel, color: AppColors.warning),
                    title: Text(agent.describe(a)),
                    trailing: ElevatedButton(
                      onPressed: () => _run(a),
                      style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.warning,
                          foregroundColor: Colors.black87),
                      child: const Text('Approve'),
                    ),
                  ),
                ),
              if (_busy)
                const Padding(
                  padding: EdgeInsets.all(12),
                  child: Center(child: CircularProgressIndicator()),
                ),
            ],
          ),
        ),
        if (_suggestions.isNotEmpty)
          SizedBox(
            height: 44,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 8),
              children: [
                for (final s in _suggestions)
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 4),
                    child: ActionChip(
                      label: Text(s),
                      backgroundColor: AppColors.surfaceAlt,
                      onPressed: () => _send(s),
                    ),
                  ),
              ],
            ),
          ),
        SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(12, 4, 12, 8),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _input,
                    decoration: const InputDecoration(
                        hintText: 'Ask the Copilot…'),
                    onSubmitted: _send,
                  ),
                ),
                const SizedBox(width: 8),
                CircleAvatar(
                  backgroundColor: AppColors.primary,
                  child: IconButton(
                    icon: const Icon(Icons.send, color: Colors.white),
                    onPressed: _busy ? null : () => _send(_input.text),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
