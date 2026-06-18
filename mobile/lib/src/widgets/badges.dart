import 'package:flutter/material.dart';
import '../core/theme.dart';
import '../models/app_user.dart';

class VerifiedTick extends StatelessWidget {
  final double size;
  const VerifiedTick({super.key, this.size = 15});
  @override
  Widget build(BuildContext context) =>
      Icon(Icons.verified, size: size, color: AppColors.accent);
}

class ModBadge extends StatelessWidget {
  const ModBadge({super.key});
  @override
  Widget build(BuildContext context) =>
      const Icon(Icons.shield, size: 14, color: AppColors.success);
}

class FounderBadge extends StatelessWidget {
  const FounderBadge({super.key});
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
            colors: [AppColors.gold, AppColors.warning]),
        borderRadius: BorderRadius.circular(6),
      ),
      child: const Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.workspace_premium, size: 11, color: Colors.black87),
          SizedBox(width: 3),
          Text('Founder',
              style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w700,
                  color: Colors.black87)),
        ],
      ),
    );
  }
}

class LevelBadge extends StatelessWidget {
  final String level;
  const LevelBadge(this.level, {super.key});

  Color get _color {
    switch (level) {
      case 'Founder':
        return AppColors.gold;
      case 'Maker':
        return AppColors.accent;
      default:
        return AppColors.primary;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: _color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: _color.withValues(alpha: 0.4)),
      ),
      child: Text(level,
          style: TextStyle(
              fontSize: 11, fontWeight: FontWeight.w600, color: _color)),
    );
  }
}

/// Name + inline founder/verified/mod badges, founder shown in gold.
class NameWithBadges extends StatelessWidget {
  final String displayName;
  final bool verified;
  final bool moderator;
  final bool founder;
  final double fontSize;
  const NameWithBadges({
    super.key,
    required this.displayName,
    this.verified = false,
    this.moderator = false,
    this.founder = false,
    this.fontSize = 14,
  });

  factory NameWithBadges.fromUser(AppUser u, {double fontSize = 14}) =>
      NameWithBadges(
        displayName: u.displayName,
        verified: u.verified,
        moderator: u.moderator,
        founder: u.founder,
        fontSize: fontSize,
      );

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Flexible(
          child: Text(
            displayName,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: fontSize,
              fontWeight: FontWeight.w700,
              color: founder ? AppColors.gold : AppColors.textPrimary,
            ),
          ),
        ),
        if (verified) ...[const SizedBox(width: 4), VerifiedTick(size: fontSize)],
        if (moderator) ...[const SizedBox(width: 3), const ModBadge()],
        if (founder) ...[const SizedBox(width: 5), const FounderBadge()],
      ],
    );
  }
}
