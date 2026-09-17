import { prisma } from '../../config/prisma.js';
import type { Prisma } from '@prisma/client';
import { projectRepository } from './project.repository.js';
import { mediaService } from '../media/media.service.js';
import { slugify, generateUniqueSlug } from '../../shared/utils/slug.js';
import { NotFoundError, ForbiddenError, BadRequestError } from '../../shared/errors/AppError.js';
import type { CreateProjectInput, UpdateProjectInput } from './project.schema.js';
import type { CursorParams } from '../../shared/utils/pagination.js';
import { cursorMeta } from '../../shared/utils/pagination.js';

// Scalar fields copied verbatim when duplicating a project.
const COPYABLE_FIELDS = [
  'shortDescription', 'detailedDescription', 'demoVideoUrl', 'liveUrl', 'githubUrl',
  'problemStatement', 'solution', 'challenges', 'futureScope', 'installationGuide',
  'difficulty', 'isOpenSource', 'license', 'version', 'estimatedDevTime', 'categoryId',
] as const;

/** Build nested connectOrCreate rows for technologies (find-or-create by slug). */
function techConnect(names: string[]) {
  return names.map((name) => {
    const slug = slugify(name);
    return { technology: { connectOrCreate: { where: { slug }, create: { name, slug } } } };
  });
}

function tagConnect(names: string[]) {
  return names.map((name) => {
    const slug = slugify(name);
    return { tag: { connectOrCreate: { where: { slug }, create: { name, slug } } } };
  });
}

/** Load a project by slug and assert the given user owns it. */
async function assertOwner(userId: string, slug: string) {
  const project = await projectRepository.findBySlugBasic(slug);
  if (!project) throw new NotFoundError('Project not found');
  if (project.authorId !== userId) throw new ForbiddenError('You do not own this project');
  return project;
}

