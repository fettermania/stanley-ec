# EC Companion

An interactive study companion for **Enumerative Combinatorics, Volume 1** by Richard P. Stanley.

## Quick Start

```bash
cd stanley-ec
python3 -m http.server 8080
# Open http://localhost:8080 in your browser
```

That's it. No build step. No npm install. Pure HTML/JS/CSS served statically.

## What's inside

| Path | Purpose |
|------|---------|
| `index.html` + `js/app.js` + `css/main.css` | The single-page web app |
| `data/book.json` | Book structure: chapters, sections, PDF pages |
| `data/techniques.json` | Proof technique library (10 techniques so far) |
| `data/sections/ch02/s2.1.json` – `s2.7.json` | Section content: §2.1–2.3 fully populated, §2.4–2.7 stubbed |
| `scripts/add_section.py` | Scaffold a new section |
| `scripts/export_notes.py` | Export notes/progress from browser to Markdown |

## Features

- **Section browser** — navigate by section, see progress dots (done/partial/stub)
- **Six tabs per section**: Overview, Theorems & Defs, Examples, Exercises, My Notes, Connections
- **Expandable proofs** — sketch visible by default, full proof behind a toggle
- **Exercise tracker** — mark exercises not-started / attempted / solved, with hints
- **My Notes** — type Markdown notes per section; auto-saved in the browser. Export to JSON for git.
- **Search** — full-text search across all loaded sections
- **Technique Library** — 10 proof techniques with descriptions and cross-references
- **Theorem Index** — all theorems from loaded sections, linked back to their section
- **Export / Import** — export notes + progress as JSON; import them back

## Adding a new section (as you work through the book)

```bash
# Scaffold the JSON
python3 scripts/add_section.py 3.1 "Introduction to Posets" 249 260

# Edit the scaffold with your notes
nano data/sections/ch03/s3.1.json

# Update book.json to add the section to the chapter listing
# (the scaffold script prints exactly what to add)
```

## Saving notes to git

Notes are stored in your browser's localStorage. To persist them in git:

1. Click **Export** in the top bar → downloads `ec-companion-YYYY-MM-DD.json`
2. Run `python3 scripts/export_notes.py ec-companion-YYYY-MM-DD.json`
   → writes `notes/all_notes.md` and `progress/exercises.md`
3. `git add notes/ progress/ && git commit -m "notes: update through §2.3"`

Or just commit the raw JSON export directly.

## Git setup

```bash
cd stanley-ec
git init
git add .
git commit -m "Initial EC companion — §2.1–2.3 fully populated"
# Add your remote and push as usual
```

## Section JSON schema

Each section JSON has these fields:

```json
{
  "id": "2.1",
  "title": "Inclusion-Exclusion",
  "pdf_pages": {"start": 223, "end": 226},
  "technique_tags": ["inclusion-exclusion"],
  "key_idea": "One sentence capturing the central insight.",
  "summary": "2-4 paragraph summary for quick skim.",
  "notation": [{"symbol": "f_{=}(T)", "latex": "...", "description": "..."}],
  "definitions": [{"id": "...", "order": 1, "term": "...", "statement": "...", "notes": "..."}],
  "theorems": [{
    "id": "thm-2.1.1", "number": "2.1.1", "title": "...", "statement": "...",
    "proof_sketch": "...", "proof_detailed": "...",
    "techniques": [], "cross_refs": []
  }],
  "propositions": [...],
  "corollaries": [...],
  "examples": [{"id": "...", "title": "...", "content": "...", "solution": "..."}],
  "exercises": [{"number": "2.1", "statement": "...", "difficulty": "...", "hints": [...]}],
  "connections": {"requires": [], "used_by": [], "related": []}
}
```

MathJax renders all `$...$` and `$$...$$` expressions. Markdown (`**bold**`, `*italic*`, `` `code` ``) is supported in all text fields.

## Current coverage

| Section | Status |
|---------|--------|
| §2.1 Inclusion-Exclusion | ✓ Done |
| §2.2 Examples (descent sets, derangements, $q$-analogues) | ✓ Done |
| §2.3 Rook Polynomials | ✓ Done |
| §2.4–2.7 | Stub (fill in as you read) |
| Chapter 1 | Stub |
