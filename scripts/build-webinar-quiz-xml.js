// Converts Jennifer's webinar quiz spreadsheets into Moodle XML question files.
// Run: node scripts/build-webinar-quiz-xml.js
//
// Input is one sheet per webinar with the header
//   Question | Option A | Option B | Option C | Option D | Correct Answer
// and a letter (A-D) in the last column. True/False rows carry only two
// options, stored by Excel as boolean cells (t="b", 1/0) rather than the words.
//
// Output goes to scripts/data/webinar-quizzes/<slug>.xml, ready to import at
// question/bank/importquestions/import.php?cmid=<quiz cmid> — no
// <question type="category"> wrapper, so the questions land in the quiz's own
// bank and show up directly in "Add from question bank" (docs/CLAUDE.md §6c).
//
// NOTE: `Braided_Funding_Quiz.csv` is not a CSV. It is an xlsx with the wrong
// extension, so every file here is read as a zip.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const DROP = path.join(
  __dirname, '..', 'docs', 'final build', 'Webinars', 'Webinars', 'Webinars',
);
const OUT = path.join(__dirname, 'data', 'webinar-quizzes');

/** slug -> spreadsheet, relative to the webinar drop. */
const QUIZZES = {
  'trauma-get-it-off-your-chest-it-s-an-inside-job':
    "Webinars 2026/Trauma-Informed Care It's an Inside Job Webinar March 2026/Trauma webinar quiz.xlsx",
  'value-of-recovery-through-community-based-recovery-supports':
    'Webinars 2026/Value of Recovery Through Community Based Recovery Supports April 2026/Value webinar april 2026 quiz.xlsx',
  'working-with-challenging-behaviors-turning-behavioral-incidents-into-transformational-experiences':
    'Webinars 2026/Working with Challenging Behaviors Webinar May 2026/Challenging Behaviors Webinar may 2026 quiz.xlsx',
  'seed-sower-building-recovery-ecosystems':
    'Webinars 2026/Beyond the Grant Rural Nonprofit Sustainability June 4, 2026/Braided_Funding_Quiz.csv',
};

// --- minimal xlsx reader (no dependency; these sheets are plain text grids) ---

function unzip(file, member) {
  // Node has no zip reader in core; PowerShell's is always present on Windows.
  const script = `
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $zip = [System.IO.Compression.ZipFile]::OpenRead('${file.replace(/'/g, "''")}')
    $entry = $zip.Entries | Where-Object { $_.FullName -eq '${member}' }
    $reader = New-Object System.IO.StreamReader($entry.Open())
    $reader.ReadToEnd()
    $reader.Close(); $zip.Dispose()
  `;
  return execFileSync('powershell.exe', ['-NoProfile', '-Command', script], {
    encoding: 'utf8', maxBuffer: 32 * 1024 * 1024,
  });
}

function listMembers(file) {
  const script = `
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $zip = [System.IO.Compression.ZipFile]::OpenRead('${file.replace(/'/g, "''")}')
    $zip.Entries | ForEach-Object { $_.FullName }
    $zip.Dispose()
  `;
  return execFileSync('powershell.exe', ['-NoProfile', '-Command', script], {
    encoding: 'utf8', maxBuffer: 8 * 1024 * 1024,
  }).split(/\r?\n/).map(s => s.trim()).filter(Boolean);
}

function decodeEntities(s) {
  return s
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&amp;/g, '&');
}

