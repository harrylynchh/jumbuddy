# Arith Generation Quick Start

## TL;DR

20-person C++ arithmetic class with realistic, varied student code and development progression.

## Files Generated

- 20 students with unique code realizations
- 250+ flushes total (~12-15 per student)
- Time range: 30 min to 106 min
- Pre-generated in `supabase/seed_data/arith/`

## How to Use

### 1. Seed the Database
```bash
python3 supabase/seed.py
```
This creates all 20 students and inserts their flushes.

### 2. Start Dev Environment
```bash
python3 scripts/run.py
```

### 3. Login & View

Any of these test accounts (all password: `testpass123`):
- `student1@jumbuddy.test` - Alice Smith (asmi00)
- `student2@jumbuddy.test` - Bob Johnson (bjoh01)
- ... (students 1-20)

### 4. Navigate to CS40 → arith assignment
See all 20 students with their unique code realizations and struggles.

## What's Different About Each Student

### Code Formatting
- Indentation: 2 spaces vs 4 spaces vs tabs
- Variable names: `result` vs `tmpVal` vs `sum`
- Blank lines: varied

### Development Path
- Fast students (~30 min): Quick implementation, fewer iterations
- Slow students (~105 min): More struggle, more iterations
- Multiply/divide typically harder than add/subtract

### Example: multiply() implementation

**Alice** (slower, 104 min total):
```cpp
int result = 0;
for (int i = 0; i < b; i++) {
    result = result + a;
}
```
Takes 4 iterations, ~25 min just for this function

**Quinn** (faster, 35 min total):
```cpp
int sum = 0;
for (int idx = 0; idx < b; idx++) {
    sum = sum + a;
}
```
Takes 2 iterations, ~8 min for this function

## Statistics

| Student | Time | Flushes | Style |
|---------|------|---------|-------|
| Mina Harris (mhar12) | 39.7 min | 12 | Fast, direct |
| Quinn Johnson (qjoh16) | 34.8 min | 12 | Quick learner |
| Olivia Garcia (ogar14) | 30.0 min | 12 | Fastest |
| Alice Smith (asmi00) | 104.3 min | 12 | Thorough, careful |
| Liam White (lwhi11) | 105.6 min | 13 | Struggles with loops |
| Tina Miller (tmil19) | 100.9 min | 12 | Cautious approach |

## Regenerate Data

If you want to change parameters:

```bash
cd supabase/seed_generators
python3 generate_arith_seed.py
```

Or edit `arith_generator.py`:
- Change time limits: `self.rng.uniform(30*60, 120*60)`
- Change struggle: `self.rng.gauss(1.0, 0.3)`
- Change function difficulty: `ArithTemplate.FUNCTION_DIFFICULTY`
- Change number of students: `generate_class_data(num_students=30)`

## What's in Each Flush

Example flush:
```json
{
  "file_path": "arithmetic.cpp",
  "diffs": "-int result = 0\n+int result = 0;\n+for (int i = 0; i < b; i++) {",
  "content": "full file state",
  "active_symbol": "multiply",
  "trigger": "timeout",
  "window_duration": 12.5
}
```

This shows:
- Which file was being edited
- What changed (unified diff)
- Full file state
- Which function they were in
- How long they were working
- What triggered the flush (timeout, init, etc.)

## Architecture

```
Base Template (constant)
    ↓
Per Student:
    ├─ Variator (format + variable names)
    └─ Flush Sequence Generator (realistic edits)
        ├─ Struggle factor: N(1.0, 0.3)
        ├─ Time allocation by difficulty
        └─ Partial implementations → staged completion
            ↓
        12-15 realistic flushes
```

## Key Features

1. **Function names stay constant** → Can compare implementations across class
2. **Variable names vary** → Realistic different coding styles
3. **Struggle varies naturally** → Gaussian distribution, not artificial
4. **Realistic progressions** → Partial implementations, iterations, debugging
5. **Time reflects difficulty** → multiply/divide take longer on average
6. **Reproducible** → Same seed always produces same result

## Example Use Cases

- See how different students approach the same problem
- Analyze which functions cause most struggle across class
- Replay individual student's work
- Find students who struggled with specific functions
- Compare coding styles and approaches
- Demonstrate realistic class diversity
