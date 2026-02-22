import { useEffect, useState } from "react";
import { supabase } from "./api/supabase";
import type { Session } from "@supabase/supabase-js";
import {
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";

import averyStep1Diff from "./mock-diffs/avery-step1.diff?raw";
import averyStep2Diff from "./mock-diffs/avery-step2.diff?raw";
import averyStep3Diff from "./mock-diffs/avery-step3.diff?raw";
import averyStep4Diff from "./mock-diffs/avery-step4.diff?raw";
import noahStep1Diff from "./mock-diffs/noah-step1.diff?raw";
import noahStep2Diff from "./mock-diffs/noah-step2.diff?raw";
import noahStep3Diff from "./mock-diffs/noah-step3.diff?raw";
import noahStep4Diff from "./mock-diffs/noah-step4.diff?raw";
import miaStep1Diff from "./mock-diffs/mia-step1.diff?raw";
import miaStep2Diff from "./mock-diffs/mia-step2.diff?raw";
import miaStep3Diff from "./mock-diffs/mia-step3.diff?raw";
import miaStep4Diff from "./mock-diffs/mia-step4.diff?raw";
import liamStep1Diff from "./mock-diffs/liam-step1.diff?raw";
import liamStep2Diff from "./mock-diffs/liam-step2.diff?raw";
import liamStep3Diff from "./mock-diffs/liam-step3.diff?raw";
import liamStep4Diff from "./mock-diffs/liam-step4.diff?raw";
import zoeStep1Diff from "./mock-diffs/zoe-step1.diff?raw";
import zoeStep2Diff from "./mock-diffs/zoe-step2.diff?raw";
import zoeStep3Diff from "./mock-diffs/zoe-step3.diff?raw";
import zoeStep4Diff from "./mock-diffs/zoe-step4.diff?raw";
import owenStep1Diff from "./mock-diffs/owen-step1.diff?raw";
import owenStep2Diff from "./mock-diffs/owen-step2.diff?raw";
import owenStep3Diff from "./mock-diffs/owen-step3.diff?raw";
import owenStep4Diff from "./mock-diffs/owen-step4.diff?raw";

type Student = {
  id: string;
  name: string;
  email: string;
};

type ReplayStep = {
  id: string;
  title: string;
  diff: string;
  before: string;
  after: string;
  durationSeconds: number;
};

type ReplayFile = {
  filePath: string;
  baseInsight: string;
  steps: ReplayStep[];
};

type AssignmentStudentData = {
  stats: Array<{ label: string; value: string }>;
  aiOverview: string[];
};

type Assignment = {
  id: string;
  title: string;
  due: string;
  symbols: string[];
  classStats: Array<{ label: string; value: string }>;
  students: Record<string, AssignmentStudentData>;
  heatmap: Record<string, Record<string, number>>;
  narratives: Record<string, Record<string, string>>;
  replay: Record<string, ReplayFile[]>;
};

type Course = {
  id: string;
  title: string;
  role: string;
  term: string;
  assignments: Assignment[];
};

type ThemeMode = "light" | "dark";
type NavIconName = "dashboard" | "faq" | "about" | "account";

const students: Student[] = [
  { id: "s-001", name: "Avery Johnson", email: "avery.johnson@school.edu" },
  { id: "s-002", name: "Noah Patel", email: "noah.patel@school.edu" },
  { id: "s-003", name: "Mia Chen", email: "mia.chen@school.edu" },
  { id: "s-004", name: "Liam Garcia", email: "liam.garcia@school.edu" },
  { id: "s-005", name: "Zoe Kim", email: "zoe.kim@school.edu" },
  { id: "s-006", name: "Owen Brooks", email: "owen.brooks@school.edu" },
];

const replayTemplates: Record<string, ReplayFile[]> = {
  "s-001": [
    {
      filePath: "src/loops.ts",
      baseInsight:
        "Avery improved loop correctness quickly after identifying an off-by-one boundary issue.",
      steps: [
        {
          id: "avery-1",
          title: "Fix loop boundary",
          diff: averyStep1Diff,
          before:
            "export function countPassed(scores: number[]) {\n  let passed = 0;\n  for (let i = 0; i <= scores.length; i++) {\n    if (scores[i] >= 70) passed += 1;\n  }\n  return passed;\n}\n",
          after:
            "export function countPassed(scores: number[]) {\n  let passed = 0;\n  for (let i = 0; i < scores.length; i++) {\n    if (scores[i] >= 70) passed += 1;\n  }\n\n  return passed;\n}\n",
          durationSeconds: 6,
        },
        {
          id: "avery-2",
          title: "Introduce local score variable",
          diff: averyStep2Diff,
          before:
            "export function countPassed(scores: number[]) {\n  let passed = 0;\n  for (let i = 0; i < scores.length; i++) {\n    if (scores[i] >= 70) passed += 1;\n  }\n\n  return passed;\n}\n",
          after:
            "export function countPassed(scores: number[]) {\n  let passed = 0;\n  for (let i = 0; i < scores.length; i++) {\n    const score = scores[i];\n    if (score >= 70) passed += 1;\n  }\n\n  return passed;\n}\n",
          durationSeconds: 4,
        },
        {
          id: "avery-3",
          title: "Extract passing score constant",
          diff: averyStep3Diff,
          before:
            "export function countPassed(scores: number[]) {\n  let passed = 0;\n  for (let i = 0; i < scores.length; i++) {\n    const score = scores[i];\n    if (score >= 70) passed += 1;\n  }\n\n  return passed;\n}\n",
          after:
            "export function countPassed(scores: number[]) {\n  let passed = 0;\n  const PASSING_SCORE = 70;\n\n  for (let i = 0; i < scores.length; i++) {\n    const score = scores[i];\n    if (score >= PASSING_SCORE) passed += 1;\n  }\n\n  return passed;\n}\n",
          durationSeconds: 5,
        },
        {
          id: "avery-4",
          title: "Use for-of and add empty guard",
          diff: averyStep4Diff,
          before:
            "export function countPassed(scores: number[]) {\n  let passed = 0;\n  const PASSING_SCORE = 70;\n\n  for (let i = 0; i < scores.length; i++) {\n    const score = scores[i];\n    if (score >= PASSING_SCORE) passed += 1;\n  }\n\n  return passed;\n}\n",
          after:
            "export function countPassed(scores: number[]) {\n  let passed = 0;\n  const PASSING_SCORE = 70;\n\n  for (const score of scores) {\n    if (score >= PASSING_SCORE) passed += 1;\n  }\n\n  return scores.length === 0 ? 0 : passed;\n}\n",
          durationSeconds: 4,
        },
      ],
    },
  ],
  "s-002": [
    {
      filePath: "src/tree.ts",
      baseInsight:
        "Noah spent less time fixing logic and more time clarifying algorithm communication.",
      steps: [
        {
          id: "noah-1",
          title: "Add traversal explanation",
          diff: noahStep1Diff,
          before:
            "export function dfs(node: Node | null) {\n  if (!node) return [];\n  const left = dfs(node.left);\n  const right = dfs(node.right);\n  return [...left, node.value, ...right];\n}\n",
          after:
            "export function dfs(node: Node | null) {\n  if (!node) return [];\n  const left = dfs(node.left);\n  const right = dfs(node.right);\n\n  // keep root in between left and right traversal\n  return [...left, node.value, ...right];\n}\n",
          durationSeconds: 4,
        },
        {
          id: "noah-2",
          title: "Refine terminology",
          diff: noahStep2Diff,
          before:
            "export function dfs(node: Node | null) {\n  if (!node) return [];\n  const left = dfs(node.left);\n  const right = dfs(node.right);\n\n  // keep root in between left and right traversal\n  return [...left, node.value, ...right];\n}\n",
          after:
            "export function dfs(node: Node | null) {\n  if (!node) return [];\n  const left = dfs(node.left);\n  const right = dfs(node.right);\n\n  // in-order traversal: left, root, right\n  return [...left, node.value, ...right];\n}\n",
          durationSeconds: 3,
        },
        {
          id: "noah-3",
          title: "Clarify traversal wording",
          diff: noahStep3Diff,
          before:
            "export function dfs(node: Node | null) {\n  if (!node) return [];\n  const left = dfs(node.left);\n  const right = dfs(node.right);\n\n  // in-order traversal: left, root, right\n  return [...left, node.value, ...right];\n}\n",
          after:
            "export function dfs(node: Node | null) {\n  if (!node) return [];\n  const left = dfs(node.left);\n  const right = dfs(node.right);\n\n  // in-order traversal: left subtree, root, right subtree\n  return [...left, node.value, ...right];\n}\n",
          durationSeconds: 2,
        },
        {
          id: "noah-4",
          title: "Add spacing for readability",
          diff: noahStep4Diff,
          before:
            "export function dfs(node: Node | null) {\n  if (!node) return [];\n  const left = dfs(node.left);\n  const right = dfs(node.right);\n\n  // in-order traversal: left subtree, root, right subtree\n  return [...left, node.value, ...right];\n}\n",
          after:
            "export function dfs(node: Node | null) {\n  if (!node) return [];\n\n  const left = dfs(node.left);\n  const right = dfs(node.right);\n\n  // in-order traversal: left subtree, root, right subtree\n  return [...left, node.value, ...right];\n}\n",
          durationSeconds: 2,
        },
      ],
    },
  ],
  "s-003": [
    {
      filePath: "src/input.ts",
      baseInsight:
        "Mia improved robustness by tightening validation and normalizing edge-case whitespace.",
      steps: [
        {
          id: "mia-1",
          title: "Trim input first",
          diff: miaStep1Diff,
          before:
            "export function isValidName(name: string) {\n  return name.length > 0;\n}\n\nexport function formatName(name: string) {\n  return name.trim();\n}\n",
          after:
            "export function isValidName(name: string) {\n  const trimmed = name.trim();\n  return trimmed.length > 0;\n}\n\nexport function formatName(name: string) {\n  return name.trim();\n}\n",
          durationSeconds: 5,
        },
        {
          id: "mia-2",
          title: "Strengthen validation",
          diff: miaStep2Diff,
          before:
            "export function isValidName(name: string) {\n  const trimmed = name.trim();\n  return trimmed.length > 0;\n}\n\nexport function formatName(name: string) {\n  return name.trim();\n}\n",
          after:
            "export function isValidName(name: string) {\n  const trimmed = name.trim();\n  return trimmed.length >= 2;\n}\n\nexport function formatName(name: string) {\n  return name.trim().replace(/\\s+/g, \" \");\n}\n",
          durationSeconds: 5,
        },
        {
          id: "mia-3",
          title: "Add upper bound to validation",
          diff: miaStep3Diff,
          before:
            "export function isValidName(name: string) {\n  const trimmed = name.trim();\n  return trimmed.length >= 2;\n}\n\nexport function formatName(name: string) {\n  return name.trim().replace(/\\s+/g, \" \");\n}\n",
          after:
            "export function isValidName(name: string) {\n  const trimmed = name.trim();\n  return trimmed.length >= 2 && trimmed.length <= 40;\n}\n\nexport function formatName(name: string) {\n  return name.trim().replace(/\\s+/g, \" \");\n}\n",
          durationSeconds: 4,
        },
        {
          id: "mia-4",
          title: "Extract trimmed variable in formatter",
          diff: miaStep4Diff,
          before:
            "export function isValidName(name: string) {\n  const trimmed = name.trim();\n  return trimmed.length >= 2 && trimmed.length <= 40;\n}\n\nexport function formatName(name: string) {\n  return name.trim().replace(/\\s+/g, \" \");\n}\n",
          after:
            "export function isValidName(name: string) {\n  const trimmed = name.trim();\n  return trimmed.length >= 2 && trimmed.length <= 40;\n}\n\nexport function formatName(name: string) {\n  const trimmed = name.trim().replace(/\\s+/g, \" \");\n  return trimmed;\n}\n",
          durationSeconds: 4,
        },
      ],
    },
  ],
  "s-004": [
    {
      filePath: "src/copy_constructor.cpp",
      baseInsight:
        "Liam struggled most with copy-constructor semantics and ownership safety.",
      steps: [
        {
          id: "liam-1",
          title: "Replace default copy constructor",
          diff: liamStep1Diff,
          before: "Widget::Widget(const Widget& other) = default;\n",
          after:
            "Widget::Widget(const Widget& other) {\n  size = other.size;\n  data = nullptr;\n}\n",
          durationSeconds: 4,
        },
        {
          id: "liam-2",
          title: "Allocate and copy elements",
          diff: liamStep2Diff,
          before:
            "Widget::Widget(const Widget& other) {\n  size = other.size;\n  data = nullptr;\n}\n",
          after:
            "Widget::Widget(const Widget& other) {\n  size = other.size;\n  data = new int[size];\n  for (int i = 0; i < size; i++) {\n    data[i] = other.data[i];\n  }\n}\n",
          durationSeconds: 6,
        },
        {
          id: "liam-3",
          title: "Handle zero-size safely",
          diff: liamStep3Diff,
          before:
            "Widget::Widget(const Widget& other) {\n  size = other.size;\n  data = new int[size];\n  for (int i = 0; i < size; i++) {\n    data[i] = other.data[i];\n  }\n}\n",
          after:
            "Widget::Widget(const Widget& other) {\n  size = other.size;\n  if (size == 0) {\n    data = nullptr;\n  } else {\n    data = new int[size];\n    for (int i = 0; i < size; i++) data[i] = other.data[i];\n  }\n}\n",
          durationSeconds: 6,
        },
        {
          id: "liam-4",
          title: "Improve constructor readability",
          diff: liamStep4Diff,
          before:
            "Widget::Widget(const Widget& other) {\n  size = other.size;\n  if (size == 0) {\n    data = nullptr;\n  } else {\n    data = new int[size];\n    for (int i = 0; i < size; i++) data[i] = other.data[i];\n  }\n}\n",
          after:
            "Widget::Widget(const Widget& other) {\n  size = other.size;\n\n  if (size == 0) {\n    data = nullptr;\n  } else {\n    data = new int[size];\n    for (int i = 0; i < size; i++) data[i] = other.data[i];\n  }\n}\n",
          durationSeconds: 3,
        },
      ],
    },
  ],
  "s-005": [
    {
      filePath: "src/schedule.ts",
      baseInsight:
        "Zoe iterated quickly on schedule filtering and ordering, with most effort spent on sorting behavior.",
      steps: [
        {
          id: "zoe-1",
          title: "Add spacing and setup",
          diff: zoeStep1Diff,
          before:
            "export function buildSchedule(events: Event[]) {\n  const out: Event[] = [];\n  for (const e of events) {\n    out.push(e);\n  }\n  return out;\n}\n",
          after:
            "export function buildSchedule(events: Event[]) {\n  const out: Event[] = [];\n\n  for (const e of events) {\n    out.push(e);\n  }\n  return out;\n}\n",
          durationSeconds: 2,
        },
        {
          id: "zoe-2",
          title: "Filter disabled events",
          diff: zoeStep2Diff,
          before:
            "export function buildSchedule(events: Event[]) {\n  const out: Event[] = [];\n\n  for (const e of events) {\n    out.push(e);\n  }\n  return out;\n}\n",
          after:
            "export function buildSchedule(events: Event[]) {\n  const out: Event[] = [];\n\n  for (const e of events) {\n    if (e.enabled) out.push(e);\n  }\n\n  return out;\n}\n",
          durationSeconds: 5,
        },
        {
          id: "zoe-3",
          title: "Sort by start time",
          diff: zoeStep3Diff,
          before:
            "export function buildSchedule(events: Event[]) {\n  const out: Event[] = [];\n\n  for (const e of events) {\n    if (e.enabled) out.push(e);\n  }\n\n  return out;\n}\n",
          after:
            "export function buildSchedule(events: Event[]) {\n  const out: Event[] = [];\n\n  for (const e of events) {\n    if (e.enabled) out.push(e);\n  }\n  out.sort((a, b) => a.start - b.start);\n  return out;\n}\n",
          durationSeconds: 6,
        },
        {
          id: "zoe-4",
          title: "Polish formatting",
          diff: zoeStep4Diff,
          before:
            "export function buildSchedule(events: Event[]) {\n  const out: Event[] = [];\n\n  for (const e of events) {\n    if (e.enabled) out.push(e);\n  }\n  out.sort((a, b) => a.start - b.start);\n  return out;\n}\n",
          after:
            "export function buildSchedule(events: Event[]) {\n  const out: Event[] = [];\n\n  for (const e of events) {\n    if (e.enabled) out.push(e);\n  }\n\n  out.sort((a, b) => a.start - b.start);\n  return out;\n}\n",
          durationSeconds: 2,
        },
      ],
    },
  ],
  "s-006": [
    {
      filePath: "src/hints.ts",
      baseInsight:
        "Owen showed steady progress in output formatting, especially around list rendering and clipping.",
      steps: [
        {
          id: "owen-1",
          title: "Handle empty hints",
          diff: owenStep1Diff,
          before:
            "export function renderHints(hints: string[]) {\n  return hints.join(\"\\n\");\n}\n",
          after:
            "export function renderHints(hints: string[]) {\n  if (hints.length === 0) return \"\";\n  return hints.join(\"\\n\");\n}\n",
          durationSeconds: 3,
        },
        {
          id: "owen-2",
          title: "Filter blank hints",
          diff: owenStep2Diff,
          before:
            "export function renderHints(hints: string[]) {\n  if (hints.length === 0) return \"\";\n  return hints.join(\"\\n\");\n}\n",
          after:
            "export function renderHints(hints: string[]) {\n  if (hints.length === 0) return \"\";\n  const cleaned = hints.filter(Boolean);\n  return cleaned.join(\"\\n\");\n}\n",
          durationSeconds: 4,
        },
        {
          id: "owen-3",
          title: "Add numbering",
          diff: owenStep3Diff,
          before:
            "export function renderHints(hints: string[]) {\n  if (hints.length === 0) return \"\";\n  const cleaned = hints.filter(Boolean);\n  return cleaned.join(\"\\n\");\n}\n",
          after:
            "export function renderHints(hints: string[]) {\n  if (hints.length === 0) return \"\";\n  const cleaned = hints.filter(Boolean);\n  const numbered = cleaned.map((hint, idx) => `${idx + 1}. ${hint}`);\n  return numbered.join(\"\\n\");\n}\n",
          durationSeconds: 5,
        },
        {
          id: "owen-4",
          title: "Limit preview length",
          diff: owenStep4Diff,
          before:
            "export function renderHints(hints: string[]) {\n  if (hints.length === 0) return \"\";\n  const cleaned = hints.filter(Boolean);\n  const numbered = cleaned.map((hint, idx) => `${idx + 1}. ${hint}`);\n  return numbered.join(\"\\n\");\n}\n",
          after:
            "export function renderHints(hints: string[]) {\n  if (hints.length === 0) return \"\";\n  const cleaned = hints.filter(Boolean);\n  const numbered = cleaned.map((hint, idx) => `${idx + 1}. ${hint}`);\n  const preview = numbered.slice(0, 20);\n  return preview.join(\"\\n\");\n}\n",
          durationSeconds: 5,
        },
      ],
    },
  ],
};

const baseAssignments: Assignment[] = [
  {
    id: "a1-debugging-foundations",
    title: "Debugging Foundations",
    due: "Feb 28, 2026",
    symbols: ["countPassed", "parseEvents", "scoreSubmission", "copy constructor"],
    classStats: [
      { label: "Class Average Score", value: "76%" },
      { label: "Average Completion Rate", value: "84%" },
      { label: "Avg Time on Assignment", value: "3.8 hrs" },
      { label: "Students Needing Support", value: "7/42" },
    ],
    students: {
      "s-001": {
        stats: [
          { label: "Assignment Score", value: "81%" },
          { label: "Time on Assignment", value: "4.2 hrs" },
          { label: "Compile Errors Resolved", value: "9" },
          { label: "Late Submissions", value: "0" },
        ],
        aiOverview: [
          "Avery improved quickly after identifying loop boundary issues.",
          "Main struggle area was maintaining confidence when first fix did not pass all tests.",
        ],
      },
      "s-002": {
        stats: [
          { label: "Assignment Score", value: "88%" },
          { label: "Time on Assignment", value: "3.6 hrs" },
          { label: "Compile Errors Resolved", value: "4" },
          { label: "Late Submissions", value: "0" },
        ],
        aiOverview: [
          "Noah was consistent and mostly focused on explanatory clarity.",
          "Could improve by planning rationale comments before implementation.",
        ],
      },
      "s-003": {
        stats: [
          { label: "Assignment Score", value: "73%" },
          { label: "Time on Assignment", value: "5.0 hrs" },
          { label: "Compile Errors Resolved", value: "11" },
          { label: "Late Submissions", value: "1" },
        ],
        aiOverview: [
          "Mia's strongest gains were around input-validation edge cases.",
          "Still needs support in decomposing tasks before coding.",
        ],
      },
      "s-004": {
        stats: [
          { label: "Assignment Score", value: "67%" },
          { label: "Time on Assignment", value: "5.4 hrs" },
          { label: "Compile Errors Resolved", value: "15" },
          { label: "Late Submissions", value: "1" },
        ],
        aiOverview: [
          "Liam's major blocker was copy semantics and memory ownership.",
          "Needs targeted review on constructor/operator rules and object lifecycle.",
        ],
      },
      "s-005": {
        stats: [
          { label: "Assignment Score", value: "86%" },
          { label: "Time on Assignment", value: "3.9 hrs" },
          { label: "Compile Errors Resolved", value: "5" },
          { label: "Late Submissions", value: "0" },
        ],
        aiOverview: [
          "Zoe moved quickly from basic filtering to sorted output behavior.",
          "Main challenge was preserving stable ordering while adding constraints.",
        ],
      },
      "s-006": {
        stats: [
          { label: "Assignment Score", value: "78%" },
          { label: "Time on Assignment", value: "4.1 hrs" },
          { label: "Compile Errors Resolved", value: "8" },
          { label: "Late Submissions", value: "0" },
        ],
        aiOverview: [
          "Owen improved output formatting incrementally with smaller safe edits.",
          "Still spends extra time on deciding when and where to clip output.",
        ],
      },
    },
    heatmap: {
      "s-001": { countPassed: 48, parseEvents: 30, scoreSubmission: 35, "copy constructor": 65 },
      "s-002": { countPassed: 25, parseEvents: 20, scoreSubmission: 31, "copy constructor": 58 },
      "s-003": { countPassed: 57, parseEvents: 61, scoreSubmission: 55, "copy constructor": 72 },
      "s-004": { countPassed: 69, parseEvents: 67, scoreSubmission: 63, "copy constructor": 91 },
      "s-005": { countPassed: 29, parseEvents: 33, scoreSubmission: 37, "copy constructor": 52 },
      "s-006": { countPassed: 54, parseEvents: 47, scoreSubmission: 44, "copy constructor": 69 },
    },
    narratives: {
      "s-001": {
        countPassed: "Avery initially used <= in loop termination and fixed it after failing edge tests.",
        parseEvents: "Minimal struggle; resolved quickly after adding a null guard.",
        scoreSubmission: "Needed one retry to align rubric scoring branch conditions.",
        "copy constructor": "Some confusion around why shallow copy breaks mutable arrays.",
      },
      "s-002": {
        countPassed: "Noah implemented correctly with minor naming cleanup.",
        parseEvents: "Smooth completion with no major issue patterns.",
        scoreSubmission: "Small adjustment to match expected boundary scoring.",
        "copy constructor": "Understood conceptually but lacked confidence in ownership explanation.",
      },
      "s-003": {
        countPassed: "Repeated boundary errors before stabilizing with focused tests.",
        parseEvents: "Needed support translating prompt language into control flow.",
        scoreSubmission: "Several branch condition reversals before final correction.",
        "copy constructor": "Struggled with deep copy mechanics and pointer lifecycle assumptions.",
      },
      "s-004": {
        countPassed: "Slow progress due to uncertainty in for-loop bounds.",
        parseEvents: "Multiple retries around symbol parsing and default cases.",
        scoreSubmission: "Difficulty mapping rubric states to branches.",
        "copy constructor": "Primary blocker: attempted default copy and caused aliasing bugs.",
      },
      "s-005": {
        countPassed: "Low struggle after quickly validating boundary tests.",
        parseEvents: "Minor friction around preserving input order while filtering.",
        scoreSubmission: "Needed one pass to align edge threshold handling.",
        "copy constructor": "Understood deep copy concept but needed syntax reminders.",
      },
      "s-006": {
        countPassed: "Moderate struggle with early-return placement.",
        parseEvents: "Stabilized after adding small checkpoint logs.",
        scoreSubmission: "Occasional branch order confusion resolved with test cases.",
        "copy constructor": "Improved after mapping object ownership explicitly.",
      },
    },
    replay: replayTemplates,
  },
  {
    id: "a2-function-design",
    title: "Function Design and Testing",
    due: "Mar 10, 2026",
    symbols: ["validateInput", "buildSchedule", "renderHints"],
    classStats: [
      { label: "Class Average Score", value: "79%" },
      { label: "Average Completion Rate", value: "87%" },
      { label: "Avg Time on Assignment", value: "3.2 hrs" },
      { label: "Students Needing Support", value: "5/42" },
    ],
    students: {
      "s-001": {
        stats: [
          { label: "Assignment Score", value: "84%" },
          { label: "Time on Assignment", value: "3.4 hrs" },
          { label: "Compile Errors Resolved", value: "6" },
          { label: "Late Submissions", value: "0" },
        ],
        aiOverview: [
          "Strong on structure; should include more boundary test notes.",
          "Had mild difficulty with validating nested optional fields.",
        ],
      },
      "s-002": {
        stats: [
          { label: "Assignment Score", value: "90%" },
          { label: "Time on Assignment", value: "2.8 hrs" },
          { label: "Compile Errors Resolved", value: "2" },
          { label: "Late Submissions", value: "0" },
        ],
        aiOverview: [
          "Very efficient progression and clear decomposition.",
          "Opportunity: communicate tradeoffs in helper-function naming.",
        ],
      },
      "s-003": {
        stats: [
          { label: "Assignment Score", value: "74%" },
          { label: "Time on Assignment", value: "4.6 hrs" },
          { label: "Compile Errors Resolved", value: "10" },
          { label: "Late Submissions", value: "0" },
        ],
        aiOverview: [
          "Needed significant retries for validation flow.",
          "Improved after writing smaller helper functions.",
        ],
      },
      "s-004": {
        stats: [
          { label: "Assignment Score", value: "70%" },
          { label: "Time on Assignment", value: "4.9 hrs" },
          { label: "Compile Errors Resolved", value: "12" },
          { label: "Late Submissions", value: "1" },
        ],
        aiOverview: [
          "Most time spent debugging composed function interfaces.",
          "Needs reinforcement on incremental test-first strategy.",
        ],
      },
      "s-005": {
        stats: [
          { label: "Assignment Score", value: "89%" },
          { label: "Time on Assignment", value: "3.1 hrs" },
          { label: "Compile Errors Resolved", value: "3" },
          { label: "Late Submissions", value: "0" },
        ],
        aiOverview: [
          "Zoe handled function composition well and iterated mostly on polish.",
          "Could improve by documenting edge behavior before implementation.",
        ],
      },
      "s-006": {
        stats: [
          { label: "Assignment Score", value: "76%" },
          { label: "Time on Assignment", value: "4.2 hrs" },
          { label: "Compile Errors Resolved", value: "9" },
          { label: "Late Submissions", value: "0" },
        ],
        aiOverview: [
          "Owen improved significantly in render function structure over time.",
          "Needs additional practice with validation guard ordering.",
        ],
      },
    },
    heatmap: {
      "s-001": { validateInput: 45, buildSchedule: 38, renderHints: 30 },
      "s-002": { validateInput: 22, buildSchedule: 26, renderHints: 24 },
      "s-003": { validateInput: 71, buildSchedule: 62, renderHints: 58 },
      "s-004": { validateInput: 77, buildSchedule: 74, renderHints: 66 },
      "s-005": { validateInput: 31, buildSchedule: 36, renderHints: 33 },
      "s-006": { validateInput: 59, buildSchedule: 52, renderHints: 63 },
    },
    narratives: {
      "s-001": {
        validateInput: "Avery fixed nested empty-input paths after adding targeted tests.",
        buildSchedule: "Moderate effort balancing readability and special-case branching.",
        renderHints: "Low struggle; polished output quickly.",
      },
      "s-002": {
        validateInput: "Minimal friction and clean decomposition.",
        buildSchedule: "One short revision to handle day rollover edge case.",
        renderHints: "Completed quickly with precise formatting.",
      },
      "s-003": {
        validateInput: "Frequent retries due to missed null/undefined combinations.",
        buildSchedule: "Struggled with helper boundaries and duplicate logic.",
        renderHints: "Needed support on deterministic ordering in output.",
      },
      "s-004": {
        validateInput: "Primary blocker with guard ordering and early returns.",
        buildSchedule: "Difficulties with state mutation across helper calls.",
        renderHints: "Several formatting regressions before final cleanup.",
      },
      "s-005": {
        validateInput: "Low struggle once optional-field checks were ordered correctly.",
        buildSchedule: "Moderate effort around sorting and preserving enabled events.",
        renderHints: "Mostly polish passes for consistent output style.",
      },
      "s-006": {
        validateInput: "Needed multiple attempts to settle on stable guard sequence.",
        buildSchedule: "Steady improvement after decomposing into helper sections.",
        renderHints: "Main issue was output clipping and numbering consistency.",
      },
    },
    replay: replayTemplates,
  },
];

const cs50Assignments: Assignment[] = baseAssignments.map((assignment) => ({ ...assignment }));

const cs210Assignments: Assignment[] = [
  {
    ...baseAssignments[0],
    id: "a1-pointer-memory-lab",
    title: "Pointer Memory Lab",
    due: "Mar 06, 2026",
  },
  {
    ...baseAssignments[1],
    id: "a2-tree-traversal-analysis",
    title: "Tree Traversal Analysis",
    due: "Mar 20, 2026",
  },
];

const engrAssignments: Assignment[] = [
  {
    ...baseAssignments[0],
    id: "a1-systems-debug-practicum",
    title: "Systems Debug Practicum",
    due: "Mar 03, 2026",
  },
  {
    ...baseAssignments[1],
    id: "a2-interface-design-lab",
    title: "Interface Design Lab",
    due: "Mar 17, 2026",
  },
];

const courses: Course[] = [
  {
    id: "cs50-spring26",
    title: "CS50: Intro to Computer Science",
    role: "Instructor",
    term: "Spring 2026",
    assignments: cs50Assignments,
  },
  {
    id: "cs210-spring26",
    title: "CS210: Data Structures",
    role: "TA",
    term: "Spring 2026",
    assignments: cs210Assignments,
  },
  {
    id: "engr101-spring26",
    title: "ENGR101: Computing for Engineers",
    role: "Instructor",
    term: "Spring 2026",
    assignments: engrAssignments,
  },
];

const appShellStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "var(--bg-app)",
  color: "var(--text-primary)",
};

