import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      /** Neon users.id */
      id?: string;
      givenName?: string | null;
      moodleUserId?: number | null;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId?: string;
    givenName?: string | null;
    moodleUserId?: number | null;
  }
}
