"""
Realistic CS40 arith seed generator.

Strategy: incremental random walk from start state (TODO stubs) to end state
(complete implementations). Each flush is a tiny edit (1-5 lines changed).
We track file content as mutable line lists and only emit diffs of what changed.
"""

import random
import difflib
from typing import Dict, List, Tuple, Optional

# ---------------------------------------------------------------------------
# C++ file templates: headers are static, cpp files are built dynamically
# ---------------------------------------------------------------------------

HEADERS = {
    "bitpack.h": """\
#ifndef BITPACK_H
#define BITPACK_H

#include <cstdint>
#include <stdexcept>

bool Bitpack_fitsu(uint64_t n, unsigned width);
bool Bitpack_fitss(int64_t n, unsigned width);
uint64_t Bitpack_getu(uint64_t word, unsigned width, unsigned lsb);
int64_t Bitpack_gets(uint64_t word, unsigned width, unsigned lsb);
uint64_t Bitpack_newu(uint64_t word, unsigned width, unsigned lsb, uint64_t value);
uint64_t Bitpack_news(uint64_t word, unsigned width, unsigned lsb, int64_t value);

#endif
""",
    "colorspace.h": """\
#ifndef COLORSPACE_H
#define COLORSPACE_H

struct ComponentVideo {
    float y, pb, pr;
};

struct RGB {
    unsigned r, g, b;
};

ComponentVideo rgb_to_component(RGB pixel);
RGB component_to_rgb(ComponentVideo cv);
float clamp(float val, float lo, float hi);

#endif
""",
    "dct.h": """\
#ifndef DCT_H
#define DCT_H

struct DCTCoeffs {
    float a, b, c, d;
};

DCTCoeffs forward_dct(float y1, float y2, float y3, float y4);
void inverse_dct(DCTCoeffs coeffs, float &y1, float &y2, float &y3, float &y4);
int quantize(float val, float scale);

#endif
""",
    "compress40.h": """\
#ifndef COMPRESS40_H
#define COMPRESS40_H

#include <cstdint>

struct CompressedBlock {
    uint64_t word;
};

CompressedBlock pack_block(float pb_avg, float pr_avg, float a, float b, float c, float d);
void unpack_block(CompressedBlock block, float &pb_avg, float &pr_avg, float &a, float &b, float &c, float &d);
void compress(const char *filename);
void decompress(const char *filename);

#endif
""",
}

# Function signatures: (return_type, name, params)
FUNC_SIGS = {
    "fitsu":             ("bool",            "Bitpack_fitsu",    "uint64_t n, unsigned width"),
    "fitss":             ("bool",            "Bitpack_fitss",    "int64_t n, unsigned width"),
    "getu":              ("uint64_t",        "Bitpack_getu",     "uint64_t word, unsigned width, unsigned lsb"),
    "gets":              ("int64_t",         "Bitpack_gets",     "uint64_t word, unsigned width, unsigned lsb"),
    "newu":              ("uint64_t",        "Bitpack_newu",     "uint64_t word, unsigned width, unsigned lsb, uint64_t value"),
    "news":              ("uint64_t",        "Bitpack_news",     "uint64_t word, unsigned width, unsigned lsb, int64_t value"),
    "rgb_to_component":  ("ComponentVideo",  "rgb_to_component", "RGB pixel"),
    "component_to_rgb":  ("RGB",            "component_to_rgb",  "ComponentVideo cv"),
    "clamp":             ("float",          "clamp",             "float val, float lo, float hi"),
    "forward_dct":       ("DCTCoeffs",      "forward_dct",       "float y1, float y2, float y3, float y4"),
    "inverse_dct":       ("void",           "inverse_dct",       "DCTCoeffs coeffs, float &y1, float &y2, float &y3, float &y4"),
    "quantize":          ("int",            "quantize",          "float val, float scale"),
    "pack_block":        ("CompressedBlock", "pack_block",       "float pb_avg, float pr_avg, float a, float b, float c, float d"),
    "unpack_block":      ("void",           "unpack_block",      "CompressedBlock block, float &pb_avg, float &pr_avg, float &a, float &b, float &c, float &d"),
    "compress":          ("void",           "compress",          "const char *filename"),
    "decompress":        ("void",           "decompress",        "const char *filename"),
    "main":              ("int",            "main",              "int argc, char *argv[]"),
}

