import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/constants.dart';
import '../../core/theme.dart';
import '../../data/auth_repository.dart';
import '../../data/credits_api.dart';
import '../../widgets/ui.dart';

class SignupScreen extends ConsumerStatefulWidget {
  const SignupScreen({super.key});
  @override
  ConsumerState<SignupScreen> createState() => _SignupScreenState();
}

class _SignupScreenState extends ConsumerState<SignupScreen> {
  final _form = GlobalKey<FormState>();
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _username = TextEditingController();
  final _displayName = TextEditingController();
  final _referral = TextEditingController();

  String _devLevel = 'Builder';
  final Set<String> _stack = {'React'};
  bool _loading = false;
  bool _obscure = true;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    _username.dispose();
    _displayName.dispose();
    _referral.dispose();
    super.dispose();
  }

  Future<void> _signup() async {
    if (!_form.currentState!.validate()) return;
    if (_stack.isEmpty) {
      showToast(context, 'Pick at least one tech.', error: true);
      return;
    }
    setState(() => _loading = true);
    try {
      final referredBy = _referral.text.trim().isEmpty
          ? null
          : _referral.text.trim().replaceAll('@', '');
      await ref.read(authRepositoryProvider).emailSignup(
            email: _email.text.trim(),
            password: _password.text,
            username: _username.text.trim().replaceAll('@', ''),
            displayName: _displayName.text.trim().isEmpty
                ? _username.text.trim()
                : _displayName.text.trim(),
            devLevel: _devLevel,
            techStack: _stack.toList(),
            referredBy: referredBy,
          );
      // Server-trusted referral payout (+150 to both) — best effort.
      if (referredBy != null) {
        await ref.read(creditsApiProvider).tryCall(
            () => ref.read(creditsApiProvider).referralSignup());
      }
      if (mounted) context.go('/feed');
    } catch (e) {
      if (mounted) showToast(context, authErrorMessage(e), error: true);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(leading: BackButton(onPressed: () => context.go('/'))),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Form(
            key: _form,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const BrandMark(),
                const SizedBox(height: 28),
                Text('Create your account', style: AppTheme.brandTitle),
                const SizedBox(height: 4),
                const Text('Join the developer community — +100 credits to start',
                    style: TextStyle(color: AppColors.textMuted)),
                const SizedBox(height: 24),
                TextFormField(
                  controller: _displayName,
                  textCapitalization: TextCapitalization.words,
                  decoration: const InputDecoration(
                      hintText: 'Display name',
                      prefixIcon: Icon(Icons.badge_outlined)),
                ),
                const SizedBox(height: 14),
                TextFormField(
                  controller: _username,
                  decoration: const InputDecoration(
                      hintText: 'Username (handle)',
                      prefixIcon: Icon(Icons.alternate_email)),
                  validator: (v) => (v == null || v.trim().length < 3)
                      ? 'At least 3 characters'
                      : null,
                ),
                const SizedBox(height: 14),
                TextFormField(
                  controller: _email,
                  keyboardType: TextInputType.emailAddress,
                  decoration: const InputDecoration(
                      hintText: 'Email', prefixIcon: Icon(Icons.mail_outline)),
                  validator: (v) => (v == null || !v.contains('@'))
                      ? 'Enter a valid email'
                      : null,
                ),
                const SizedBox(height: 14),
                TextFormField(
                  controller: _password,
                  obscureText: _obscure,
                  decoration: InputDecoration(
                    hintText: 'Password (min 6 chars)',
                    prefixIcon: const Icon(Icons.lock_outline),
                    suffixIcon: IconButton(
                      icon: Icon(_obscure
                          ? Icons.visibility_outlined
                          : Icons.visibility_off_outlined),
                      onPressed: () => setState(() => _obscure = !_obscure),
                    ),
                  ),
                  validator: (v) =>
                      (v == null || v.length < 6) ? 'At least 6 characters' : null,
                ),
                const SizedBox(height: 20),
                const Text('Dev level',
                    style: TextStyle(fontWeight: FontWeight.w600)),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  children: [
                    for (final lvl in kDevLevels)
                      ChoiceChip(
                        label: Text(lvl),
                        selected: _devLevel == lvl,
                        onSelected: (_) => setState(() => _devLevel = lvl),
                        selectedColor: AppColors.primary,
                        backgroundColor: AppColors.surfaceAlt,
                        labelStyle: TextStyle(
                            color: _devLevel == lvl
                                ? Colors.white
                                : AppColors.textPrimary),
                      ),
                  ],
                ),
                const SizedBox(height: 20),
                Text('Tech stack (${_stack.length})',
                    style: const TextStyle(fontWeight: FontWeight.w600)),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    for (final tech in kTechStackOptions)
                      FilterChip(
                        label: Text(tech),
                        selected: _stack.contains(tech),
                        onSelected: (sel) => setState(() =>
                            sel ? _stack.add(tech) : _stack.remove(tech)),
                        selectedColor: AppColors.primary.withValues(alpha: 0.3),
                        checkmarkColor: AppColors.primary,
                        backgroundColor: AppColors.surfaceAlt,
                      ),
                  ],
                ),
                const SizedBox(height: 20),
                TextFormField(
                  controller: _referral,
                  decoration: const InputDecoration(
                      hintText: 'Referral code (optional)',
                      prefixIcon: Icon(Icons.card_giftcard_outlined)),
                ),
                const SizedBox(height: 24),
                PrimaryButton(
                    label: 'Create account',
                    onPressed: _signup,
                    loading: _loading),
                const SizedBox(height: 20),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Text('Already have an account? ',
                        style: TextStyle(color: AppColors.textMuted)),
                    GestureDetector(
                      onTap: () => context.go('/login'),
                      child: const Text('Log in',
                          style: TextStyle(
                              color: AppColors.primary,
                              fontWeight: FontWeight.w600)),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
