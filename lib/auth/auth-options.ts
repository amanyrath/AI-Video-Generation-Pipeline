import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/db/prisma';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        console.log('=== AUTHORIZE FUNCTION CALLED ===');
        console.log('Environment:', process.env.NODE_ENV);
        console.log('Credentials received:', {
          email: credentials?.email,
          hasPassword: !!credentials?.password
        });

        try {
          if (!credentials?.email || !credentials?.password) {
            console.log('❌ Missing credentials');
            throw new Error('Email and password are required');
          }

          console.log('🔍 Looking up user:', credentials.email);
          
          // Test database connection
          try {
            await prisma.$connect();
            console.log('✅ Database connected');
          } catch (dbError) {
            console.error('❌ Database connection failed:', dbError);
            throw new Error('Database connection failed');
          }

          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
            include: { company: true },
          });

          if (!user) {
            console.log('❌ User not found:', credentials.email);
            throw new Error('No user found with this email');
          }

          console.log('✅ User found:', {
            id: user.id,
            email: user.email,
            hasCompany: !!user.company
          });

          console.log('🔐 Comparing passwords...');
          const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

          if (!isPasswordValid) {
            console.log('❌ Invalid password for:', credentials.email);
            throw new Error('Invalid password');
          }

          console.log('✅ Password valid, returning user data');
          const userData = {
            id: user.id,
            email: user.email,
            name: user.name,
            companyId: user.companyId,
            companyName: user.company.name,
            role: user.role,
          };
          console.log('User data to return:', userData);
          
          return userData;
        } catch (error) {
          console.error('❌ Authorization error:', error);
          console.error('Error details:', {
            name: error instanceof Error ? error.name : 'Unknown',
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
          });
          throw error;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // When user logs in, populate the token with user data
      if (user) {
        token.id = user.id;
        token.companyId = user.companyId;
        token.companyName = user.companyName;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      // Ensure session.user exists before populating it
      if (!session.user) {
        session.user = {} as any;
      }
      
      // Populate session.user from token data
      if (token) {
        session.user.id = token.id as string;
        session.user.companyId = token.companyId as string;
        session.user.companyName = token.companyName as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  cookies: {
    sessionToken: {
      name: `${process.env.NODE_ENV === 'production' ? '__Secure-' : ''}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production', // Secure cookies in production (HTTPS required)
      },
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development', // Enable debug logs in development
};
