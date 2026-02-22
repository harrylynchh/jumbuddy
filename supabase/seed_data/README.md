# Modular Seed Data Structure

## Overview

This directory contains seed data for assignments in external JSON files rather than hardcoded in `seed.py`. This makes it easy to add new students, modify existing data, and manage large datasets.

## Directory Structure

```
seed_data/
├── README.md (this file)
├── arith/
│   ├── students.json      (student metadata and list)
│   ├── slupo01.json       (flushes for each student)
│   ├── abrow02.json
│   ├── cchen03.json
│   └── djames04.json
```

## Format

### `students.json`

Defines all students for an assignment. Each entry includes:

```json
{
  "description": "...",
  "students": [
    {
      "utln": "slupo01",
      "email": "student1@jumbuddy.test",
      "password": "testpass123",
      "display_name": "Seth Lupo",
      "data_file": "slupo01.json"
    }
  ]
}
```

### `{utln}.json`

One file per student. Contains their coding style and all flushes:

```json
{
  "style": "Iterative, lots of checking and refinement",
  "description": "...",
  "flushes": [
    {
      "file_path": "arith.py",
      "diffs": "unified diff format",
      "content": "full file content after this flush",
      "active_symbol": "function_name",
      "trigger": "init|timeout|file_switch|symbol_change|max_duration|deactivate",
      "window_duration": 12.0
    }
  ]
}
```

## Adding More Students

1. Add entry to `arith/students.json`:
   ```json
   {
     "utln": "esmith05",
     "email": "student5@jumbuddy.test",
     "password": "testpass123",
     "display_name": "Emma Smith",
     "data_file": "esmith05.json"
   }
   ```

2. Create `arith/esmith05.json` with flushes following the format above

3. Run the seed script — it will automatically load and insert the new student's data

## Seed Script Integration

The Python seed script (`supabase/seed.py`) loads all students and flushes from these files:

```python
import json

def load_arith_students(arith_dir):
    """Load student metadata from students.json"""
    with open(f"{arith_dir}/students.json") as f:
        return json.load(f)["students"]

def load_student_flushes(arith_dir, data_file):
    """Load flushes for a specific student"""
    with open(f"{arith_dir}/{data_file}") as f:
        return json.load(f)["flushes"]
```

## Notes

- Flushes are loaded in order from the JSON file
- `sequence_number` is auto-assigned by the database
- `content_hash` is computed from the `content` field
- All students are created in CS40 course and enrolled in the arith assignment
- Easy to add more students by following the pattern above
