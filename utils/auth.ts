import connectToDB  from "@/utils/db";
import jwt from "jsonwebtoken";
import { revalidatePath } from "next/cache";
import { JWT } from "next-auth/jwt";
import { Session } from "next-auth";
import User from "@/utils/schemas/User";
import { farcasterAuthProvider } from "../app/api/walletAuthProvider/farcasterProvider";

// Type definitions
interface NextAuthUser {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  fid?: string;
  username?: string;
  pfpUrl?: string;
  bio?: string;
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
  username?: string;
  role?: string;
  wallet?: string;
  fid?: string;
  token?: string;
  pfpUrl?: string;
  bio?: string;
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
    username?: string;
    pfpUrl?: string;
    bio?: string;
  } & Session["user"];
}

export const authOptions = {
  providers: [
    farcasterAuthProvider,
  ],
  callbacks: {
    async signIn({ user, account }: { user: NextAuthUser, account: Account | null }) {
      revalidatePath('/', 'layout') 
      await connectToDB();
      return true;
    },

    async jwt({ token, user, account }: { token: CustomToken, user: any, account: Account | null }): Promise<CustomToken> {
      if(!user) return token;

      if (account?.provider) {
        token.provider = account.provider;
        token.id = user.id;

        if ('fid' in user) {
          token.fid = user.fid;
          token.username = user.username;
          token.pfpUrl = user.pfpUrl;
          token.bio = user.bio;
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

        // Find user in database using the FID
        const dbUser = await User.findOne({
          fid: user?.fid
        });

        if(dbUser) {
          token.wallet = dbUser.wallet;
          token.fid = dbUser.fid;
          token.token = dbUser.token;
          token.username = dbUser.username;
          token.pfpUrl = dbUser.pfp_url;
          token.bio = dbUser.bio;
        }
      }
      return token;
    },

    async session({ session, token }: { session: any, token: CustomToken }): Promise<CustomSession> {
      const customSession: CustomSession = {
        ...session,
        accessToken: token.accessToken || '',
        refreshToken: token.refreshToken || '',
        fid: token.fid || '',
        token: token.token || '',
        wallet: token.wallet || '',
        user: {
          ...session.user,
          name: token.username || session.user?.name || 'Farcaster User',
          wallet: token.wallet,
          fid: token.fid,
          token: token.token,
          username: token.username,
          pfpUrl: token.pfpUrl,
          bio: token.bio,
          image: token.pfpUrl || session.user?.image,
        },
        expires: session.expires
      };
      
      return customSession;
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
  session: {
    strategy: 'jwt' as const,
  },
};