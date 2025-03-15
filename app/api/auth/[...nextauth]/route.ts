import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import prisma from "@/lib/db/prisma";

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        // @ts-ignore - Add user ID to the session
        session.user.id = user.id;
      }
      return session;
    },
    async signIn({ user }) {
      try {
        // Create a team for new users if they don't have one
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email },
          include: { teamMembers: true },
        });

        if (existingUser && existingUser.teamMembers.length === 0) {
          const team = await prisma.team.create({
            data: {
              name: `${user.name || user.email}'s Team`,
            },
          });

          // Add user to the team
          await prisma.teamMember.create({
            data: {
              userId: existingUser.id,
              teamId: team.id,
              role: "owner",
            },
          });

          // Log activity
          await prisma.activityLog.create({
            data: {
              team: { connect: { id: team.id } },
              user: { connect: { id: existingUser.id } },
              action: "SIGN_UP",
              ipAddress: "",
            },
          });
        }
        return true;
      } catch (error) {
        console.error("Error in signIn callback:", error);
        return true; // Still allow sign in even if team creation fails
      }
    },
  },
  pages: {
    signIn: "/sign-in",
    error: "/sign-in",
  },
  session: {
    strategy: "database",
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST }; 