import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';

import '../../core/constants.dart';
import '../../core/theme.dart';
import '../../data/ai_client.dart';
import '../../data/credits_api.dart';
import '../../data/post_repository.dart';
import '../../data/upload_client.dart';
import '../../models/app_user.dart';
import '../../widgets/ui.dart';

/// Bottom sheet to compose a new post. Returns true if a post was created.
Future<bool?> showCreatePostSheet(BuildContext context, AppUser me) {
  return showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    backgroundColor: AppColors.surface,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
    ),
    builder: (_) => Padding(
      padding: EdgeInsets.only(
          bottom: MediaQuery.of(context).viewInsets.bottom),
      child: _CreatePostForm(me: me),
    ),
  );
}

class _CreatePostForm extends ConsumerStatefulWidget {
  final AppUser me;
  const _CreatePostForm({required this.me});
  @override
  ConsumerState<_CreatePostForm> createState() => _CreatePostFormState();
}

class _CreatePostFormState extends ConsumerState<_CreatePostForm> {
  final _content = TextEditingController();
  final _imageUrl = TextEditingController();
  String _type = kPostTypes.first.label;
  bool _posting = false;
  String? _aiPreview;
  bool _aiLoading = false;

  @override
  void dispose() {
    _content.dispose();
    _imageUrl.dispose();
    super.dispose();
  }

  Future<void> _pickImage() async {
    if (!ref.read(uploadClientProvider).enabled) {
      showToast(context,
          'Image upload not configured — paste an image URL below.',
          error: true);
      return;
    }
    final picked =
        await ImagePicker().pickImage(source: ImageSource.gallery, maxWidth: 1600);
    if (picked == null) return;
    try {
      final bytes = await picked.readAsBytes();
      final url = await ref
          .read(uploadClientProvider)
          .uploadBytes(bytes, picked.name);
      if (!mounted) return;
      setState(() => _imageUrl.text = url);
      if (mounted) showToast(context, 'Image uploaded.');
    } catch (e) {
      if (mounted) showToast(context, '$e', error: true);
    }
  }

  Future<void> _previewAi() async {
    if (_content.text.trim().isEmpty) return;
    setState(() => _aiLoading = true);
    try {
      final r = await ref
          .read(aiClientProvider)
          .analyzePost(_type, _content.text.trim());
      if (!mounted) return;
      setState(() => _aiPreview = r);
    } catch (_) {
      if (mounted) showToast(context, 'AI unavailable.', error: true);
    } finally {
      if (mounted) setState(() => _aiLoading = false);
    }
  }

  Future<void> _submit() async {
    final text = _content.text.trim();
    if (text.isEmpty) {
      showToast(context, 'Write something first.', error: true);
      return;
    }
    if (widget.me.banned) {
      showToast(context, 'Your account cannot post.', error: true);
      return;
    }
    setState(() => _posting = true);
    try {
      final me = widget.me;
      await ref.read(postRepositoryProvider).createPost({
        'type': _type,
        'content': text,
        'authorUid': me.uid,
        'author': me.asAuthor.toMap(),
        'imageUrl': _imageUrl.text.trim().isEmpty ? null : _imageUrl.text.trim(),
        'tags': me.techStack.take(2).toList(),
        'hashtags': parseHashtags(text),
      });
      // Server-trusted +30 post reward (+50 referrer first post) — best effort.
      ref.read(creditsApiProvider).tryCall(
          () => ref.read(creditsApiProvider).postReward());
      if (mounted) {
        showToast(context, 'Posted! +30 credits');
        Navigator.of(context).pop(true);
      }
    } catch (e) {
      if (mounted) showToast(context, 'Failed to post: $e', error: true);
    } finally {
      if (mounted) setState(() => _posting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: AppColors.border,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 16),
            Text('Create post', style: AppTheme.brandTitle(22)),
            const SizedBox(height: 16),
            SizedBox(
              height: 40,
              child: ListView(
                scrollDirection: Axis.horizontal,
                children: [
                  for (final t in kPostTypes)
                    Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: ChoiceChip(
                        avatar: Icon(t.icon,
                            size: 16,
                            color: _type == t.label ? Colors.white : t.tint),
                        label: Text(t.label),
                        selected: _type == t.label,
                        onSelected: (_) => setState(() => _type = t.label),
                        selectedColor: t.tint,
                        backgroundColor: AppColors.surfaceAlt,
                        labelStyle: TextStyle(
                            color: _type == t.label
                                ? Colors.white
                                : AppColors.textPrimary),
                      ),
                    ),
                ],
              ),
            ),
            const SizedBox(height: 14),
            TextField(
              controller: _content,
              maxLines: 6,
              minLines: 3,
              decoration: const InputDecoration(
                  hintText: 'Share code, a project, an idea... use #hashtags'),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: _imageUrl,
              decoration: InputDecoration(
                hintText: 'Image URL (optional)',
                prefixIcon: const Icon(Icons.image_outlined),
                suffixIcon: IconButton(
                  icon: const Icon(Icons.upload),
                  onPressed: _pickImage,
                  tooltip: 'Upload image',
                ),
              ),
            ),
            if (_aiPreview != null) ...[
              const SizedBox(height: 10),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Row(children: [
                  const Icon(Icons.auto_awesome,
                      size: 16, color: AppColors.primary),
                  const SizedBox(width: 8),
                  Expanded(child: Text(_aiPreview!)),
                ]),
              ),
            ],
            const SizedBox(height: 14),
            Row(
              children: [
                OutlinedButton.icon(
                  onPressed: _aiLoading ? null : _previewAi,
                  icon: _aiLoading
                      ? const SizedBox(
                          width: 14,
                          height: 14,
                          child: CircularProgressIndicator(strokeWidth: 2))
                      : const Icon(Icons.auto_awesome, size: 16),
                  label: const Text('Preview AI'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.primary,
                    side: const BorderSide(color: AppColors.primary),
                  ),
                ),
                const Spacer(),
                ElevatedButton(
                  onPressed: _posting ? null : _submit,
                  child: _posting
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(
                              strokeWidth: 2, color: Colors.white))
                      : const Text('Post'),
                ),
              ],
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }
}
