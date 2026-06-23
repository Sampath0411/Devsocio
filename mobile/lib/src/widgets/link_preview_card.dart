import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../core/theme.dart';
import '../data/link_preview_client.dart';
import 'app_image.dart';

/// Detects the first URL in a text string and shows a rich preview card.
class LinkPreviewCard extends ConsumerStatefulWidget {
  final String text;
  final double? maxWidth;

  const LinkPreviewCard({
    super.key,
    required this.text,
    this.maxWidth,
  });

  @override
  ConsumerState<LinkPreviewCard> createState() => _LinkPreviewCardState();
}

class _LinkPreviewCardState extends ConsumerState<LinkPreviewCard> {
  String? _url;
  LinkPreviewData? _data;
  bool _loading = false;
  bool _errored = false;
  Timer? _debounce;

  @override
  void initState() {
    super.initState();
    _url = _extractUrl(widget.text);
    if (_url != null) {
      _debounce = Timer(const Duration(milliseconds: 600), _fetch);
    }
  }

  @override
  void didUpdateWidget(LinkPreviewCard oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.text != widget.text) {
      final newUrl = _extractUrl(widget.text);
      if (newUrl != _url) {
        _url = newUrl;
        _data = null;
        _errored = false;
        _debounce?.cancel();
        if (_url != null) {
          _debounce = Timer(const Duration(milliseconds: 600), _fetch);
        }
      }
    }
  }

  @override
  void dispose() {
    _debounce?.cancel();
    super.dispose();
  }

  Future<void> _fetch() async {
    final url = _url;
    if (url == null) return;
    setState(() => _loading = true);
    try {
      final data = await ref.read(linkPreviewClientProvider).fetch(url);
      if (mounted) {
        setState(() {
          _data = data;
          _loading = false;
          _errored = !data.hasData;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _loading = false;
          _errored = true;
        });
      }
    }
  }

  /// Extract the first http(s) URL from text using a non-raw string for
  /// the regex pattern to avoid Dart raw-string quoting issues.
  String? _extractUrl(String text) {
    // Pattern: http:// or https:// followed by non-whitespace chars.
    // Using a regular (non-raw) string with double backslashes for regex escapes.
    final pattern = "https?://[^\\s<>\"'(){}|\\\\^`\\[\\]]+";
    final match = RegExp(pattern, caseSensitive: false).firstMatch(text);
    if (match == null) return null;
    final url = match.group(0)!;
    return url.replaceAll(RegExp('[.,;:!?)\\]\$]+'), '');
  }

  @override
  Widget build(BuildContext context) {
    if (_url == null) return const SizedBox.shrink();
    if (_loading) return _buildShimmer();
    if (_errored || _data == null) return const SizedBox.shrink();
    final data = _data!;
    if (!data.hasData) return const SizedBox.shrink();

    return GestureDetector(
      onTap: () async {
        final uri = Uri.tryParse(_url!);
        if (uri != null) {
          await launchUrl(uri, mode: LaunchMode.externalApplication);
        }
      },
      child: Container(
        width: widget.maxWidth,
        margin: const EdgeInsets.only(top: 8),
        decoration: BoxDecoration(
          color: AppColors.surfaceAlt.withValues(alpha: 0.5),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: AppColors.border.withValues(alpha: 0.4),
          ),
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            if (data.imageUrl != null && data.imageUrl!.isNotEmpty)
              SizedBox(
                width: double.infinity,
                height: 160,
                child: Stack(
                  children: [
                    SmartImage(
                      url: data.imageUrl,
                      fit: BoxFit.cover,
                      width: double.infinity,
                      height: 160,
                      backgroundColor: AppColors.surfaceAlt,
                    ),
                    Positioned(
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: 60,
                      child: Container(
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            begin: Alignment.topCenter,
                            end: Alignment.bottomCenter,
                            colors: [
                              Colors.transparent,
                              AppColors.bg.withValues(alpha: 0.7),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            Padding(
              padding: EdgeInsets.fromLTRB(12, data.imageUrl != null ? 8 : 12, 12, 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (data.title != null && data.title!.isNotEmpty)
                    Text(data.title!,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                            fontWeight: FontWeight.w600,
                            fontSize: 14,
                            color: AppColors.textPrimary,
                            height: 1.3)),
                  if (data.description != null && data.description!.isNotEmpty)
                    ..._buildDescription(data),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      Icon(Icons.link, size: 12,
                          color: AppColors.accent.withValues(alpha: 0.7)),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(
                          data.siteName ?? _url!,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(
                              fontSize: 11,
                              color: AppColors.accent.withValues(alpha: 0.7)),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  List<Widget> _buildDescription(LinkPreviewData data) {
    return [
      if (data.title != null) const SizedBox(height: 4),
      Text(data.description!,
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(
              fontSize: 12, color: AppColors.textMuted, height: 1.3)),
    ];
  }

  Widget _buildShimmer() {
    return Container(
      width: widget.maxWidth,
      margin: const EdgeInsets.only(top: 8),
      height: 120,
      decoration: BoxDecoration(
        color: AppColors.surfaceAlt.withValues(alpha: 0.3),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border.withValues(alpha: 0.3)),
      ),
      child: const Center(
        child: SizedBox(width: 18, height: 18,
            child: CircularProgressIndicator(strokeWidth: 2)),
      ),
    );
  }
}
