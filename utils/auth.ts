import connectToDB  from "@/utils/db";
import jwt from "jsonwebtoken";
import { revalidatePath } from "next/cache";
import { JWT } from "next-auth/jwt";
import { Session } from "next-auth";
import User from "@/utils/schemas/User";
import { walletAuthProvider } from "../app/api/walletAuthProvider/credsProvider";
import { isWhitelisted } from "@/utils/whitelist";

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

export const authOptions = {
  providers: [
    walletAuthProvider, // This will handle both regular wallets and smart contract wallets
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

        // Find user in database using the wallet address
        const dbUser = await User.findOne({
          wallet: user?.address
        });

        if(dbUser) {
          token.wallet = dbUser.wallet;
          token.fid = dbUser.fid;
          token.token = dbUser.token;
        } else {
          // Create new user with whitelist status
          const newUser = new User({
            wallet: user.address,
          });
          await newUser.save();
          
          token.wallet = user.address;
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
        wallet: token.wallet || token.walletAddress || '',
        user: {
          ...session.user,
          name: session.user?.name || 'Wallet User',
          wallet: token.wallet || token.walletAddress,
          fid: token.fid,
          token: token.token,
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