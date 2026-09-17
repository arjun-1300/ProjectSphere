import { prisma } from '../../config/prisma.js';

/**
 * Append-only audit trail of privileged actions. Best-effort: an audit write
 * failure should never block the action itself, so callers await but errors
 * are swallowed here.
 */
export async function recordAudit(
  adminId: string,
  action: string,
  target?: { type?: string; id?: string; metadata?: Record<string, unknown> },
): Promise<void> {
  try {
    await prisma.adminAuditLog.create({
      data: {
        adminId,
        action,
        targetType: target?.type ?? null,
        targetId: target?.id ?? null,
        metadata: target?.metadata ?? undefined,
      },
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to write audit log:', err);
  }
}
