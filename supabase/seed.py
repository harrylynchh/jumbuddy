#!/usr/bin/env python3
"""
Seed local Supabase with test data for the full schema.
Creates: professor, 2 students, 1 TA, 1 course, 1 assignment, sample flushes.
"""

import os

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


def seed():
    print("Seeding...")

    # --- Users ---
    prof_id = create_user("professor@jumbuddy.test", "testpass123", "mprof01", "Professor Morris")
    print(f"  Professor: mprof01 ({prof_id})")

    ta_id = create_user("ta@jumbuddy.test", "testpass123", "jta0102", "Jane TA")
    print(f"  TA: jta0102 ({ta_id})")

    stu1_id = create_user("student1@jumbuddy.test", "testpass123", "slupo01", "Seth Lupo")
    print(f"  Student: slupo01 ({stu1_id})")

    stu2_id = create_user("student2@jumbuddy.test", "testpass123", "abrow02", "Alice Brown")
    print(f"  Student: abrow02 ({stu2_id})")

    # --- Course ---
    course = sb.table("courses").insert({
        "name": "CS 101 - Intro to Computer Science",
        "code": "CS101",
        "professor_id": prof_id,
    }).execute()
    course_id = course.data[0]["id"]
    print(f"  Course: CS101 ({course_id})")

    # --- Memberships ---
    sb.table("enrollments").insert([
        {"profile_id": stu1_id, "course_id": course_id},
        {"profile_id": stu2_id, "course_id": course_id},
    ]).execute()
    print("  Enrolled 2 students")

    sb.table("teaching_assistants").insert({
        "profile_id": ta_id,
        "course_id": course_id,
    }).execute()
    print("  Assigned 1 TA")

    # --- Assignment ---
    assignment = sb.table("assignments").insert({
        "course_id": course_id,
        "name": "MetroSim",
        "description": "Simulate a metro transit system",
    }).execute()
    assignment_id = assignment.data[0]["id"]
    print(f"  Assignment: MetroSim ({assignment_id})")

    print("\nSeed done.")
    print("\n=== Test credentials ===")
    print("  Professor:  professor@jumbuddy.test / testpass123  (utln: mprof01)")
    print("  TA:         ta@jumbuddy.test / testpass123         (utln: jta0102)")
    print("  Student 1:  student1@jumbuddy.test / testpass123   (utln: slupo01)")
    print("  Student 2:  student2@jumbuddy.test / testpass123   (utln: abrow02)")
    print("\n  Keys and flushes are generated naturally via the VS Code extension.")


if __name__ == "__main__":
    seed()
