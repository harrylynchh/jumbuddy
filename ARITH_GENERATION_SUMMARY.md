# Stochastic 20-Person C++ Arith Class Generation System

## What Was Created

A complete stochastic system to generate realistic, varied seed data for a 20-person C++ class working on an arithmetic operations project. Each student has a unique code "realization" and realistic development progression.

## System Components

### 1. Core Generator (`supabase/seed_generators/arith_generator.py`)

**ArithTemplate Class**
- Defines base C++ project structure (3 files: arithmetic.h, arithmetic.cpp, main.cpp)
- Function names: `add`, `subtract`, `multiply`, `divide`, `modulo`
- Difficulty multipliers per function:
  - add: 1.0 (easiest)
  - subtract: 1.1
  - multiply: 1.5 (loop-based)
  - divide: 2.0 (complex logic)
  - modulo: 1.8

**StudentVariator Class**
- Takes base template → student-specific realization
- Randomizes (per student seed):
  - Variable names within function scope (result → tmp1, quotient → val2, etc.)
  - Indentation style (2 spaces, 4 spaces, or tabs)
  - Blank line placement
- Keeps constant: Function names, signatures, parameters
- Result: 20 visually distinct but logically identical codebases

**FlushSequenceGenerator Class**
- Generates realistic sequence of edits for one student
- Struggle profile: Gaussian(μ=1.0, σ=0.3) - varies naturally per student
- Time allocation: Uniform(30-120 min) distributed by function difficulty
- Three phases:
  1. Create header file (2-5 sec)
  2. Implement functions iteratively (struggle-based iterations)
  3. Create main.cpp (3-8 sec)

### 2. Generation Script (`supabase/seed_generators/generate_arith_seed.py`)

Generates all 20 students:
```bash
cd supabase/seed_generators
python3 generate_arith_seed.py
```

Output:
- `seed_data/arith/students.json` - Metadata for all 20 students
- `seed_data/arith/{utln}.json` - Individual flush sequences (one per student)

## Generated Data

### Statistics

All 20 students generated with natural variation:

| Metric | Value |
|--------|-------|
| Total Students | 20 |
| Total Flushes | 250+ |
| Time Range | 30.0 min to 105.6 min |
| Mean Time | ~67 minutes |
| Flushes per Student | 12-15 |

### Example Students

**Fast Performers** (struggle less, finish quickly):
- Quinn Johnson (qjoh16): 34.8 min, 12 flushes
- Olivia Garcia (ogar14): 30.0 min, 12 flushes
- Mina Harris (mhar12): 39.7 min, 12 flushes

**Slow Performers** (struggle more, take longer):
- Liam White (lwhi11): 105.6 min, 13 flushes
- Alice Smith (asmi00): 104.3 min, 12 flushes
- Tina Miller (tmil19): 100.9 min, 12 flushes

**Medium Performers**:
- Frank Wilson (fwil05): 85.6 min, 15 flushes
- Iris Anderson (iand08): 85.3 min, 12 flushes
- Grace Moore (gmoo06): 80.6 min, 12 flushes

## Key Design Features

### 1. **Constant Function Names**
- All students implement: `add()`, `subtract()`, `multiply()`, `divide()`, `modulo()`
- Enables comparative analysis across class
- Teachers can spot implementation patterns

### 2. **Variable Randomization (Within Function Scope)**
```cpp
// Alice's version:
int Arithmetic::multiply(int a, int b) {
    int tmpVal = 0;
    for (int idx = 0; idx < b; idx++) {
        tmpVal = tmpVal + a;
    }
    return tmpVal;
}

// Bob's version:
int Arithmetic::multiply(int a, int b) {
    int sum = 0;
    for (int i = 0; i < b; i++) {
        sum = sum + a;
    }
    return sum;
}
```

### 3. **Realistic Struggle Patterns**
- Each student has a struggle factor: N(1.0, 0.3)
- Multiplied by function difficulty
- Results in variable number of iterations per function
- Example: multiply() typically takes 2-4 iterations per student

