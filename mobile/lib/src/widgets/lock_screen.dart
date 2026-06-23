import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';

import '../core/app_lock.dart';
import '../core/theme.dart';

class LockScreen extends ConsumerStatefulWidget {
  final Widget child;
  const LockScreen({super.key, required this.child});

  @override
  ConsumerState<LockScreen> createState() => _LockScreenState();
}

class _LockScreenState extends ConsumerState<LockScreen>
    with WidgetsBindingObserver {
  String _pin = '';
  String? _error;
  Timer? _inactivityTimer;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _resetInactivityTimer();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _inactivityTimer?.cancel();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    final lock = ref.read(appLockProvider.notifier);
    // Only lock on explicit app backgrounding (paused).
    // Do NOT lock on 'inactive' — that fires during rotation, incoming calls,
    // and quick task-switch on Android, which would lock unnecessarily.
    if (state == AppLifecycleState.paused) {
      lock.lock();
    }
    if (state == AppLifecycleState.resumed) {
      _resetInactivityTimer();
    }
  }

  /// Resets the inactivity timer based on the configured timeout.
  /// Cancels any previous timer and starts a new one.
  void _resetInactivityTimer() {
    _inactivityTimer?.cancel();
    final timeout = ref.read(appLockProvider).inactivityTimeout;
    if (timeout <= 0) return;
    _inactivityTimer = Timer(Duration(seconds: timeout), () {
      ref.read(appLockProvider.notifier).lock();
    });
  }

  /// Called on any user interaction to reset the inactivity countdown.
  void _onUserInteraction() {
    _resetInactivityTimer();
  }

  Future<void> _tryBiometric() async {
    final notifier = ref.read(appLockProvider.notifier);
    final ok = await notifier.authenticateWithBiometrics();
    if (ok) _onUserInteraction();
  }

  void _onPinDigit(String digit) {
    if (_pin.length < 4) {
      setState(() {
        _pin += digit;
        _error = null;
      });
      _onUserInteraction();
      if (_pin.length == 4) {
        _verify();
      }
    }
  }

  void _onDelete() {
    if (_pin.isNotEmpty) {
      setState(() {
        _pin = _pin.substring(0, _pin.length - 1);
        _error = null;
      });
      _onUserInteraction();
    }
  }

  void _onClear() {
    setState(() {
      _pin = '';
      _error = null;
    });
    _onUserInteraction();
  }

  Future<void> _verify() async {
    try {
      final notifier = ref.read(appLockProvider.notifier);
      final valid = await notifier.verifyPin(_pin);
      if (valid) {
        notifier.unlock();
        _onUserInteraction();
      } else {
        if (mounted) {
          setState(() {
            _pin = '';
            _error = 'Incorrect PIN';
          });
        }
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _pin = '';
          _error = 'Verification failed';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final lockState = ref.watch(appLockProvider);

    // Listener catches raw pointer events without entering the gesture arena,
    // so it won't interfere with scroll views or button taps inside child content.
    return Listener(
      onPointerDown: (_) => _onUserInteraction(),
      child: Stack(
        children: [
          widget.child,
          if (lockState.locked)
            Positioned.fill(
              child: Container(
                color: AppColors.bg,
                child: SafeArea(
                  child: Column(
                    children: [
                      const Spacer(flex: 2),
                      // Lock icon with glow
                      Container(
                        padding: const EdgeInsets.all(20),
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
                        child: const Icon(
                          Icons.lock_outline,
                          size: 36,
                          color: Colors.white,
                        ),
                      ),
                      const SizedBox(height: 24),
                      Text(
                        'App Locked',
                        style: GoogleFonts.spaceGrotesk(
                          fontSize: 24,
                          fontWeight: FontWeight.w700,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Enter PIN to unlock',
                        style: TextStyle(
                          color: AppColors.textMuted.withValues(alpha: 0.7),
                          fontSize: 14,
                        ),
                      ),
                      const SizedBox(height: 28),
                      // PIN dots
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: List.generate(
                          4,
                          (i) => Container(
                            margin:
                                const EdgeInsets.symmetric(horizontal: 8),
                            width: 16,
                            height: 16,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: i < _pin.length
                                  ? AppColors.primary
                                  : AppColors.border,
                              border: Border.all(
                                color: i < _pin.length
                                    ? AppColors.primary
                                    : AppColors.borderLight,
                              ),
                            ),
                          ),
                        ),
                      ),
                      if (_error != null) ...[
                        const SizedBox(height: 16),
                        Text(
                          _error!,
                          style: const TextStyle(
                            color: AppColors.danger,
                            fontSize: 13,
                          ),
                        ),
                      ],
                      const SizedBox(height: 16),
                      // Biometric unlock
                      if (lockState.biometricEnabled)
                        TextButton.icon(
                          onPressed: _tryBiometric,
                          icon: Icon(
                            Icons.fingerprint,
                            color: AppColors.primary.withValues(alpha: 0.8),
                          ),
                          label: Text(
                            'Use fingerprint',
                            style: TextStyle(
                              color: AppColors.primary.withValues(alpha: 0.8),
                            ),
                          ),
                        ),
                      // Clear / reset PIN button
                      if (_pin.isNotEmpty)
                        TextButton(
                          onPressed: _onClear,
                          child: Text(
                            'Clear',
                            style: TextStyle(
                              color: AppColors.textMuted
                                  .withValues(alpha: 0.6),
                              fontSize: 13,
                            ),
                          ),
                        ),
                      const Spacer(flex: 1),
                      // Number pad
                      _buildNumpad(),
                      const Spacer(flex: 1),
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildNumpad() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 48),
      child: Column(
        children: [
          for (final row in [
            ['1', '2', '3'],
            ['4', '5', '6'],
            ['7', '8', '9'],
          ])
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: row.map((d) => _NumpadButton(
                  digit: d,
                  onTap: () => _onPinDigit(d),
                )).toList(),
              ),
            ),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: [
              const SizedBox(width: 72),
              _NumpadButton(
                digit: '0',
                onTap: () => _onPinDigit('0'),
              ),
              SizedBox(
                width: 72,
                child: IconButton(
                  onPressed: _onDelete,
                  icon: const Icon(Icons.backspace_outlined),
                  color: AppColors.textMuted,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _NumpadButton extends StatelessWidget {
  final String digit;
  final VoidCallback onTap;
  const _NumpadButton({required this.digit, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 72,
      height: 72,
      child: Material(
        color: AppColors.surfaceAlt,
        borderRadius: BorderRadius.circular(36),
        child: InkWell(
          customBorder: const CircleBorder(),
          onTap: onTap,
          child: Center(
            child: Text(
              digit,
              style: const TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.w500,
                color: AppColors.textPrimary,
              ),
            ),
          ),
        ),
      ),
    );
  }
}
