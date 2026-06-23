import 'dart:convert';
import 'dart:math';
import 'package:crypto/crypto.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:local_auth/local_auth.dart';
import 'package:shared_preferences/shared_preferences.dart';

final appLockProvider = StateNotifierProvider<AppLockNotifier, AppLockState>((ref) {
  return AppLockNotifier();
});

class AppLockState {
  final bool enabled;
  final bool locked;
  final bool biometricAvailable;
  final bool biometricEnabled;
  final int inactivityTimeout; // seconds, 0 = never auto-lock

  const AppLockState({
    this.enabled = false,
    this.locked = false,
    this.biometricAvailable = false,
    this.biometricEnabled = false,
    this.inactivityTimeout = 0,
  });

  AppLockState copyWith({
    bool? enabled,
    bool? locked,
    bool? biometricAvailable,
    bool? biometricEnabled,
    int? inactivityTimeout,
  }) {
    return AppLockState(
      enabled: enabled ?? this.enabled,
      locked: locked ?? this.locked,
      biometricAvailable: biometricAvailable ?? this.biometricAvailable,
      biometricEnabled: biometricEnabled ?? this.biometricEnabled,
      inactivityTimeout: inactivityTimeout ?? this.inactivityTimeout,
    );
  }
}

class AppLockNotifier extends StateNotifier<AppLockState> {
  AppLockNotifier() : super(const AppLockState()) {
    _init();
  }

  static const _keyEnabled = 'app_lock_enabled';
  static const _keyPinHash = 'app_lock_pin_hash';
  static const _keyPinSalt = 'app_lock_pin_salt';
  static const _keyBiometric = 'app_lock_biometric';
  static const _keyTimeout = 'app_lock_timeout';

  final LocalAuthentication _auth = LocalAuthentication();

  Future<void> _init() async {
    final prefs = await SharedPreferences.getInstance();
    final enabled = prefs.getBool(_keyEnabled) ?? false;
    final biometricEnabled = prefs.getBool(_keyBiometric) ?? false;
    final timeout = prefs.getInt(_keyTimeout) ?? 0;
    bool available = false;
    try {
      // isDeviceSupported() checks whether the DEVICE has biometric hardware
      // (fingerprint reader, face ID). canCheckBiometrics only returns true
      // if biometrics are already ENROLLED, which skips capable devices that
      // haven't enrolled a fingerprint yet — so we use isDeviceSupported.
      available = await _auth.isDeviceSupported();
    } catch (_) {}
    state = AppLockState(
      enabled: enabled,
      locked: enabled, // immediately locked if enabled
      biometricAvailable: available,
      biometricEnabled: enabled && biometricEnabled && available,
      inactivityTimeout: timeout,
    );
  }

  Future<void> _savePinHash(String pin) async {
    final prefs = await SharedPreferences.getInstance();
    final salt = List.generate(16, (_) => Random.secure().nextInt(256));
    final saltStr = base64Encode(salt);
    final hash = _hashPin(pin, saltStr);
    await prefs.setString(_keyPinHash, hash);
    await prefs.setString(_keyPinSalt, saltStr);
  }

  String _hashPin(String pin, String salt) {
    final bytes = utf8.encode(salt + pin);
    return sha256.convert(bytes).toString();
  }

  Future<bool> verifyPin(String pin) async {
    final prefs = await SharedPreferences.getInstance();
    final storedHash = prefs.getString(_keyPinHash);
    final salt = prefs.getString(_keyPinSalt);
    if (storedHash == null || salt == null) return false;
    final computed = _hashPin(pin, salt);
    return storedHash == computed;
  }

  Future<bool> hasPin() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_keyPinHash) != null;
  }

  Future<void> setPin(String pin) async {
    await _savePinHash(pin);
  }

  Future<void> clearPin() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_keyPinHash);
    await prefs.remove(_keyPinSalt);
  }

  Future<void> toggleLock(bool enable, {String? pin}) async {
    final prefs = await SharedPreferences.getInstance();
    if (enable && pin != null) {
      await _savePinHash(pin);
    }
    await prefs.setBool(_keyEnabled, enable);
    if (!enable) {
      await prefs.remove(_keyPinHash);
      await prefs.remove(_keyPinSalt);
      await prefs.setBool(_keyBiometric, false);
    }
    state = state.copyWith(
      enabled: enable,
      locked: enable, // real-time: lock immediately when enabled
      biometricEnabled: enable && state.biometricAvailable,
    );
  }

  Future<void> toggleBiometric(bool enable) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_keyBiometric, enable);
    state = state.copyWith(biometricEnabled: enable);
  }

  Future<void> setInactivityTimeout(int seconds) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt(_keyTimeout, seconds);
    state = state.copyWith(inactivityTimeout: seconds);
  }

  Future<bool> authenticateWithBiometrics() async {
    try {
      final result = await _auth.authenticate(
        localizedReason: 'Unlock DevSocio',
        biometricOnly: true,
        // Persist across backgrounding so the sensor stays active when the
        // app is brought back from the background (Android lifecycle).
        persistAcrossBackgrounding: true,
      );
      if (result) {
        unlock();
      }
      return result;
    } catch (_) {
      return false;
    }
  }

  void unlock() {
    state = state.copyWith(locked: false);
  }

  void lock() {
    if (state.enabled) {
      state = state.copyWith(locked: true);
    }
  }
}