### 4. **Stochastic Progression**
- Partial implementations show realistic "getting unstuck" process
- Example multiply stages:
  1. (empty)
  2. "int result = 0"
  3. "for (int i = 0; i < b; i++)"
  4. "result = result + a"
  5. "return result"
- Time per stage varies, mimicking real debugging/thinking

### 5. **Function-Specific Difficulty**
- `divide()` hardest (2.0x difficulty):
  - Needs edge case check for zero
  - Needs two variables (quotient, remainder)
  - Needs while loop logic
  - Average 3-4 iterations, longer per iteration

- `add()`/`subtract()` easiest (1.0-1.1x):
  - Simple operations
  - Usually done in 1-2 iterations
  - Quick flush times

## Integration with Seed System

The seed script (`supabase/seed.py`) now:

1. Creates professor and TA users
2. Creates all 20 arith students from metadata
3. Enrolls all 20 in CS40 course
4. Creates arith assignment
5. Loads individual student files
6. Inserts all flushes (250+)

```bash
python3 supabase/seed.py
```

## File Structure

```
supabase/
├── seed_generators/
│   ├── __init__.py
│   ├── arith_generator.py       (core generation logic)
│   ├── generate_arith_seed.py   (CLI to create JSON files)
│   └── README.md                (detailed documentation)
│
└── seed_data/
    └── arith/
        ├── students.json        (metadata for all 20)
        ├── asmi00.json          (Alice: 12 flushes, 104.3 min)
        ├── bjoh01.json          (Bob: 12 flushes, 64.9 min)
        ├── cbro02.json          (Charlie: 12 flushes, 74.0 min)
        ├── ... (17 more students)
        └── tmil19.json          (Tina: 12 flushes, 100.9 min)
```

## Customization

### Generate Different Number of Students
```python
# In arith_generator.py
data = generate_class_data(num_students=30)  # Instead of 20
```

### Adjust Difficulty Range
```python
# In FlushSequenceGenerator.__init__
self.base_struggle = self.rng.gauss(1.5, 0.4)  # Harder class on average
```

### Change Time Limits
```python
# In generate_flush_sequence()
total_time = self.rng.uniform(15*60, 180*60)  # 15 min to 3 hours
```

### Make Functions Universally Harder/Easier
```python
# In ArithTemplate.FUNCTION_DIFFICULTY
FUNCTION_DIFFICULTY = {
    "multiply": 2.5,  # Make multiply harder (was 1.5)
    "divide": 3.0,    # Make divide harder (was 2.0)
}
```

## Reproducibility

Each student's realization is generated from a fixed seed:
```python
seed = 12345 + student_id
```

This means:
- Running generation again produces identical results
- Can reproduce specific student's data
- Suitable for testing and demos

## Next Steps

### To Use This Data

1. **Run generation** (if needed):
   ```bash
   cd supabase/seed_generators
   python3 generate_arith_seed.py
   ```

2. **Seed database**:
   ```bash
   python3 supabase/seed.py
   ```

3. **Start dev environment**:
   ```bash
   python3 scripts/run.py
   ```

4. **Login with any student** (e.g., Alice Smith):
   - Email: `student1@jumbuddy.test`
   - Password: `testpass123`
   - View their progress replay with 12 unique flushes

### To Analyze Results

The system enables analysis such as:
- Which functions students struggle with most
- How struggle varies across population
- Time spent on each function
- Editing patterns and code variation
- Development methodology per student

### To Add More Assignment Data

Create similar generators for other C++ projects:
1. Create base template with function names
2. Define function difficulties
3. Create student variator
4. Create flush sequence generator
5. Run generation script

Pattern is fully reusable!

## Technical Notes

- **Reproducible randomization**: Each student gets consistent results via seed
- **No hardcoding**: Fully parameterized, easy to adjust
- **Realistic diffs**: Actual unified diff format, valid for reconstruction
- **Scalable**: Can generate 50+ students without modification
- **Self-contained**: No external dependencies beyond core Python libraries
