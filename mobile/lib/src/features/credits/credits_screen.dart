import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:timeago/timeago.dart' as timeago;

import '../../core/constants.dart';
import '../../core/theme.dart';
import '../../data/credits_api.dart';
import '../../data/social_repository.dart';
import '../../data/user_repository.dart';
import '../../models/app_user.dart';
import '../../widgets/avatar.dart';
import '../../widgets/ui.dart';

class CreditsScreen extends ConsumerStatefulWidget {
  const CreditsScreen({super.key});
  @override
  ConsumerState<CreditsScreen> createState() => _CreditsScreenState();
}

class _CreditsScreenState extends ConsumerState<CreditsScreen> {
  bool _claiming = false;

  Future<void> _dailyLogin() async {
    setState(() => _claiming = true);
    try {
      final res = await ref.read(creditsApiProvider).dailyLogin();
      final awarded = (res['awarded'] as num?)?.toInt() ?? 0;
      if (mounted) {
        showToast(context,
            awarded > 0
                ? 'Daily bonus: +$awarded credits! 🔥'
                : 'Already claimed today — come back tomorrow.');
      }
    } catch (e) {
      if (mounted) {
        showToast(context, 'Could not claim (check API_BASE): $e',
            error: true);
      }
    } finally {
      if (mounted) setState(() => _claiming = false);
    }
  }

  Future<void> _redeem(AppUser me, Reward r) async {
    if (me.credits < r.cost) {
      showToast(context, 'Not enough credits.', error: true);
      return;
    }
    await ref.read(userRepositoryProvider).changeCredits(me.uid, -r.cost);
    if (r.id == 'verified') {
      await ref
          .read(userRepositoryProvider)
          .setFlag(me.uid, 'verified', true);
    }
    if (mounted) showToast(context, 'Redeemed: ${r.title}');
  }

