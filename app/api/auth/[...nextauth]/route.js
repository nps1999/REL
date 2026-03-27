import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import DiscordProvider from 'next-auth/providers/discord';
import { getDB } from '@/lib/mongodb';
import { v4 as uuidv4 } from 'uuid';

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || 'placeholder',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'placeholder',
    }),
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID || 'placeholder',
      clientSecret: process.env.DISCORD_CLIENT_SECRET || 'placeholder',
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      try {
        const db = await getDB();
        const existingUser = await db.collection('users').findOne({ email: user.email });
        
        const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim());
        const isAdmin = adminEmails.includes(user.email);
        
        if (!existingUser) {
          await db.collection('users').insertOne({
            id: uuidv4(),
            email: user.email,
            name: user.name,
            image: user.image,
            provider: account.provider,
            role: isAdmin ? 'admin' : 'customer',
            loyaltyPoints: 0,
            totalSpent: 0,
            orderCount: 0,
            banned: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        } else {
          if (isAdmin && existingUser.role !== 'admin') {
            await db.collection('users').updateOne(
              { email: user.email },
              { $set: { role: 'admin', updatedAt: new Date() } }
            );
          }
          if (existingUser.banned) return false;
        }
        return true;
      } catch (error) {
        console.error('SignIn error:', error);
        return true;
      }
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
      }
      if (token.email) {
        try {
          const db = await getDB();
          const dbUser = await db.collection('users').findOne({ email: token.email });
          if (dbUser) {
            token.role = dbUser.role;
            token.dbId = dbUser.id;
            token.loyaltyPoints = dbUser.loyaltyPoints;
            token.banned = dbUser.banned;
          }
        } catch (e) {}
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.dbId || token.id;
        session.user.role = token.role || 'customer';
        session.user.loyaltyPoints = token.loyaltyPoints || 0;
        session.user.banned = token.banned || false;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
