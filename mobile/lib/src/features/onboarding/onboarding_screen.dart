import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/constants.dart';
import '../../core/theme.dart';
import '../../data/social_repository.dart';
import '../../data/user_repository.dart';
import '../../widgets/avatar.dart';
import '../../widgets/badges.dart';
import '../../widgets/ui.dart';

/// Guided onboarding wizard shown to new users after signup.
/// Steps: Welcome → Tech Stack → Dev Level → Follow Suggestions → Done.
class OnboardingScreen extends ConsumerStatefulWidget {
  const OnboardingScreen({super.key});

  @override
  ConsumerState<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends ConsumerState<OnboardingScreen> {
  int _step = 0;

  // Data collected across steps.
  final Set<String> _stack = {};
  String _devLevel = 'Builder';
  bool _openToCollab = true;
  bool _lookingForCofounder = false;
  final Set<String> _followUids = {};
  bool _saving = false;

  static const _totalSteps = 4;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _prefill());
  }

  void _prefill() {
    final me = ref.read(currentUserProvider).value;
    if (me == null) return;
    if (me.techStack.isNotEmpty) {
      setState(() => _stack.addAll(me.techStack));
    }
    if (kDevLevels.contains(me.devLevel)) {
      setState(() => _devLevel = me.devLevel);
    }
    setState(() {
      _openToCollab = me.openToCollab;
      _lookingForCofounder = me.lookingForCofounder;
    });
  }

  Future<void> _finish() async {
    final me = ref.read(currentUserProvider).value;
    if (me == null) return;

    setState(() => _saving = true);
    try {
      // Save profile preferences if changed from defaults.
      await ref.read(userRepositoryProvider).updateProfile(me.uid, {
        'techStack': _stack.toList(),
        'devLevel': _devLevel,
        'openToCollab': _openToCollab,
        'lookingForCofounder': _lookingForCofounder,
      });

      // Follow selected users.
      for (final targetUid in _followUids) {
        await ref
            .read(userRepositoryProvider)
            .setFollow(me.uid, targetUid, true);
        ref.read(socialRepositoryProvider).pushNotification(targetUid, {
          'type': 'follow',
          'actorUid': me.uid,
          'actor': me.asAuthor.toMap(),
          'text': 'started following you',
        }).catchError((_) {});
      }

      // Mark onboarding as done.
      await ref.read(userRepositoryProvider).markOnboardingDone(me.uid);

      if (mounted) {
        showToast(context, 'Welcome to DevSocio! 🚀');
        context.go('/feed');
      }
    } catch (e) {
      if (mounted) {
        showToast(context, 'Could not save: $e', error: true);
        // don't redirect on error — let the user retry
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: RadialGradient(
            center: Alignment.topCenter,
            radius: 1.5,
            colors: [
              AppColors.primary.withValues(alpha: 0.2),
              AppColors.accent.withValues(alpha: 0.08),
              AppColors.bg,
              AppColors.bg,
            ],
          ),
        ),
        child: SafeArea(
          child: Column(
            children: [
              // Progress indicator
              Padding(
                padding: const EdgeInsets.fromLTRB(24, 16, 24, 8),
                child: Row(
                  children: [
                    for (int i = 0; i < _totalSteps; i++)
                      Expanded(
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 3),
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 400),
                            height: 4,
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(2),
                              gradient: i <= _step
                                  ? AppColors.gradientBrand
                                  : null,
                              color: i <= _step
                                  ? null
                                  : AppColors.border.withValues(alpha: 0.3),
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
              // Step title
              Padding(
                padding: const EdgeInsets.fromLTRB(24, 8, 24, 0),
                child: Row(
                  children: [
                    AnimatedContainer(
                      duration: const Duration(milliseconds: 300),
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        gradient: AppColors.gradientBrand,
                        borderRadius: BorderRadius.circular(10),
                        boxShadow: [
                          BoxShadow(
                            color: AppColors.primary.withValues(alpha: 0.3),
                            blurRadius: 12,
                            spreadRadius: 2,
                          ),
                        ],
                      ),
                      child: Icon(_stepIcon, color: Colors.white, size: 22),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            _stepTitle,
                            style: AppTheme.brandTitle(20),
                          ),
                          Text(
                            _stepSubtitle,
                            style: const TextStyle(
                              color: AppColors.textMuted,
                              fontSize: 13,
                            ),
                          ),
                        ],
                      ),
                    ),
                    _saving
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const SizedBox.shrink(),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              // Step content
              Expanded(
                child: AnimatedSwitcher(
                  duration: const Duration(milliseconds: 300),
                  child: _buildStepContent(),
                ),
              ),
              // Bottom navigation
              Padding(
                padding: const EdgeInsets.fromLTRB(24, 12, 24, 24),
                child: Row(
                  children: [
                    if (_step > 0)
                      OutlinedButton(
                        onPressed: () =>
                            setState(() => _step = (_step - 1).clamp(0, _totalSteps - 1)),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: AppColors.textPrimary,
                          side: const BorderSide(color: AppColors.border),
                          padding: const EdgeInsets.symmetric(
                              horizontal: 24, vertical: 14),
                        ),
                        child: const Text('Back'),
                      )
                    else
                      const SizedBox.shrink(),
                    const Spacer(),
                    Container(
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(12),
                        gradient: AppColors.gradientBrand,
                        boxShadow: [
                          BoxShadow(
                            color: AppColors.primary.withValues(alpha: 0.3),
                            blurRadius: 12,
                            spreadRadius: 1,
                          ),
                        ],
                      ),
                      child: ElevatedButton(
                        onPressed: _saving
                            ? null
                            : () {
                                if (_step >= _totalSteps - 1) {
                                  _finish();
                                } else {
                                  setState(() =>
                                      _step = (_step + 1).clamp(0, _totalSteps - 1));
                                }
                              },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.transparent,
                          shadowColor: Colors.transparent,
                          padding: const EdgeInsets.symmetric(
                              horizontal: 28, vertical: 14),
                        ),
                        child: Text(
                          _step >= _totalSteps - 1 ? 'Get started 🚀' : 'Continue',
                          style: const TextStyle(
                              fontWeight: FontWeight.w600, fontSize: 15),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  IconData get _stepIcon {
    switch (_step) {
      case 0:
        return Icons.auto_awesome;
      case 1:
        return Icons.code;
      case 2:
        return Icons.psychology;
      case 3:
        return Icons.people;
      default:
        return Icons.auto_awesome;
    }
  }

  String get _stepTitle {
    switch (_step) {
      case 0:
        return 'Welcome to DevSocio';
      case 1:
        return 'Your tech stack';
      case 2:
        return 'Your developer level';
      case 3:
        return 'Who to follow';
      default:
        return '';
    }
  }

  String get _stepSubtitle {
    switch (_step) {
      case 0:
        return 'Let\'s set up your profile in a few quick steps.';
      case 1:
        return 'Select the technologies you work with.';
      case 2:
        return 'Tell us about your experience level.';
      case 3:
        return 'Follow some developers to get started.';
      default:
        return '';
    }
  }

  Widget _buildStepContent() {
    switch (_step) {
      case 0:
        return _buildWelcomeStep();
      case 1:
        return _buildTechStackStep();
      case 2:
        return _buildDevLevelStep();
      case 3:
        return _buildFollowStep();
      default:
        return const SizedBox.shrink();
    }
  }

  // ─── Step 0: Welcome ───────────────────────────────

  Widget _buildWelcomeStep() {
    return ListView(
      key: const ValueKey('welcome'),
      padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
      children: [
        // Big animated icon
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(24),
          child: Column(
            children: [
              Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  gradient: AppColors.gradientBrand,
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.primary.withValues(alpha: 0.3),
                      blurRadius: 30,
                      spreadRadius: 5,
                    ),
                  ],
                ),
                child: const Icon(Icons.terminal, size: 48, color: Colors.white),
              ),
              const SizedBox(height: 20),
              Text(
                "You've joined $_totalSteps developers building the future.",
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 15,
                  color: AppColors.textSecondary.withValues(alpha: 0.8),
                  height: 1.4,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        // Feature highlights
        _featureCard(
          icon: Icons.code,
          title: 'Share your work',
          subtitle: 'Post code, projects, memes, and ideas.',
        ),
        const SizedBox(height: 8),
        _featureCard(
          icon: Icons.groups,
          title: 'Connect with devs',
          subtitle: 'Find collaborators, co-founders, and friends.',
        ),
        const SizedBox(height: 8),
        _featureCard(
          icon: Icons.auto_awesome,
          title: 'AI-powered insights',
          subtitle: 'Get AI feedback on posts and ideas.',
        ),
      ],
    );
  }

  Widget _featureCard({
    required IconData icon,
    required String title,
    required String subtitle,
  }) {
    return Card(
      margin: EdgeInsets.zero,
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.border.withValues(alpha: 0.4)),
          gradient: LinearGradient(
            colors: [
              AppColors.primary.withValues(alpha: 0.05),
              AppColors.surface,
            ],
          ),
        ),
        child: ListTile(
          leading: Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              gradient: AppColors.gradientBrand,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: Colors.white, size: 22),
          ),
          title: Text(title, style: const TextStyle(fontWeight: FontWeight.w600)),
          subtitle: Text(subtitle),
        ),
      ),
    );
  }

  // ─── Step 1: Tech Stack ─────────────────────────────

  Widget _buildTechStackStep() {
    return ListView(
      key: const ValueKey('stack'),
      padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
      children: [
        Text(
          'Pick your tools (${_stack.length} selected)',
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w600,
            color: AppColors.primary.withValues(alpha: 0.8),
          ),
        ),
        const SizedBox(height: 8),
        Wrap(
          spacing: 10,
          runSpacing: 10,
          children: [
            for (final tech in kTechStackOptions)
              FilterChip(
                label: Text(tech, style: const TextStyle(fontSize: 13)),
                selected: _stack.contains(tech),
                onSelected: (sel) =>
                    setState(() => sel ? _stack.add(tech) : _stack.remove(tech)),
                selectedColor: AppColors.primary.withValues(alpha: 0.3),
                checkmarkColor: AppColors.primary,
                backgroundColor: AppColors.surfaceAlt,
                labelStyle: TextStyle(
                  color: _stack.contains(tech)
                      ? Colors.white
                      : AppColors.textPrimary,
                ),
                padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 8),
              ),
          ],
        ),
      ],
    );
  }

  // ─── Step 2: Dev Level & Preferences ────────────────

  Widget _buildDevLevelStep() {
    return ListView(
      key: const ValueKey('level'),
      padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
      children: [
        const Text('Experience level',
            style: TextStyle(fontWeight: FontWeight.w600, color: AppColors.textSecondary)),
        const SizedBox(height: 10),
        Wrap(
          spacing: 10,
          runSpacing: 10,
          children: [
            for (final lvl in kDevLevels)
              ChoiceChip(
                label: Text(lvl),
                selected: _devLevel == lvl,
                onSelected: (_) => setState(() => _devLevel = lvl),
                selectedColor: AppColors.primary,
                backgroundColor: AppColors.surfaceAlt,
                labelStyle: TextStyle(
                  color: _devLevel == lvl ? Colors.white : AppColors.textPrimary,
                  fontWeight: FontWeight.w600,
                ),
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              ),
          ],
        ),
        const SizedBox(height: 24),
        const Text('Preferences',
            style: TextStyle(fontWeight: FontWeight.w600, color: AppColors.textSecondary)),
        const SizedBox(height: 10),
        Card(
          margin: EdgeInsets.zero,
          child: Column(
            children: [
              SwitchListTile(
                contentPadding: const EdgeInsets.symmetric(horizontal: 16),
                value: _openToCollab,
                onChanged: (v) => setState(() => _openToCollab = v),
                title: const Text('Open to collaborate'),
                subtitle: const Text('Let others know you\'re looking to work together'),
                activeThumbColor: AppColors.primary,
                activeTrackColor: AppColors.primary.withValues(alpha: 0.3),
              ),
              const Divider(height: 1, color: AppColors.border),
              SwitchListTile(
                contentPadding: const EdgeInsets.symmetric(horizontal: 16),
                value: _lookingForCofounder,
                onChanged: (v) => setState(() => _lookingForCofounder = v),
                title: const Text('Looking for a co-founder'),
                subtitle: const Text('Show that you want to start something new'),
                activeThumbColor: AppColors.primary,
                activeTrackColor: AppColors.primary.withValues(alpha: 0.3),
              ),
            ],
          ),
        ),
      ],
    );
  }

  // ─── Step 3: Follow Suggestions ─────────────────────

  Widget _buildFollowStep() {
    final usersAsync = ref.watch(usersProvider);
    final me = ref.watch(currentUserProvider).value;

    return usersAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => Center(child: Text('Error: $e')),
      data: (users) {
        // Suggest users who share tech stack interests, excluding self.
        final suggestions = users
            .where((u) => u.uid != me?.uid)
            .toList()
          ..sort((a, b) {
            // Prioritize users with matching tech.
            final aMatch = a.techStack.any((t) => _stack.contains(t)) ? 1 : 0;
            final bMatch = b.techStack.any((t) => _stack.contains(t)) ? 1 : 0;
            if (aMatch != bMatch) return bMatch.compareTo(aMatch);
            return b.followersCount.compareTo(a.followersCount);
          });

        return ListView(
          padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
          children: [
            Text(
              'Suggested developers (${_followUids.length} followed)',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: AppColors.primary.withValues(alpha: 0.8),
              ),
            ),
            const SizedBox(height: 8),
            if (suggestions.isEmpty)
              const Padding(
                padding: EdgeInsets.all(24),
                child: Text('No suggestions yet.',
                    style: TextStyle(color: AppColors.textMuted)),
              )
            else
              ...suggestions.take(10).map((u) {
                final isFollowing = _followUids.contains(u.uid);
                return Card(
                  margin: const EdgeInsets.only(bottom: 6),
                  child: Container(
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(12),
                      border: isFollowing
                          ? Border.all(
                              color: AppColors.primary.withValues(alpha: 0.3))
                          : null,
                    ),
                    child: ListTile(
                      onTap: () {
                        setState(() {
                          if (isFollowing) {
                            _followUids.remove(u.uid);
                          } else {
                            _followUids.add(u.uid);
                          }
                        });
                      },
                      leading: Avatar(
                          url: u.avatar, size: 44, online: u.isOnline),
                      title: NameWithBadges.fromUser(u),
                      subtitle: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('@${u.username} · ${u.devLevel}',
                              style: const TextStyle(
                                  fontSize: 12, color: AppColors.textMuted)),
                          if (u.techStack.isNotEmpty)
                            Text(
                                u.techStack.take(3).join(' · '),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                    fontSize: 11,
                                    color: AppColors.primary
                                        .withValues(alpha: 0.7))),
                        ],
                      ),
                      trailing: Icon(
                        isFollowing ? Icons.check_circle : Icons.add_circle_outline,
                        color: isFollowing
                            ? AppColors.primary
                            : AppColors.textMuted,
                      ),
                    ),
                  ),
                );
              }),
            if (suggestions.length > 10)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Text(
                  '+ ${suggestions.length - 10} more developers in Explore',
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                      fontSize: 12, color: AppColors.textMuted),
                ),
              ),
          ],
        );
      },
    );
  }
}
