import 'next-auth';
import 'next-auth/jwt';

/** Site access level — distinct from the "I am a…" interest checkboxes. */
export type AccessRole = 'learner' | 'staff' | 'admin';

declare module 'next-auth' {
  interface Session {
    user: {
      /** Neon users.id */
      id?: string;
      givenName?: string | null;
      moodleUserId?: number | null;
      /** learner (default) | staff | admin — see docs/CLAUDE.md §6au */
      role?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }

  interface User {
    userId?: string;
    givenName?: string | null;
    moodleUserId?: number | null;
    role?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId?: string;
    givenName?: string | null;
    moodleUserId?: number | null;
    role?: string;
  }
}
