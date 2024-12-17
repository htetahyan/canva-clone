import { z } from "zod";
import bcrypt from "bcryptjs";
import type { NextAuthConfig } from "next-auth";
import { eq } from "drizzle-orm";
import { JWT } from "next-auth/jwt";

import Credentials from "next-auth/providers/credentials";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/db/drizzle";
import { users } from "@/db/schema";

const CredentialsSchema = z.object({
  username: z.string(),
  password: z.string(),
});


declare module "@auth/core/jwt" {
  interface JWT {
    id: string | undefined;
  }
}

export default {
  adapter: DrizzleAdapter(db),
  providers: [
    Credentials({
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const validatedFields = CredentialsSchema.safeParse(credentials);

        if (!validatedFields.success) {
          return null;
        }

        const { username, password } = validatedFields.data;

        const query = await db
          .select()
          .from(users)
          .where(eq(users.username, username));

        const user = query[0];

        if (!user || !user.password) {
          return null;
        }

        const passwordsMatch = await bcrypt.compare(
          password,
          user.password,
        );

        if (!passwordsMatch) {
          return null;
        }

        return user;
      },
    }),

  ],
  pages: {
    signIn: "/sign-in",
    error: "/sign-in"
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    session({ session, token }) {

      if (token.id) {
          // @ts-ignore
        session.user.id = token.id;
        session.user.name=token.name
        
      }

      return session;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.name=user.name
      }

      return token;
    }
  },

} satisfies NextAuthConfig