# Which functions go in which file, and include directives
FILE_FUNCS = {
    "bitpack.cpp":     (["fitsu", "fitss", "getu", "gets", "newu", "news"],
                        '#include "bitpack.h"\n'),
    "colorspace.cpp":  (["rgb_to_component", "component_to_rgb", "clamp"],
                        '#include "colorspace.h"\n'),
    "dct.cpp":         (["forward_dct", "inverse_dct", "quantize"],
                        '#include "dct.h"\n'),
    "compress40.cpp":  (["pack_block", "unpack_block", "compress", "decompress"],
                        '#include "compress40.h"\n#include "bitpack.h"\n#include "colorspace.h"\n#include "dct.h"\n'),
    "main.cpp":        (["main"],
                        '#include <iostream>\n#include <string>\n#include "compress40.h"\n'),
}

# The FINAL body lines for each function (what the student ultimately writes).
# Each value is a list of lines (no leading indent — indent is added at render time).
FINAL_BODY: Dict[str, List[str]] = {
    "fitsu": [
        "if (width >= 64) return true;",
        "return n < ((uint64_t)1 << width);",
    ],
    "fitss": [
        "if (width >= 64) return true;",
        "int64_t lo = -(int64_t)((uint64_t)1 << (width - 1));",
        "int64_t hi = ((int64_t)1 << (width - 1)) - 1;",
        "return n >= lo && n <= hi;",
    ],
    "getu": [
        "uint64_t mask = ((uint64_t)1 << width) - 1;",
        "return (word >> lsb) & mask;",
    ],
    "gets": [
        "uint64_t val = Bitpack_getu(word, width, lsb);",
        "uint64_t sign = val >> (width - 1);",
        "if (sign) {",
        "    val = val | ~(((uint64_t)1 << width) - 1);",
        "}",
        "return (int64_t)val;",
    ],
    "newu": [
        "if (!Bitpack_fitsu(value, width)) throw std::overflow_error(\"overflow\");",
        "uint64_t mask = ((uint64_t)1 << width) - 1;",
        "word = word & ~(mask << lsb);",
        "word = word | ((value & mask) << lsb);",
        "return word;",
    ],
    "news": [
        "if (!Bitpack_fitss(value, width)) throw std::overflow_error(\"overflow\");",
        "uint64_t uval = (uint64_t)value & (((uint64_t)1 << width) - 1);",
        "return Bitpack_newu(word, width, lsb, uval);",
    ],
    "rgb_to_component": [
        "ComponentVideo cv;",
        "cv.y  = 0.299f * pixel.r + 0.587f * pixel.g + 0.114f * pixel.b;",
        "cv.pb = -0.168736f * pixel.r - 0.331264f * pixel.g + 0.5f * pixel.b;",
        "cv.pr = 0.5f * pixel.r - 0.418688f * pixel.g - 0.081312f * pixel.b;",
        "return cv;",
    ],
    "component_to_rgb": [
        "RGB rgb;",
        "float r = cv.y + 1.402f * cv.pr;",
        "float g = cv.y - 0.344136f * cv.pb - 0.714136f * cv.pr;",
        "float b = cv.y + 1.772f * cv.pb;",
        "rgb.r = (unsigned)clamp(r, 0, 255);",
        "rgb.g = (unsigned)clamp(g, 0, 255);",
        "rgb.b = (unsigned)clamp(b, 0, 255);",
        "return rgb;",
    ],
    "clamp": [
        "if (val < lo) return lo;",
        "if (val > hi) return hi;",
        "return val;",
    ],
    "forward_dct": [
        "DCTCoeffs c;",
        "c.a = (y4 + y3 + y2 + y1) / 4.0f;",
        "c.b = (y4 + y3 - y2 - y1) / 4.0f;",
        "c.c = (y4 - y3 + y2 - y1) / 4.0f;",
        "c.d = (y4 - y3 - y2 + y1) / 4.0f;",
        "return c;",
    ],
    "inverse_dct": [
        "y1 = coeffs.a - coeffs.b - coeffs.c + coeffs.d;",
        "y2 = coeffs.a - coeffs.b + coeffs.c - coeffs.d;",
        "y3 = coeffs.a + coeffs.b - coeffs.c - coeffs.d;",
        "y4 = coeffs.a + coeffs.b + coeffs.c + coeffs.d;",
    ],
    "quantize": [
        "int q = (int)(val / scale);",
        "if (q > 31) q = 31;",
        "if (q < -31) q = -31;",
        "return q;",
    ],
    "pack_block": [
        "CompressedBlock block;",
        "block.word = 0;",
        "unsigned pb_idx = (unsigned)((pb_avg + 0.5f) / 1.0f * 15);",
        "unsigned pr_idx = (unsigned)((pr_avg + 0.5f) / 1.0f * 15);",
        "unsigned aq = (unsigned)(a / 1.0f * 511);",
        "int bq = quantize(b, 0.03f);",
        "int cq = quantize(c, 0.03f);",
        "int dq = quantize(d, 0.03f);",
        "block.word = Bitpack_newu(block.word, 4, 0, pr_idx);",
        "block.word = Bitpack_newu(block.word, 4, 4, pb_idx);",
        "block.word = Bitpack_news(block.word, 6, 8, dq);",
        "block.word = Bitpack_news(block.word, 6, 14, cq);",
        "block.word = Bitpack_news(block.word, 6, 20, bq);",
        "block.word = Bitpack_newu(block.word, 9, 26, aq);",
        "return block;",
    ],
    "unpack_block": [
        "pr_avg = ((float)Bitpack_getu(block.word, 4, 0) / 15.0f) - 0.5f;",
        "pb_avg = ((float)Bitpack_getu(block.word, 4, 4) / 15.0f) - 0.5f;",
        "d = (float)Bitpack_gets(block.word, 6, 8) * 0.03f;",
        "c = (float)Bitpack_gets(block.word, 6, 14) * 0.03f;",
        "b = (float)Bitpack_gets(block.word, 6, 20) * 0.03f;",
        "a = (float)Bitpack_getu(block.word, 9, 26) / 511.0f;",
    ],
    "compress": [
        "(void)filename;",
        "// Read PPM image",
        "// For each 2x2 block of pixels:",
        "//   Convert RGB to component video",
        "//   Apply forward DCT on Y values",
        "//   Quantize and pack into 32-bit word",
        "//   Write word to stdout in big-endian order",
    ],
    "decompress": [
        "(void)filename;",
        "// Read compressed data from stdin",
        "// For each 32-bit word:",
        "//   Unpack block components",
        "//   Apply inverse DCT",
        "//   Convert component video to RGB",
        "//   Store pixel in output image",
        "// Write PPM to stdout",
    ],
    "main": [
        "if (argc < 3) {",
        '    std::cerr << "Usage: " << argv[0] << " -c|-d filename" << std::endl;',
        "    return 1;",
        "}",
        "std::string mode = argv[1];",
        "const char *filename = argv[2];",
        "if (mode == \"-c\") {",
        "    compress(filename);",
        "} else if (mode == \"-d\") {",
        "    decompress(filename);",
        "} else {",
        '    std::cerr << "Unknown mode: " << mode << std::endl;',
        "    return 1;",
        "}",
        "return 0;",
    ],
}

