import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:package_info_plus/package_info_plus.dart';

import '../../core/changelog.dart';
import '../../core/theme.dart';
import 'whats_new_screen.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen>
    with TickerProviderStateMixin {
  late AnimationController _logoController;
  late AnimationController _pulseController;
  late AnimationController _textController;
  late AnimationController _glowController;

  late Animation<double> _logoScale;
  late Animation<double> _logoFade;
  late Animation<double> _pulseScale;
  late Animation<double> _textSlide;
  late Animation<double> _textFade;
  late Animation<double> _glowOpacity;

  @override
  void initState() {
    super.initState();

    // Logo entrance: scale from 0.5 → 1 + fade in
    _logoController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    );
    _logoScale = Tween<double>(begin: 0.5, end: 1.0).animate(
      CurvedAnimation(parent: _logoController, curve: Curves.elasticOut),
    );
    _logoFade = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _logoController, curve: Curves.easeOut),
    );

    // Pulsing glow behind logo
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1500),
    );
    _pulseScale = Tween<double>(begin: 1.0, end: 1.15).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );

    // Glow ring opacity
    _glowController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    );
    _glowOpacity = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _glowController, curve: Curves.easeOut),
    );

    // Text slide up + fade in
    _textController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
    );
    _textSlide = Tween<double>(begin: 30.0, end: 0.0).animate(
      CurvedAnimation(parent: _textController, curve: Curves.easeOut),
    );
    _textFade = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _textController, curve: Curves.easeOut),
    );

    _startAnimations();
  }

  Future<void> _startAnimations() async {
    // Small initial delay for the app to settle
    await Future.delayed(const Duration(milliseconds: 200));
    if (!mounted) return;

    _logoController.forward();
    _glowController.forward();
    _pulseController.repeat(reverse: true);

    await Future.delayed(const Duration(milliseconds: 500));
    if (!mounted) return;
    _textController.forward();

    // Navigate after animation completes
    await Future.delayed(const Duration(milliseconds: 1500));
    if (!mounted) return;

    // Check if we should show the What's New changelog
    int buildNumber = 1;
    try {
      final packageInfo = await PackageInfo.fromPlatform();
      buildNumber = int.tryParse(packageInfo.buildNumber) ?? 1;
    } catch (_) {
      // Fallback: treat as fresh install
    }
    final shouldShow = await ChangelogStore.shouldShowChangelog(buildNumber);

    if (!mounted) return;

    if (shouldShow) {
      // Show What's New screen as a dialog, then navigate to main app
      await showDialog<bool>(
        context: context,
        barrierDismissible: false,
        useSafeArea: true,
        builder: (_) => const WhatsNewScreen(),
      );
      if (!mounted) return;
      // Mark as seen
      await ChangelogStore.setLastSeenBuild(buildNumber);
    }

    if (!mounted) return;
    context.go('/');
  }

  @override
  void dispose() {
    _logoController.dispose();
    _pulseController.dispose();
    _textController.dispose();
    _glowController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.bg,
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Animated logo container
            AnimatedBuilder(
              animation: Listenable.merge([_logoController, _glowController, _pulseController]),
              builder: (context, child) {
                return Transform.scale(
                  scale: _logoScale.value * _pulseScale.value,
                  child: Opacity(
                    opacity: _logoFade.value,
                    child: child,
                  ),
                );
              },
              child: Stack(
                alignment: Alignment.center,
                children: [
                  // Outer glow ring
                  AnimatedBuilder(
                    animation: _glowController,
                    builder: (context, _) {
                      return Container(
                        width: 140,
                        height: 140,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          boxShadow: [
                            BoxShadow(
                              color: AppColors.primary.withValues(
                                alpha: 0.3 * _glowOpacity.value,
                              ),
                              blurRadius: 60,
                              spreadRadius: 10,
                            ),
                            BoxShadow(
                              color: AppColors.accent.withValues(
                                alpha: 0.15 * _glowOpacity.value,
                              ),
                              blurRadius: 80,
                              spreadRadius: 20,
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                  // Rotating border ring
                  AnimatedBuilder(
                    animation: _glowController,
                    builder: (context, _) {
                      return Transform.rotate(
                        angle: _glowController.value * 2 * math.pi * 0.3,
                        child: Container(
                          width: 120,
                          height: 120,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            gradient: SweepGradient(
                              colors: [
                                AppColors.primary.withValues(alpha: 0.6),
                                AppColors.accent.withValues(alpha: 0.6),
                                Colors.transparent,
                                AppColors.primary.withValues(alpha: 0.6),
                              ],
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                  // Inner dark circle with icon
                  Container(
                    width: 108,
                    height: 108,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: AppColors.bg,
                      border: Border.all(
                        color: AppColors.primary.withValues(alpha: 0.4),
                        width: 2,
                      ),
                    ),
                    child: const Center(
                      child: Icon(
                        Icons.terminal_rounded,
                        size: 48,
                        color: AppColors.primary,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 32),
            // App name
            AnimatedBuilder(
              animation: _textController,
              builder: (context, _) {
                return Transform.translate(
                  offset: Offset(0, _textSlide.value),
                  child: Opacity(
                    opacity: _textFade.value,
                    child: Text(
                      'DevSocio',
                      style: GoogleFonts.spaceGrotesk(
                        fontSize: 36,
                        fontWeight: FontWeight.w800,
                        color: AppColors.textPrimary,
                        letterSpacing: -0.5,
                      ),
                    ),
                  ),
                );
              },
            ),
            const SizedBox(height: 8),
            // Tagline
            AnimatedBuilder(
              animation: _textController,
              builder: (context, _) {
                return Opacity(
                  opacity: _textFade.value * 0.7,
                  child: Text(
                    'Where Developers Live Online',
                    style: GoogleFonts.inter(
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                      color: AppColors.textMuted,
                      letterSpacing: 2,
                    ),
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}
