import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/app_lock.dart';
import '../../core/constants.dart';
import '../../core/theme.dart';
import '../../data/auth_repository.dart';
import '../../data/user_repository.dart';
import '../../widgets/ui.dart';

class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key});
  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  void _showSetupPinSheet() {
    final pinController = TextEditingController();
    final confirmController = TextEditingController();
    final formKey = GlobalKey<FormState>();
    bool obscurePin = true;
    bool obscureConfirm = true;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheet) => Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(ctx).viewInsets.bottom,
            left: 24,
            right: 24,
            top: 24,
          ),
          child: Form(
            key: formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        gradient: AppColors.gradientBrand,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(Icons.lock_outline,
                          color: Colors.white, size: 20),
                    ),
                    const SizedBox(width: 12),
                    Text('Set app PIN', style: AppTheme.brandTitle(20)),
                  ],
                ),
                const SizedBox(height: 8),
                const Text(
                  'Choose a 4-digit PIN to lock the app.',
                  style: TextStyle(color: AppColors.textMuted),
                ),
                const SizedBox(height: 20),
                TextFormField(
                  controller: pinController,
                  obscureText: obscurePin,
                  maxLength: 4,
                  keyboardType: TextInputType.number,
                  decoration: InputDecoration(
                    hintText: 'Enter PIN',
                    prefixIcon: const Icon(Icons.pin),
                    suffixIcon: IconButton(
                      icon: Icon(obscurePin
                          ? Icons.visibility_outlined
                          : Icons.visibility_off_outlined),
                      onPressed: () => setSheet(() => obscurePin = !obscurePin),
                    ),
                  ),
                  validator: (v) {
                    if (v == null || v.length != 4) return 'Enter exactly 4 digits';
                    if (int.tryParse(v) == null) return 'Digits only';
                    return null;
                  },
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: confirmController,
                  obscureText: obscureConfirm,
                  maxLength: 4,
                  keyboardType: TextInputType.number,
                  decoration: InputDecoration(
                    hintText: 'Confirm PIN',
                    prefixIcon: const Icon(Icons.pin),
                    suffixIcon: IconButton(
                      icon: Icon(obscureConfirm
                          ? Icons.visibility_outlined
                          : Icons.visibility_off_outlined),
                      onPressed: () =>
                          setSheet(() => obscureConfirm = !obscureConfirm),
                    ),
                  ),
                  validator: (v) {
                    if (v != pinController.text) return 'PINs do not match';
                    return null;
                  },
                ),
                const SizedBox(height: 20),
                Container(
                  width: double.infinity,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(12),
                    gradient: AppColors.gradientBrand,
                  ),
                  child: ElevatedButton(
                    onPressed: () async {
                      if (!formKey.currentState!.validate()) return;
                      final notifier = ref.read(appLockProvider.notifier);
                      await notifier.setPin(pinController.text);
                      await notifier.toggleLock(true);
                      if (ctx.mounted) Navigator.pop(ctx);
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.transparent,
                      shadowColor: Colors.transparent,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                    ),
                    child: const Text('Enable app lock',
                        style: TextStyle(fontWeight: FontWeight.w600)),
                  ),
                ),
                const SizedBox(height: 16),
              ],
            ),
          ),
        ),
      ),
    );
  }

  static const _timeoutOptions = [0, 15, 30, 60, 120, 300];

  String _timeoutLabel(int seconds) {
    switch (seconds) {
      case 0:
        return 'Never';
      case 15:
        return '15 seconds';
      case 30:
        return '30 seconds';
      case 60:
        return '1 minute';
      case 120:
        return '2 minutes';
      case 300:
        return '5 minutes';
      default:
        return 'Never';
    }
  }

  void _showTimeoutPicker() {
    final current =
        ref.read(appLockProvider).inactivityTimeout;

    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 20, 24, 12),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      gradient: AppColors.gradientBrand,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(Icons.timer_outlined,
                        color: Colors.white, size: 20),
                  ),
                  const SizedBox(width: 12),
                  Text('Auto-lock timeout',
                      style: AppTheme.brandTitle(20)),
                ],
              ),
            ),
            const SizedBox(height: 8),
            ..._timeoutOptions.map((seconds) {
              final selected = seconds == current;
              return ListTile(
                leading: Icon(
                  selected
                      ? Icons.radio_button_checked
                      : Icons.radio_button_unchecked,
                  color: selected
                      ? AppColors.primary
                      : AppColors.textMuted,
                ),
                title: Text(_timeoutLabel(seconds)),
                subtitle: seconds == 0
                    ? const Text('App stays unlocked until you leave it')
                    : Text(
                        'Lock after ${_timeoutLabel(seconds)} of inactivity'),
                selected: selected,
                onTap: () {
                  ref
                      .read(appLockProvider.notifier)
                      .setInactivityTimeout(seconds);
                  Navigator.pop(ctx);
                },
              );
            }),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final me = ref.watch(currentUserProvider).value;
    if (me == null) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    void toggle(String field, bool value) {
      ref.read(userRepositoryProvider).setFlag(me.uid, field, value);
    }

    bool flag(String key, bool fallback) =>
        (me.raw[key] as bool?) ?? fallback;

    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [AppColors.primary, AppColors.accent],
                ),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.settings, color: Colors.white, size: 20),
            ),
            const SizedBox(width: 10),
            const Text('Settings'),
          ],
        ),
      ),
      body: ListView(
        children: [
          _Header('Account', Icons.person_outline),
          Card(
            margin: const EdgeInsets.symmetric(horizontal: 16),
            child: Column(
              children: [
                _SettingTile(
                    icon: Icons.mail_outline, title: 'Email', value: me.email),
                _SettingTile(
                    icon: Icons.alternate_email,
                    title: 'Username',
                    value: '@${me.username}'),
                _SettingTile(
                    icon: Icons.verified_user_outlined,
                    title: 'Provider',
                    value: me.provider),
              ],
            ),
          ),
          const SizedBox(height: 8),
          _Header('Privacy', Icons.lock_outline),
          Card(
            margin: const EdgeInsets.symmetric(horizontal: 16),
            child: Column(
              children: [
                _SwitchTile(
                  icon: Icons.circle,
                  iconColor: AppColors.success,
                  title: 'Show online status',
                  value: flag('showOnline', true),
                  onChanged: (v) => toggle('showOnline', v),
                ),
                Divider(
                    height: 1,
                    color: AppColors.border.withValues(alpha: 0.5)),
                _SwitchTile(
                  icon: Icons.chat_bubble_outline,
                  title: 'Allow direct messages',
                  value: flag('allowDMs', true),
                  onChanged: (v) => toggle('allowDMs', v),
                ),
                Divider(
                    height: 1,
                    color: AppColors.border.withValues(alpha: 0.5)),
                _SwitchTile(
                  icon: Icons.public,
                  title: 'Public profile',
                  value: flag('publicProfile', true),
                  onChanged: (v) => toggle('publicProfile', v),
                ),
                Divider(
                    height: 1,
                    color: AppColors.border.withValues(alpha: 0.5)),
                _SwitchTile(
                  icon: Icons.notifications_outlined,
                  title: 'Email notifications',
                  value: flag('emailNotifs', false),
                  onChanged: (v) => toggle('emailNotifs', v),
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),
          _Header('App security', Icons.lock_outline),
          Card(
            margin: const EdgeInsets.symmetric(horizontal: 16),
            child: Column(
              children: [
                _SwitchTile(
                  icon: Icons.lock,
                  iconColor: AppColors.primary,
                  title: 'App lock (PIN)',
                  value: ref.watch(appLockProvider).enabled,
                  onChanged: (v) {
                    if (v) {
                      _showSetupPinSheet();
                    } else {
                      ref.read(appLockProvider.notifier).toggleLock(false);
                    }
                  },
                ),
                if (ref.watch(appLockProvider).enabled) ...[
                  Divider(
                      height: 1,
                      color: AppColors.border.withValues(alpha: 0.5)),
                  _SwitchTile(
                    icon: Icons.fingerprint,
                    iconColor: AppColors.primary,
                    title: 'Fingerprint unlock',
                    value: ref.watch(appLockProvider).biometricEnabled,
                    onChanged: (v) =>
                        ref.read(appLockProvider.notifier).toggleBiometric(v),
                  ),
                  Divider(
                      height: 1,
                      color: AppColors.border.withValues(alpha: 0.5)),
                  ListTile(
                    leading: Icon(Icons.timer_outlined,
                        color: AppColors.textMuted),
                    title: const Text('Auto-lock timeout'),
                    subtitle: Text(_timeoutLabel(
                        ref.watch(appLockProvider).inactivityTimeout)),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: () => _showTimeoutPicker(),
                  ),
                ],
              ],
            ),
          ),
          if (me.isAdmin) ...[
            const SizedBox(height: 8),
            Card(
              margin: const EdgeInsets.symmetric(horizontal: 16),
              child: ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: AppColors.warning.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.shield, color: AppColors.warning),
                ),
                title: const Text('Admin panel'),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => context.push('/admin'),
              ),
            ),
          ],
          const SizedBox(height: 8),
          _Header('Account actions', Icons.warning_amber_outlined),
          Card(
            margin: const EdgeInsets.symmetric(horizontal: 16),
            child: Column(
              children: [
                ListTile(
                  leading: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: AppColors.danger.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(Icons.delete_outline,
                        color: AppColors.danger),
                  ),
                  title: const Text('Request account deletion'),
                  onTap: () async {
                    final uri = Uri.parse(
                        'mailto:$kAdminEmail?subject=Delete%20my%20DevSocio%20account');
                    if (await canLaunchUrl(uri)) await launchUrl(uri);
                  },
                ),
                Divider(
                    height: 1,
                    color: AppColors.border.withValues(alpha: 0.5)),
                ListTile(
                  leading: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: AppColors.danger.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child:
                        const Icon(Icons.logout, color: AppColors.danger),
                  ),
                  title: const Text('Log out',
                      style: TextStyle(color: AppColors.danger)),
                  onTap: () async {
                    await ref.read(authRepositoryProvider).logout();
                    if (context.mounted) {
                      showToast(context, 'Logged out.');
                      context.go('/');
                    }
                  },
                ),
              ],
            ),
          ),
          const SizedBox(height: 30),
        ],
      ),
    );
  }
}

