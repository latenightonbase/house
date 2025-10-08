import connectToDB  from "@/utils/db";
import NextAuth from "next-auth";
import jwt from "jsonwebtoken";
import { GetSiweMessageOptions } from "@rainbow-me/rainbowkit-siwe-next-auth";
import { revalidatePath } from "next/cache";
import { JWT } from "next-auth/jwt";
import { Session } from "next-auth";

import CredentialsProvider from 'next-auth/providers/credentials'
import User from "@/utils/schemas/User";
import { walletAuthProvider } from "../../walletAuthProvider/credsProvider";

// Type definitions
interface NextAuthUser {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  address?: string;
}

interface Account {
  provider: string;
  type: string;
  providerAccountId: string;
}

interface CustomToken extends JWT {
  accessToken?: string;
  refreshToken?: string;
  provider?: string;
  id?: string;
  walletAddress?: string;
  username?: string;
  role?: string;
  wallet?: string;
  fid?: string;
  token?: string;
}

interface CustomSession extends Session {
  accessToken: string;
  refreshToken: string;
  fid: string;
  token: string;
  wallet: string;
  user: {
    wallet?: string;
    fid?: string;
    token?: string;
  } & Session["user"];
}

const handler = NextAuth({
  providers: [
    walletAuthProvider,
  ],
  callbacks: {
    async signIn({ user, account }: { user: NextAuthUser, account: Account | null }) {
      revalidatePath('/', 'layout') 
      await connectToDB();
      return true;
    },

    async jwt({ token, user, account }: { token: CustomToken, user: any, account: Account | null }): Promise<CustomToken> {
      if(!user) return token;

      const dbUser = await User.findOne({
          wallet: user?.address
      });

      if(!dbUser && account?.provider !== "anonymous"){
        return token;
      }

      if (account?.provider) {
        token.provider = account.provider;
        token.id = user.id;

        if ('address' in user) {
          token.walletAddress = user.address;
        } else if (account.provider === "anonymous") {
          token.username = user.name;
          token.role = "ANONYMOUS";
        } 

        const accessToken = jwt.sign(
          { userId: user.id, provider: account.provider },
          process.env.NEXTAUTH_SECRET || '',
          { expiresIn: '6h' }
        );

        const refreshToken = jwt.sign(
          { userId: user.id, provider: account.provider },
          process.env.NEXTAUTH_SECRET || '',
          { expiresIn: '6h' }
        );

        token.accessToken = accessToken;
        token.refreshToken = refreshToken;

        if(account.provider === "anonymous"){
          return token;
        }

        token.wallet = dbUser.wallet;
        token.fid = dbUser.fid;
        token.token = dbUser.token;
      }
      return token;
    },

    async session({ session, token }: { session: any, token: CustomToken }): Promise<CustomSession> {
      return {
        ...session,
        accessToken: token.accessToken || '',
        refreshToken: token.refreshToken || '',
        fid: token.fid || '',
        token: token.token || '',
        wallet: token.wallet || '',
        user: {
          ...session.user,
          wallet: token.wallet,
          fid: token.fid,
          token: token.token,
        }
      };
    },
  }
});

export { handler as GET, handler as POST };