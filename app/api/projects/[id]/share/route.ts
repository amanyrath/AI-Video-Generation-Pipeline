import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getSession } from '@/lib/auth/auth-utils';
import { checkProjectAccess } from '@/lib/auth/auth-utils';
import { generateShareToken, getShareUrl } from '@/lib/share/share-utils';
import type { ShareLinkResponse } from '@/lib/share/types';

/**
 * POST /api/projects/[id]/share
 * Create a new share link for a project
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId } = await params;

    // Check if user has access to this project
    const hasAccess = await checkProjectAccess(session.user.id, projectId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Verify project has a final video
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { finalVideoUrl: true, finalVideoS3Key: true },
    });

    if (!project || (!project.finalVideoUrl && !project.finalVideoS3Key)) {
      return NextResponse.json(
        { error: 'Project does not have a final video' },
        { status: 400 }
      );
    }

    // Generate unique token
    let shareToken = generateShareToken();

    // Ensure token is unique (very unlikely to collide, but check anyway)
    let existing = await prisma.shareLink.findUnique({
      where: { shareToken },
    });

    while (existing) {
      shareToken = generateShareToken();
      existing = await prisma.shareLink.findUnique({
        where: { shareToken },
      });
    }

    // Create share link
    const shareLink = await prisma.shareLink.create({
      data: {
        shareToken,
        projectId,
        createdById: session.user.id,
      },
    });

    const response: ShareLinkResponse = {
      id: shareLink.id,
      shareToken: shareLink.shareToken,
      shareUrl: getShareUrl(shareLink.shareToken),
      projectId: shareLink.projectId,
      createdAt: shareLink.createdAt.toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[POST /api/projects/[id]/share] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create share link' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/projects/[id]/share
 * List all share links for a project
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId } = await params;

    // Check if user has access to this project
    const hasAccess = await checkProjectAccess(session.user.id, projectId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get all share links for this project
    const shareLinks = await prisma.shareLink.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });

    const response: ShareLinkResponse[] = shareLinks.map((link) => ({
      id: link.id,
      shareToken: link.shareToken,
      shareUrl: getShareUrl(link.shareToken),
      projectId: link.projectId,
      createdAt: link.createdAt.toISOString(),
    }));

    return NextResponse.json(response);
  } catch (error) {
    console.error('[GET /api/projects/[id]/share] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch share links' },
      { status: 500 }
    );
  }
}
