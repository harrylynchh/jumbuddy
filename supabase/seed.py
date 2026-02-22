#!/usr/bin/env python3
"""
Seed local Supabase with test data for the full schema.
Creates: professor, multiple students, 1 TA, 2 courses (CS101, Arith), assignments, and realistic flushes.
"""

import os
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

    stu3_id = create_user("student3@jumbuddy.test", "testpass123", "cchen03", "Charlie Chen")
    print(f"  Student: cchen03 ({stu3_id})")

    stu4_id = create_user("student4@jumbuddy.test", "testpass123", "djames04", "Diana James")
    print(f"  Student: djames04 ({stu4_id})")

    # --- CS101 Course ---
    course1 = sb.table("courses").insert({
        "name": "CS 101 - Intro to Computer Science",
        "code": "CS101",
        "professor_id": prof_id,
    }).execute()
    course1_id = course1.data[0]["id"]
    print(f"  Course: CS101 ({course1_id})")

    # --- Arith Course ---
    course2 = sb.table("courses").insert({
        "name": "CS 201 - Arithmetic Algorithms",
        "code": "ARITH",
        "professor_id": prof_id,
    }).execute()
    course2_id = course2.data[0]["id"]
    print(f"  Course: ARITH ({course2_id})")

    # --- CS101 Memberships ---
    sb.table("enrollments").insert([
        {"profile_id": stu1_id, "course_id": course1_id},
        {"profile_id": stu2_id, "course_id": course1_id},
    ]).execute()
    print("  Enrolled 2 students in CS101")

    # --- Arith Memberships ---
    sb.table("enrollments").insert([
        {"profile_id": stu1_id, "course_id": course2_id},
        {"profile_id": stu2_id, "course_id": course2_id},
        {"profile_id": stu3_id, "course_id": course2_id},
        {"profile_id": stu4_id, "course_id": course2_id},
    ]).execute()
    print("  Enrolled 4 students in ARITH")

    sb.table("teaching_assistants").insert({
        "profile_id": ta_id,
        "course_id": course1_id,
    }).execute()
    sb.table("teaching_assistants").insert({
        "profile_id": ta_id,
        "course_id": course2_id,
    }).execute()
    print("  Assigned TA to both courses")

    # --- CS101 Assignment ---
    assignment1 = sb.table("assignments").insert({
        "course_id": course1_id,
        "name": "MetroSim",
        "description": "Simulate a metro transit system",
    }).execute()
    assignment1_id = assignment1.data[0]["id"]
    print(f"  Assignment: MetroSim ({assignment1_id})")

    # --- Arith Assignment ---
    assignment2 = sb.table("assignments").insert({
        "course_id": course2_id,
        "name": "Basic Arithmetic",
        "description": "Implement add, subtract, multiply functions",
    }).execute()
    assignment2_id = assignment2.data[0]["id"]
    print(f"  Assignment: Basic Arithmetic ({assignment2_id})")

    # --- Generate realistic flushes for Arith assignment ---
    print("\n  Generating realistic flushes for Arith assignment...")

    # ===== SETH: Iterative, lots of checking and refinement =====
    print("    Student 1: Seth (iterative, multiple passes, debugging)...")

    # Seth attempt 1: Initial structure
    seth_v1 = "def add(a, b):\n    result = a\n    for i in range(b):\n        result += 1\n    return result\n"
    create_flush(stu1_id, assignment2_id, "arith.py", "+def add(a, b):\n+    result = a\n+    for i in range(b):\n+        result += 1\n+    return result", seth_v1, "add", "init", 12.0)

    # Seth: Add edge case handling for negative
    seth_v2 = "def add(a, b):\n    result = a\n    if b >= 0:\n        for i in range(b):\n            result += 1\n    else:\n        for i in range(-b):\n            result -= 1\n    return result\n"
    create_flush(stu1_id, assignment2_id, "arith.py", "-    for i in range(b):\n-        result += 1\n+    if b >= 0:\n+        for i in range(b):\n+            result += 1\n+    else:\n+        for i in range(-b):\n+            result -= 1", seth_v2, "add", "timeout", 18.0)

    # Seth: Test add function
    seth_test1 = "def test_add():\n    assert add(2, 3) == 5\n    assert add(-5, 2) == -3\n"
    create_flush(stu1_id, assignment2_id, "test.py", "+def test_add():\n+    assert add(2, 3) == 5\n+    assert add(-5, 2) == -3", seth_test1, "test_add", "timeout", 15.0)

    # Seth: Subtract v1
    seth_sub_v1 = "def subtract(a, b):\n    return add(a, -b)\n"
    create_flush(stu1_id, assignment2_id, "arith.py", "+\ndef subtract(a, b):\n+    return add(a, -b)", seth_sub_v1, "subtract", "timeout", 8.0)

    # Seth: Wait, that doesn't work, rewrite
    seth_sub_v2 = "def subtract(a, b):\n    result = a\n    if b > 0:\n        for i in range(b):\n            result -= 1\n    else:\n        for i in range(-b):\n            result += 1\n    return result\n"
    create_flush(stu1_id, assignment2_id, "arith.py", "-def subtract(a, b):\n-    return add(a, -b)\n+def subtract(a, b):\n+    result = a\n+    if b > 0:\n+        for i in range(b):\n+            result -= 1\n+    else:\n+        for i in range(-b):\n+            result += 1\n+    return result", seth_sub_v2, "subtract", "timeout", 22.0)

    # Seth: Multiply initial attempt
    seth_mul_v1 = "def multiply(a, b):\n    result = 0\n    for i in range(abs(b)):\n        result = add(result, a)\n    if b < 0:\n        result = -result\n    return result\n"
    create_flush(stu1_id, assignment2_id, "arith.py", "+\ndef multiply(a, b):\n+    result = 0\n+    for i in range(abs(b)):\n+        result = add(result, a)\n+    if b < 0:\n+        result = -result\n+    return result", seth_mul_v1, "multiply", "timeout", 25.0)

    # Seth: Test multiply
    seth_test2 = "def test_add():\n    assert add(2, 3) == 5\n\ndef test_subtract():\n    assert subtract(5, 3) == 2\n\ndef test_multiply():\n    assert multiply(3, 4) == 12\n    assert multiply(3, -2) == -6\n"
    create_flush(stu1_id, assignment2_id, "test.py", "-def test_add():\n-    assert add(2, 3) == 5\n-    assert add(-5, 2) == -3\n+def test_add():\n+    assert add(2, 3) == 5\n+\n+def test_subtract():\n+    assert subtract(5, 3) == 2\n+\n+def test_multiply():\n+    assert multiply(3, 4) == 12\n+    assert multiply(3, -2) == -6", seth_test2, "test_multiply", "timeout", 20.0)

    # Seth: Edge cases refinement
    seth_v3 = seth_v2 + "\ndef subtract(a, b):\n    result = a\n    if b > 0:\n        for i in range(b):\n            result -= 1\n    else:\n        for i in range(-b):\n            result += 1\n    return result\n\ndef multiply(a, b):\n    if b == 0:\n        return 0\n    result = 0\n    for i in range(abs(b)):\n        result = add(result, a)\n    if b < 0:\n        result = -result\n    return result\n"
    create_flush(stu1_id, assignment2_id, "arith.py", "+    if b == 0:\n+        return 0", seth_v3, "multiply", "timeout", 18.0)

    # ===== ALICE: Quick, compact, done fast =====
    print("    Student 2: Alice (compact, fast iterations)...")

    # Alice: All three functions at once
    alice_final = "def add(a, b):\n    return a + b\n\ndef subtract(a, b):\n    return a - b\n\ndef multiply(a, b):\n    return a * b\n"
    create_flush(stu2_id, assignment2_id, "arith.py", "+def add(a, b):\n+    return a + b\n+\n+def subtract(a, b):\n+    return a - b\n+\n+def multiply(a, b):\n+    return a * b", alice_final, "add", "init", 4.0)

    # Alice: Quick test
    alice_test = "assert add(2, 3) == 5\nassert subtract(10, 3) == 7\nassert multiply(4, 5) == 20\n"
    create_flush(stu2_id, assignment2_id, "test.py", "+assert add(2, 3) == 5\n+assert subtract(10, 3) == 7\n+assert multiply(4, 5) == 20", alice_test, "test", "timeout", 2.0)

    # ===== CHARLIE: Defensive, lots of error checking, multiple passes =====
    print("    Student 3: Charlie (defensive, lots of validation, debugging)...")

    # Charlie v1: Add with validation
    charlie_add_v1 = "def add(a, b):\n    if type(a) != int or type(b) != int:\n        raise TypeError('Must be int')\n    total = a\n    total += b\n    return total\n"
    create_flush(stu3_id, assignment2_id, "arith.py", "+def add(a, b):\n+    if type(a) != int or type(b) != int:\n+        raise TypeError('Must be int')\n+    total = a\n+    total += b\n+    return total", charlie_add_v1, "add", "init", 20.0)

    # Charlie: Realize they need to handle floats better
    charlie_add_v2 = "def add(a, b):\n    if not isinstance(a, (int, float)) or not isinstance(b, (int, float)):\n        raise TypeError('Must be numeric')\n    total = a\n    total += b\n    if isinstance(total, float) and total.is_integer():\n        return int(total)\n    return total\n"
    create_flush(stu3_id, assignment2_id, "arith.py", "-def add(a, b):\n-    if type(a) != int or type(b) != int:\n-        raise TypeError('Must be int')\n-    total = a\n-    total += b\n-    return total\n+def add(a, b):\n+    if not isinstance(a, (int, float)) or not isinstance(b, (int, float)):\n+        raise TypeError('Must be numeric')\n+    total = a\n+    total += b\n+    if isinstance(total, float) and total.is_integer():\n+        return int(total)\n+    return total", charlie_add_v2, "add", "timeout", 25.0)

    # Charlie: Subtract with warnings
    charlie_sub = "def subtract(a, b):\n    if not isinstance(a, (int, float)) or not isinstance(b, (int, float)):\n        raise TypeError('Must be numeric')\n    result = a - b\n    if result < 0:\n        print(f'Warning: negative result {result}')\n    return result\n"
    create_flush(stu3_id, assignment2_id, "arith.py", "+def subtract(a, b):\n+    if not isinstance(a, (int, float)) or not isinstance(b, (int, float)):\n+        raise TypeError('Must be numeric')\n+    result = a - b\n+    if result < 0:\n+        print(f'Warning: negative result {result}')\n+    return result", charlie_sub, "subtract", "timeout", 28.0)

    # Charlie: Multiply with loops
    charlie_mul_v1 = "def multiply(a, b):\n    if not isinstance(a, (int, float)) or not isinstance(b, (int, float)):\n        raise TypeError('Must be numeric')\n    product = 0\n    for _ in range(abs(int(b))):\n        product += a\n    if b < 0:\n        product = -product\n    return product\n"
    create_flush(stu3_id, assignment2_id, "arith.py", "+def multiply(a, b):\n+    if not isinstance(a, (int, float)) or not isinstance(b, (int, float)):\n+        raise TypeError('Must be numeric')\n+    product = 0\n+    for _ in range(abs(int(b))):\n+        product += a\n+    if b < 0:\n+        product = -product\n+    return product", charlie_mul_v1, "multiply", "timeout", 35.0)

    # Charlie: Refine multiply for edge cases
    charlie_mul_v2 = charlie_mul_v1.replace("product = 0", "product = 0 if a != 0 else 0")
    create_flush(stu3_id, assignment2_id, "arith.py", " product = 0 if a != 0 else 0", charlie_mul_v2, "multiply", "timeout", 20.0)

    # Charlie: Comprehensive tests
    charlie_tests = "def test_add():\n    assert add(2, 3) == 5\n    assert add(-1, 1) == 0\n\ndef test_subtract():\n    assert subtract(5, 3) == 2\n    assert subtract(2, 5) == -3\n\ndef test_multiply():\n    assert multiply(3, 4) == 12\n    assert multiply(0, 100) == 0\n\ndef test_errors():\n    try:\n        add('a', 1)\n        assert False\n    except TypeError:\n        pass\n"
    create_flush(stu3_id, assignment2_id, "test.py", "+def test_add():\n+    assert add(2, 3) == 5\n+    assert add(-1, 1) == 0\n+\n+def test_subtract():\n+    assert subtract(5, 3) == 2\n+    assert subtract(2, 5) == -3\n+\n+def test_multiply():\n+    assert multiply(3, 4) == 12\n+    assert multiply(0, 100) == 0\n+\n+def test_errors():\n+    try:\n+        add('a', 1)\n+        assert False\n+    except TypeError:\n+        pass", charlie_tests, "test", "timeout", 32.0)

    # ===== DIANA: Pragmatic, clear code, good comments =====
    print("    Student 4: Diana (pragmatic, comments, clean approach)...")

    # Diana: Header and add
    diana_v1 = "\"\"\"Basic arithmetic operations.\n\nAll functions accept two numbers and return result.\n\"\"\"\n\ndef add(a, b):\n    \"\"\"Add two numbers.\"\"\"\n    return a + b\n"
    create_flush(stu4_id, assignment2_id, "arith.py", "+\"\"\"Basic arithmetic operations.\n+\n+All functions accept two numbers and return result.\n+\"\"\"\n+\n+def add(a, b):\n+    \"\"\"Add two numbers.\"\"\"\n+    return a + b", diana_v1, "add", "init", 8.0)

    # Diana: Add subtract
    diana_v2 = diana_v1 + "\ndef subtract(a, b):\n    \"\"\"Subtract b from a.\"\"\"\n    return a - b\n"
    create_flush(stu4_id, assignment2_id, "arith.py", "+def subtract(a, b):\n+    \"\"\"Subtract b from a.\"\"\"\n+    return a - b", diana_v2, "subtract", "timeout", 5.0)

    # Diana: Add multiply
    diana_v3 = diana_v2 + "\ndef multiply(a, b):\n    \"\"\"Multiply two numbers.\"\"\"\n    return a * b\n"
    create_flush(stu4_id, assignment2_id, "arith.py", "+def multiply(a, b):\n+    \"\"\"Multiply two numbers.\"\"\"\n+    return a * b", diana_v3, "multiply", "timeout", 6.0)

    # Diana: Quick test file
    diana_test = "from arith import add, subtract, multiply\n\ndef test_basic():\n    assert add(1, 2) == 3\n    assert subtract(5, 2) == 3\n    assert multiply(3, 4) == 12\n    print('All tests pass!')\n\nif __name__ == '__main__':\n    test_basic()\n"
    create_flush(stu4_id, assignment2_id, "test.py", "+from arith import add, subtract, multiply\n+\n+def test_basic():\n+    assert add(1, 2) == 3\n+    assert subtract(5, 2) == 3\n+    assert multiply(3, 4) == 12\n+    print('All tests pass!')\n+\n+if __name__ == '__main__':\n+    test_basic()", diana_test, "test_basic", "timeout", 10.0)

    print("\nSeed done.")
    print("\n=== Test credentials ===")
    print("  Professor:  professor@jumbuddy.test / testpass123  (utln: mprof01)")
    print("  TA:         ta@jumbuddy.test / testpass123         (utln: jta0102)")
    print("  Student 1:  student1@jumbuddy.test / testpass123   (utln: slupo01)")
    print("  Student 2:  student2@jumbuddy.test / testpass123   (utln: abrow02)")
    print("  Student 3:  student3@jumbuddy.test / testpass123   (utln: cchen03)")
    print("  Student 4:  student4@jumbuddy.test / testpass123   (utln: djames04)")


if __name__ == "__main__":
    seed()
