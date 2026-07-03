import NextAuth, { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { compare } from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { rateLimit } from "@/lib/rateLimit"

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      // Link a verified Google email to an existing account created with a
      // password, instead of failing with OAuthAccountNotLinked.
      allowDangerousEmailAccountLinking: true,
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials")
        }

        // Throttle credential stuffing / brute force, keyed by IP + email.
        const fwd = req?.headers?.["x-forwarded-for"]
        const ip = (Array.isArray(fwd) ? fwd[0] : fwd)?.split(",")[0].trim() || "unknown"
        if (!rateLimit(`login:${ip}:${credentials.email.toLowerCase()}`, 10, 15 * 60 * 1000)) {
          throw new Error("Too many login attempts. Please try again later.")
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email
          }
        })

        if (!user || !user.password) {
          throw new Error("Invalid credentials")
        }

        const isPasswordValid = await compare(credentials.password, user.password)

        if (!isPasswordValid) {
          throw new Error("Invalid credentials")
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id
        token.role = user.role
      }
      return token
    },
    async session({ session, token, user }) {
      if (session.user) {
        session.user.id = token.id as string || user?.id
        session.user.role = token.role as string || user?.role || "PATIENT"
      }
      return session
    },
    async signIn() {
      // New Google users receive role "PATIENT" via the Prisma schema default
      // when the adapter creates them — no update needed here. (Updating by id
      // in this callback throws "Record to update not found" on first sign-in,
      // because the user hasn't been created yet.)
      return true
    }
  },
  pages: {
    signIn: "/auth/signin",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
}

export default NextAuth(authOptions)
