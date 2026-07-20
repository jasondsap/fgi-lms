// =============================================================================
// POST /api/account/registration
// Saves the one-time registration profile for the *signed-in* user. The user id
// always comes from the session — never from the request body — so a caller
// cannot write a profile onto someone else's account.
// =============================================================================
import { NextResponse } from 'next/server';
import { getSession } from '@/auth';
import { saveRegistration } from '@/lib/users';
import { USER_ROLE_LABELS, US_STATES, type UserRole } from '@/types';

const VALID_ROLES = new Set(Object.keys(USER_ROLE_LABELS));
const VALID_STATES = new Set(US_STATES.map(s => s.code));

/** Trim, collapse whitespace, and cap length on a free-text field. */
function clean(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, max) : '';
}

export async function POST(request: Request) {
  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const name         = clean(body.name, 120);
  const organization = clean(body.organization, 200);
  const state        = clean(body.state, 2).toUpperCase();
  const zip          = clean(body.zip, 10);
  const county       = clean(body.county, 120);
  const roleOther    = clean(body.roleOther, 200);

  const roles = (Array.isArray(body.roles) ? body.roles : [])
    .filter((r: unknown): r is UserRole => typeof r === 'string' && VALID_ROLES.has(r));

  const errors: Record<string, string> = {};
  if (!name)                     errors.name         = 'Name is required.';
  if (!organization)             errors.organization = 'Organization is required.';
  if (!VALID_STATES.has(state))  errors.state        = 'Select a state.';
  if (!/^\d{5}(-\d{4})?$/.test(zip)) errors.zip      = 'Enter a valid ZIP code.';
  if (!county)                   errors.county       = 'County is required.';
  if (roles.length === 0)        errors.roles        = 'Select at least one role.';

  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ errors }, { status: 400 });
  }

  // Split the single Name field into the given/family columns the users table
  // (and the Moodle mirror) already use.
  const parts = name.split(' ');
  const givenName  = parts[0];
  const familyName = parts.slice(1).join(' ');

  try {
    await saveRegistration(userId, {
      givenName,
      familyName,
      organization,
      state,
      zip,
      county,
      roles,
      // Only meaningful when "Other" was checked; it is the one optional field.
      roleOther: roles.includes('other') && roleOther ? roleOther : null,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Registration save failed:', error);
    return NextResponse.json({ error: 'Could not save registration.' }, { status: 500 });
  }
}
