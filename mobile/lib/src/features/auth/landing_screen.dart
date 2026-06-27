import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/constants.dart';
import '../../core/theme.dart';

class LandingScreen extends StatefulWidget {
  const LandingScreen({super.key});

  @override
  State<LandingScreen> createState() => _LandingScreenState();
}

class _LandingScreenState extends State<LandingScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _fadeIn;
  late Animation<Offset> _slideUp;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    );
    _fadeIn = CurvedAnimation(parent: _controller, curve: Curves.easeOut);
    _slideUp = Tween<Offset>(
      begin: const Offset(0, 0.1),
      end: Offset.zero,
    ).animate(CurvedAnimation(parent: _controller, curve: Curves.easeOut));
    _controller.forward();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: RadialGradient(
            center: Alignment.topRight,
            radius: 1.5,
            colors: [
              AppColors.primary.withValues(alpha: 0.3),
              AppColors.accent.withValues(alpha: 0.1),
              AppColors.bg,
              AppColors.bg,
            ],
          ),
        ),
        child: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(24, 32, 24, 24),
            child: FadeTransition(
              opacity: _fadeIn,
              child: SlideTransition(
                position: _slideUp,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Logo
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            gradient: AppColors.gradientBrand,
                            borderRadius: BorderRadius.circular(14),
                            boxShadow: [
                              BoxShadow(
                                color: AppColors.primary.withValues(alpha: 0.4),
                                blurRadius: 20,
                                spreadRadius: 2,
                              ),
                            ],
                          ),
                          child: const Icon(Icons.terminal,
                              color: Colors.white, size: 28),
                        ),
                        const SizedBox(width: 14),
                        Text('DevSocio',
                            style: AppTheme.brandTitle(28)),
                      ],
                    ),
                    const SizedBox(height: 48),
                    // Hero text with gradient
                    ShaderMask(
                      shaderCallback: (b) => const LinearGradient(
                        colors: [AppColors.primary, AppColors.accent],
                      ).createShader(b),
                      child: const Text(
                        'Where Developers\nLive Online',
                        style: TextStyle(
                          fontSize: 42,
                          fontWeight: FontWeight.w800,
                          height: 1.1,
                          color: Colors.white,
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    const Text(
                      'The social platform built exclusively for developers. '
                      'Showcase projects, share ideas, find collaborators — '
                      'without the corporate noise.',
                      style: TextStyle(
                          fontSize: 16,
                          color: AppColors.textMuted,
                          height: 1.5),
                    ),
                    const SizedBox(height: 32),
                    // Buttons
                    SizedBox(
                      width: double.infinity,
                      child: Container(
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(12),
                          gradient: AppColors.gradientBrand,
                          boxShadow: [
                            BoxShadow(
                              color:
                                  AppColors.primary.withValues(alpha: 0.4),
                              blurRadius: 20,
                              spreadRadius: 0,
                            ),
                          ],
                        ),
                        child: ElevatedButton(
                          onPressed: () => context.go('/signup'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.transparent,
                            shadowColor: Colors.transparent,
                            padding:
                                const EdgeInsets.symmetric(vertical: 16),
                          ),
                          child: const Padding(
                            padding: EdgeInsets.symmetric(vertical: 4),
                            child: Text('Get started — it\'s free',
                                style: TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w600)),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 14),
                    SizedBox(
                      width: double.infinity,
                      child: OutlinedButton(
                        onPressed: () => context.go('/login'),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: AppColors.textPrimary,
                          side: const BorderSide(
                              color: AppColors.borderLight),
                          padding:
                              const EdgeInsets.symmetric(vertical: 16),
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12)),
                        ),
                        child: const Text('I already have an account',
                            style: TextStyle(fontSize: 16)),
                      ),
                    ),
                    const SizedBox(height: 48),
                    // Post types section
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(6),
                          decoration: BoxDecoration(
                            gradient: AppColors.gradientBrand,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Icon(Icons.edit_note,
                              color: Colors.white, size: 18),
                        ),
                        const SizedBox(width: 10),
                        const Text('Six ways to post',
                            style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.w700)),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Wrap(
                      spacing: 10,
                      runSpacing: 10,
                      children: [
                        for (final t in kPostTypes)
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 14, vertical: 10),
                            decoration: BoxDecoration(
                              gradient: LinearGradient(
                                colors: [
                                  t.tint.withValues(alpha: 0.1),
                                  AppColors.surface,
                                ],
                                begin: Alignment.centerLeft,
                                end: Alignment.centerRight,
                              ),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: t.tint.withValues(alpha: 0.3),
                              ),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(t.icon, size: 18, color: t.tint),
                                const SizedBox(width: 8),
                                Text(t.label,
                                    style: TextStyle(
                                        fontSize: 13,
                                        fontWeight: FontWeight.w500,
                                        color: t.tint)),
                              ],
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 40),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
