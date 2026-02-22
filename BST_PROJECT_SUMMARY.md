# Binary Search Tree (BST) Project - Stochastic Seed Data

## Overview

A complete **Binary Search Tree** implementation project for a 20-person C++ class. This is a more complex and realistic CS project compared to basic arithmetic, involving:

- **Pointers and memory management** (Node struct, dynamic allocation)
- **Recursion** (insertHelper, searchHelper, traversals)
- **Data structure design** (tree operations)
- **Complex logic** (especially deletion with multiple cases)
- **Algorithms** (inorder, preorder, postorder traversals)

## Project Structure

### Files Each Student Implements

1. **node.h** - Node struct definition
   ```cpp
   struct Node {
       int value;
       Node* left;
       Node* right;
       Node(int val) : value(val), left(nullptr), right(nullptr) {}
   };
   ```

2. **bst.h** - BST class declaration with methods
   - insert, search, remove
   - traversals (inorder, preorder, postorder)
   - helper methods (height, nodeCount, isValid)

3. **bst.cpp** - All implementations
   - insertHelper, searchHelper, removeHelper
   - traversal helpers
   - utility methods

4. **main.cpp** - Test driver with sample usage

## Function Difficulty Levels

| Method | Difficulty | Why |
|--------|-----------|-----|
| insert | 1.0 (Easy) | Basic recursive insertion |
| search | 1.0 (Easy) | Simple binary search |
| traversals | 1.3 (Medium) | 3 traversal types, recursion |
| helper_methods | 1.2 (Medium-Easy) | height, count, validation |
| remove | 2.5 (HARD) | 3 cases: leaf, one child, two children |

**Key Challenge:** **Remove operation** is significantly harder
- Must find node to delete
- Handle leaf node case (simple)
- Handle single child case (replace node)
- Handle two children case (find min in right subtree, replace, recursively delete)

## Generated Data Statistics

**20 Students Generated:**

| Metric | Value |
|--------|-------|
| Total Flushes | 500+ (much more than arith) |
| Flushes/Student | 8-45 (highly variable!) |
| Time Range | 30.9 min to 97.9 min |
| Mean Time | ~68 minutes |
| Files per Student | 4 (node.h, bst.h, bst.cpp, main.cpp) |

### Student Variation Examples

**Fast Students** (understand pointers/recursion quickly):
- Diana Davis (ddav03): 26 flushes, 30.9 min
- Frank Wilson (fwil05): 20 flushes, 34.9 min
- Tina Miller (tmil19): 30 flushes, 31.6 min

**Slow Students** (struggle with recursion/pointers):
- Sam Davis (sdav18): 12 flushes, 97.9 min
- Eve Miller (emil04): 28 flushes, 97.8 min
- Quinn Johnson (qjoh16): 24 flushes, 95.2 min

**Struggle Hotspot:** Remove operation causes students to iterate repeatedly
- Grace Moore (gmoo06): 45 flushes total (highest iteration count)
- Jack Thomas (jtho09): 41 flushes (struggles with two-child case)
- Karen Jackson (kjac10): 40 flushes

## Complexity vs. Arithmetic

| Aspect | Arithmetic | BST |
|--------|-----------|-----|
| Concepts | Basic loops | Pointers, recursion, trees |
| Difficulty | Simple | Complex |
| Time Range | 30-106 min | 31-98 min |
| Avg Flushes | 12-15 | 8-45 |
| Total Flushes | ~250 | 500+ |
| Memory Model | Simple values | Pointers, dynamic alloc |
| Struggle Pattern | Consistent | Highly variable |

**Why BST is harder:**
1. Pointers require careful thinking
2. Recursion can be confusing
3. Multiple cases in deletion (not obvious)
4. Tree visualization required to debug
5. Memory management (delete, nullptr checks)

## Key Implementation Stages

### Insert Implementation (6 stages)
1. Empty
2. nullptr check
3. Return new node
4. Left case
5. Right case (partial)
6. Full with return

