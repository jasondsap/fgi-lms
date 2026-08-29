# Convert a simple quiz sheet (Question | Option A | B | C | D | Correct Answer)
# to Moodle XML + the augment_course.php spec, matching umu2xml.py's output.
# Rows whose prompt is not a numbered question ("N. …") or that have fewer
# than two options are reported and skipped — the 8-29 "quiz pregnant women"
# sheet arrived with rows 4-8 overwritten by an Excel fill-down.
#
#   python scripts/moodle/simplequiz2xml.py <xlsx> <shortname> "<fullname>" <outdir>
import html, json, os, re, sys
import openpyxl

SRC, SHORT, FULLNAME, OUTDIR = sys.argv[1:5]
LETTERS = "ABCDEFGH"


def cdata(s):
    return "<![CDATA[" + s.replace("]]>", "]]]]><![CDATA[>") + "]]>"


wb = openpyxl.load_workbook(SRC, data_only=True)
ws = wb.active
rows = list(ws.iter_rows(values_only=True))
header = [str(c).strip().lower() if c else "" for c in rows[0]]
assert header[0] == "question", header
opt_cols = [i for i, h in enumerate(header) if h.startswith("option")]
ans_col = next(i for i, h in enumerate(header) if h.startswith("correct"))

questions, skipped = [], []
for n, row in enumerate(rows[1:], start=1):
    prompt = str(row[0]).strip() if row[0] else ""
    choices = [str(row[i]).strip() for i in opt_cols if row[i] not in (None, "")]
    correct = str(row[ans_col]).strip().upper() if row[ans_col] else ""
    m = re.match(r"^\d+\.\s*(.+)$", prompt, re.S)
    if not m or len(choices) < 2 or correct not in LETTERS[: len(choices)]:
        skipped.append((n, prompt[:70]))
        continue
    prompt = m.group(1).strip()
    idx = LETTERS.index(correct)
    answers = []
    for j, text in enumerate(choices):
        frac = "100" if j == idx else "0"
        answers.append(
            f'    <answer fraction="{frac}" format="html">\n'
            f"      <text>{cdata('<p>' + html.escape(text, quote=False) + '</p>')}</text>\n"
            f'      <feedback format="html"><text></text></feedback>\n'
            f"    </answer>"
        )
    questions.append("\n".join([
        '  <question type="multichoice">',
        f"    <name><text>{html.escape(FULLNAME, quote=False)} Q{len(questions) + 1}</text></name>",
        f'    <questiontext format="html"><text>{cdata("<p>" + html.escape(prompt, quote=False) + "</p>")}</text></questiontext>',
        '    <generalfeedback format="html"><text></text></generalfeedback>',
        "    <defaultgrade>1</defaultgrade>",
        "    <penalty>0.3333333</penalty>",
        "    <hidden>0</hidden>",
        "    <single>true</single>",
        # True/False rows keep their order; everything else shuffles like UMU banks.
        f"    <shuffleanswers>{'false' if choices[:2] == ['True', 'False'] and len(choices) == 2 else 'true'}</shuffleanswers>",
        "    <answernumbering>abc</answernumbering>",
        *answers,
        "  </question>",
    ]))
    print(f"Q{len(questions)} (sheet row {n}): correct={correct} options={len(choices)} | {prompt[:60]}")

for n, p in skipped:
    print(f"SKIPPED sheet row {n}: {p!r}")

os.makedirs(OUTDIR, exist_ok=True)
xml = "\n".join(['<?xml version="1.0" encoding="UTF-8"?>', "<quiz>", *questions, "</quiz>", ""])
open(os.path.join(OUTDIR, SHORT + ".questions.xml"), "w", encoding="utf-8").write(xml)
json.dump({"fullname": FULLNAME, "videos": [], "questionCount": len(questions)},
          open(os.path.join(OUTDIR, SHORT + ".spec.json"), "w", encoding="utf-8"), indent=1)
print(f"\n{len(questions)} questions -> {SHORT}.questions.xml ({len(skipped)} skipped)")