# Difficulty affects how many extra noise steps a function gets
DIFFICULTY = {
    "fitsu": 1.0, "fitss": 1.2, "getu": 1.8, "gets": 2.2, "newu": 2.0, "news": 2.3,
    "rgb_to_component": 1.5, "component_to_rgb": 1.5, "clamp": 0.8,
    "forward_dct": 1.7, "inverse_dct": 1.7, "quantize": 1.4,
    "pack_block": 2.5, "unpack_block": 2.4, "compress": 2.0, "decompress": 2.0,
    "main": 0.5,
}

# Implementation order
IMPL_ORDER = [
    "fitsu", "fitss", "getu", "gets", "newu", "news",
    "rgb_to_component", "component_to_rgb", "clamp",
    "forward_dct", "inverse_dct", "quantize",
    "pack_block", "unpack_block", "compress", "decompress",
    "main",
]

# Common wrong-attempt lines per function (for noise / backtracking)
WRONG_ATTEMPTS: Dict[str, List[str]] = {
    "fitsu": ["return n < (1 << width);"],  # missing cast
    "fitss": ["int64_t lo = -(1 << (width - 1));"],  # missing cast
    "getu":  ["return (word << lsb) & mask;"],  # wrong shift direction
    "gets":  ["return val;"],  # forgot sign extension
    "newu":  ["word = word | (value << lsb);"],  # forgot mask
    "news":  ["return Bitpack_newu(word, width, lsb, (uint64_t)value);"],  # forgot mask
    "rgb_to_component": ["cv.y = 0.299 * pixel.r + 0.587 * pixel.g;"],  # missing blue
    "component_to_rgb": ["rgb.r = (unsigned)r;"],  # no clamp
    "forward_dct": ["c.a = (y4 + y3 + y2 + y1) / 2.0f;"],  # wrong divisor
    "pack_block": ["block.word = Bitpack_newu(block.word, 4, 0, pb_idx);"],  # pb/pr swapped
}


