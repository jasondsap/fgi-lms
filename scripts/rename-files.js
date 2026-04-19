// =============================================================================
// FGI LMS — File Renamer
// Renames all files in a folder: spaces → hyphens, ALL LETTERS → lowercase
// Removes any double-hyphens and trims hyphens from ends.
//
// Usage:
//   node scripts/rename-files.js <folder-path>
//
// Example:
//   node scripts/rename-files.js ./newsletters-raw
//   node scripts/rename-files.js ./toolkits-raw
//
// The script is DRY-RUN by default — it prints what it WOULD rename.
// Add --apply to actually rename the files.
//
// Example dry run:
//   node scripts/rename-files.js ./newsletters-raw
//
// Example live run:
//   node scripts/rename-files.js ./newsletters-raw --apply
// =============================================================================

const fs   = require('fs');
const path = require('path');

const folderArg = process.argv[2];
const apply     = process.argv.includes('--apply');

if (!folderArg) {
  console.error('Usage: node scripts/rename-files.js <folder-path> [--apply]');
  process.exit(1);
}

const folder = path.resolve(folderArg);

if (!fs.existsSync(folder)) {
  console.error(`Folder not found: ${folder}`);
  process.exit(1);
}

function slugifyFilename(filename) {
  const ext  = path.extname(filename);                  // e.g. ".pdf"
  const base = path.basename(filename, ext);            // name without extension

  const clean = base
    .toLowerCase()                                      // UPPERCASE → lowercase
    .replace(/['']/g, '')                               // remove apostrophes
    .replace(/[^a-z0-9]+/g, '-')                        // anything not a-z/0-9 → hyphen
    .replace(/-+/g, '-')                                // collapse multiple hyphens
    .replace(/^-+|-+$/g, '');                           // trim leading/trailing hyphens

  return clean + ext.toLowerCase();
}

const files = fs.readdirSync(folder).filter(f => {
  const full = path.join(folder, f);
  return fs.statSync(full).isFile();                    // files only, skip subdirectories
});

if (files.length === 0) {
  console.log('No files found in folder.');
  process.exit(0);
}

console.log(`\n${apply ? '🔄 RENAMING' : '👀 DRY RUN (add --apply to rename)'} — ${files.length} files in: ${folder}\n`);

let renamed  = 0;
let skipped  = 0;
let conflicts = 0;

for (const file of files) {
  const newName = slugifyFilename(file);

  if (file === newName) {
    console.log(`  ✓ unchanged  ${file}`);
    skipped++;
    continue;
  }

  const oldPath = path.join(folder, file);
  const newPath = path.join(folder, newName);

  // Check for collision with an existing file
  if (fs.existsSync(newPath) && file.toLowerCase() !== newName) {
    console.log(`  ⚠ CONFLICT  ${file}  →  ${newName}  (target already exists, skipping)`);
    conflicts++;
    continue;
  }

  console.log(`  ✎ rename     ${file}`);
  console.log(`           →  ${newName}`);

  if (apply) {
    fs.renameSync(oldPath, newPath);
  }

  renamed++;
}

console.log(`\n${apply ? 'Done' : 'Dry run complete'}.`);
console.log(`  ${renamed} would be renamed${apply ? ' — renamed' : ''}`);
console.log(`  ${skipped} already clean`);
if (conflicts) console.log(`  ${conflicts} skipped (name conflict)`);

if (!apply && renamed > 0) {
  console.log(`\nRun again with --apply to rename for real:`);
  console.log(`  node scripts/rename-files.js ${folderArg} --apply\n`);
}
