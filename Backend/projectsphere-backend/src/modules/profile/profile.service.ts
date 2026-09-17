import { prisma } from '../../config/prisma.js';
import { AnalyticsEventType } from '@prisma/client';
import { profileRepository } from './profile.repository.js';
import { socialRepository } from '../social/social.repository.js';
import { mediaService } from '../media/media.service.js';
import { hashToken } from '../../shared/utils/tokens.js';
import { NotFoundError } from '../../shared/errors/AppError.js';
import type { UpdateProfileInput } from './profile.schema.js';

interface ProfileRecord {
  name: string | null;
  headline: string | null;
  bio: string | null;
  location: string | null;
  skills: string[];
  experience: string | null;
  education: string | null;
  avatarUrl: string | null;
  portfolioWebsite: string | null;
  githubUrl: string | null;
  linkedinUrl: string | null;
  twitterUrl: string | null;
  avatarPublicId?: string | null;
  coverImagePublicId?: string | null;
  resumePublicId?: string | null;
}

/** Percentage of key profile fields that are filled in. */
function computeCompletion(p: ProfileRecord): number {
  const checks = [
    Boolean(p.name),
    Boolean(p.headline),
    Boolean(p.bio),
    Boolean(p.location),
    p.skills.length > 0,
    Boolean(p.experience),
    Boolean(p.education),
    Boolean(p.avatarUrl),
    Boolean(p.portfolioWebsite || p.githubUrl || p.linkedinUrl || p.twitterUrl),
  ];
  const filled = checks.filter(Boolean).length;
  return Math.round((filled / checks.length) * 100);
}

/**
 * Record a profile view, deduplicated per viewer per day. The visitorHash bakes
 * in the viewed profile + viewer key + date, so a repeat view the same day maps
 * to an existing row and does not double-count.
 */
async function recordProfileView(targetUserId: string, viewerKey: string): Promise<void> {
  const day = new Date().toISOString().slice(0, 10);
  const visitorHash = hashToken(`profile:${targetUserId}:${viewerKey}:${day}`);
  try {
    const seen = await prisma.analyticsEvent.findFirst({
      where: { type: AnalyticsEventType.PROFILE_VIEW, visitorHash },
      select: { id: true },
    });
    if (seen) return;
    await prisma.analyticsEvent.create({
      data: {
        type: AnalyticsEventType.PROFILE_VIEW,
        visitorHash,
        metadata: { targetUserId },
      },
    });
    await profileRepository.incrementViews(targetUserId);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to record profile view:', err);
  }
}

export const profileService = {
  async getProfile(username: string, viewerId: string | undefined, viewerKey: string) {
    const user = await profileRepository.findByUsername(username);
    if (!user || !user.profile) throw new NotFoundError('Profile not found');

    const isOwner = viewerId === user.id;
    const [projectCount, followerCount, followingCount] = await Promise.all([
      profileRepository.projectCount(user.id, !isOwner),
      socialRepository.followerCount(user.id),
      socialRepository.followingCount(user.id),
    ]);

    const isFollowing =
      viewerId && !isOwner ? Boolean(await socialRepository.findFollow(viewerId, user.id)) : false;

    // Count a view only for non-owners.
    if (!isOwner) await recordProfileView(user.id, viewerKey);

    // Public view hides email and Cloudinary public_ids; owner sees the full record.
    const { avatarPublicId, coverImagePublicId, resumePublicId, ...publicProfile } = user.profile;
    void avatarPublicId;
    void coverImagePublicId;
    void resumePublicId;

    return {
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        memberSince: user.createdAt,
        ...(isOwner ? { email: user.email } : {}),
      },
      profile: publicProfile,
      counts: { projectCount, followerCount, followingCount },
      isOwner,
      isFollowing,
    };
  },

  async updateMyProfile(userId: string, input: UpdateProfileInput) {
    const updated = await profileRepository.update(userId, input);
    const completion = computeCompletion(updated as unknown as ProfileRecord);
    if (completion !== updated.completionPercentage) {
      await profileRepository.setCompletion(userId, completion);
      updated.completionPercentage = completion;
    }
    return updated;
  },

  async setAvatar(userId: string, file: Express.Multer.File) {
    const current = await profileRepository.findByUserId(userId);
    const asset = await mediaService.uploadImage(file, 'avatar', userId);
    await mediaService.deleteAsset(current?.avatarPublicId, 'image');
    return profileRepository.updateMedia(userId, {
      avatarUrl: asset.url,
      avatarPublicId: asset.publicId,
    });
  },

  async setCover(userId: string, file: Express.Multer.File) {
    const current = await profileRepository.findByUserId(userId);
    const asset = await mediaService.uploadImage(file, 'cover', userId);
    await mediaService.deleteAsset(current?.coverImagePublicId, 'image');
    return profileRepository.updateMedia(userId, {
      coverImageUrl: asset.url,
      coverImagePublicId: asset.publicId,
    });
  },

  async setResume(userId: string, file: Express.Multer.File) {
    const current = await profileRepository.findByUserId(userId);
    const asset = await mediaService.uploadPdf(file, userId);
    await mediaService.deleteAsset(current?.resumePublicId, 'raw');
    return profileRepository.updateMedia(userId, {
      resumeUrl: asset.url,
      resumePublicId: asset.publicId,
    });
  },

  async deleteAccount(userId: string): Promise<void> {
    // Best-effort media cleanup, then soft-delete the account.
    const profile = await profileRepository.findByUserId(userId);
    if (profile) {
      await mediaService.deleteAsset(profile.avatarPublicId, 'image');
      await mediaService.deleteAsset(profile.coverImagePublicId, 'image');
      await mediaService.deleteAsset(profile.resumePublicId, 'raw');
    }
    await profileRepository.softDeleteAccount(userId);
  },
};