# ---------------------------------------------------------------------------
# Style Variator
# ---------------------------------------------------------------------------

class StyleVariator:
    """Per-student coding style."""

    def __init__(self, rng: random.Random):
        self.rng = rng
        self.indent = rng.choice(["  ", "    ", "\t"])
        self.brace_style = rng.choice(["knr", "allman"])
        self.comment_prob = rng.uniform(0.0, 0.35)
        # Variable renames (applied to function body lines only)
        self.renames: Dict[str, str] = {}
        all_renames = {
            "mask": ["bitMask", "m", "field_mask"],
            "val": ["v", "value", "tmp"],
            "lo": ["low", "min_val", "lower"],
            "hi": ["high", "max_val", "upper"],
            "sign": ["signBit", "sign_bit"],
        }
        for orig, alts in all_renames.items():
            if rng.random() < 0.4:
                self.renames[orig] = rng.choice(alts)

    def indent_line(self, line: str, depth: int) -> str:
        """Indent a line to the given depth."""
        if not line.strip():
            return ""
        return self.indent * depth + line

    def apply_renames(self, line: str) -> str:
        """Apply variable renames to a body line."""
        import re
        for orig, repl in self.renames.items():
            line = re.sub(rf'\b{orig}\b(?!\()', repl, line)
        return line

    def render_function(self, func_name: str, body_lines: List[str]) -> List[str]:
        """Render a complete function with student's style. Returns list of lines."""
        ret, name, params = FUNC_SIGS[func_name]
        result: List[str] = []

        # Optional comment
        if self.rng.random() < self.comment_prob:
            result.append(f"// {func_name}")

        sig = f"{ret} {name}({params})"
        if self.brace_style == "knr":
            result.append(sig + " {")
        else:
            result.append(sig)
            result.append("{")

        for line in body_lines:
            renamed = self.apply_renames(line)
            # Detect indentation level from the line itself
            stripped = renamed.lstrip()
            extra_indent = (len(renamed) - len(stripped)) // 4
            result.append(self.indent_line(stripped, 1 + extra_indent))

        result.append("}")
        result.append("")  # blank line after function
        return result


# ---------------------------------------------------------------------------
# FileState: mutable representation of a .cpp file as lines
# ---------------------------------------------------------------------------

