#!/usr/bin/env python3
"""
Generate complete arith seed data for 20-person class and write to JSON files.
"""

import json
import os
from arith_generator import generate_class_data


def main():
    print("Generating arith seed data for 20-person class...")

    # Generate all student data
    students_data = generate_class_data(num_students=20)

    # Output directory
    output_dir = os.path.join(os.path.dirname(__file__), "..", "seed_data", "arith")
    os.makedirs(output_dir, exist_ok=True)

    # Create students.json (metadata)
    students_meta = {
        "description": "Stochastically generated arith assignment data for 20-person class with varying student struggle profiles",
        "students": [
            {
                "utln": student["utln"],
                "email": student["email"],
                "password": student["password"],
                "display_name": student["display_name"],
                "data_file": student["data_file"],
            }
            for student in students_data.values()
        ]
    }

    students_json_path = os.path.join(output_dir, "students.json")
    with open(students_json_path, "w") as f:
        json.dump(students_meta, f, indent=2)
    print(f"✓ Created {students_json_path}")

    # Create individual student JSON files
    for utln, student in students_data.items():
        student_json = {
            "style": "C++ arithmetic implementation - varying struggle profiles",
            "description": f"{student['display_name']}: {len(student['flushes'])} flushes, {student['total_time']/60:.1f} min total time",
            "flushes": student["flushes"],
        }

        student_json_path = os.path.join(output_dir, f"{utln}.json")
        with open(student_json_path, "w") as f:
            json.dump(student_json, f, indent=2)

        print(f"✓ {student['display_name']:20s} ({utln}): {len(student['flushes']):2d} flushes, {student['total_time']/60:5.1f} min")

    print(f"\n✓ Generated {len(students_data)} student files in {output_dir}")


if __name__ == "__main__":
    main()
