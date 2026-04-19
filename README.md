# FGI Learning Management & Resource System

Built by MADE180 for Fletcher Group, Inc.

## Stack

| Layer | Tech |
|---|---|
| Front-end | Next.js 14 (App Router) + TypeScript |
| Database | Neon PostgreSQL (serverless) |
| Storage | AWS S3 (private bucket, presigned URLs) |
| Auth | JWT via `jose` + bcrypt |
| LMS (Phase 2) | Moodle Core on AWS |

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set environment variables
cp .env.local.example .env.local
# Fill in: DATABASE_URL, AWS_*, JWT_SECRET

# 3. Run database migration
# Paste contents of 001_fgi_lms_initial_schema.sql into Neon SQL editor

# 4. Start development server
npm run dev
```

## Project Structure

```
app/
  page.tsx                    → Homepage (hero + Vimeo embed)
  library/page.tsx            → Filterable resource grid
  resource/[slug]/page.tsx    → Resource detail / viewer
  api/
    resources/                → GET list + GET by slug
    tenants/[slug]/           → Tenant config
    admin/                    → Admin auth + resource CRUD

components/
  layout/Header.tsx           → FGI Blue header + nav
  layout/Footer.tsx           → FGI Blue footer + HRSA disclaimer
  library/ResourceCard.tsx    → Card with type badge, thumbnail, excerpt
  library/FilterSidebar.tsx   → Filter sidebar (type, length, audience, topic)

lib/
  db.ts                       → Neon SQL client
  s3.ts                       → S3 presigned URL generation
  auth.ts                     → JWT sign/verify for admin
  resources.ts                → Query helpers

types/index.ts                → Shared TypeScript types + label maps
```

## S3 Bucket Layout

```
fgi-resources/
  thumbnails/{slug}.webp
  toolkits/{slug}.pdf
  papers/{slug}.pdf
  newsletters/{slug}.pdf
  infographics/{slug}.pdf
  success-stories/{slug}.pdf
  non-fgi/{slug}.pdf
  tenant-assets/{tenant-slug}/logo.webp
```

## Adding a New Resource (Admin)

```bash
# Via API (once admin UI is built)
curl -X POST /api/admin/resources \
  -H "Authorization: Bearer <admin-jwt>" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Communicate in a Crisis",
    "slug": "communicate-in-a-crisis",
    "type": "toolkit",
    "description": "...",
    "duration_minutes": 15,
    "s3_key": "toolkits/communicate-in-a-crisis.pdf",
    "audience_tags": ["house_owner", "peer_support"],
    "topic_tags": ["operations", "rh_management"]
  }'
```

## Phase 2 — Moodle Integration

When Moodle is deployed on AWS:
1. Set `moodle_course_id` on existing course-type resources
2. Add `/api/moodle/courses` proxy route to Moodle REST API
3. ResourceCard links to Moodle enrollment URL for course type
4. Implement shared session / SSO between Next.js and Moodle

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `AWS_REGION` | S3 bucket region |
| `AWS_ACCESS_KEY_ID` | IAM access key |
| `AWS_SECRET_ACCESS_KEY` | IAM secret |
| `S3_BUCKET_NAME` | `fgi-resources` |
| `S3_PRESIGNED_URL_EXPIRY` | Seconds (default 3600) |
| `JWT_SECRET` | Admin JWT signing secret |
| `NEXT_PUBLIC_APP_URL` | Deployed app URL |