class FileState:
    """Tracks current lines of a file and where each function's body is."""

    def __init__(self, include_block: str, func_names: List[str], style: StyleVariator):
        self.style = style
        self.func_names = func_names
        self.lines: List[str] = []
        # Current body lines per function (without indent, raw content)
        self.func_bodies: Dict[str, List[str]] = {fn: ["// TODO"] for fn in func_names}

        # Build initial file
        self._rebuild(include_block)
        self.include_block = include_block

    def _rebuild(self, include_block: str):
        """Rebuild the full file from include block + function bodies."""
        self.lines = include_block.rstrip("\n").split("\n") + [""]
        # Track where each function starts in self.lines
        self.func_line_ranges: Dict[str, Tuple[int, int]] = {}
        for fn in self.func_names:
            start = len(self.lines)
            rendered = self.style.render_function(fn, self.func_bodies[fn])
            self.lines.extend(rendered)
            end = len(self.lines)
            self.func_line_ranges[fn] = (start, end)

    def set_body(self, func_name: str, new_body: List[str]):
        """Replace a function's body and rebuild the file."""
        self.func_bodies[func_name] = list(new_body)
        self._rebuild(self.include_block)

    def get_content(self) -> str:
        return "\n".join(self.lines)


# ---------------------------------------------------------------------------
# Edit planner: generates micro-edits from TODO → final body
# ---------------------------------------------------------------------------