### Remove Implementation (9 stages)
1. Empty
2. nullptr check
3. Null return
4. Left/right recursion setup
5. Recurse cases
6. Single child handling
7. Two children case
8. Find min helper
9. Complete solution

### Traversals (5 stages per type)
1. Empty
2. Method signature
3. Helper setup
4. Base case
5. Full implementation

## Usage

### To Seed BST Data

```bash
# Option 1: Use existing generated data
python3 supabase/seed_bst.py

# Option 2: Regenerate data with different parameters
cd supabase/seed_generators
python3 generate_bst_seed.py
python3 ../seed_bst.py
```

### To Use in UI

1. Navigate to CS40 → bst assignment
2. See all 20 students with varying struggle patterns
3. Click "Replay" on any student
4. Watch their BST implementation process
5. Notice how students struggle differently with:
   - Initial pointer understanding
   - Recursive logic
   - Deletion (especially two-child case)
   - Traversal implementation

## Customization

### Change Difficulty Levels

In `bst_generator.py`:
```python
FUNCTION_DIFFICULTY = {
    "insert": 1.0,
    "remove": 3.5,  # Make removal even harder
    "traversals": 1.8,  # Make traversals harder
}
```

### Adjust Time Range

In `FlushSequenceGenerator.generate_flush_sequence()`:
```python
total_time = self.rng.uniform(60*60, 180*60)  # 1 hour to 3 hours
```

### Change Number of Students

```bash
cd supabase/seed_generators
python3 -c "
from bst_generator import generate_class_data
import json
data = generate_class_data(30)  # Generate 30 instead of 20
# ... write to JSON files
"
```

## Comparison: Arith vs. BST

### Arith (Arithmetic Operations)
- **Good for:** Basic understanding of iteration
- **Struggle points:** loops (multiply, divide)
- **Time per student:** Consistent (30-106 min)
- **Flushes:** ~250 total
- **Type:** Procedural, linear progression

### BST (Binary Search Tree)
- **Good for:** Understanding pointers, recursion, data structures
- **Struggle points:** deletion, pointer logic, recursion
- **Time per student:** Highly variable (30-98 min)
- **Flushes:** 500+ total (much more iteration)
- **Type:** Structural, recursive algorithms

## Files Generated

```
supabase/
├── seed_generators/
│   ├── bst_generator.py       (BST generation logic)
│   ├── generate_bst_seed.py   (CLI to create JSON)
│   └── arith_generator.py     (original arithmetic)
│
├── seed_data/
│   ├── arith/                 (arithmetic student data)
│   │   ├── students.json
│   │   └── {utln}.json × 20
│   │
│   └── bst/                   (BST student data)
│       ├── students.json
│       └── {utln}.json × 20
│
├── seed.py                    (arith seeding)
└── seed_bst.py               (BST seeding - NEW)
```

## Next Steps

1. **Run BST seed:**
   ```bash
   python3 supabase/seed_bst.py
   ```

2. **Or stick with arith:**
   ```bash
   python3 supabase/seed.py
   ```

3. **Or run both:**
   - Create separate CS40 sections
   - One for arith, one for bst
   - Compare student approaches to different problems

## Why BST is Better for a CS Class

✓ **More realistic project** - actual data structure, not just math
✓ **Tests deeper understanding** - pointers, recursion, complexity
✓ **Shows problem-solving variety** - different students solve differently
✓ **More visible struggle** - harder problems produce more flushes
✓ **Educational value** - students see their own iteration process
✓ **Interview-like** - common coding interview question
✓ **Scalable complexity** - can add AVL balancing, B-trees, etc. later

## Generated BST Files Breakdown

Each student file contains flushes showing:

**Example:** Grace Moore (gmoo06)
- 45 flushes (most of any student)
- 45.5 minutes total
- Shows extensive iteration on:
  - Insert implementation (multiple attempts)
  - Remove logic (especially two-child case)
  - Traversal implementations
  - Debugging and refinement

This suggests Grace struggled most with tree operations but persevered through the problem systematically.
