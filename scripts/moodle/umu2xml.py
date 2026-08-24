# Convert the Intermediate Evaluation UMU question bank to Moodle XML,
# matching the proven build-course pipeline's output shape.
import openpyxl, html, json, sys

SRC = r"C:/Users/Unity/fgi-lms/docs/courses/Intermediate Program Evaluations/NAADAC---Intermediate-Evaluation).xlsx"
OUT_XML = r"C:/Users/Unity/AppData/Local/Temp/claude/C--Users-Unity-fgi-lms/aeecf777-bc53-4777-8b38-e8f8a9b5b8b3/scratchpad/intermediate-evaluation.questions.xml"
OUT_SPEC = r"C:/Users/Unity/AppData/Local/Temp/claude/C--Users-Unity-fgi-lms/aeecf777-bc53-4777-8b38-e8f8a9b5b8b3/scratchpad/intermediate-evaluation.spec.json"
FULLNAME = "Intermediate Program Evaluation"

def cdata(s):
    return "<![CDATA[" + s.replace("]]>", "]]]]><![CDATA[>") + "]]>"

wb = openpyxl.load_workbook(SRC, data_only=True)
ws = wb["Question bank information"]
rows = list(ws.iter_rows(values_only=True))
header = rows[1]
assert str(header[0]).strip() == "Question", header
questions = []
for i, row in enumerate(rows[2:], start=1):
    prompt = (row[0] or "").strip() if row[0] else ""
    if not prompt:
        continue
    qtype = (row[1] or "").strip()
    correct = (row[2] or "").strip().upper()
    explanation = (row[5] or "").strip() if row[5] else ""
    choices = [(c or "").strip() for c in row[6:14]]
    choices = [c for c in choices if c]
    assert qtype in ("Single-answer", "Multiple-answer"), f"row {i}: type {qtype!r}"
    idxs = [ord(ch) - 65 for ch in correct]
    assert idxs and all(0 <= x < len(choices) for x in idxs), f"row {i}: answer {correct!r} vs {len(choices)} options"
    single = qtype == "Single-answer"
    if single:
        assert len(idxs) == 1, f"row {i}: single-answer with {correct!r}"

    answers = []
    ncorrect = len(idxs)
    for j, text in enumerate(choices):
        if single:
            frac = "100" if j in idxs else "0"
        else:
            frac = f"{100/ncorrect:.5f}" if j in idxs else f"{-100/ncorrect:.5f}"
        answers.append(
            f'    <answer fraction="{frac}" format="html">\n'
            f"      <text>{cdata('<p>' + html.escape(text, quote=False) + '</p>')}</text>\n"
            f"      <feedback format=\"html\"><text></text></feedback>\n"
            f"    </answer>"
        )
    gf = "<p>" + html.escape(explanation, quote=False) + "</p>"
    questions.append("\n".join([
        '  <question type="multichoice">',
        f"    <name><text>{html.escape(FULLNAME, quote=False)} Q{len(questions)+1}</text></name>",
        f'    <questiontext format="html"><text>{cdata("<p>" + html.escape(prompt, quote=False) + "</p>")}</text></questiontext>',
        f'    <generalfeedback format="html"><text>{cdata(gf)}</text></generalfeedback>',
        "    <defaultgrade>1</defaultgrade>",
        "    <penalty>0.3333333</penalty>",
        "    <hidden>0</hidden>",
        f"    <single>{'true' if single else 'false'}</single>",
        "    <shuffleanswers>true</shuffleanswers>",
        "    <answernumbering>abc</answernumbering>",
        *answers,
        "  </question>",
    ]))
    print(f"Q{len(questions)}: {qtype:15s} correct={correct:4s} options={len(choices)} | {prompt[:60]}")

xml = "\n".join(['<?xml version="1.0" encoding="UTF-8"?>', "<quiz>", *questions, "</quiz>", ""])
open(OUT_XML, "w", encoding="utf-8").write(xml)
json.dump({"fullname": FULLNAME, "videos": [], "questionCount": len(questions)},
          open(OUT_SPEC, "w", encoding="utf-8"), indent=1)
print(f"\n{len(questions)} questions -> intermediate-evaluation.questions.xml")