function readGrid(file) {
  const members = listMembers(file);
  const sharedXml = members.includes('xl/sharedStrings.xml')
    ? unzip(file, 'xl/sharedStrings.xml') : '';
  const shared = [...sharedXml.matchAll(/<si>([\s\S]*?)<\/si>/g)]
    .map(m => decodeEntities(m[1].replace(/<[^>]+>/g, '')));

  const sheetName = members.find(m => /^xl\/worksheets\/sheet\d+\.xml$/.test(m));
  const xml = unzip(file, sheetName);

  const rows = [];
  for (const rowMatch of xml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
    const cells = [];
    for (const cellMatch of rowMatch[1].matchAll(/<c\s+([^>]*)>([\s\S]*?)<\/c>/g)) {
      const attrs = cellMatch[1];
      const type = /t="([^"]+)"/.exec(attrs)?.[1];
      const value = /<v>([\s\S]*?)<\/v>/.exec(cellMatch[2])?.[1] ?? '';
      if (type === 's' && value) cells.push(shared[Number(value)] ?? '');
      // Excel stores TRUE/FALSE as a boolean cell — the words are gone by the
      // time they reach the file, so they have to be put back.
      else if (type === 'b') cells.push(value === '1' ? 'True' : 'False');
      else cells.push(decodeEntities(value));
    }
    if (cells.some(c => c.trim())) rows.push(cells);
  }
  return rows;
}

// --- Moodle XML ---

const cdata = (s) => `<![CDATA[${s.replace(/\]\]>/g, ']]]]><![CDATA[>')}]]>`;

function questionXml(prompt, options, correctIndex, index) {
  const answers = options.map((text, i) => [
    `    <answer fraction="${i === correctIndex ? '100' : '0'}" format="html">`,
    `      <text>${cdata(`<p>${text}</p>`)}</text>`,
    '      <feedback format="html"><text></text></feedback>',
    '    </answer>',
  ].join('\n')).join('\n');

  return [
    '  <question type="multichoice">',
    `    <name><text>Q${index}</text></name>`,
    `    <questiontext format="html"><text>${cdata(`<p>${prompt}</p>`)}</text></questiontext>`,
    '    <generalfeedback format="html"><text></text></generalfeedback>',
    '    <defaultgrade>1.0000000</defaultgrade>',
    '    <penalty>0.3333333</penalty>',
    '    <hidden>0</hidden>',
    '    <single>true</single>',
    // Shuffling a True/False pair is pointless but harmless; shuffling the
    // four-option questions is what stops answer-position memorisation.
    '    <shuffleanswers>true</shuffleanswers>',
    '    <answernumbering>abc</answernumbering>',
    answers,
    '  </question>',
  ].join('\n');
}

function convert(slug, relative) {
  const file = path.join(DROP, relative);
  const rows = readGrid(file);
  const [header, ...body] = rows;
  if (!/^question$/i.test((header[0] || '').trim())) {
    throw new Error(`${slug}: unexpected header ${JSON.stringify(header)}`);
  }

  const questions = body.map((row, i) => {
    // Strip the "12. " numbering Jennifer's sheets carry inside the prompt.
    const prompt = (row[0] || '').replace(/^\s*\d+\.\s*/, '').trim();
    const options = row.slice(1, -1).map(c => (c || '').trim()).filter(Boolean);
    const letter = (row[row.length - 1] || '').trim().toUpperCase();
    const correctIndex = letter.charCodeAt(0) - 65;

    if (!prompt) throw new Error(`${slug}: row ${i + 2} has no question text`);
    if (options.length < 2) throw new Error(`${slug}: row ${i + 2} has ${options.length} options`);
    if (!(correctIndex >= 0 && correctIndex < options.length)) {
      throw new Error(`${slug}: row ${i + 2} answer "${letter}" is outside its ${options.length} options`);
    }
    return questionXml(prompt, options, correctIndex, i + 1);
  });

  const xml = ['<?xml version="1.0" encoding="UTF-8"?>', '<quiz>', ...questions, '</quiz>', ''].join('\n');
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, `${slug}.xml`), xml, 'utf8');
  return questions.length;
}

let total = 0;
for (const [slug, relative] of Object.entries(QUIZZES)) {
  const n = convert(slug, relative);
  total += n;
  console.log(`${String(n).padStart(2)} questions  ${slug}.xml`);
}
console.log(`\n${total} questions across ${Object.keys(QUIZZES).length} quizzes -> ${path.relative(process.cwd(), OUT)}`);
