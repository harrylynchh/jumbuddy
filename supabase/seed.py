#!/usr/bin/env python3
"""
Seed local Supabase with test data for the full schema.
Creates: professor, multiple students, 1 TA, 2 courses (CS15, CS40), assignments, and realistic flushes.
Loads assignment-specific data from external JSON files in seed_data/ directory.
"""

import os
import json
import uuid
import hashlib
from datetime import datetime, timedelta

from dotenv import load_dotenv
from supabase import create_client

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(root, ".env"))

SUPABASE_URL = os.environ.get("SUPABASE_URL", "http://localhost:10002")
SERVICE_KEY = os.environ.get(
    "SUPABASE_SERVICE_ROLE_KEY",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU",
)

sb = create_client(SUPABASE_URL, SERVICE_KEY)


def create_user(email, password, utln, display_name):
    """Create an auth user and a profile. Returns profile ID."""
    user = sb.auth.admin.create_user({
        "email": email,
        "password": password,
        "email_confirm": True,
    })
    uid = user.user.id

    sb.table("profiles").insert({
        "id": uid,
        "email": email,
        "utln": utln,
        "display_name": display_name,
    }).execute()

    return uid


def create_flush(profile_id, assignment_id, file_path, diffs, content, active_symbol, trigger="timeout", window_duration=10.0):
    """Create a realistic flush with metrics."""
    content_hash = hashlib.sha256(content.encode()).hexdigest()
    client_flush_id = str(uuid.uuid4())
    now = datetime.utcnow()
    start_ts = (now - timedelta(seconds=window_duration)).isoformat() + "Z"
    end_ts = now.isoformat() + "Z"

    # Calculate basic metrics from diffs
    lines_added = diffs.count("\n+")
    lines_removed = diffs.count("\n-")
    chars_inserted = sum(len(line) for line in diffs.split("\n") if line.startswith("+"))
    chars_deleted = sum(len(line) for line in diffs.split("\n") if line.startswith("-"))
    net_change = chars_inserted - chars_deleted
    lines_touched = max(lines_added, lines_removed, 1)

    edit_velocity = chars_inserted / max(window_duration, 1.0)
    rewrite_ratio = (chars_inserted + chars_deleted) / max(abs(net_change), 1) if net_change != 0 else None

    sb.table("flushes").insert({
        "profile_id": profile_id,
        "assignment_id": assignment_id,
        "file_path": file_path,
        "client_flush_id": client_flush_id,
        "sequence_number": 0,  # Will be set by server
        "content_hash": content_hash,
        "trigger": trigger,
        "start_timestamp": start_ts,
        "end_timestamp": end_ts,
        "diffs": diffs,
        "snapshot": content,
        "active_symbol": active_symbol,
        "metrics": {
            "chars_inserted": chars_inserted,
            "chars_deleted": chars_deleted,
            "rewrite_ratio": rewrite_ratio,
            "edit_velocity": edit_velocity,
            "lines_touched": lines_touched,
            "thrash": {"score": 0, "thrashing_lines": []},
            "delete_rewrite": None,
            "cursor_reads": {},
            "pause_count": 0,
            "edit_events": max(chars_inserted, 1),
        },
    }).execute()


def load_assignment_students(assignment_dir):
    """Load student metadata from students.json in assignment directory."""
    students_file = os.path.join(assignment_dir, "students.json")
    with open(students_file) as f:
        return json.load(f)["students"]


def load_student_flushes(assignment_dir, data_file):
    """Load flushes for a specific student from their JSON file."""
    flush_file = os.path.join(assignment_dir, data_file)
    with open(flush_file) as f:
        return json.load(f)["flushes"]


