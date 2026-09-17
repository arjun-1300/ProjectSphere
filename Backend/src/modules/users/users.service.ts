import { prisma } from '../../config/prisma.js';
import { projectService } from '../project/project.service.js';
import { NotFoundError } from '../../shared/errors/AppError.js';
import type { CursorParams } from '../../shared/utils/pagination.js';

async function resolveUser(username: string): Promise<{ id: string }> {
  const user = await prisma.user.findFirst({
    where: { username, deletedAt: null },
    select: { id: true },
  });
  if (!user) throw new NotFoundError('User not found');
  return user;
}

export const usersService = {
  async getUserProjects(
    username: string,
    viewerId: string | undefined,
    opts: CursorParams & { status?: string },
  ) {
    const user = await resolveUser(username);
    const isOwner = viewerId === user.id;
    return projectService.listByAuthor(user.id, isOwner, opts);
  },
};