export const projectService = {
  async create(userId: string, input: CreateProjectInput) {
    const slug = await generateUniqueSlug(input.title, projectRepository.slugExists);
    const publish = input.status === 'PUBLISHED';

    return projectRepository.create({
      title: input.title,
      slug,
      shortDescription: input.shortDescription,
      detailedDescription: input.detailedDescription,
      demoVideoUrl: input.demoVideoUrl,
      liveUrl: input.liveUrl,
      githubUrl: input.githubUrl,
      problemStatement: input.problemStatement,
      solution: input.solution,
      challenges: input.challenges,
      futureScope: input.futureScope,
      installationGuide: input.installationGuide,
      difficulty: input.difficulty,
      status: input.status,
      isOpenSource: input.isOpenSource,
      license: input.license,
      version: input.version,
      estimatedDevTime: input.estimatedDevTime,
      publishedAt: publish ? new Date() : null,
      author: { connect: { id: userId } },
      ...(input.categoryId ? { category: { connect: { id: input.categoryId } } } : {}),
      ...(input.technologies.length ? { technologies: { create: techConnect(input.technologies) } } : {}),
      ...(input.tags.length ? { tags: { create: tagConnect(input.tags) } } : {}),
    });
  },

  async getBySlug(slug: string, viewerId?: string) {
    const project = await projectRepository.findBySlug(slug);
    if (!project) throw new NotFoundError('Project not found');
    // Unpublished or moderated (hidden) projects are visible only to their author.
    const restricted = project.status !== 'PUBLISHED' || project.isHidden;
    if (restricted && project.authorId !== viewerId) {
      throw new NotFoundError('Project not found');
    }
    return project;
  },

  async update(userId: string, slug: string, input: UpdateProjectInput) {
    const existing = await assertOwner(userId, slug);

    // Determine publish transition (set publishedAt the first time it's published).
    let publishedAt: Date | null | undefined;
    if (input.status === 'PUBLISHED' && existing.status !== 'PUBLISHED') publishedAt = new Date();

    const { technologies, tags, categoryId, title, ...rest } = input;

    // If title changed, regenerate a slug (keeps URLs meaningful).
    let newSlug: string | undefined;
    if (title && slugify(title) !== slug.replace(/-[a-z0-9]{6,}$/, '')) {
      newSlug = await generateUniqueSlug(title, projectRepository.slugExists);
    }

    // Technologies/tags are full replacements when provided — do it atomically.
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      if (technologies) {
        await tx.projectTechnology.deleteMany({ where: { projectId: existing.id } });
      }
      if (tags) {
        await tx.projectTag.deleteMany({ where: { projectId: existing.id } });
      }
      return tx.project.update({
        where: { id: existing.id },
        data: {
          ...rest,
          ...(title ? { title } : {}),
          ...(newSlug ? { slug: newSlug } : {}),
          ...(publishedAt !== undefined ? { publishedAt } : {}),
          ...(categoryId !== undefined
            ? categoryId
              ? { category: { connect: { id: categoryId } } }
              : { category: { disconnect: true } }
            : {}),
          ...(technologies ? { technologies: { create: techConnect(technologies) } } : {}),
          ...(tags ? { tags: { create: tagConnect(tags) } } : {}),
        },
        include: {
          author: { select: { id: true, username: true, profile: { select: { name: true, avatarUrl: true } } } },
          category: true,
          technologies: { include: { technology: true } },
          tags: { include: { tag: true } },
          images: { orderBy: { position: 'asc' } },
        },
      });
    });
  },

  async remove(userId: string, slug: string): Promise<void> {
    const existing = await assertOwner(userId, slug);
    await projectRepository.softDelete(existing.id);
  },

  async setStatus(userId: string, slug: string, status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED') {
    const existing = await assertOwner(userId, slug);
    const publishedAt = status === 'PUBLISHED' && existing.status !== 'PUBLISHED' ? new Date() : undefined;
    return projectRepository.update(existing.id, {
      status,
      ...(publishedAt ? { publishedAt } : {}),
    });
  },

  /** Deep-clone a project's content into a brand-new draft owned by the same user. */
  async duplicate(userId: string, slug: string) {
    const source = await projectRepository.findBySlug(slug);
    if (!source) throw new NotFoundError('Project not found');
    if (source.authorId !== userId) throw new ForbiddenError('You do not own this project');

    const newTitle = `${source.title} (Copy)`;
    const newSlug = await generateUniqueSlug(newTitle, projectRepository.slugExists);

    const copied: Record<string, unknown> = {};
    for (const f of COPYABLE_FIELDS) copied[f] = (source as Record<string, unknown>)[f];

    const techNames: string[] = source.technologies.map((t: { technology: { name: string } }) => t.technology.name);
    const tagNames: string[] = source.tags.map((t: { tag: { name: string } }) => t.tag.name);

    return projectRepository.create({
      ...copied,
      title: newTitle,
      slug: newSlug,
      status: 'DRAFT',
      publishedAt: null,
      author: { connect: { id: userId } },
      ...(techNames.length ? { technologies: { create: techConnect(techNames) } } : {}),
      ...(tagNames.length ? { tags: { create: tagConnect(tagNames) } } : {}),
    } as Parameters<typeof projectRepository.create>[0]);
  },

  async listByAuthor(
    authorId: string,
    isOwner: boolean,
    opts: CursorParams & { status?: string },
  ) {
    // Non-owners only ever see published projects.
    const status = isOwner ? opts.status : 'PUBLISHED';
    const rows = await projectRepository.listByAuthor(authorId, { ...opts, status });
    return cursorMeta(rows, opts.limit);
  },

  // ---------------------------- Media ----------------------------

  async setCover(userId: string, slug: string, file: Express.Multer.File) {
    const project = await assertOwner(userId, slug);
    const asset = await mediaService.uploadImage(file, 'project-cover', userId);

    // Replace any existing cover (one per project).
    const existing = await projectRepository.listImages(project.id, 'COVER');
    for (const img of existing) {
      await mediaService.deleteAsset(img.publicId, 'image');
      await projectRepository.deleteImage(img.id);
    }
    return projectRepository.addImage({
      projectId: project.id,
      url: asset.url,
      publicId: asset.publicId,
      type: 'COVER',
      position: 0,
    });
  },

  async setArchitecture(userId: string, slug: string, file: Express.Multer.File) {
    const project = await assertOwner(userId, slug);
    const asset = await mediaService.uploadImage(file, 'architecture', userId);
    const existing = await projectRepository.listImages(project.id, 'ARCHITECTURE');
    for (const img of existing) {
      await mediaService.deleteAsset(img.publicId, 'image');
      await projectRepository.deleteImage(img.id);
    }
    return projectRepository.addImage({
      projectId: project.id,
      url: asset.url,
      publicId: asset.publicId,
      type: 'ARCHITECTURE',
      position: 0,
    });
  },

  async addGallery(userId: string, slug: string, files: Express.Multer.File[]) {
    const project = await assertOwner(userId, slug);
    if (!files.length) throw new BadRequestError('No files uploaded');

    const start = (await projectRepository.maxGalleryPosition(project.id))._max.position ?? -1;
    const created = [];
    let position = start;
    for (const file of files) {
      position += 1;
      const asset = await mediaService.uploadImage(file, 'gallery', userId);
      created.push(
        await projectRepository.addImage({
          projectId: project.id,
          url: asset.url,
          publicId: asset.publicId,
          type: 'GALLERY',
          position,
        }),
      );
    }
    return created;
  },

  async reorderGallery(userId: string, slug: string, order: string[]) {
    const project = await assertOwner(userId, slug);
    const images = await projectRepository.listImages(project.id, 'GALLERY');
    const ownedIds = new Set(images.map((i: { id: string }) => i.id));

    // Every id in the request must belong to this project's gallery.
    for (const id of order) {
      if (!ownedIds.has(id)) throw new BadRequestError(`Image ${id} is not in this project's gallery`);
    }
    await prisma.$transaction(order.map((id, index) => projectRepository.setImagePosition(id, index)));
    return projectRepository.listImages(project.id, 'GALLERY');
  },

  async deleteGalleryImage(userId: string, slug: string, imageId: string): Promise<void> {
    const project = await assertOwner(userId, slug);
    const image = await projectRepository.findImage(imageId);
    if (!image || image.projectId !== project.id) throw new NotFoundError('Image not found');
    await mediaService.deleteAsset(image.publicId, 'image');
    await projectRepository.deleteImage(imageId);
  },
};