class _Header extends StatelessWidget {
  final String text;
  final IconData icon;
  const _Header(this.text, this.icon);

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
        child: Row(
          children: [
            Icon(icon, size: 16, color: AppColors.textMuted),
            const SizedBox(width: 8),
            Text(text.toUpperCase(),
                style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 1,
                    color: AppColors.textMuted)),
          ],
        ),
      );
}

class _SettingTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final String value;
  const _SettingTile(
      {required this.icon, required this.title, required this.value});

  @override
  Widget build(BuildContext context) => ListTile(
        leading: Icon(icon, color: AppColors.textMuted),
        title: Text(title),
        subtitle: Text(value,
            style: const TextStyle(color: AppColors.textSecondary)),
      );
}

class _SwitchTile extends StatelessWidget {
  final IconData icon;
  final Color? iconColor;
  final String title;
  final bool value;
  final ValueChanged<bool> onChanged;
  const _SwitchTile(
      {required this.icon,
      this.iconColor,
      required this.title,
      required this.value,
      required this.onChanged});

  @override
  Widget build(BuildContext context) => SwitchListTile(
        secondary: Icon(icon, color: iconColor ?? AppColors.textMuted),
        title: Text(title),
        value: value,
        onChanged: onChanged,
        activeThumbColor: AppColors.primary,
        activeTrackColor: AppColors.primary.withValues(alpha: 0.3),
      );
}
