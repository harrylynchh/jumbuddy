"""
Stochastic generator for C++ Binary Search Tree project with 20-person class variation.
Creates realistic code realizations and flush sequences with varying student struggle.
"""

import random
from datetime import datetime, timedelta
from typing import Dict, List, Tuple


class BSTTemplate:
    """Base C++ Binary Search Tree project template."""

    FILES = {
        "node.h": '''#ifndef NODE_H
#define NODE_H

struct Node {
    int value;
    Node* left;
    Node* right;

    Node(int val) : value(val), left(nullptr), right(nullptr) {}
};

#endif
''',
        "bst.h": '''#ifndef BST_H
#define BST_H

#include "node.h"

class BST {
public:
    BST();
    ~BST();

    void insert(int value);
    bool search(int value);
    void remove(int value);

    void inorder();
    void preorder();
    void postorder();

    int height();
    int nodeCount();
    bool isValid();

private:
    Node* root;

    Node* insertHelper(Node* node, int value);
    bool searchHelper(Node* node, int value);
    Node* removeHelper(Node* node, int value);
    Node* findMin(Node* node);

    void inorderHelper(Node* node);
    void preorderHelper(Node* node);
    void postorderHelper(Node* node);

    int heightHelper(Node* node);
    int nodeCountHelper(Node* node);
    bool isValidHelper(Node* node, int minVal, int maxVal);

    void deleteTree(Node* node);
};

#endif
''',
        "bst.cpp": '''#include "bst.h"
#include <iostream>

BST::BST() : root(nullptr) {}

BST::~BST() {
    deleteTree(root);
}

void BST::insert(int value) {
    root = insertHelper(root, value);
}

Node* BST::insertHelper(Node* node, int value) {
    if (node == nullptr) {
        return new Node(value);
    }

    if (value < node->value) {
        node->left = insertHelper(node->left, value);
    } else if (value > node->value) {
        node->right = insertHelper(node->right, value);
    }

    return node;
}

bool BST::search(int value) {
    return searchHelper(root, value);
}

bool BST::searchHelper(Node* node, int value) {
    if (node == nullptr) {
        return false;
    }

    if (value == node->value) {
        return true;
    } else if (value < node->value) {
        return searchHelper(node->left, value);
    } else {
        return searchHelper(node->right, value);
    }
}

void BST::remove(int value) {
    root = removeHelper(root, value);
}

Node* BST::removeHelper(Node* node, int value) {
    if (node == nullptr) {
        return nullptr;
    }

    if (value < node->value) {
        node->left = removeHelper(node->left, value);
    } else if (value > node->value) {
        node->right = removeHelper(node->right, value);
    } else {
        // Node with only one child or no child
        if (node->left == nullptr) {
            Node* temp = node->right;
            delete node;
            return temp;
        } else if (node->right == nullptr) {
            Node* temp = node->left;
            delete node;
            return temp;
        }

        // Node with two children
        Node* minRight = findMin(node->right);
        node->value = minRight->value;
        node->right = removeHelper(node->right, minRight->value);
    }

    return node;
}

Node* BST::findMin(Node* node) {
    while (node->left != nullptr) {
        node = node->left;
    }
    return node;
}

void BST::inorder() {
    inorderHelper(root);
    std::cout << std::endl;
}

void BST::inorderHelper(Node* node) {
    if (node == nullptr) return;

    inorderHelper(node->left);
    std::cout << node->value << " ";
    inorderHelper(node->right);
}

void BST::preorder() {
    preorderHelper(root);
    std::cout << std::endl;
}

void BST::preorderHelper(Node* node) {
    if (node == nullptr) return;

    std::cout << node->value << " ";
    preorderHelper(node->left);
    preorderHelper(node->right);
}

void BST::postorder() {
    postorderHelper(root);
    std::cout << std::endl;
}

void BST::postorderHelper(Node* node) {
    if (node == nullptr) return;

    postorderHelper(node->left);
    postorderHelper(node->right);
    std::cout << node->value << " ";
}

int BST::height() {
    return heightHelper(root);
}

int BST::heightHelper(Node* node) {
    if (node == nullptr) return -1;

    int leftHeight = heightHelper(node->left);
    int rightHeight = heightHelper(node->right);

    return 1 + (leftHeight > rightHeight ? leftHeight : rightHeight);
}

int BST::nodeCount() {
    return nodeCountHelper(root);
}

int BST::nodeCountHelper(Node* node) {
    if (node == nullptr) return 0;

    return 1 + nodeCountHelper(node->left) + nodeCountHelper(node->right);
}

bool BST::isValid() {
    return isValidHelper(root, INT_MIN, INT_MAX);
}

bool BST::isValidHelper(Node* node, int minVal, int maxVal) {
    if (node == nullptr) return true;

    if (node->value <= minVal || node->value >= maxVal) {
        return false;
    }

    return isValidHelper(node->left, minVal, node->value) &&
           isValidHelper(node->right, node->value, maxVal);
}

void BST::deleteTree(Node* node) {
    if (node == nullptr) return;

    deleteTree(node->left);
    deleteTree(node->right);
    delete node;
}
''',
        "main.cpp": '''#include <iostream>
#include "bst.h"

int main() {
    BST tree;

    // Insert values
    int values[] = {50, 30, 70, 20, 40, 60, 80};
    for (int val : values) {
        tree.insert(val);
    }

    std::cout << "Inorder: ";
    tree.inorder();

    std::cout << "Height: " << tree.height() << std::endl;
    std::cout << "Count: " << tree.nodeCount() << std::endl;

    // Search
    std::cout << "Search 40: " << (tree.search(40) ? "Found" : "Not found") << std::endl;

    // Remove
    tree.remove(30);
    std::cout << "After removing 30: ";
    tree.inorder();

    return 0;
}
''',
    }

    # Difficulty levels for each method/concept
    FUNCTION_DIFFICULTY = {
        "insert": 1.0,           # Easy
        "search": 1.0,           # Easy
        "remove": 2.5,           # Hard (multiple cases)
        "traversals": 1.3,       # Medium (inorder, preorder, postorder)
        "helper_methods": 1.2,   # Easy-medium (height, count, isValid)
    }


