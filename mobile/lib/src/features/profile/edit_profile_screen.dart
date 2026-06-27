import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';

import '../../core/constants.dart';
import '../../core/theme.dart';
import '../../data/ai_client.dart';
import '../../data/credits_api.dart';
import '../../data/upload_client.dart';
import '../../data/user_repository.dart';
import '../../widgets/avatar.dart';
import '../../widgets/ui.dart';

class EditProfileScreen extends ConsumerStatefulWidget {
  const EditProfileScreen({super.key});
  @override
  ConsumerState<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends ConsumerState<EditProfileScreen> {
  final _displayName = TextEditingController();
  final _bio = TextEditingController();
  final _avatar = TextEditingController();
  final _github = TextEditingController();
  final _linkedin = TextEditingController();
  final _twitter = TextEditingController();
  final _portfolio = TextEditingController();

  String _devLevel = 'Builder';
  final Set<String> _stack = {};
  bool _openToCollab = true;
  bool _lookingForCofounder = false;
  bool _loaded = false;
  bool _saving = false;
  bool _aiLoading = false;

  @override
  void dispose() {
    for (final c in [
      _displayName, _bio, _avatar, _github, _linkedin, _twitter, _portfolio
    ]) {
      c.dispose();
    }
    super.dispose();
  }

  void _hydrate() {
    final me = ref.read(currentUserProvider).value;
    if (me == null || _loaded) return;
    _displayName.text = me.displayName;
    _bio.text = me.bio;
    _avatar.text = me.avatar;
    _devLevel = kDevLevels.contains(me.devLevel) ? me.devLevel : 'Builder';
    _stack.addAll(me.techStack);
    _openToCollab = me.openToCollab;
    _lookingForCofounder = me.lookingForCofounder;
    _github.text = (me.links['github'] as String?) ?? '';
    _linkedin.text = (me.links['linkedin'] as String?) ?? '';
    _twitter.text = (me.links['twitter'] as String?) ?? '';
    _portfolio.text = (me.links['portfolio'] as String?) ?? '';
    _loaded = true;
  }

  Future<void> _pickAvatar() async {
    if (!ref.read(uploadClientProvider).enabled) {
      showToast(context, 'Upload not configured — paste an image URL.',
          error: true);
      return;
    }
    final picked = await ImagePicker()
        .pickImage(source: ImageSource.gallery, maxWidth: 512);
    if (picked == null) return;
    try {
      final url = await ref
          .read(uploadClientProvider)
          .uploadBytes(await picked.readAsBytes(), picked.name);
      setState(() => _avatar.text = url);
    } catch (e) {
      if (mounted) showToast(context, '$e', error: true);
    }
  }

  Future<void> _generateBio() async {
    setState(() => _aiLoading = true);
    try {
      final bio = await ref.read(aiClientProvider).generateBio(
            techStack: _stack.toList(),
            devLevel: _devLevel,
            lookingForCofounder: _lookingForCofounder,
          );
      setState(() => _bio.text = bio);
    } catch (_) {
      if (mounted) showToast(context, 'AI unavailable.', error: true);
    } finally {
      if (mounted) setState(() => _aiLoading = false);
    }
  }

  Future<void> _save() async {
    final me = ref.read(currentUserProvider).value;
    if (me == null) return;
    setState(() => _saving = true);
    try {
      final links = <String, dynamic>{};
      if (_github.text.trim().isNotEmpty) links['github'] = _github.text.trim();
      if (_linkedin.text.trim().isNotEmpty) links['linkedin'] = _linkedin.text.trim();
      if (_twitter.text.trim().isNotEmpty) links['twitter'] = _twitter.text.trim();
      if (_portfolio.text.trim().isNotEmpty) links['portfolio'] = _portfolio.text.trim();
      await ref.read(userRepositoryProvider).updateProfile(me.uid, {
        'displayName': _displayName.text.trim(),
        'bio': _bio.text.trim(),
        'avatar': _avatar.text.trim(),
        'devLevel': _devLevel,
        'techStack': _stack.toList(),
        'openToCollab': _openToCollab,
        'lookingForCofounder': _lookingForCofounder,
        'links': links,
      });
      ref.read(creditsApiProvider).tryCall(
          () => ref.read(creditsApiProvider).profileComplete());
      if (mounted) {
        showToast(context, 'Profile saved.');
        context.pop();
      }
    } catch (e) {
      if (mounted) showToast(context, 'Save failed: $e', error: true);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    _hydrate();
    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                gradient: AppColors.gradientProfile,
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.edit, color: Colors.white, size: 20),
            ),
            const SizedBox(width: 10),
            const Text('Edit profile'),
          ],
        ),
        actions: [
          TextButton(
            onPressed: _saving ? null : _save,
            child: _saving
                ? const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2))
                : Text('Save',
                    style: TextStyle(
                        color: AppColors.profilePrimary,
                        fontWeight: FontWeight.w600)),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Center(
            child: GestureDetector(
              onTap: _pickAvatar,
              child: Stack(
                children: [
                  Container(
                    padding: const EdgeInsets.all(3),
                    decoration: BoxDecoration(
                      gradient: AppColors.gradientProfile,
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: AppColors.profilePrimary
                              .withValues(alpha: 0.3),
                          blurRadius: 15,
                          spreadRadius: 3,
                        ),
                      ],
                    ),
                    child: Avatar(url: _avatar.text, size: 88),
                  ),
                  Positioned(
                    right: 0,
                    bottom: 0,
                    child: Container(
                      padding: const EdgeInsets.all(6),
                      decoration: const BoxDecoration(
                          gradient: AppColors.gradientProfile,
                          shape: BoxShape.circle),
                      child: const Icon(Icons.camera_alt,
                          size: 18, color: Colors.white),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 20),
          _label('Avatar URL'),
          TextField(
              controller: _avatar,
              decoration: const InputDecoration(hintText: 'https://...')),
          const SizedBox(height: 14),
          _label('Display name'),
          TextField(controller: _displayName),
          const SizedBox(height: 14),
          Row(
            children: [
              _label('Bio'),
              const Spacer(),
              TextButton.icon(
                onPressed: _aiLoading ? null : _generateBio,
                icon: _aiLoading
                    ? const SizedBox(
                        width: 14,
                        height: 14,
                        child: CircularProgressIndicator(strokeWidth: 2))
                    : const Icon(Icons.auto_awesome, size: 16),
                label: const Text('Generate'),
              ),
            ],
          ),
          TextField(
              controller: _bio,
              maxLines: 3,
              decoration:
                  const InputDecoration(hintText: 'Tell devs who you are')),
          const SizedBox(height: 16),
          _label('Dev level'),
          Wrap(
            spacing: 8,
            children: [
              for (final lvl in kDevLevels)
                ChoiceChip(
                  label: Text(lvl),
                  selected: _devLevel == lvl,
                  onSelected: (_) => setState(() => _devLevel = lvl),
                  selectedColor: AppColors.profilePrimary,
                  backgroundColor: AppColors.surfaceAlt,
                  labelStyle: TextStyle(
                      color: _devLevel == lvl
                          ? Colors.white
                          : AppColors.textPrimary),
                ),
            ],
          ),
          const SizedBox(height: 16),
          _label('Tech stack (${_stack.length})'),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final tech in kTechStackOptions)
                FilterChip(
                  label: Text(tech),
                  selected: _stack.contains(tech),
                  onSelected: (sel) => setState(
                      () => sel ? _stack.add(tech) : _stack.remove(tech)),
                  selectedColor:
                      AppColors.profilePrimary.withValues(alpha: 0.3),
                  checkmarkColor: AppColors.profilePrimary,
                  backgroundColor: AppColors.surfaceAlt,
                ),
            ],
          ),
          const SizedBox(height: 16),
          Card(
            child: Column(
              children: [
                SwitchListTile(
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16),
                  value: _openToCollab,
                  onChanged: (v) => setState(() => _openToCollab = v),
                  title: const Text('Open to collaborate'),
                  activeThumbColor: AppColors.profilePrimary,
                  activeTrackColor:
                      AppColors.profilePrimary.withValues(alpha: 0.3),
                ),
                Divider(
                    height: 1,
                    color: AppColors.border.withValues(alpha: 0.5)),
                SwitchListTile(
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16),
                  value: _lookingForCofounder,
                  onChanged: (v) => setState(() => _lookingForCofounder = v),
                  title: const Text('Looking for a co-founder'),
                  activeThumbColor: AppColors.profilePrimary,
                  activeTrackColor:
                      AppColors.profilePrimary.withValues(alpha: 0.3),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          _label('Social links'),
          _linkField(_github, 'GitHub', Icons.code),
          _linkField(_linkedin, 'LinkedIn', Icons.business_center),
          _linkField(_twitter, 'Twitter / X', Icons.alternate_email),
          _linkField(_portfolio, 'Portfolio', Icons.link),
          const SizedBox(height: 32),
        ],
      ),
    );
  }

  Widget _label(String text) => Padding(
        padding: const EdgeInsets.only(bottom: 6),
        child: Text(text,
            style: const TextStyle(
                fontWeight: FontWeight.w600, color: AppColors.textSecondary)),
      );

  Widget _linkField(TextEditingController c, String hint, IconData icon) =>
      Padding(
        padding: const EdgeInsets.only(bottom: 10),
        child: TextField(
          controller: c,
          decoration:
              InputDecoration(hintText: hint, prefixIcon: Icon(icon)),
        ),
      );
}