function scoreColor(score: number) {
  if (score >= 80) return "#991b1b";
  if (score >= 65) return "#dc2626";
  if (score >= 50) return "#f97316";
  if (score >= 35) return "#facc15";
  return "#22c55e";
}

function sharedPrefixLength(a: string, b: string) {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i += 1;
  return i;
}

function findCourse(courseId?: string) {
  return courses.find((course) => course.id === courseId);
}

function findAssignment(course: Course | undefined, assignmentId?: string) {
  return course?.assignments.find((assignment) => assignment.id === assignmentId);
}

function topStruggleSummary(assignment: Assignment) {
  let bestSymbol = assignment.symbols[0] ?? "";
  let bestPercent = -1;

  for (const symbol of assignment.symbols) {
    const percent =
      (students.filter((student) => (assignment.heatmap[student.id]?.[symbol] ?? 0) >= 60).length /
        students.length) *
      100;
    if (percent > bestPercent) {
      bestPercent = percent;
      bestSymbol = symbol;
    }
  }

  return `${bestSymbol} was a problem for ${Math.round(bestPercent)}% of the class.`;
}

function Navbar({
  onSignOut,
  theme,
  onToggleTheme,
  collapsed,
  onToggleCollapsed,
}: {
  onSignOut: () => Promise<void>;
  theme: ThemeMode;
  onToggleTheme: () => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  const location = useLocation();
  const items = [
    { label: "Dashboard", to: "/", icon: "dashboard" as NavIconName },
    { label: "FAQ / How To Use", to: "/faq", icon: "faq" as NavIconName },
    { label: "About Our Product", to: "/about", icon: "about" as NavIconName },
    { label: "Account", to: "/account", icon: "account" as NavIconName },
  ];

  function renderNavIcon(icon: NavIconName) {
    if (icon === "dashboard") {
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M3 11.5 12 4l9 7.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M6 10.5V20h12v-9.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    }
    if (icon === "faq") {
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
          <path d="M9.8 9.2a2.4 2.4 0 1 1 4.2 1.6c-.8.8-1.7 1.2-1.7 2.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="12" cy="16.8" r="1" fill="currentColor" />
        </svg>
      );
    }
    if (icon === "about") {
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
          <path d="M12 10.6V16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="12" cy="7.5" r="1" fill="currentColor" />
        </svg>
      );
    }
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="8.2" r="3.2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M5 19.2c1.7-2.8 4-4.2 7-4.2s5.3 1.4 7 4.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <aside className={`sidebar ${collapsed ? "sidebar--collapsed" : ""}`}>
      <div style={{ padding: "1rem 0.9rem 0.6rem", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
        <div style={{ fontWeight: 800, letterSpacing: 0.5, fontSize: 30, lineHeight: 1.1 }}>
          <span className="brand-label">JumBuddy</span>
          <span className="brand-mini">JB</span>
        </div>
      </div>
      <nav className="sidebar-nav" style={{ display: "grid", gap: "0.25rem", padding: "0.8rem 0.6rem", alignContent: "start" }}>
        {items.map((item) => {
          const active = location.pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`nav-link ${active ? "nav-link--active" : ""}`}
              data-tooltip={item.label}
              aria-label={collapsed ? item.label : undefined}
            >
              <span className="nav-icon">{renderNavIcon(item.icon)}</span>
              <span className="nav-label">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <button
        className="btn btn-secondary sidebar-toggle-rail"
        onClick={onToggleCollapsed}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? "»" : "«"}
      </button>
      <div className="sidebar-footer" style={{ marginTop: "auto", display: "flex", gap: "0.5rem", padding: "0.8rem", borderTop: "1px solid var(--border)" }}>
        <button
          className="btn btn-secondary theme-toggle"
          onClick={onToggleTheme}
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          style={{ display: "grid", placeItems: "center" }}
        >
          {theme === "dark" ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 4V2M12 22v-2M4 12H2m20 0h-2M6.34 6.34 4.93 4.93m14.14 14.14-1.41-1.41M6.34 17.66l-1.41 1.41m14.14-14.14-1.41 1.41M12 18a6 6 0 1 1 0-12 6 6 0 0 1 0 12Z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>
        <button className="btn btn-secondary signout-btn" onClick={() => void onSignOut()} style={{ flex: 1, padding: "0.45rem 0.75rem" }}>
          <span className="signout-label">Sign Out</span>
          <span className="signout-mini">⎋</span>
        </button>
      </div>
    </aside>
  );
}

function LoginPage({ onLogin }: { onLogin: (email: string, password: string) => Promise<string | null> }) {
  const [email, setEmail] = useState("professor@jumbuddy.test");
  const [password, setPassword] = useState("testpass123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const nextError = await onLogin(email, password);
    if (nextError) {
      setError(nextError);
    } else {
      navigate("/", { replace: true });
    }
    setLoading(false);
  }

  return (
    <div
      style={{
        height: "100vh",
        display: "grid",
        gridTemplateColumns: "minmax(320px, 420px) 1fr",
        background: "var(--bg-page)",
      }}
    >
      <section
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "2.5rem 2.5rem",
          background: "var(--surface)",
          borderRight: "1px solid var(--border)",
        }}
      >
        <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: 0.5, lineHeight: 1, marginBottom: "1.5rem" }}>JumBuddy</div>
        <form onSubmit={submit}>
          <label style={{ display: "block", marginBottom: "0.35rem", fontWeight: 600 }}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: "100%", padding: "0.7rem", borderRadius: 8, border: "1px solid var(--border)", marginBottom: "0.8rem" }}
          />
          <label style={{ display: "block", marginBottom: "0.35rem", fontWeight: 600 }}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: "100%", padding: "0.7rem", borderRadius: 8, border: "1px solid var(--border)", marginBottom: "1rem" }}
          />
          {error && <p style={{ color: "var(--danger)", marginTop: 0 }}>{error}</p>}
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: "100%", padding: "0.75rem", border: "none", borderRadius: 8, fontWeight: 700 }}
          >
            {loading ? "Signing In..." : "Sign In"}
          </button>
        </form>
      </section>

      <div
        style={{
          backgroundImage: "url(https://images.unsplash.com/photo-1534665482403-a909d0d97c67?fm=jpg&q=60&w=3000&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8bWFuJTIwY29kaW5nfGVufDB8fDB8fHww)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
    </div>
  );
}