  @override
  Widget build(BuildContext context) {
    final me = ref.watch(currentUserProvider).value;
    final logAsync = ref.watch(creditLogProvider);
    final usersAsync = ref.watch(usersProvider);

    if (me == null) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    final leaderboard = [...(usersAsync.value ?? const <AppUser>[])]
      ..sort((a, b) => b.credits.compareTo(a.credits));

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [AppColors.warning, AppColors.gold],
                ),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.monetization_on,
                  color: Colors.black87, size: 20),
            ),
            const SizedBox(width: 10),
            const Text('Credits'),
          ],
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Balance card
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [AppColors.primary, AppColors.accent],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(20),
              boxShadow: [
                BoxShadow(
                  color: AppColors.primary.withValues(alpha: 0.4),
                  blurRadius: 30,
                  spreadRadius: 5,
                ),
              ],
            ),
            child: Column(
              children: [
                const Text('Your balance',
                    style: TextStyle(color: Colors.white70)),
                const SizedBox(height: 8),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(Icons.bolt,
                          color: Colors.white, size: 28),
                    ),
                    const SizedBox(width: 12),
                    Text('${me.credits}',
                        style: const TextStyle(
                            fontSize: 44,
                            fontWeight: FontWeight.w800,
                            color: Colors.white)),
                  ],
                ),
                if (me.loginStreak > 0) ...[
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 12, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text('🔥 ${me.loginStreak}-day streak',
                        style: const TextStyle(color: Colors.white)),
                  ),
                ],
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: _claiming ? null : _dailyLogin,
                    style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.white,
                        foregroundColor: AppColors.primary,
                        padding: const EdgeInsets.symmetric(vertical: 14)),
                    child: _claiming
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(
                                strokeWidth: 2))
                        : const Text('Claim daily bonus',
                            style: TextStyle(
                                fontWeight: FontWeight.w600,
                                fontSize: 16)),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
          // Referral
          _SectionTitle('Refer & earn'),
          Card(
            child: Container(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: AppColors.warning.withValues(alpha: 0.2),
                ),
              ),
              child: ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: AppColors.warning.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.card_giftcard,
                      color: AppColors.warning),
                ),
                title: const Text('Your referral code'),
                subtitle: Text(me.username,
                    style: TextStyle(
                        fontWeight: FontWeight.w600,
                        color: AppColors.accent)),
                trailing: IconButton(
                  icon: const Icon(Icons.copy),
                  onPressed: () {
                    Clipboard.setData(ClipboardData(
                        text:
                            'Join me on DevSocio! Use code: ${me.username}'));
                    showToast(context, 'Referral copied!');
                  },
                ),
              ),
            ),
          ),
          const SizedBox(height: 20),
          // Rewards shop
          _SectionTitle('Rewards shop'),
          ...kRewards.map((r) => Card(
                margin: const EdgeInsets.only(bottom: 8),
                child: Container(
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: AppColors.primary.withValues(alpha: 0.1),
                    ),
                  ),
                  child: ListTile(
                    leading: Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: AppColors.primary.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Icon(r.icon, color: AppColors.primary),
                    ),
                    title: Text(r.title),
                    subtitle: Text(r.description),
                    trailing: ElevatedButton(
                      onPressed: () => _redeem(me, r),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.warning,
                        foregroundColor: Colors.black87,
                      ),
                      child: Text('${r.cost}'),
                    ),
                  ),
                ),
              )),
          const SizedBox(height: 20),
          // Leaderboard
          _SectionTitle('Weekly leaderboard'),
          ...leaderboard.take(5).toList().asMap().entries.map((e) {
            final u = e.value;
            final rank = e.key + 1;
            return Card(
              margin: const EdgeInsets.only(bottom: 4),
              child: ListTile(
                leading: CircleAvatar(
                  backgroundColor: rank <= 3
                      ? AppColors.warning.withValues(alpha: 0.2)
                      : AppColors.surfaceAlt,
                  child: Text('$rank',
                      style: TextStyle(
                          fontWeight: FontWeight.w700,
                          color: rank <= 3
                              ? AppColors.warning
                              : AppColors.textPrimary)),
                ),
                title: Row(
                  children: [
                    Avatar(url: u.avatar, size: 28),
                    const SizedBox(width: 8),
                    Flexible(
                        child: Text(u.displayName,
                            overflow: TextOverflow.ellipsis)),
                  ],
                ),
                trailing: Text('${u.credits} ⚡',
                    style: const TextStyle(
                        fontWeight: FontWeight.w600,
                        color: AppColors.warning)),
              ),
            );
          }),
          const SizedBox(height: 20),
          // Transaction history
          _SectionTitle('Transaction history'),
          logAsync.when(
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (e, _) => const SizedBox.shrink(),
            data: (txs) => txs.isEmpty
                ? const Padding(
                    padding: EdgeInsets.all(16),
                    child: Text('No transactions yet.',
                        style: TextStyle(color: AppColors.textMuted)),
                  )
                : Column(
                    children: txs
                        .map((t) => ListTile(
                              dense: true,
                              leading: Icon(
                                  t.amount >= 0
                                      ? Icons.add_circle_outline
                                      : Icons.remove_circle_outline,
                                  color: t.amount >= 0
                                      ? AppColors.success
                                      : AppColors.danger),
                              title: Text(t.description),
                              subtitle: t.createdAtDate == null
                                  ? null
                                  : Text(timeago.format(t.createdAtDate!)),
                              trailing: Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 10, vertical: 4),
                                decoration: BoxDecoration(
                                  color: (t.amount >= 0
                                          ? AppColors.success
                                          : AppColors.danger)
                                      .withValues(alpha: 0.1),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Text(
                                    '${t.amount >= 0 ? '+' : ''}${t.amount}',
                                    style: TextStyle(
                                        fontWeight: FontWeight.w700,
                                        color: t.amount >= 0
                                            ? AppColors.success
                                            : AppColors.danger)),
                              ),
                            ))
                        .toList(),
                  ),
          ),
          const SizedBox(height: 30),
        ],
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  final String text;
  const _SectionTitle(this.text);
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 8, top: 4),
        child: Text(text,
            style:
                const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
      );
}
