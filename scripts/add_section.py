#!/usr/bin/env python3
"""
add_section.py — scaffold a new section JSON for the EC Companion.

Usage:
    python3 scripts/add_section.py 3.1
    python3 scripts/add_section.py 3.1 "Title of Section" 55 70

This creates data/sections/ch03/s3.1.json with empty fields, ready to fill.
Also prints a reminder to update data/book.json.

Run from the stanley-ec directory.
"""
import sys
import json
import os
import re

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 scripts/add_section.py <section_id> [title] [pdf_start] [pdf_end]")
        sys.exit(1)

    section_id = sys.argv[1]
    if not re.match(r'^\d+\.\d+$', section_id):
        print(f"Section ID must be like '2.3', got: {section_id}")
        sys.exit(1)

    ch, sec = section_id.split('.')
    ch_int = int(ch)
    title  = sys.argv[2] if len(sys.argv) > 2 else f"Section {section_id}"
    pdf_start = int(sys.argv[3]) if len(sys.argv) > 3 else 1
    pdf_end   = int(sys.argv[4]) if len(sys.argv) > 4 else pdf_start + 5

    out_dir = f"data/sections/ch{ch.zfill(2)}"
    os.makedirs(out_dir, exist_ok=True)
    out_path = f"{out_dir}/s{section_id}.json"

    if os.path.exists(out_path):
        print(f"File already exists: {out_path}")
        overwrite = input("Overwrite? (y/N): ").strip().lower()
        if overwrite != 'y':
            print("Aborted.")
            sys.exit(0)

    skeleton = {
        "id": section_id,
        "title": title,
        "chapter": ch_int,
        "pdf_pages": {"start": pdf_start, "end": pdf_end},
        "technique_tags": [],
        "status": "partial",

        "key_idea": "FILL IN: one sentence capturing the central insight.",

        "summary": "FILL IN: 2-4 paragraph summary for skimming.",

        "notation": [
            {"symbol": "example", "latex": "\\text{example}", "description": "FILL IN"}
        ],

        "definitions": [
            {
                "id": f"def-{section_id}-main",
                "order": 1,
                "term": "FILL IN: term",
                "statement": "FILL IN: formal statement.",
                "notes": "FILL IN: informal remarks or caveats."
            }
        ],

        "theorems": [
            {
                "id": f"thm-{section_id}-1",
                "order": 2,
                "number": f"{section_id}.1",
                "title": "FILL IN: theorem name",
                "statement": "FILL IN: theorem statement.",
                "proof_sketch": "FILL IN: 1-3 sentence proof sketch.",
                "proof_detailed": "FILL IN: full step-by-step proof.",
                "techniques": [],
                "cross_refs": []
            }
        ],

        "propositions": [],
        "corollaries": [],

        "examples": [
            {
                "id": f"{section_id}-ex1",
                "title": "FILL IN: example title",
                "content": "FILL IN: example setup.",
                "solution": "FILL IN: solution."
            }
        ],

        "exercises": [
            {
                "number": f"{section_id[2:]}.1",
                "statement": "FILL IN: exercise statement.",
                "difficulty": "medium",
                "techniques": [],
                "relevant_theorems": [section_id],
                "hints": ["FILL IN: hint 1."]
            }
        ],

        "connections": {
            "requires": [],
            "used_by": [],
            "related": []
        }
    }

    with open(out_path, 'w') as f:
        json.dump(skeleton, f, indent=2)

    print(f"Created: {out_path}")
    print()
    print("Next steps:")
    print(f"  1. Edit {out_path} — fill in all FILL IN fields.")
    print(f"  2. Update data/book.json — add section {section_id} to chapter {ch_int}:")
    print(f'     {{"id": "{section_id}", "title": "{title}", "status": "partial", "pdf_pages": {{"start": {pdf_start}, "end": {pdf_end}}}}}')
    print(f"  3. Set status to 'done' when complete.")

if __name__ == '__main__':
    main()