function DashboardPage() {
  return (
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: "1rem 1.1rem 2rem" }}>
      <h1 style={{ marginBottom: "0.3rem" }}>Dashboard</h1>
      <p style={{ marginTop: 0, color: "var(--text-muted)" }}>Select a course to inspect assignments and student performance.</p>

      <section className="surface-card" style={{ border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", background: "var(--surface)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ background: "var(--surface-muted)", textAlign: "left" }}>
            <tr>
              <th style={{ padding: "0.75rem", borderBottom: "1px solid var(--border)" }}>Course</th>
              <th style={{ padding: "0.75rem", borderBottom: "1px solid var(--border)" }}>Role</th>
              <th style={{ padding: "0.75rem", borderBottom: "1px solid var(--border)" }}>Term</th>
              <th style={{ padding: "0.75rem", borderBottom: "1px solid var(--border)" }}>Open</th>
            </tr>
          </thead>
          <tbody>
            {courses.map((course) => (
              <tr key={course.id}>
                <td style={{ padding: "0.75rem", borderBottom: "1px solid var(--border-soft)", fontWeight: 600 }}>{course.title}</td>
                <td style={{ padding: "0.75rem", borderBottom: "1px solid var(--border-soft)" }}>{course.role}</td>
                <td style={{ padding: "0.75rem", borderBottom: "1px solid var(--border-soft)" }}>{course.term}</td>
                <td style={{ padding: "0.75rem", borderBottom: "1px solid var(--border-soft)" }}>
                  <Link to={`/${course.id}`} className="text-link" style={{ color: "var(--accent)", fontWeight: 700, textDecoration: "none" }}>
                    View Course
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}

function CoursePage() {
  const { courseId } = useParams();
  const course = findCourse(courseId);
  if (!course) return <NotFoundPage />;

  return (
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: "1rem 1.1rem 2rem" }}>
      <h1 style={{ marginBottom: "0.3rem" }}>{course.title}</h1>
      <p style={{ marginTop: 0, color: "var(--text-muted)" }}>
        {course.role} • {course.term}
      </p>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "0.9rem" }}>
        {course.assignments.map((assignment) => (
          <article className="surface-card" key={assignment.id} style={{ border: "1px solid var(--border)", borderRadius: 12, padding: "1rem", background: "var(--surface)" }}>
            <h2 style={{ marginTop: 0, marginBottom: "0.35rem", fontSize: 19 }}>{assignment.title}</h2>
            <p style={{ margin: "0 0 0.8rem", color: "var(--text-muted)" }}>Due: {assignment.due}</p>
            <Link to={`/${course.id}/${assignment.id}`} className="text-link" style={{ color: "var(--accent)", fontWeight: 700, textDecoration: "none" }}>
              Open Assignment
            </Link>
          </article>
        ))}
      </section>
    </main>
  );
}