class StudentVariator:
    """Creates student-specific realizations of the template."""

    INDENT_STYLES = ["  ", "    ", "\t"]

    def __init__(self, seed: int):
        self.rng = random.Random(seed)
        self.indent = self.rng.choice(self.INDENT_STYLES)
        self.var_mapping = {}

    def generate_var_name(self, original: str) -> str:
        """Generate student-specific variable name."""
        if original in self.var_mapping:
            return self.var_mapping[original]

        prefixes = ["curr", "tmp", "ptr", "n", "curr_node"]
        suffixes = ["", "1", "2", "Ptr", "_val"]

        new_name = self.rng.choice(prefixes) + self.rng.choice(suffixes)
        self.var_mapping[original] = new_name
        return new_name

    def randomize_formatting(self, code: str) -> str:
        """Randomize indentation, variable names, spacing."""
        # Vary brace placement (K&R vs Allman)
        if self.rng.random() < 0.5:
            code = code.replace("{\n", " {\n")

        # Vary variable names
        for original in ["node", "value", "left", "right", "leftHeight", "rightHeight"]:
            new_name = self.generate_var_name(original)
            import re
            code = re.sub(rf"\b{original}\b", new_name, code)

        return code

    def realize_template(self) -> Dict[str, str]:
        """Create student-specific realization."""
        realized = {}
        for filename, content in BSTTemplate.FILES.items():
            realized[filename] = self.randomize_formatting(content)
        return realized


