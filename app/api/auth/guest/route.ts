import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/db/prisma';

/**
 * POST /api/auth/guest
 *
 * Creates a temporary guest user account with a unique identifier.
 * Guest users can use the app without signing up, but their data
 * may be cleaned up periodically.
 */
export async function POST() {
  try {
    // Generate unique guest identifier
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 9);
    const guestEmail = `guest-${timestamp}-${randomId}@guest.local`;
    const guestName = `Guest ${randomId}`;

    // Create a random password for the guest account
    const guestPassword = Math.random().toString(36).substring(2, 15);
    const hashedPassword = await bcrypt.hash(guestPassword, 12);

    // Create or get the "Guest Company"
    let guestCompany = await prisma.company.findFirst({
      where: { name: 'Guest Users' },
    });

    if (!guestCompany) {
      guestCompany = await prisma.company.create({
        data: { name: 'Guest Users' },
      });
    }

    // Create guest user
    const guestUser = await prisma.user.create({
      data: {
        email: guestEmail,
        password: hashedPassword,
        name: guestName,
        companyId: guestCompany.id,
        role: 'MEMBER',
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        companyId: true,
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({
      user: guestUser,
      credentials: {
        email: guestEmail,
        password: guestPassword,
      },
      message: 'Guest user created successfully',
    });
  } catch (error) {
    console.error('Guest user creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create guest user' },
      { status: 500 }
    );
  }
}