function AssignmentPage() {
  const { courseId, assignment: assignmentId } = useParams();
  const course = findCourse(courseId);
  const assignment = findAssignment(course, assignmentId);

  const [selectedStudentId, setSelectedStudentId] = useState(students[0].id);
  const [selectedCell, setSelectedCell] = useState<{ studentId: string; symbol: string } | null>(null);

  useEffect(() => {
    setSelectedStudentId(students[0].id);
    setSelectedCell(null);
  }, [courseId, assignmentId]);

  if (!course || !assignment) return <NotFoundPage />;

  const selectedStudent = students.find((student) => student.id === selectedStudentId) ?? students[0];
  const selectedStudentAssignmentData = assignment.students[selectedStudentId];

  const narrative =
    selectedCell && assignment.narratives[selectedCell.studentId]
      ? assignment.narratives[selectedCell.studentId][selectedCell.symbol]
      : "Click any heatmap cell to drill into that student's narrative for a specific function or symbol.";

  const summary = topStruggleSummary(assignment);

  return (
    <main style={{ maxWidth: 1240, margin: "0 auto", padding: "1rem 1.1rem 2rem" }}>
      <h1 style={{ marginBottom: "0.3rem" }}>{assignment.title}</h1>
      <p style={{ marginTop: 0, color: "var(--text-muted)" }}>
        {course.title} • Due {assignment.due}
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "260px minmax(380px, 1fr)", gap: "1rem" }}>
        <aside style={{ border: "1px solid var(--border)", borderRadius: 12, background: "var(--surface)", padding: "0.8rem" }}>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>Students</h2>
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {students.map((student) => (
              <li key={student.id} style={{ marginBottom: "0.55rem" }}>
                <div style={{ border: "1px solid var(--border-soft)", borderRadius: 8, padding: "0.45rem" }}>
                  <button
                    onClick={() => setSelectedStudentId(student.id)}
                    className="student-button"
                    style={{
                      width: "100%",
                      textAlign: "left",
                      border: "none",
                      background: selectedStudentId === student.id ? "var(--accent-soft)" : "transparent",
                      padding: "0.35rem",
                      borderRadius: 6,
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ fontWeight: 700 }}>{student.name}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{student.email}</div>
                  </button>
                  <Link
                    to={`/${course.id}/${assignment.id}/${student.id}`}
                    className="text-link"
                    style={{ display: "inline-block", marginTop: "0.35rem", fontSize: 13, color: "var(--accent)", textDecoration: "none", fontWeight: 700 }}
                  >
                    Details
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </aside>

        <section style={{ display: "grid", gap: "1rem" }}>
          <section style={{ border: "1px solid var(--border)", borderRadius: 12, background: "var(--surface)", padding: "1rem" }}>
            <h2 style={{ marginTop: 0, marginBottom: "0.3rem" }}>Student Assignment Stats: {selectedStudent.name}</h2>
            <div style={{ display: "grid", gridTemplateColumns: "minmax(240px, 1fr) minmax(260px, 1.1fr)", gap: "1rem" }}>
              <div>
                <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                  {selectedStudentAssignmentData.stats.map((item) => (
                    <li key={item.label} style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem 0", borderBottom: "1px solid var(--border-soft)" }}>
                      <span>{item.label}</span>
                      <strong>{item.value}</strong>
                    </li>
                  ))}
                </ul>
              </div>
              <div style={{ border: "1px solid var(--border-soft)", borderRadius: 8, padding: "0.75rem", background: "var(--surface-muted)" }}>
                <h3 style={{ marginTop: 0, marginBottom: "0.5rem", fontSize: 16 }}>AI Student Overview</h3>
                {selectedStudentAssignmentData.aiOverview.map((line) => (
                  <p key={line} style={{ margin: "0 0 0.45rem", lineHeight: 1.35 }}>
                    {line}
                  </p>
                ))}
                <p style={{ marginBottom: 0, color: "var(--text-muted)", fontSize: 13 }}>Placeholder for model output integration.</p>
              </div>
            </div>
          </section>

          <section style={{ border: "1px solid var(--border)", borderRadius: 12, background: "var(--surface)", padding: "1rem" }}>
            <h2 style={{ marginTop: 0, marginBottom: "0.35rem" }}>Overall Class Statistics</h2>
            <ul style={{ listStyle: "none", margin: "0 0 0.8rem", padding: 0 }}>
              {assignment.classStats.map((item) => (
                <li key={item.label} style={{ display: "flex", justifyContent: "space-between", padding: "0.45rem 0", borderBottom: "1px solid var(--border-soft)" }}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </li>
              ))}
            </ul>

            <h3 style={{ marginTop: "0.8rem", marginBottom: "0.4rem" }}>Function/Symbol Struggle Heatmap</h3>
            <p style={{ marginTop: 0, color: "var(--text-muted)" }}>{summary}</p>

            <div style={{ overflowX: "auto", border: "1px solid var(--border-soft)", borderRadius: 8 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
                <thead style={{ background: "var(--surface-muted)" }}>
                  <tr>
                    <th style={{ textAlign: "left", padding: "0.5rem", borderBottom: "1px solid var(--border-soft)" }}>Student</th>
                    {assignment.symbols.map((symbol) => (
                      <th key={symbol} style={{ textAlign: "left", padding: "0.5rem", borderBottom: "1px solid var(--border-soft)", fontWeight: 600 }}>
                        {symbol}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student.id}>
                      <td style={{ padding: "0.45rem 0.5rem", borderBottom: "1px solid var(--border-soft)", fontWeight: 600 }}>{student.name}</td>
                      {assignment.symbols.map((symbol) => {
                        const score = assignment.heatmap[student.id]?.[symbol] ?? 0;
                        const active = selectedCell?.studentId === student.id && selectedCell.symbol === symbol;
                        return (
                          <td key={`${student.id}-${symbol}`} style={{ padding: "0.3rem 0.45rem", borderBottom: "1px solid var(--border-soft)" }}>
                            <button
                              onClick={() => setSelectedCell({ studentId: student.id, symbol })}
                              style={{
                                width: "100%",
                                border: active ? "2px solid var(--accent)" : "1px solid var(--border)",
                                borderRadius: 6,
                                background: scoreColor(score),
                                color: score >= 65 ? "#fff" : "var(--text-primary)",
                                padding: "0.35rem",
                                fontWeight: 700,
                                cursor: "pointer",
                                transition: "filter 140ms ease",
                              }}
                            >
                              {score}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: "0.8rem", border: "1px solid var(--border-soft)", borderRadius: 8, background: "var(--surface-muted)", padding: "0.75rem" }}>
              <h4 style={{ marginTop: 0, marginBottom: "0.35rem" }}>Narrative Drilldown</h4>
              <p style={{ margin: 0, lineHeight: 1.4 }}>{narrative}</p>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}

function ReplayPage() {
  const { courseId, assignment: assignmentId, student: studentId } = useParams();
  const course = findCourse(courseId);
  const assignment = findAssignment(course, assignmentId);
  const student = students.find((item) => item.id === studentId);

  const replayFiles = assignment?.replay[studentId ?? ""] ?? [];
  const [selectedFilePath, setSelectedFilePath] = useState(replayFiles[0]?.filePath ?? "");
  const [stepIndex, setStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [displayCode, setDisplayCode] = useState("");
  const [animationNonce, setAnimationNonce] = useState(0);
  const [insights, setInsights] = useState<string[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    setSelectedFilePath(replayFiles[0]?.filePath ?? "");
    setStepIndex(0);
    setIsPlaying(false);
  }, [courseId, assignmentId, studentId]);

  const selectedFile = replayFiles.find((file) => file.filePath === selectedFilePath) ?? replayFiles[0];
  const steps = selectedFile?.steps ?? [];
  const step = steps[stepIndex];
  const totalDuration = steps.reduce((sum, item) => sum + item.durationSeconds, 0);

  useEffect(() => {
    setStepIndex(0);
    setIsPlaying(false);
    setInsights(selectedFile ? [selectedFile.baseInsight] : []);
  }, [selectedFilePath]);

  useEffect(() => {
    if (!step) {
      setDisplayCode("");
      return;
    }
    const prefix = sharedPrefixLength(step.before, step.after);
    let currentText = step.before;
    let timeoutId = 0;
    let canceled = false;

    setDisplayCode(currentText);

    const deletePhase = () => {
      if (canceled) return;
      if (currentText.length > prefix) {
        currentText = currentText.slice(0, -1);
        setDisplayCode(currentText);
        timeoutId = window.setTimeout(deletePhase, 7);
        return;
      }
      timeoutId = window.setTimeout(typePhase, 55);
    };

    const typePhase = () => {
      if (canceled) return;
      if (currentText.length < step.after.length) {
        currentText = step.after.slice(0, currentText.length + 1);
        setDisplayCode(currentText);
        timeoutId = window.setTimeout(typePhase, 7);
      }
    };

    timeoutId = window.setTimeout(deletePhase, 130);

    return () => {
      canceled = true;
      window.clearTimeout(timeoutId);
    };
  }, [selectedFilePath, stepIndex, step, animationNonce]);

  useEffect(() => {
    if (!isPlaying || !step || stepIndex >= steps.length - 1) {
      if (stepIndex >= steps.length - 1) setIsPlaying(false);
      return;
    }
    const UNIFORM_STEP_DELAY_MS = 1500;
    const timerId = window.setTimeout(
      () => setStepIndex((prev) => Math.min(prev + 1, steps.length - 1)),
      UNIFORM_STEP_DELAY_MS,
    );
    return () => window.clearTimeout(timerId);
  }, [isPlaying, step, stepIndex, steps]);

  if (!course || !assignment || !student) return <NotFoundPage />;

  function playPause() {
    if (steps.length === 0) return;
    if (isPlaying) {
      setIsPlaying(false);
      return;
    }
    if (stepIndex >= steps.length - 1) {
      setStepIndex(0);
      setAnimationNonce((prev) => prev + 1);
      setIsPlaying(true);
      return;
    }
    setAnimationNonce((prev) => prev + 1);
    setIsPlaying(true);
  }

  function submitInsight(e: React.FormEvent) {
    e.preventDefault();
    const cleaned = query.trim();
    if (!cleaned) return;
    setInsights((prev) => [
      ...prev,
      `Teacher: ${cleaned}`,
      "AI: Placeholder answer. Connect this input to your LLM endpoint and append model output here.",
    ]);
    setQuery("");
  }

  return (
    <main style={{ maxWidth: 1280, margin: "0 auto", padding: "1rem 1.1rem 2rem" }}>
      <h1 style={{ marginBottom: "0.25rem" }}>{assignment.title} • Progress Replay</h1>
      <p style={{ marginTop: 0, color: "var(--text-muted)" }}>
        {student.name} ({student.email})
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "220px minmax(460px, 1fr) 380px", gap: "1rem" }}>
        <section style={{ border: "1px solid var(--border)", borderRadius: 12, background: "var(--surface)", padding: "0.75rem" }}>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>File Tree</h2>
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {replayFiles.map((file) => (
              <li key={file.filePath} style={{ marginBottom: "0.4rem" }}>
                <button
                  className="file-tree-button"
                  onClick={() => setSelectedFilePath(file.filePath)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "0.45rem",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    background: selectedFilePath === file.filePath ? "var(--accent-soft)" : "var(--surface)",
                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  {file.filePath}
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section style={{ border: "1px solid var(--border)", borderRadius: 12, background: "var(--surface)", padding: "0.75rem" }}>
          <div style={{ border: "1px solid #1e293b", borderRadius: 8, background: "var(--text-primary)", padding: "0.75rem", marginBottom: "0.8rem" }}>
            <p style={{ color: "var(--border)", marginTop: 0, marginBottom: "0.45rem" }}>
              <code>{selectedFile?.filePath ?? "-"}</code>
            </p>
            <pre
              style={{
                margin: 0,
                color: "var(--border-soft)",
                minHeight: 280,
                whiteSpace: "pre-wrap",
                fontSize: 13,
                lineHeight: 1.45,
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              }}
            >
              {displayCode || "// No replay data for this file."}
            </pre>
          </div>

          <div style={{ marginBottom: "0.65rem" }}>
            <p style={{ marginTop: 0, marginBottom: "0.35rem", fontSize: 12, color: "var(--text-muted)" }}>
              Timeline ({stepIndex + 1}/{Math.max(steps.length, 1)})
            </p>
            <div style={{ display: "flex", height: 18, overflow: "hidden", borderRadius: 999, border: "1px solid var(--border)" }}>
              {steps.map((entry, idx) => {
                const width = totalDuration > 0 ? (entry.durationSeconds / totalDuration) * 100 : 0;
                const active = idx === stepIndex;
                return (
                  <button
                    className="timeline-segment"
                    key={entry.id}
                    onClick={() => {
                      setIsPlaying(false);
                      setStepIndex(idx);
                    }}
                    title={`${entry.title} (${entry.durationSeconds}s)`}
                    style={{ width: `${width}%`, border: "none", borderRight: "1px solid var(--accent-soft-2)", background: active ? "var(--accent)" : "var(--accent-soft-2)", cursor: "pointer" }}
                  />
                );
              })}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
            <button
              className="btn-icon"
              onClick={() => {
                setIsPlaying(false);
                setStepIndex((prev) => Math.max(prev - 1, 0));
              }}
              disabled={stepIndex === 0}
              aria-label="Previous step"
              title="Previous step"
              style={{ width: 36, height: 36, display: "grid", placeItems: "center" }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <rect x="2" y="3" width="2" height="10" fill="currentColor" />
                <path d="M12 3L5 8L12 13V3Z" fill="currentColor" />
              </svg>
            </button>
            <button
              className="btn-icon btn-icon-lg"
              onClick={playPause}
              disabled={steps.length === 0}
              aria-label={isPlaying ? "Pause" : "Play"}
              title={isPlaying ? "Pause" : "Play"}
              style={{ width: 44, height: 44, borderRadius: 999, display: "grid", placeItems: "center" }}
            >
              {isPlaying ? (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <rect x="3" y="2" width="3" height="12" fill="currentColor" />
                  <rect x="10" y="2" width="3" height="12" fill="currentColor" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M4 2L13 8L4 14V2Z" fill="currentColor" />
                </svg>
              )}
            </button>
            <button
              className="btn-icon"
              onClick={() => {
                setIsPlaying(false);
                setStepIndex((prev) => Math.min(prev + 1, steps.length - 1));
              }}
              disabled={stepIndex >= steps.length - 1}
              aria-label="Next step"
              title="Next step"
              style={{ width: 36, height: 36, display: "grid", placeItems: "center" }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <rect x="12" y="3" width="2" height="10" fill="currentColor" />
                <path d="M4 3L11 8L4 13V3Z" fill="currentColor" />
              </svg>
            </button>
          </div>
        </section>

        <section style={{ border: "1px solid var(--border)", borderRadius: 12, background: "var(--surface)", padding: "0.75rem", display: "flex", flexDirection: "column", minHeight: 450 }}>
          <h2 style={{ marginTop: 0, fontSize: 18 }}>AI Insights</h2>
          <p style={{ marginTop: 0, marginBottom: "0.5rem", color: "var(--text-muted)", fontSize: 12 }}>
            Current Replay Step: {step?.title ?? "No step selected"}
          </p>
          <div style={{ flex: 1, border: "1px solid var(--border-soft)", borderRadius: 8, background: "var(--surface-muted)", padding: "0.6rem", overflowY: "auto", marginBottom: "0.6rem" }}>
            {insights.map((line, idx) => (
              <p key={`${idx}-${line}`} style={{ margin: "0 0 0.5rem", lineHeight: 1.35, fontSize: 12 }}>
                {line}
              </p>
            ))}
          </div>
          <form onSubmit={submitInsight} style={{ display: "flex", gap: "0.45rem" }}>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask AI about this student"
              style={{ flex: 1, padding: "0.55rem" }}
            />
            <button type="submit" style={{ padding: "0.55rem 0.8rem" }}>
              Send
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}

function GenericPage({ title, body }: { title: string; body: string }) {
  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "1.5rem 1.1rem 2rem" }}>
      <div
        style={{
          border: "1px solid var(--border)",
          borderRadius: 12,
          background: "var(--surface)",
          padding: "1.5rem 1.75rem",
        }}
      >
        <h1 style={{ marginTop: 0 }}>{title}</h1>
        <p style={{ color: "var(--text-muted)", lineHeight: 1.65, marginBottom: 0 }}>{body}</p>
      </div>
    </main>
  );
}

function NotFoundPage() {
  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "1.5rem 1.1rem 2rem" }}>
      <div
        style={{
          border: "1px solid var(--border)",
          borderRadius: 12,
          background: "var(--surface)",
          padding: "1.5rem 1.75rem",
        }}
      >
        <h1 style={{ marginTop: 0 }}>Not Found</h1>
        <p style={{ color: "var(--text-muted)" }}>This page does not exist in the current routing setup.</p>
        <Link
          to="/"
          className="btn btn-primary"
          style={{
            display: "inline-block",
            padding: "0.55rem 1.1rem",
            borderRadius: 8,
            color: "white",
            textDecoration: "none",
          }}
        >
          Back to Dashboard
        </Link>
      </div>
    </main>
  );
}

function AuthedApp({
  onSignOut,
  theme,
  onToggleTheme,
  collapsed,
  onToggleCollapsed,
}: {
  onSignOut: () => Promise<void>;
  theme: ThemeMode;
  onToggleTheme: () => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  return (
    <div style={appShellStyle} className={`app-shell ${collapsed ? "sidebar-collapsed" : ""}`}>
      <Navbar
        onSignOut={onSignOut}
        theme={theme}
        onToggleTheme={onToggleTheme}
        collapsed={collapsed}
        onToggleCollapsed={onToggleCollapsed}
      />
      <div className="content-shell">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route
            path="/faq"
            element={
              <GenericPage
                title="FAQ / How To Use"
                body="Use Dashboard to choose a course, click into assignments, inspect student and class stats, then open Details for per-student replay and AI-supported insight threads."
              />
            }
          />
          <Route
            path="/about"
            element={
              <GenericPage
                title="About Our Product"
                body="JumBuddy helps instructors identify where students struggle by combining assignment analytics, replay-based development traces, and AI-assisted interpretation of learning behaviors."
              />
            }
          />
          <Route
            path="/account"
            element={
              <GenericPage
                title="Account"
                body="Account settings can be connected here. Current demo includes authentication via Supabase and role-aware course navigation."
              />
            }
          />
          <Route path="/:courseId" element={<CoursePage />} />
          <Route path="/:courseId/:assignment" element={<AssignmentPage />} />
          <Route path="/:courseId/:assignment/:student" element={<ReplayPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
}

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem("jumbuddy-theme");
    return saved === "light" ? "light" : "dark";
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("jumbuddy-theme", theme);
  }, [theme]);

  async function handleLogin(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error?.message ?? null;
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  const location = useLocation();

  if (!session) {
    if (location.pathname === "/login") {
      return <LoginPage onLogin={handleLogin} />;
    }
    return <Navigate to="/login" replace />;
  }

  if (location.pathname === "/login") {
    return <Navigate to="/" replace />;
  }

  return (
    <AuthedApp
      onSignOut={handleSignOut}
      theme={theme}
      onToggleTheme={() => setTheme((prev) => (prev === "light" ? "dark" : "light"))}
      collapsed={sidebarCollapsed}
      onToggleCollapsed={() => setSidebarCollapsed((prev) => !prev)}
    />
  );
}

export default App;