def seed():
    print("Seeding...")

    # --- Users ---
    prof_id = create_user("mark.sheldon@tufts.edu", "testpass123", "msheld01", "Mark Sheldon")
    print(f"  Professor: msheld01 ({prof_id})")

    ta_id = create_user("jane.ta@tufts.edu", "testpass123", "jta0102", "Jane TA")
    print(f"  TA: jta0102 ({ta_id})")

    # --- CS15 Course ---
    course1 = sb.table("courses").insert({
        "name": "CS 15 - Data Structures",
        "code": "CS15",
        "professor_id": prof_id,
    }).execute()
    course1_id = course1.data[0]["id"]
    print(f"  Course: CS15 ({course1_id})")

    # --- CS40 Course ---
    course2 = sb.table("courses").insert({
        "name": "CS 40 - Machine Structure & Assembly",
        "code": "CS40",
        "professor_id": prof_id,
    }).execute()
    course2_id = course2.data[0]["id"]
    print(f"  Course: CS40 ({course2_id})")

    # Load arith student data
    arith_seed_dir = os.path.join(root, "supabase", "seed_data", "arith")
    arith_students_meta = load_assignment_students(arith_seed_dir)

    # Create all arith students and store their IDs
    print(f"\n  Creating {len(arith_students_meta)} arith students...")
    student_profiles = {}
    for i, student_meta in enumerate(arith_students_meta):
        utln = student_meta["utln"]
        email = student_meta["email"]
        password = student_meta["password"]
        display_name = student_meta["display_name"]

        student_id = create_user(email, password, utln, display_name)
        student_profiles[utln] = student_id
        if (i + 1) % 5 == 0:
            print(f"    Created {i + 1}/{len(arith_students_meta)} students")

    # --- CS15 Memberships (team members) ---
    team_utlns = ["slupo01", "bgrazi02", "joverh01", "ealema01", "msharf02", "hlynch02"]
    cs15_enrollments = [
        {"profile_id": student_profiles[u], "course_id": course1_id}
        for u in team_utlns if u in student_profiles
    ]
    if cs15_enrollments:
        sb.table("enrollments").insert(cs15_enrollments).execute()
    print(f"  Enrolled {len(cs15_enrollments)} students in CS15")

    # --- CS40 Memberships (all arith students) ---
    enrollment_records = [{"profile_id": pid, "course_id": course2_id} for pid in student_profiles.values()]
    sb.table("enrollments").insert(enrollment_records).execute()
    print(f"  Enrolled {len(student_profiles)} students in CS40")

    sb.table("teaching_assistants").insert({
        "profile_id": ta_id,
        "course_id": course1_id,
    }).execute()
    sb.table("teaching_assistants").insert({
        "profile_id": ta_id,
        "course_id": course2_id,
    }).execute()
    print("  Assigned TA to both courses")

    # --- CS15 Assignment ---
    assignment1 = sb.table("assignments").insert({
        "course_id": course1_id,
        "name": "LinkedList",
        "description": "Implement a doubly-linked list with templated nodes",
    }).execute()
    assignment1_id = assignment1.data[0]["id"]
    print(f"  Assignment: LinkedList ({assignment1_id})")

    # --- CS40 Assignments ---
    assignment2 = sb.table("assignments").insert({
        "course_id": course2_id,
        "name": "arith",
        "description": "Image compressor using arithmetic coding",
    }).execute()
    assignment2_id = assignment2.data[0]["id"]
    print(f"  Assignment: arith ({assignment2_id})")

    assignment3 = sb.table("assignments").insert({
        "course_id": course2_id,
        "name": "filesofpix",
        "description": "Restore corrupted image files from lines of pixels",
    }).execute()
    assignment3_id = assignment3.data[0]["id"]
    print(f"  Assignment: filesofpix ({assignment3_id})")

    # --- Additional CS40 Assignments (empty — no flush data) ---
    for name, desc in [
        ("iii", "Interfaces, Implementations, and Images — pixel transformations using polymorphism"),
        ("locality", "Measure and optimize cache locality in 2D array traversals"),
        ("bomb", "Binary bomb lab — defuse a binary bomb by reverse-engineering assembly"),
        ("profiling", "Profile and optimize a rotation/transformation pipeline"),
        ("um", "Universal Machine — build an emulator for a simple instruction set"),
    ]:
        row = sb.table("assignments").insert({
            "course_id": course2_id,
            "name": name,
            "description": desc,
        }).execute()
        print(f"  Assignment: {name} ({row.data[0]['id']}) [empty]")

    # --- Generate realistic flushes for arith assignment ---
    print("\n  Loading and inserting arith flushes for all students...")

    total_flushes_created = 0
    for i, student_meta in enumerate(arith_students_meta):
        utln = student_meta["utln"]
        data_file = student_meta["data_file"]
        profile_id = student_profiles[utln]

        flushes = load_student_flushes(arith_seed_dir, data_file)
        for flush_data in flushes:
            create_flush(
                profile_id,
                assignment2_id,
                flush_data["file_path"],
                flush_data["diffs"],
                flush_data["content"],
                flush_data["active_symbol"],
                flush_data.get("trigger", "timeout"),
                flush_data.get("window_duration", 10.0),
            )
            total_flushes_created += 1

        if (i + 1) % 5 == 0:
            print(f"    Inserted flushes for {i + 1}/{len(arith_students_meta)} students ({total_flushes_created} total flushes)")

    print("\n  Skipped filesofpix (can be added separately if needed)")

    print(f"\n✓ Seed complete! Created {total_flushes_created} flushes for arith assignment")
    print("\n=== Test Credentials ===")
    print("  Professor:  msheld01 / testpass123  (mark.sheldon@tufts.edu)")
    print("  TA:         jta0102 / testpass123  (jane.ta@tufts.edu)")
    print(f"\n  {len(arith_students_meta)} CS40 Students (arith assignment):")
    for i, student in enumerate(arith_students_meta[:5]):
        print(f"    {student['display_name']:20s} {student['email']:30s} (utln: {student['utln']})")
    if len(arith_students_meta) > 5:
        print(f"    ... and {len(arith_students_meta) - 5} more")


if __name__ == "__main__":
    seed()