class EditPlanner:
    """Plans a sequence of tiny edits to take a function from TODO to complete."""

    def __init__(self, rng: random.Random, noise_level: float):
        self.rng = rng
        self.noise_level = noise_level

    def plan_edits(self, func_name: str, struggle: float) -> List[List[str]]:
        """
        Return a list of body snapshots, starting at ["// TODO"] and ending
        at FINAL_BODY[func_name]. Each consecutive pair differs by 1-3 lines.

        Thrash is generated by:
        1. Writing wrong approaches then deleting them (high chars_deleted)
        2. Rewriting the same line multiple times (high chars_inserted+deleted, low net)
        3. Adding debug stmts then removing them
        Higher struggle → more thrash sequences.
        """
        final = FINAL_BODY[func_name]
        snapshots: List[List[str]] = [["// TODO"]]
        current: List[str] = []

        i = 0
        while i < len(final):
            # How many lines to add this step
            chunk = self.rng.randint(1, min(2, len(final) - i))
            new_lines = final[i:i + chunk]
            current = current + new_lines
            snapshots.append(list(current))
            i += chunk

            # === THRASH: multi-step false starts and rewrites ===
            # Probability scales with struggle and noise_level
            thrash_prob = min(0.7, self.noise_level * struggle * 0.4)

            if self.rng.random() < thrash_prob:
                thrash_type = self.rng.choices(
                    ["rewrite_line", "false_start", "debug_cycle", "typo_fix"],
                    weights=[3, 2, 2, 1],
                    k=1,
                )[0]
                thrash = self._make_thrash(func_name, current, thrash_type, struggle)
                snapshots.extend(thrash)
                # After thrash, current is restored to clean state
                # (last element of thrash sequence is the clean revert)

        # Ensure final snapshot is exactly the final body
        if snapshots[-1] != final:
            snapshots.append(list(final))

        return snapshots

    def _make_thrash(self, func_name: str, current: List[str],
                     thrash_type: str, struggle: float) -> List[List[str]]:
        """
        Generate a thrash sequence: multiple snapshots that churn chars
        before reverting to `current`. Returns list of body snapshots.
        The LAST snapshot is always `list(current)` (clean revert).
        """
        steps: List[List[str]] = []

        if thrash_type == "rewrite_line" and current:
            # Rewrite the last line 2-4 times with variations before settling
            idx = len(current) - 1
            original = current[idx]
            num_rewrites = self.rng.randint(2, 4)
            for _ in range(num_rewrites):
                variant = list(current)
                # Generate a plausible wrong version of the line
                variant[idx] = self._mutate_line(original)
                steps.append(variant)
            # Revert to correct
            steps.append(list(current))

        elif thrash_type == "false_start" and func_name in WRONG_ATTEMPTS:
            # Write 2-4 wrong lines, then delete them all, then write correct
            wrong_lines = []
            num_wrong = self.rng.randint(2, min(4, len(FINAL_BODY[func_name])))
            for _ in range(num_wrong):
                if func_name in WRONG_ATTEMPTS:
                    wrong_lines.append(self.rng.choice(WRONG_ATTEMPTS[func_name]))
                else:
                    wrong_lines.append("// hmm, not sure about this")
                # Snapshot with growing wrong approach
                wrong_body = current[:-1] + wrong_lines if current else wrong_lines
                steps.append(list(wrong_body))
            # Delete wrong lines (back to state before last correct line)
            if len(current) > 1:
                steps.append(list(current[:-1]))
            else:
                steps.append(["// TODO"])
            # Re-add correct
            steps.append(list(current))

        elif thrash_type == "debug_cycle":
            # Add debug stmt, keep for 1-2 steps, then remove
            var = self.rng.choice(["val", "result", "word", "mask", "n", "width"])
            debug = f'std::cout << "DEBUG {var}=" << {var} << std::endl;'
            pos = self.rng.randint(0, len(current))
            with_debug = list(current)
            with_debug.insert(pos, debug)
            steps.append(with_debug)
            # Maybe add a second debug line
            if self.rng.random() < 0.4:
                var2 = self.rng.choice(["lsb", "sign", "churn", "i"])
                debug2 = f'std::cerr << "{var2}=" << {var2} << "\\n";'
                with_debug2 = list(with_debug)
                with_debug2.insert(pos + 1, debug2)
                steps.append(with_debug2)
            # Remove all debug
            steps.append(list(current))

        elif thrash_type == "typo_fix" and current:
            # Introduce typo, then fix it (simple 2-step)
            idx = self.rng.randint(0, len(current) - 1)
            line = current[idx]
            if len(line) > 5:
                typo_version = list(current)
                chars = list(line)
                pos = self.rng.randint(2, len(chars) - 2)
                chars[pos] = self.rng.choice("abcdefghijklmnop")
                typo_version[idx] = "".join(chars)
                steps.append(typo_version)
            steps.append(list(current))

        if not steps:
            steps.append(list(current))

        return steps

    def _mutate_line(self, line: str) -> str:
        """Create a plausible wrong variation of a code line."""
        mutations = [
            # Swap operator
            lambda l: l.replace(">>", "<<") if ">>" in l else l.replace("<<", ">>"),
            # Wrong constant
            lambda l: l.replace("1", "0") if "1 <<" in l else l,
            # Missing parens
            lambda l: l.replace("((uint64_t)", "(uint64_t") if "((uint64_t)" in l else l,
            # Off by one
            lambda l: l.replace("- 1", "") if "- 1" in l else l.replace("+ 1", ""),
            # Different variable name
            lambda l: l.replace("word", "value") if "word" in l else l.replace("val", "tmp"),
            # Comment out (thinking)
            lambda l: "// " + l.lstrip(),
            # Truncate (incomplete thought)
            lambda l: l[:max(len(l) * 2 // 3, 5)],
        ]
        mut = self.rng.choice(mutations)
        result = mut(line)
        # If mutation didn't change anything, fall back to commenting out
        if result == line:
            result = "// " + line.lstrip()
        return result


# ---------------------------------------------------------------------------
# Diff generator
# ---------------------------------------------------------------------------

def make_diff(old: str, new: str) -> str:
    """Simple +/- diff between two strings."""
    old_lines = old.split("\n")
    new_lines = new.split("\n")
    sm = difflib.SequenceMatcher(None, old_lines, new_lines)
    parts: List[str] = []
    for op, i1, i2, j1, j2 in sm.get_opcodes():
        if op == "equal":
            continue
        if op in ("replace", "delete"):
            for line in old_lines[i1:i2]:
                parts.append(f"-{line}")
        if op in ("replace", "insert"):
            for line in new_lines[j1:j2]:
                parts.append(f"+{line}")
    return "\n".join(parts)


# ---------------------------------------------------------------------------
# Flush sequence generator
# ---------------------------------------------------------------------------

class FlushSequenceGenerator:
    """Generates the full flush sequence for one student."""

    def __init__(self, student_id: int, utln: str, seed: int):
        self.rng = random.Random(seed)
        self.utln = utln
        self.style = StyleVariator(self.rng)

        # Per-student parameters
        self.base_struggle = max(0.5, self.rng.gauss(1.0, 0.3))
        self.noise_level = max(0.1, min(0.5, self.rng.gauss(0.3, 0.1)))
        self.planner = EditPlanner(self.rng, self.noise_level)

    def generate(self) -> Tuple[List[Dict], float]:
        """Returns (flush_list, total_time_seconds)."""
        flushes: List[Dict] = []

        # Step 1: Create all header files (one flush each)
        for hdr_name, hdr_content in HEADERS.items():
            content = hdr_content.rstrip("\n")
            flushes.append(self._flush(
                hdr_name, "", content, hdr_name.replace(".h", ""), "init",
                self.rng.uniform(1, 4),
            ))

        # Step 2: Create each cpp file with TODO stubs, then incrementally fill in
        for cpp_file, (func_list, includes) in FILE_FUNCS.items():
            fs = FileState(includes, func_list, self.style)
            prev_content = ""

            # Initial file creation flush (all TODOs)
            content = fs.get_content()
            flushes.append(self._flush(
                cpp_file, prev_content, content, func_list[0], "init",
                self.rng.uniform(2, 5),
            ))
            prev_content = content

            # Implement each function incrementally
            for func_name in func_list:
                difficulty = DIFFICULTY[func_name]
                struggle = difficulty * self.base_struggle
                snapshots = self.planner.plan_edits(func_name, struggle)

                # snapshots[0] is ["// TODO"] which is the current state
                for snap_idx in range(1, len(snapshots)):
                    body = snapshots[snap_idx]
                    fs.set_body(func_name, body)
                    new_content = fs.get_content()

                    if new_content == prev_content:
                        continue

                    diff = make_diff(prev_content, new_content)
                    if not diff.strip():
                        continue

                    dur = self.rng.uniform(3, 25) * (1 + struggle * 0.3)
                    dur = max(2, min(dur, 90))

                    flushes.append(self._flush(
                        cpp_file, prev_content, new_content, func_name,
                        "timeout", dur,
                    ))
                    prev_content = new_content

        total_time = sum(f["window_duration"] for f in flushes)
        return flushes, total_time

    def _flush(self, file_path: str, old: str, new: str,
               symbol: str, trigger: str, duration: float) -> Dict:
        return {
            "file_path": file_path,
            "diffs": make_diff(old, new),
            "content": new,
            "active_symbol": symbol,
            "trigger": trigger,
            "window_duration": round(duration, 1),
        }


# ---------------------------------------------------------------------------
# Public API (same interface as before)
# ---------------------------------------------------------------------------

def generate_class_data(num_students: int = 20) -> Dict[str, Dict]:
    first_names = [
        "Alice", "Bob", "Charlie", "Diana", "Eve", "Frank", "Grace", "Hank",
        "Iris", "Jack", "Karen", "Liam", "Mina", "Noah", "Olivia", "Paul",
        "Quinn", "Ruby", "Sam", "Tina",
    ]
    last_names = [
        "Smith", "Johnson", "Brown", "Davis", "Miller", "Wilson", "Moore",
        "Taylor", "Anderson", "Thomas", "Jackson", "White", "Harris",
        "Martin", "Garcia",
    ]
    students = {}
    for i in range(num_students):
        first = first_names[i % len(first_names)]
        last = last_names[i % len(last_names)]
        utln = f"{first[0].lower()}{last[:3].lower()}{i:02d}"
        email = f"student{i + 1}@jumbuddy.test"
        gen = FlushSequenceGenerator(i, utln, seed=12345 + i)
        flush_list, total_time = gen.generate()
        students[utln] = {
            "utln": utln,
            "email": email,
            "password": "testpass123",
            "display_name": f"{first} {last}",
            "data_file": f"{utln}.json",
            "flushes": flush_list,
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
        files = set(f["file_path"] for f in student["flushes"])
        print(f"  Files: {sorted(files)}")
