import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/constants.dart';
import '../../core/theme.dart';
import '../../data/auth_repository.dart';
import '../../data/user_repository.dart';
import '../../widgets/ui.dart';

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
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
      appBar: AppBar(title: const Text('Settings')),
      body: ListView(
        children: [
          const _Header('Account'),
          ListTile(
            leading: const Icon(Icons.mail_outline),
            title: const Text('Email'),
            subtitle: Text(me.email),
          ),
          ListTile(
            leading: const Icon(Icons.alternate_email),
            title: const Text('Username'),
            subtitle: Text('@${me.username}'),
          ),
          ListTile(
            leading: const Icon(Icons.verified_user_outlined),
            title: const Text('Provider'),
            subtitle: Text(me.provider),
          ),
          const Divider(color: AppColors.border),
          const _Header('Privacy'),
          SwitchListTile(
            secondary: const Icon(Icons.circle, color: AppColors.success, size: 16),
            title: const Text('Show online status'),
            value: flag('showOnline', true),
            onChanged: (v) => toggle('showOnline', v),
            activeThumbColor: AppColors.primary,
          ),
          SwitchListTile(
            secondary: const Icon(Icons.chat_bubble_outline),
            title: const Text('Allow direct messages'),
            value: flag('allowDMs', true),
            onChanged: (v) => toggle('allowDMs', v),
            activeThumbColor: AppColors.primary,
          ),
          SwitchListTile(
            secondary: const Icon(Icons.public),
            title: const Text('Public profile'),
            value: flag('publicProfile', true),
            onChanged: (v) => toggle('publicProfile', v),
            activeThumbColor: AppColors.primary,
          ),
          SwitchListTile(
            secondary: const Icon(Icons.notifications_outlined),
            title: const Text('Email notifications'),
            value: flag('emailNotifs', false),
            onChanged: (v) => toggle('emailNotifs', v),
            activeThumbColor: AppColors.primary,
          ),
          const Divider(color: AppColors.border),
          if (me.isAdmin)
            ListTile(
              leading: const Icon(Icons.shield, color: AppColors.warning),
              title: const Text('Admin panel'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => context.push('/admin'),
            ),
          const _Header('Account actions'),
          ListTile(
            leading: const Icon(Icons.delete_outline, color: AppColors.danger),
            title: const Text('Request account deletion'),
            onTap: () async {
              final uri = Uri.parse(
                  'mailto:$kAdminEmail?subject=Delete%20my%20DevSocio%20account');
              if (await canLaunchUrl(uri)) await launchUrl(uri);
            },
          ),
          ListTile(
            leading: const Icon(Icons.logout, color: AppColors.danger),
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
          const SizedBox(height: 30),
        ],
      ),
    );
  }
}

class _Header extends StatelessWidget {
  final String text;
  const _Header(this.text);
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 4),
        child: Text(text.toUpperCase(),
            style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                letterSpacing: 1,
                color: AppColors.textMuted)),
      );
}
