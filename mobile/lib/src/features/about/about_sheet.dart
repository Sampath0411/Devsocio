import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/constants.dart';
import '../../core/theme.dart';
import '../../core/theme_provider.dart';

/// About/Info bottom sheet triggered by long-pressing the home (Feed) tab.
/// Shows app credits, contact info, bug report option, and theme toggles.
class AboutSheet extends ConsumerWidget {
  const AboutSheet({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final currentTheme = ref.watch(themeModeProvider);

    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).scaffoldBackgroundColor,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(24, 12, 24, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Drag handle
              Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: AppColors.border.withValues(alpha: 0.5),
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(height: 20),

              // App icon & name
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  gradient: AppColors.gradientBrand,
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.primary.withValues(alpha: 0.3),
                      blurRadius: 20,
                      spreadRadius: 2,
                    ),
                  ],
                ),
                child: const Icon(Icons.terminal, color: Colors.white, size: 32),
              ),
              const SizedBox(height: 12),
              Text('DevSocio', style: AppTheme.brandTitle(24)),
              const SizedBox(height: 4),
              Text(
                'v1.0.0',
                style: TextStyle(
                  color: AppColors.textMuted.withValues(alpha: 0.7),
                  fontSize: 13,
                ),
              ),
              const SizedBox(height: 20),

              // Developed by
              _InfoTile(
                icon: Icons.code,
                title: 'Developed by',
                subtitle: 'Sampath',
                trailing: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    gradient: AppColors.gradientGold,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Text('Founder',
                      style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: Colors.black87)),
                ),
              ),
              const SizedBox(height: 8),

              // Contact email
              _InfoTile(
                icon: Icons.mail_outline,
                title: 'Contact',
                subtitle: kAdminEmail,
                onTap: () async {
                  final uri = Uri.parse('mailto:$kAdminEmail');
                  if (await canLaunchUrl(uri)) await launchUrl(uri);
                },
              ),
              const SizedBox(height: 8),

              // Report bug
              _InfoTile(
                icon: Icons.bug_report_outlined,
                title: 'Report a bug',
                subtitle: 'Send feedback or report issues',
                onTap: () async {
                  final subject = Uri.encodeComponent('DevSocio Bug Report');
                  final body = Uri.encodeComponent(
                      'Describe the bug you encountered:\n\n'
                      'Steps to reproduce:\n'
                      'Expected behavior:\n'
                      'Actual behavior:\n'
                      'Device/OS:');
                  final uri = Uri.parse('mailto:$kAdminEmail?subject=$subject&body=$body');
                  if (await canLaunchUrl(uri)) await launchUrl(uri);
                },
              ),

              const SizedBox(height: 20),

              // Theme section
              Row(
                children: [
                  Icon(Icons.palette_outlined,
                      size: 16, color: AppColors.textMuted),
                  const SizedBox(width: 8),
                  Text('THEME',
                      style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 1,
                          color: AppColors.textMuted)),
                ],
              ),
              const SizedBox(height: 10),

              // Theme toggle chips
              Wrap(
                spacing: 10,
                runSpacing: 10,
                children: [
                  _ThemeChip(
                    label: 'Dark',
                    icon: Icons.dark_mode,
                    selected: currentTheme == AppThemeMode.dark,
                    onTap: () => ref.read(themeModeProvider.notifier).setMode(AppThemeMode.dark),
                  ),
                  _ThemeChip(
                    label: 'Light',
                    icon: Icons.light_mode,
                    selected: currentTheme == AppThemeMode.light,
                    onTap: () => ref.read(themeModeProvider.notifier).setMode(AppThemeMode.light),
                  ),
                  _ThemeChip(
                    label: 'Pure Black',
                    icon: Icons.brightness_2,
                    selected: currentTheme == AppThemeMode.pureBlack,
                    onTap: () => ref.read(themeModeProvider.notifier).setMode(AppThemeMode.pureBlack),
                    isAmoled: true,
                  ),
                ],
              ),

              const SizedBox(height: 12),

              // Footer
              Text(
                'Where Developers Live Online',
                style: TextStyle(
                  fontSize: 12,
                  color: AppColors.textMuted.withValues(alpha: 0.6),
                  fontStyle: FontStyle.italic,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// A single row in the about section.
class _InfoTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final Widget? trailing;
  final VoidCallback? onTap;

  const _InfoTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    this.trailing,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            color: Theme.of(context).cardTheme.color?.withValues(alpha: 0.5) ??
                AppColors.surface.withValues(alpha: 0.5),
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  gradient: AppColors.gradientBrand,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, size: 18, color: Colors.white),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title,
                        style: const TextStyle(
                            fontWeight: FontWeight.w600, fontSize: 13)),
                    Text(subtitle,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                            fontSize: 12,
                            color: AppColors.textMuted)),
                  ],
                ),
              ),
              ?trailing,
              if (onTap != null && trailing == null)
                const Icon(Icons.chevron_right,
                    size: 18, color: AppColors.textMuted),
            ],
          ),
        ),
      ),
    );
  }
}

/// Theme selection chip.
class _ThemeChip extends StatelessWidget {
  final String label;
  final IconData icon;
  final bool selected;
  final VoidCallback onTap;
  final bool isAmoled;

  const _ThemeChip({
    required this.label,
    required this.icon,
    required this.selected,
    required this.onTap,
    this.isAmoled = false,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(
          gradient: selected
              ? (isAmoled
                  ? const LinearGradient(
                      colors: [Color(0xFF1A1A1A), Color(0xFF0A0A0A)])
                  : AppColors.gradientBrand)
              : null,
          color: selected ? null : AppColors.border.withValues(alpha: 0.2),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: selected
                ? (isAmoled ? Colors.white24 : AppColors.primary)
                : AppColors.border.withValues(alpha: 0.3),
            width: selected ? 1.5 : 1,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 18,
              color: selected ? Colors.white : AppColors.textMuted,
            ),
            const SizedBox(width: 8),
            Text(
              label,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: selected ? Colors.white : AppColors.textPrimary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