class FlushSequenceGenerator:
    """Generates realistic sequence of flushes for a BST project."""

    def __init__(self, student_id: int, utln: str, seed: int):
        self.student_id = student_id
        self.utln = utln
        self.rng = random.Random(seed)
        self.variator = StudentVariator(seed)
        self.realized_files = self.variator.realize_template()

        # Student-specific struggle profile
        self.base_struggle = self.rng.gauss(1.0, 0.3)
        self.function_struggle = {
            func: BSTTemplate.FUNCTION_DIFFICULTY[func] * self.base_struggle
            for func in BSTTemplate.FUNCTION_DIFFICULTY
        }

    def _partial_insert(self, completeness: float) -> str:
        """Generate partial insert implementation."""
        stages = [
            "",
            "if (node == nullptr) {",
            "if (node == nullptr) {\n        return new Node(value);",
            "if (node == nullptr) {\n        return new Node(value);\n    }\n    \n    if (value < node->value) {",
            "if (node == nullptr) {\n        return new Node(value);\n    }\n    \n    if (value < node->value) {\n        node->left = insertHelper(node->left, value);\n    } else if (value > node->value) {",
            "if (node == nullptr) {\n        return new Node(value);\n    }\n    \n    if (value < node->value) {\n        node->left = insertHelper(node->left, value);\n    } else if (value > node->value) {\n        node->right = insertHelper(node->right, value);\n    }\n    \n    return node;",
        ]
        idx = int(completeness * (len(stages) - 1))
        return stages[min(idx, len(stages) - 1)]

    def _partial_remove(self, completeness: float) -> str:
        """Generate partial remove implementation (harder)."""
        stages = [
            "",
            "if (node == nullptr) {",
            "if (node == nullptr) {\n        return nullptr;",
            "if (node == nullptr) {\n        return nullptr;\n    }\n    \n    if (value < node->value) {",
            "if (node == nullptr) {\n        return nullptr;\n    }\n    \n    if (value < node->value) {\n        node->left = removeHelper(node->left, value);\n    } else if (value > node->value) {",
            "// ... recursive cases ...\n    } else {\n        // Node found - handle cases",
            "// Single child case\n        if (node->left == nullptr) {",
            "// Two children - find min in right subtree",
            "Node* minRight = findMin(node->right);\n        node->value = minRight->value;\n        node->right = removeHelper(node->right, minRight->value);",
        ]
        idx = int(completeness * (len(stages) - 1))
        return stages[min(idx, len(stages) - 1)]

    def _partial_traversal(self, completeness: float) -> str:
        """Generate partial traversal implementations."""
        stages = [
            "",
            "void BST::inorder() {",
            "void BST::inorder() {\n    inorderHelper(root);",
            "void BST::inorderHelper(Node* node) {\n    if (node == nullptr) return;",
            "inorderHelper(node->left);\n    std::cout << node->value << \" \";\n    inorderHelper(node->right);",
        ]
        idx = int(completeness * (len(stages) - 1))
        return stages[min(idx, len(stages) - 1)]

    def _create_flush(self, file_path: str, old_content: str, new_content: str,
                     active_symbol: str, trigger: str, duration_sec: float) -> Dict:
        """Create a flush record."""
        diffs = []
        old_lines = old_content.split("\n")
        new_lines = new_content.split("\n")

        for i, (old, new) in enumerate(zip(old_lines, new_lines)):
            if old != new:
                diffs.append(f"-{old}\n+{new}")
        if len(new_lines) > len(old_lines):
            for line in new_lines[len(old_lines):]:
                diffs.append(f"+{line}")

        return {
            "file_path": file_path,
            "diffs": "\n".join(diffs),
            "content": new_content,
            "active_symbol": active_symbol,
            "trigger": trigger,
            "window_duration": duration_sec,
        }

    def generate_flush_sequence(self) -> Tuple[List[Dict], float]:
        """Generate realistic flush sequence for BST project."""
        flushes = []
        total_time = self.rng.uniform(45 * 60, 150 * 60)  # 45 min to 2.5 hours

        # Phase 1: Create headers
        for filename in ["node.h", "bst.h"]:
            flush = self._create_flush(
                filename,
                "",
                self.realized_files[filename],
                "Node" if filename == "node.h" else "BST",
                "init",
                self.rng.uniform(3, 7)
            )
            flushes.append(flush)
            total_time -= flush["window_duration"]

        # Phase 2: Implement key methods
        methods = [
            ("insert", self._partial_insert, 3),
            ("search", self._partial_insert, 2),  # Similar to insert
            ("traversals", self._partial_traversal, 3),
            ("remove", self._partial_remove, 5),  # Harder
            ("helper_methods", self._partial_insert, 2),  # Count, height, etc.
        ]

        current_cpp = "#include \"bst.h\"\n\n"

        for method, partial_fn, num_iterations in methods:
            struggle_factor = self.function_struggle[method]
            iterations = max(1, int(num_iterations * struggle_factor * self.rng.gauss(1, 0.3)))
            method_time = (total_time * struggle_factor) / sum(self.function_struggle.values())

            for iteration in range(iterations):
                completeness = (iteration + 1) / iterations
                impl = partial_fn(completeness)

                duration = (method_time / iterations) + self.rng.gauss(0, 2)
                duration = max(1, duration)

                new_cpp = current_cpp + impl + "\n// ... more methods ...\n"

                flush = self._create_flush(
                    "bst.cpp",
                    current_cpp,
                    new_cpp,
                    method.split("_")[0],
                    "timeout",
                    duration
                )
                flushes.append(flush)
                current_cpp = new_cpp
                total_time -= duration

        # Phase 3: Create main.cpp
        flush = self._create_flush(
            "main.cpp",
            "",
            self.realized_files["main.cpp"],
            "main",
            "timeout",
            min(total_time, self.rng.uniform(5, 10))
        )
        flushes.append(flush)

        total_elapsed = sum(f["window_duration"] for f in flushes)
        return flushes, total_elapsed


def generate_class_data(num_students: int = 20) -> Dict[str, Dict]:
    """Generate complete 20-person BST class data."""
    first_names = ["Alice", "Bob", "Charlie", "Diana", "Eve", "Frank", "Grace", "Hank",
                   "Iris", "Jack", "Karen", "Liam", "Mina", "Noah", "Olivia", "Paul",
                   "Quinn", "Ruby", "Sam", "Tina"]
    last_names = ["Smith", "Johnson", "Brown", "Davis", "Miller", "Wilson", "Moore", "Taylor",
                  "Anderson", "Thomas", "Jackson", "White", "Harris", "Martin", "Garcia"]

    students = {}

    for i in range(num_students):
        first = first_names[i % len(first_names)]
        last = last_names[i % len(last_names)]
        utln = f"{first[0].lower()}{last[:3].lower()}{i:02d}".lower()
        email = f"student{i+1}@jumbuddy.test"

        generator = FlushSequenceGenerator(i, utln, seed=54321 + i)
        flushes, total_time = generator.generate_flush_sequence()

        students[utln] = {
            "utln": utln,
            "email": email,
            "password": "testpass123",
            "display_name": f"{first} {last}",
            "data_file": f"{utln}.json",
            "flushes": flushes,
            "total_time": total_time,
        }

    return students


if __name__ == "__main__":
    data = generate_class_data(20)
    print(f"Generated {len(data)} students")
    for utln, student in list(data.items())[:3]:
        print(f"\n{student['display_name']} ({utln}):")
        print(f"  Total time: {student['total_time'] / 60:.1f} minutes")
        print(f"  Flushes: {len(student['flushes'])}")
