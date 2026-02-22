#!/usr/bin/env python3
"""
Seed local Supabase with BST (Binary Search Tree) project data for 20-person class.
More complex CS project than arithmetic - involves pointers, recursion, tree operations.
"""

import os
import json
import uuid
import hashlib
from datetime import datetime, timedelta

from dotenv import load_dotenv
from supabase import create_client

root = os.path.dirname(os.path.abspath(__file__))
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
        "sequence_number": 0,
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
    """Load student metadata from students.json."""
    students_file = os.path.join(assignment_dir, "students.json")
    with open(students_file) as f:
        return json.load(f)["students"]


def load_student_flushes(assignment_dir, data_file):
    """Load flushes for a specific student."""
    flush_file = os.path.join(assignment_dir, data_file)
    with open(flush_file) as f:
        return json.load(f)["flushes"]


def seed():
    print("Seeding BST (Binary Search Tree) project data...")

    # --- Users ---
    prof_id = create_user("professor@jumbuddy.test", "testpass123", "mprof01", "Professor Morris")
    print(f"  Professor: mprof01 ({prof_id})")

    ta_id = create_user("ta@jumbuddy.test", "testpass123", "jta0102", "Jane TA")
    print(f"  TA: jta0102 ({ta_id})")

    # --- CS40 Course ---
    course2 = sb.table("courses").insert({
        "name": "CS 40 - Machine Structure & Assembly",
        "code": "CS40",
        "professor_id": prof_id,
    }).execute()
    course2_id = course2.data[0]["id"]
    print(f"  Course: CS40 ({course2_id})")

    # --- BST Assignment ---
    assignment_bst = sb.table("assignments").insert({
        "course_id": course2_id,
        "name": "bst",
        "description": "Binary Search Tree implementation with insert, search, remove, and traversals",
    }).execute()
    assignment_bst_id = assignment_bst.data[0]["id"]
    print(f"  Assignment: bst ({assignment_bst_id})")

    # Load BST student data
    bst_seed_dir = os.path.join(root, "supabase", "seed_data", "bst")
    bst_students_meta = load_assignment_students(bst_seed_dir)

    # Create all BST students
    print(f"\n  Creating {len(bst_students_meta)} BST students...")
    student_profiles = {}
    for i, student_meta in enumerate(bst_students_meta):
        utln = student_meta["utln"]
        email = student_meta["email"]
        password = student_meta["password"]
        display_name = student_meta["display_name"]

        student_id = create_user(email, password, utln, display_name)
        student_profiles[utln] = student_id
        if (i + 1) % 5 == 0:
            print(f"    Created {i + 1}/{len(bst_students_meta)} students")

    # --- CS40 Memberships ---
    enrollment_records = [{"profile_id": pid, "course_id": course2_id} for pid in student_profiles.values()]
    sb.table("enrollments").insert(enrollment_records).execute()
    print(f"  Enrolled {len(student_profiles)} students in CS40")

    # --- Load and insert BST flushes ---
    print("\n  Loading and inserting BST flushes for all students...")

    total_flushes_created = 0
    for i, student_meta in enumerate(bst_students_meta):
        utln = student_meta["utln"]
        data_file = student_meta["data_file"]
        profile_id = student_profiles[utln]

        flushes = load_student_flushes(bst_seed_dir, data_file)
        for flush_data in flushes:
            create_flush(
                profile_id,
                assignment_bst_id,
                flush_data["file_path"],
                flush_data["diffs"],
                flush_data["content"],
                flush_data["active_symbol"],
                flush_data.get("trigger", "timeout"),
                flush_data.get("window_duration", 10.0),
            )
            total_flushes_created += 1

        if (i + 1) % 5 == 0:
            print(f"    Inserted flushes for {i + 1}/{len(bst_students_meta)} students ({total_flushes_created} total flushes)")

    print(f"\n✓ Seed complete! Created {total_flushes_created} flushes for BST assignment")
    print("\n=== Test Credentials ===")
    print("  Professor:  professor@jumbuddy.test / testpass123  (utln: mprof01)")
    print("  TA:         ta@jumbuddy.test / testpass123         (utln: jta0102)")
    print(f"\n  {len(bst_students_meta)} CS40 Students (bst assignment):")
    for i, student in enumerate(bst_students_meta[:5]):
        print(f"    {student['display_name']:20s} {student['email']:30s} (utln: {student['utln']})")
    if len(bst_students_meta) > 5:
        print(f"    ... and {len(bst_students_meta) - 5} more")


if __name__ == "__main__":
    seed()
