// Creates the site users table (Cognito-backed accounts).
// Run: node scripts/create-users-table.js
require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);

async function main() {
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      cognito_sub    text NOT NULL UNIQUE,
      email          text NOT NULL UNIQUE,
      given_name     text,
      family_name    text,
      moodle_user_id integer UNIQUE,
      tenant_id      uuid REFERENCES tenants(id),
      created_at     timestamptz NOT NULL DEFAULT now(),
      updated_at     timestamptz NOT NULL DEFAULT now()
    )
  `;
  console.log('users table ready');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
