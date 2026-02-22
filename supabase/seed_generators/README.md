# Stochastic Seed Data Generator for Arith (20-Person C++ Class)

## Overview

This module generates realistic, varied seed data for a 20-person C++ class working on an arithmetic operations project. Each student gets a unique "realization" of the base C++ template with randomized formatting and variable names, plus a stochastic sequence of flushes showing their realistic development process.

## Architecture

### 1. Base Template (`ArithTemplate`)

A fixed C++ project structure with standardized function names and behavior:

**Files:**
- `arithmetic.h` - Class declaration with function signatures (add, subtract, multiply, divide, modulo)
- `arithmetic.cpp` - Function implementations
- `main.cpp` - Entry point with test calls

**Key Properties:**
- Function names are **constant** across all students
- Function signatures are **constant**
- Each function has a difficulty level that affects how much students struggle with it
  - `add`: 1.0 (easy)
  - `subtract`: 1.1 (easy+)
  - `multiply`: 1.5 (medium - uses loops)
  - `divide`: 2.0 (hard - complex logic)
  - `modulo`: 1.8 (hard)

### 2. Student Realization (`StudentVariator`)

For each of 20 students, creates a unique variant of the template by randomizing:

**Variable Names (within function scope only)**
- Maps original names (result, quotient, remainder, i) to student-specific names
- Keep mapping consistent per student
- Function parameters and names remain unchanged

**Formatting**
- Indentation style: 2 spaces, 4 spaces, or tabs (randomly chosen per student)
- Blank lines: randomly added/removed for organic feel
- Bracing style: consistent per student

**Result:**
- 20 different "realizations" of the same logical code
- Same function names and signatures
- Visibly different formatting and variable naming

### 3. Stochastic Flush Sequence Generator (`FlushSequenceGenerator`)

For each student, generates a realistic sequence of flushes showing development progression.

**Struggle Profile (Gaussian Distribution)**
- Base struggle factor: N(μ=1.0, σ=0.3)
- Varies per student, giving natural variance in how long it takes
- Each function's difficulty is multiplied by student's base struggle

**Flush Generation Strategy**

1. **Phase 1: Create Header** (arithmetic.h)
   - Single flush, 2-5 seconds
   - Establishes function interface

2. **Phase 2: Implement Functions** (arithmetic.cpp)
   - For each function (add, subtract, multiply, divide, modulo):
     - Number of iterations: 2 + (struggle * Gaussian(0, 0.5))
     - Each iteration: partial implementation → fuller implementation
     - Stages defined for each function, allowing realistic progression
     - Duration per iteration distributed from function's time budget

3. **Phase 3: Create Main** (main.cpp)
   - Single flush, 3-8 seconds
   - Quick test/verification

**Time Budgets**
- Total time per student: Uniform(30 min, 120 min)
- Distributed across functions based on their difficulty
- Higher difficulty = more time allocated
- Random variations keep it realistic

**Partial Implementations**
Each function has stages of implementation:

- **add/subtract**: Empty → start declaration → complete
- **multiply**: Empty → setup loop → loop body → final
- **divide**: Complex progression (empty → edge case check → loop setup → complete)
- **modulo**: Similar to divide

Example multiply stages:
1. (empty)
2. "int result = 0"
3. "int result = 0; for (int i = 0; i < b; i++)"
4. "... { result = result + a }"
5. "... { result = result + a; } return result;"

### 4. Data Flow

```
Base Template
    ↓
For each of 20 students:
    ├─ StudentVariator → Student-specific realization
    └─ FlushSequenceGenerator → Sequence of diffs
        ├─ Struggle profile drawn from Gaussian
        ├─ Partial implementations per function
        ├─ Time budgets based on difficulty + struggle
        └─ Realistic progression with variable struggle
            ↓
        JSON with 12-15 flushes per student
```

## Generated Data Structure

### students.json
```json
{
  "description": "...",
  "students": [
    {
      "utln": "asmi00",
      "email": "student1@jumbuddy.test",
      "password": "testpass123",
      "display_name": "Alice Smith",
      "data_file": "asmi00.json"
    },
    ...20 total students
  ]
}
```

### Individual student files (asmi00.json, bjoh01.json, etc.)
```json
{
  "style": "C++ arithmetic implementation - varying struggle profiles",
  "description": "Alice Smith: 12 flushes, 104.3 min total time",
  "flushes": [
    {
      "file_path": "arithmetic.h",
      "diffs": "unified diff format",
      "content": "full file content after this flush",
      "active_symbol": "Arithmetic",
      "trigger": "init",
      "window_duration": 3.5
    },
    ...more flushes
  ]
}
```

## Statistics from Current Generation

All 20 students generated:
- **Total time range**: 30.0 min to 105.6 min
- **Mean time**: ~67 min
- **Flushes per student**: 12-15
- **Total flushes**: ~250+

Key variations:
- Fast students: Mina (39.7 min), Noah (41.2 min), Quinn (34.8 min)
- Slow students: Liam (105.6 min), Alice (104.3 min), Tina (100.9 min)
- Function struggle varies per student (multiply/divide typically harder)

## Usage

### Generate New Data
```bash
cd supabase/seed_generators
python3 generate_arith_seed.py
```

This will:
1. Create all 20 student realizations
2. Generate flush sequences for each student
3. Write to `supabase/seed_data/arith/`

### Seed Database
```bash
cd /path/to/project
python3 supabase/seed.py
```

This will:
1. Create all 20 student users
2. Enroll them in CS40
3. Insert all flushes for arith assignment

## Customization

### Change Number of Students
In `arith_generator.py`:
```python
data = generate_class_data(num_students=30)  # Change from 20
```

### Adjust Struggle Range
In `FlushSequenceGenerator.__init__`:
```python
self.base_struggle = self.rng.gauss(1.2, 0.4)  # Increase mean/variance
```

### Change Time Limits
In `FlushSequenceGenerator.generate_flush_sequence`:
```python
total_time = self.rng.uniform(20*60, 180*60)  # 20 min to 3 hours
```

### Adjust Function Difficulty
In `ArithTemplate.FUNCTION_DIFFICULTY`:
```python
"multiply": 2.0,  # Make harder
```

### Change Realization Randomization
In `StudentVariator`:
- Add more indent styles
- Adjust variable name generation
- Add more blank lines probabilistically

## Implementation Notes

1. **Reproducibility**: Each student's data is generated from a fixed seed (12345 + student_id), so regeneration produces identical results

2. **Variable Naming**: Within function scope only - global names, function names, and parameters stay constant

3. **Realistic Struggle**: Gaussian distribution means some students naturally faster/slower, not artificial

4. **Partial Implementations**: Staged progression gives realistic "stuck on multiply" feeling for some students

5. **Time Distribution**: Respects function difficulty multipliers, so harder functions consume more time overall

6. **Unified Diffs**: Simple line-by-line diff generation matches realistic editing patterns

## Files

- `arith_generator.py` - Core generation logic
- `generate_arith_seed.py` - CLI to create JSON files
- `seed_data/arith/` - Generated JSON output (20 student files + students.json)
