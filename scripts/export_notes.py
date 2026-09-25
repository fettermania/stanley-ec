#!/usr/bin/env python3
"""
export_notes.py — export notes and progress from an EC Companion JSON export file.

Usage:
    python3 scripts/export_notes.py ec-companion-2026-01-01.json
    python3 scripts/export_notes.py ec-companion-2026-01-01.json --format md
    python3 scripts/export_notes.py ec-companion-2026-01-01.json --format latex

Reads the JSON file produced by the browser Export button.
Writes:
  - notes/all_notes.md  (Markdown, one section per heading)
  - progress/exercises.md (exercise progress summary)
"""
import sys
import json
import os
from datetime import datetime

def load_book():
    try:
        with open('data/book.json') as f:
            return json.load(f)
    except FileNotFoundError:
        return None

def load_section(section_id):
    ch, _ = section_id.split('.')
    path = f"data/sections/ch{ch.zfill(2)}/s{section_id}.json"
    try:
        with open(path) as f:
            return json.load(f)
    except FileNotFoundError:
        return None

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 scripts/export_notes.py <export.json> [--format md|latex]")
        sys.exit(1)

    export_file = sys.argv[1]
    fmt = 'md'
    if '--format' in sys.argv:
        i = sys.argv.index('--format')
        fmt = sys.argv[i+1]

    with open(export_file) as f:
        data = json.load(f)

    notes    = data.get('notes', {})
    progress = data.get('progress', {})
    exported = data.get('exported', 'unknown')

    book = load_book()

    # --- Notes export ---
    os.makedirs('notes', exist_ok=True)
    notes_path = 'notes/all_notes.md'
    with open(notes_path, 'w') as f:
        f.write(f"# EC Companion — My Notes\n")
        f.write(f"Exported: {exported}\n\n")

        if book:
            for ch in book['chapters']:
                has_notes = any(sec['id'] in notes and notes[sec['id']].strip()
                                for sec in ch['sections'])
                if not has_notes:
                    continue
                f.write(f"## Chapter {ch['num']}: {ch['title']}\n\n")
                for sec in ch['sections']:
                    note = notes.get(sec['id'], '').strip()
                    if note:
                        f.write(f"### §{sec['id']} — {sec['title']}\n\n")
                        f.write(note + "\n\n")
        else:
            for sec_id, note in sorted(notes.items()):
                if note.strip():
                    f.write(f"## §{sec_id}\n\n{note.strip()}\n\n")

    print(f"Notes written to: {notes_path}")

    # --- Progress export ---
    os.makedirs('progress', exist_ok=True)
    prog_path = 'progress/exercises.md'
    solved   = [k for k,v in progress.items() if v == 'solved']
    attempted = [k for k,v in progress.items() if v == 'attempted']

    with open(prog_path, 'w') as f:
        f.write(f"# Exercise Progress\nExported: {exported}\n\n")
        f.write(f"**Solved**: {len(solved)}  **Attempted**: {len(attempted)}\n\n")
        if solved:
            f.write("## Solved\n")
            for ex in sorted(solved):
                f.write(f"- {ex}\n")
            f.write("\n")
        if attempted:
            f.write("## Attempted\n")
            for ex in sorted(attempted):
                f.write(f"- {ex}\n")

    print(f"Progress written to: {prog_path}")

    # Also write raw JSON for programmatic use
    raw_path = 'progress/progress.json'
    with open(raw_path, 'w') as f:
        json.dump(progress, f, indent=2)
    print(f"Raw progress JSON: {raw_path}")

if __name__ == '__main__':
    main()
