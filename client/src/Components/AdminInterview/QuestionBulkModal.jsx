import React, { useState, useEffect, useRef } from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import {
  Upload,
  Download,
  FileSpreadsheet,
  FileCode,
  FileText,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  X,
  RefreshCw,
  Plus,
  HelpCircle,
  Trash2,
  FileUp
} from 'lucide-react';
import api from '../../api/axios';

// ============================================================
// STRICTLY MODE-SPECIFIC SAMPLE TEMPLATES (JSON & CSV)
// ============================================================
export const getModeSampleJSON = (mode = 'coding') => {
  switch (mode) {
    case 'verbal_qa':
      return [
        {
          title: "Database Indexing Internal Mechanisms & B-Tree vs Hash",
          prompt: "Explain how database indexes speed up read queries. Compare B-Tree vs Hash indexing structures and their specific use cases.",
          difficulty: "Medium",
          type: "verbal_qa",
          detail: {
            ideal_answer: "B-Tree indexes maintain a balanced multi-way search tree supporting range queries (BETWEEN, <, >) and equality with O(log N) depth. Hash indexes use hash buckets providing O(1) exact match lookup but do not support range scans or sorting. Indexing adds write amplification overhead during INSERT/UPDATE/DELETE."
          },
          hints: [
            { type: "rubric", content: "Explains log(N) tree traversal depth and page-level disk I/O reduction." },
            { type: "rubric", content: "Correctly contrasts range scan support in B-Trees vs point lookup in Hash indexes." },
            { type: "interview_tip", content: "Probe the candidate: What happens to write throughput when a table has 10 secondary indexes?" }
          ]
        },
        {
          title: "Process vs Thread Memory Isolation & Context Switching",
          prompt: "What is the difference between a process and a thread in modern operating systems? Discuss memory space, communication mechanisms, and context switching overhead.",
          difficulty: "Easy",
          type: "verbal_qa",
          detail: {
            ideal_answer: "Processes possess isolated virtual address spaces (code, heap, stack, file descriptors) managed by MMU/page tables. Threads belong to a process and share code, data, and heap while keeping independent call stacks and registers. Thread context switching is faster as page tables and TLB caches don't need flushing."
          },
          hints: [
            { type: "rubric", content: "Mentions virtual memory address space isolation and IPC mechanisms (pipes, sockets, shared memory)." },
            { type: "rubric", content: "Mentions shared heap/data vs private stack/registers for threads." },
            { type: "interview_tip", content: "Ask candidate how race conditions occur and what synchronization primitives (mutex, semaphore, atomic ops) prevent them." }
          ]
        }
      ];

    case 'mcq':
      return [
        {
          title: "Worst-Case Time Complexity of Quicksort",
          prompt: "What is the worst-case time complexity of standard Quicksort with the first element chosen as the pivot on an already sorted array?",
          difficulty: "Easy",
          type: "mcq",
          detail: {
            correct_option: "C",
            explanation: "When the array is already sorted and the pivot is chosen as the first element, partitions become completely unbalanced of size 0 and N-1 at every recursive step, resulting in O(N^2) comparisons."
          },
          mcq_options: [
            { option_key: "A", option_text: "O(N log N)", is_correct: false },
            { option_key: "B", option_text: "O(N)", is_correct: false },
            { option_key: "C", option_text: "O(N^2)", is_correct: true },
            { option_key: "D", option_text: "O(log N)", is_correct: false }
          ],
          hints: [
            { type: "interview_tip", content: "Verify candidate understanding of randomized pivot selection or median-of-three to mitigate worst-case." }
          ]
        },
        {
          title: "ACID Isolation Levels & Phantom Reads",
          prompt: "Which SQL transaction isolation level guarantees prevention of Phantom Reads according to ANSI SQL standard?",
          difficulty: "Medium",
          type: "mcq",
          detail: {
            correct_option: "D",
            explanation: "Serializable is the highest isolation level and prevents dirty reads, non-repeatable reads, and phantom reads using range locks or multiversion concurrency control with serializability validation."
          },
          mcq_options: [
            { option_key: "A", option_text: "Read Uncommitted", is_correct: false },
            { option_key: "B", option_text: "Read Committed", is_correct: false },
            { option_key: "C", option_text: "Repeatable Read", is_correct: false },
            { option_key: "D", option_text: "Serializable", is_correct: true }
          ],
          hints: [
            { type: "interview_tip", content: "Note that in InnoDB MySQL, Next-Key Locking in Repeatable Read also avoids phantom reads in many scenarios." }
          ]
        }
      ];

    case 'whiteboard':
    case 'discussion':
      return [
        {
          title: "Design a Distributed URL Shortener (Bitly)",
          prompt: "Design a scalable URL shortening service that generates 7-character unique aliases for long URLs and handles rapid redirections with sub-10ms latency.",
          difficulty: "Medium",
          type: "whiteboard",
          detail: {
            scenario: "Read/Write Ratio: 100:1 (500M new URLs/month, 50B redirects/month). Latency: < 10ms redirect. 99.99% availability."
          },
          hints: [
            { type: "talking_point", content: "Base62 encoding (62^7 = ~3.5 trillion URLs) with distributed counter (Zookeeper / Redis range allocation)." },
            { type: "talking_point", content: "Caching tier using Redis LRU cache for high-frequency hot URLs to bypass DB reads." },
            { type: "tradeoff", content: "301 Permanent Redirect (browser caches redirect, lower server load, loses click analytics) vs 302 Temporary Redirect (hits server every time, accurate telemetry)." },
            { type: "interview_tip", content: "Probe candidate on database sharding key strategy (hash of short URL vs user_id)." }
          ]
        },
        {
          title: "Design Real-Time Collaborative Document Editing",
          prompt: "Architect a real-time collaborative text editor supporting simultaneous multi-user typing, instant conflict resolution, and offline sync.",
          difficulty: "Hard",
          type: "whiteboard",
          detail: {
            scenario: "100 active collaborators per document, typing latency < 50ms, document history revisions."
          },
          hints: [
            { type: "talking_point", content: "Operational Transformation (OT) with central ordering server vs Conflict-free Replicated Data Types (CRDTs) like Yjs/Automerge." },
            { type: "talking_point", content: "WebSocket connection pool with Redis Pub/Sub backplane for ephemeral presence and cursor coordinates." },
            { type: "tradeoff", content: "Client-side state convergence overhead of CRDT tombstone metadata vs OT centralized coordination single-point bottleneck." },
            { type: "interview_tip", content: "Ask candidate how document snapshotting works to prevent replaying millions of operational events from scratch." }
          ]
        }
      ];

    case 'database':
      return [
        {
          title: "E-Commerce Customer Order Analytics",
          prompt: "Design a normalized database schema for an e-commerce platform and write a SQL query to identify top 5 customers by total spending in 2026.",
          difficulty: "Medium",
          type: "database",
          detail: {
            scenario: "Tables required: users, orders, and order_items. Handle order statuses ('completed', 'refunded', 'pending').",
            expected_approach: "SELECT u.id, u.username, SUM(o.total_amount) AS total_spent FROM users u JOIN orders o ON u.id = o.user_id WHERE o.status = 'completed' AND o.created_at >= '2026-01-01' GROUP BY u.id, u.username ORDER BY total_spent DESC LIMIT 5;",
            constraints: "Foreign keys with ON DELETE CASCADE for order_items. Index on orders(user_id, status, created_at)."
          },
          templates: [
            {
              language: "sql",
              starter_code: "CREATE TABLE users (\n  id INTEGER PRIMARY KEY,\n  username VARCHAR(100) NOT NULL,\n  email VARCHAR(255) UNIQUE NOT NULL\n);\n\nCREATE TABLE orders (\n  id INTEGER PRIMARY KEY,\n  user_id INTEGER REFERENCES users(id),\n  total_amount DECIMAL(10,2) NOT NULL,\n  status VARCHAR(50) DEFAULT 'completed',\n  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n);\n\nINSERT INTO users VALUES (1, 'alice', 'alice@example.com'), (2, 'bob', 'bob@example.com'), (3, 'charlie', 'charlie@example.com');\nINSERT INTO orders VALUES (101, 1, 350.00, 'completed', '2026-02-10'), (102, 2, 1200.00, 'completed', '2026-03-01'), (103, 1, 450.00, 'completed', '2026-04-15'), (104, 3, 200.00, 'refunded', '2026-05-01');"
            }
          ],
          hints: [
            { type: "hint", content: "Remember to filter out non-completed orders before calculating total sums." },
            { type: "interview_tip", content: "Evaluate if candidate utilizes composite indexes on (user_id, status, created_at) to optimize aggregation query." }
          ]
        }
      ];

    case 'frontend':
      return [
        {
          title: "Responsive Product Card Grid with Search Filter",
          prompt: "Build a responsive product listing interface in React with dynamic search filtering, category pills, and add-to-cart counter state.",
          difficulty: "Medium",
          type: "frontend",
          detail: {
            scenario: "Render a clean product grid. Search bar filters titles in real-time. Badge shows total cart count in navbar.",
            constraints: "Mobile (<640px): 1 column grid; Tablet (640px-1024px): 2 columns; Desktop (>1024px): 3 columns."
          },
          templates: [
            {
              language: "javascript",
              starter_code: "import React, { useState } from 'react';\n\nconst PRODUCTS = [\n  { id: 1, name: 'Mechanical Keyboard', price: 99, category: 'Electronics' },\n  { id: 2, name: 'Ergonomic Mouse', price: 49, category: 'Electronics' },\n  { id: 3, name: 'Noise-Cancelling Headphones', price: 199, category: 'Audio' },\n];\n\nexport default function App() {\n  const [query, setQuery] = useState('');\n  const [cartCount, setCartCount] = useState(0);\n\n  return (\n    <div className=\"p-6 max-w-4xl mx-auto font-sans\">\n      <header className=\"flex justify-between items-center mb-6 pb-4 border-b\">\n        <h1 className=\"text-2xl font-bold text-gray-800\">Tech Store</h1>\n        <span className=\"bg-indigo-600 text-white px-3 py-1 rounded-full text-sm font-semibold\">\n          Cart: {cartCount}\n        </span>\n      </header>\n      {/* Product cards and filter UI */}\n    </div>\n  );\n}"
            }
          ],
          hints: [
            { type: "hint", content: "Use filtered inline array or useMemo to filter products by query lowercase." },
            { type: "interview_tip", content: "Check accessibility: proper button elements, alt text on images, keyboard navigable search input." }
          ]
        }
      ];

    case 'backend':
      return [
        {
          title: "Task Management REST API with Filter & Patch",
          prompt: "Implement a RESTful task management service supporting task creation, listing with completion filters, and status patching.",
          difficulty: "Medium",
          type: "backend",
          detail: {
            constraints: "Task title must be 3-100 characters. Return HTTP 400 for empty titles, 404 for nonexistent task IDs.",
            expected_approach: "Maintain in-memory state or map keyed by ID. Parse JSON body and route HTTP methods according to standard REST semantics.",
            expected_complexity: "Time: O(1) CRUD lookups, Space: O(N)"
          },
          templates: [
            {
              language: "javascript",
              starter_code: "const tasks = new Map();\nlet nextId = 1;\n\n// Handle incoming HTTP request payloads\nmodule.exports = async function handle(req) {\n  const { method, path, body } = req;\n  if (method === 'POST' && path === '/tasks') {\n    const title = (body?.title || '').trim();\n    if (!title) return { status: 400, body: { error: 'Title required' } };\n    const task = { id: nextId++, title, completed: false };\n    tasks.set(task.id, task);\n    return { status: 201, body: task };\n  }\n  return { status: 404, body: { error: 'Not found' } };\n};"
            }
          ],
          test_cases: [
            {
              input: "POST /tasks {\"title\":\"Build API\"}",
              expected_output: "201 {\"id\":1,\"title\":\"Build API\",\"completed\":false}",
              is_hidden: false,
              explanation: "Creates a new task and returns 201 Created."
            },
            {
              input: "POST /tasks {\"title\":\"\"}",
              expected_output: "400 {\"error\":\"Title required\"}",
              is_hidden: false,
              explanation: "Rejects empty title with 400 Bad Request."
            },
            {
              input: "GET /tasks/999",
              expected_output: "404 {\"error\":\"Not found\"}",
              is_hidden: true,
              explanation: "Returns 404 for missing resource."
            }
          ],
          hints: [
            { type: "hint", content: "Make sure status code is placed at the start of the output line or JSON payload." },
            { type: "interview_tip", content: "Evaluate whether candidate validates request body and handles non-integer path IDs gracefully." }
          ]
        }
      ];

    case 'coding':
    default:
      return [
        {
          title: "Two Sum with Target Lookup",
          prompt: "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.",
          difficulty: "Easy",
          type: "coding",
          detail: {
            constraints: "2 <= nums.length <= 10^4\n-10^9 <= nums[i] <= 10^9\nOnly one valid answer exists.",
            expected_approach: "Use a hash map to look up the complement (target - nums[i]) for each element in O(1) average time.",
            expected_complexity: "Time: O(N), Space: O(N)"
          },
          templates: [
            {
              language: "javascript",
              starter_code: "function twoSum(nums, target) {\n  // Return [index1, index2]\n}"
            },
            {
              language: "python",
              starter_code: "def twoSum(nums: list[int], target: int) -> list[int]:\n    # Return [index1, index2]\n    pass"
            }
          ],
          test_cases: [
            {
              input: "[2,7,11,15]\n9",
              expected_output: "[0,1]",
              is_hidden: false,
              explanation: "nums[0] + nums[1] == 2 + 7 == 9"
            },
            {
              input: "[3,2,4]\n6",
              expected_output: "[1,2]",
              is_hidden: false,
              explanation: "nums[1] + nums[2] == 2 + 4 == 6"
            },
            {
              input: "[3,3]\n6",
              expected_output: "[0,1]",
              is_hidden: true,
              explanation: "Boundary check for duplicate elements"
            }
          ],
          hints: [
            { type: "hint", content: "Can you store already visited numbers and their indices in a hash map?" },
            { type: "interview_tip", content: "Ask candidate: Why is nested iteration O(N^2) suboptimal for N = 10^5?" }
          ]
        },
        {
          title: "Valid Palindrome Verification",
          prompt: "A phrase is a palindrome if, after converting all uppercase letters into lowercase letters and removing all non-alphanumeric characters, it reads the same forward and backward.",
          difficulty: "Easy",
          type: "coding",
          detail: {
            constraints: "1 <= s.length <= 2 * 10^5\ns consists only of printable ASCII characters.",
            expected_approach: "Two-pointer approach comparing start and end characters while skipping non-alphanumerics.",
            expected_complexity: "Time: O(N), Space: O(1)"
          },
          templates: [
            {
              language: "javascript",
              starter_code: "function isPalindrome(s) {\n  // Return boolean true/false\n}"
            }
          ],
          test_cases: [
            {
              input: "\"A man, a plan, a canal: Panama\"",
              expected_output: "true",
              is_hidden: false,
              explanation: "\"amanaplanacanalpanama\" is a palindrome."
            },
            {
              input: "\"race a car\"",
              expected_output: "false",
              is_hidden: false,
              explanation: "\"raceacar\" is not a palindrome."
            }
          ],
          hints: [
            { type: "hint", content: "Consider using two pointers from both ends moving inward." }
          ]
        }
      ];
  }
};

export const getModeSampleCSV = (mode = 'coding') => {
  switch (mode) {
    case 'verbal_qa':
      return [
        'title,prompt,difficulty,ideal_answer,rubric_1,rubric_2,probing_tip_1',
        '"Database Indexing Mechanisms","Explain how database indexes speed up read queries. Compare B-Tree vs Hash indexing.","Medium","B-Tree indexes maintain a balanced multi-way search tree supporting range queries (BETWEEN, <, >) and equality with O(log N) depth. Hash indexes use hash buckets providing O(1) exact match lookup but do not support range scans. Indexing adds write overhead.","Explains log(N) tree traversal depth and disk I/O reduction","Contrasts range scan support in B-Trees vs point lookup in Hash indexes","Probe: What happens to write throughput when a table has 10 secondary indexes?"',
        '"Process vs Thread Isolation","What is the difference between a process and a thread in modern OS?","Easy","Processes possess isolated virtual address spaces managed by MMU/page tables. Threads belong to a process and share code, data, and heap while keeping independent call stacks. Thread context switching is faster as page tables and TLB caches don\'t need flushing.","Mentions virtual memory address space isolation and IPC","Mentions shared heap vs private stack/registers","Ask how race conditions occur and what synchronization primitives prevent them."'
      ].join('\n');

    case 'mcq':
      return [
        'title,prompt,difficulty,option_a,option_b,option_c,option_d,correct_option,explanation,interview_tip_1',
        '"Worst-Case Quicksort Complexity","What is worst-case time complexity of standard Quicksort with first element as pivot on sorted array?","Easy","O(N log N)","O(N)","O(N^2)","O(log N)","C","Unbalanced partitions of size 0 and N-1 occur at every recursive step on sorted inputs.","Verify understanding of randomized pivot selection."',
        '"ACID Isolation Phantom Reads","Which SQL isolation level guarantees prevention of Phantom Reads according to ANSI standard?","Medium","Read Uncommitted","Read Committed","Repeatable Read","Serializable","D","Serializable uses range locks or MVCC serializability validation to prevent phantom inserts.","Note InnoDB next-key locking behavior in Repeatable Read."'
      ].join('\n');

    case 'whiteboard':
    case 'discussion':
      return [
        'title,prompt,difficulty,scenario,talking_point_1,talking_point_2,tradeoff_1,interview_tip_1',
        '"Design a Distributed URL Shortener (Bitly)","Design a scalable URL shortening service with sub-10ms redirection latency.","Medium","500M new URLs/month, 50B redirects/month, <10ms redirect latency, 99.99% SLA","Base62 encoding (62^7 = ~3.5T URLs) with distributed counter allocation","Redis LRU caching tier for top hot URLs","301 Permanent (browser cache, less server load) vs 302 Temporary (accurate hit telemetry)","Probe on DB sharding key strategy (hash of short URL vs user_id)"',
        '"Design Real-Time Collaborative Document Editing","Architect a real-time collaborative text editor like Google Docs with conflict resolution.","Hard","100 active collaborators per doc, <50ms sync latency, revision history","Operational Transformation (OT) central server vs CRDTs (Yjs/Automerge)","WebSocket connection pool with Redis Pub/Sub backplane","CRDT client memory metadata overhead vs OT central server coordination bottleneck","Ask how document snapshotting prevents replaying millions of operational events"'
      ].join('\n');

    case 'database':
      return [
        'title,prompt,difficulty,scenario,schema_ddl,expected_sql_solution,constraints,hint_1,interview_tip_1',
        '"E-Commerce Customer Spending Analytics","Design schema and write SQL query to find top 5 customers by total spending in 2026.","Medium","Tables: users, orders, order_items. Filter completed status.","CREATE TABLE users (id INT PRIMARY KEY, username VARCHAR(100));\nCREATE TABLE orders (id INT PRIMARY KEY, user_id INT, total_amount DECIMAL(10,2), status VARCHAR(50), created_at TIMESTAMP);\nINSERT INTO users VALUES (1, \'alice\'), (2, \'bob\');\nINSERT INTO orders VALUES (101, 1, 350.00, \'completed\', \'2026-02-10\'), (102, 2, 1200.00, \'completed\', \'2026-03-01\');","SELECT u.id, u.username, SUM(o.total_amount) AS total_spent FROM users u JOIN orders o ON u.id = o.user_id WHERE o.status = \'completed\' GROUP BY u.id, u.username ORDER BY total_spent DESC LIMIT 5;","Index on orders(user_id, status, created_at)","Filter out non-completed and refunded orders before summing","Evaluate if candidate utilizes composite indexes to optimize aggregate"'
      ].join('\n');

    case 'frontend':
      return [
        'title,prompt,difficulty,scenario,breakpoint_constraints,starter_code,hint_1,interview_tip_1',
        '"Responsive Product Card Grid","Build a responsive product listing interface in React with search filter and cart count badge.","Medium","Render product grid. Search bar filters titles in real time. Cart count badge in header.","Mobile (<640px): 1 col; Tablet (640-1024px): 2 cols; Desktop (>1024px): 3 cols","import React, { useState } from \'react\';\n\nexport default function App() {\n  return <div className=\"p-4\"><h1 className=\"text-xl font-bold\">Tech Store</h1></div>;\n}","Use useMemo or filtered inline array to filter products by query lowercase","Check accessibility: proper button elements, alt text on images, keyboard navigable search"'
      ].join('\n');

    case 'backend':
      return [
        'title,prompt,difficulty,constraints,expected_approach,expected_complexity,starter_code,open_testcase_1_in,open_testcase_1_out,hidden_testcase_1_in,hidden_testcase_1_out,hint_1,interview_tip_1',
        '"Task Management REST API","Implement a RESTful task management service supporting creation, listing, and patching.","Medium","Title 3-100 chars. Return 400 for empty title, 404 for missing ID.","Route HTTP method & path, maintain in-memory map","Time: O(1), Space: O(N)","module.exports = async function handle(req) {\n  const { method, path, body } = req;\n  if (method === \'POST\' && path === \'/tasks\') {\n    return { status: 201, body: { id: 1, title: body.title, completed: false } };\n  }\n  return { status: 404, body: { error: \'Not found\' } };\n};","POST /tasks {\"title\":\"Build API\"}","201 {\"id\":1,\"title\":\"Build API\",\"completed\":false}","GET /tasks/999","404 {\"error\":\"Not found\"}","Place status code at start of response","Verify how candidate handles empty strings or non-integer IDs"'
      ].join('\n');

    case 'coding':
    default:
      return [
        'title,prompt,difficulty,constraints,expected_approach,expected_complexity,starter_code,open_testcase_1_in,open_testcase_1_out,hidden_testcase_1_in,hidden_testcase_1_out,hint_1,interview_tip_1',
        '"Two Sum with Target Lookup","Given an array of integers nums and target, return indices of two numbers that add up to target.","Easy","2 <= nums.length <= 10^4\n-10^9 <= nums[i] <= 10^9","Use a hash map to look up complement in O(1) time","Time: O(N), Space: O(N)","function twoSum(nums, target) {\n  // Write solution\n}","[2,7,11,15]\n9","[0,1]","[3,3]\n6","[0,1]","Store already visited numbers in a hash map","Ask candidate why nested loop O(N^2) is suboptimal"',
        '"Valid Palindrome Verification","Determine if phrase is palindrome after stripping non-alphanumeric characters.","Easy","1 <= s.length <= 2 * 10^5","Two-pointer approach converging inwards","Time: O(N), Space: O(1)","function isPalindrome(s) {\n  // Write solution\n}","\"A man, a plan, a canal: Panama\"","true","\"race a car\"","false","Consider two pointers from start and end","Check candidate handling of non-alphanumerics"'
      ].join('\n');
  }
};

export default function QuestionBulkModal({
  isOpen,
  onClose,
  currentLevel,
  currentTrack,
  onSuccess,
}) {
  const [importFormat, setImportFormat] = useState('json'); // 'json' | 'csv'
  const [inputMode, setInputMode] = useState('file'); // 'file' | 'text'
  const [uploadedFile, setUploadedFile] = useState(null);
  const [rawText, setRawText] = useState('');
  const [parsedPreview, setParsedPreview] = useState([]);
  const [parseError, setParseError] = useState('');
  const [loading, setLoading] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const resetAll = () => {
    setImportResult(null);
    setUploadedFile(null);
    setRawText('');
    setParsedPreview([]);
    setParseError('');
    setLoading(false);
    setIsDragging(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  useEffect(() => {
    if (isOpen) {
      resetAll();
    }
  }, [isOpen]);

  const handleClose = () => {
    resetAll();
    onClose();
  };

  if (!isOpen) return null;

  const currentMode = currentLevel?.mode || 'coding';

  // ============================================================
  // SAMPLE TEMPLATES DOWNLOADERS
  // ============================================================
  const handleDownloadJSONTemplate = () => {
    const sample = getModeSampleJSON(currentMode);
    const blob = new Blob([JSON.stringify(sample, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mockmate_${currentMode}_questions_template.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadCSVTemplate = () => {
    const csvContent = getModeSampleCSV(currentMode);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mockmate_${currentMode}_questions_template.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // ============================================================
  // PARSING LOGIC
  // ============================================================
  const parseContent = (content, format) => {
    setParseError('');
    if (!content || !content.trim()) {
      setParsedPreview([]);
      return;
    }

    if (format === 'json') {
      try {
        const data = JSON.parse(content);
        const list = Array.isArray(data) ? data : [data];
        const preview = list.map((item, idx) => {
          const title = (item.title || item.name || '').trim();
          const prompt = (item.prompt || item.description || item.question || item.statement || '').trim();
          const difficulty = item.difficulty || 'Medium';
          const type = item.type || currentMode;

          // Normalize shorthand starter_code into templates array if provided at top-level
          if (item.starter_code && (!item.templates || item.templates.length === 0)) {
            const lang = type === 'database' ? 'sql' : 'javascript';
            item.templates = [{ language: lang, starter_code: item.starter_code }];
          }

          let status = 'valid';
          let message = 'Ready to import';

          if (!title) {
            status = 'error';
            message = 'Missing title';
          } else if (!prompt) {
            status = 'error';
            message = 'Missing prompt';
          }

          return {
            id: idx + 1,
            title,
            prompt,
            difficulty,
            type,
            testCasesCount: (item.test_cases || []).length,
            templatesCount: (item.templates || []).length,
            hintsCount: (item.hints || []).length,
            mcqOptionsCount: (item.mcq_options || []).length,
            rawItem: item,
            status,
            message,
          };
        });
        setParsedPreview(preview);
      } catch (err) {
        setParseError('Invalid JSON format: ' + err.message);
        setParsedPreview([]);
      }
    } else {
      // Robust CSV parser supporting quotes, commas, multiline values
      const parseCSVRows = (text) => {
        const rows = [];
        let curRow = [];
        let curField = '';
        let inQuotes = false;
        for (let i = 0; i < text.length; i++) {
          const char = text[i];
          const nextChar = text[i + 1];

          if (char === '"') {
            if (inQuotes && nextChar === '"') {
              curField += '"';
              i++;
            } else {
              inQuotes = !inQuotes;
            }
          } else if (char === ',' && !inQuotes) {
            curRow.push(curField.trim());
            curField = '';
          } else if ((char === '\r' || char === '\n') && !inQuotes) {
            if (char === '\r' && nextChar === '\n') i++;
            curRow.push(curField.trim());
            if (curRow.length > 0 && curRow.some((c) => c !== '')) {
              rows.push(curRow);
            }
            curRow = [];
            curField = '';
          } else {
            curField += char;
          }
        }
        if (curField.length > 0 || curRow.length > 0) {
          curRow.push(curField.trim());
          if (curRow.some((c) => c !== '')) {
            rows.push(curRow);
          }
        }
        return rows;
      };

      const rows = parseCSVRows(content);
      if (rows.length === 0) {
        setParsedPreview([]);
        return;
      }

      const headerCols = rows[0].map((h) => h.toLowerCase().replace(/[\s_\-/]/g, ''));
      const hasHeader = headerCols.some((h) =>
        h.includes('title') || h.includes('prompt') || h.includes('name') || h.includes('question') || h.includes('ideal') || h.includes('option')
      );

      const findCol = (...keywords) => {
        return headerCols.findIndex((col) => keywords.some((k) => col.includes(k)));
      };

      const titleIdx = findCol('title', 'name', 'qntitle');
      const promptIdx = findCol('prompt', 'desc', 'question', 'statement', 'problem');
      const diffIdx = findCol('diff', 'difficulty', 'level');
      const typeIdx = findCol('type', 'mode');

      // Detail fields
      const constraintsIdx = findCol('constraint', 'breakpoint');
      const approachIdx = findCol('approach', 'sqlsolution', 'solution', 'expectedsql');
      const complexityIdx = findCol('complexity');
      const idealAnswerIdx = findCol('idealanswer', 'modelanswer', 'referenceanswer', 'evaluatornotes', 'answer');
      const scenarioIdx = findCol('scenario', 'context', 'scaletarget');
      const correctOptIdx = findCol('correctoption', 'correctkey', 'answerkey', 'key');
      const explanationIdx = findCol('explanation', 'rationale', 'why');

      // MCQ options
      const optAIdx = findCol('optiona', 'opta', 'choicea');
      const optBIdx = findCol('optionb', 'optb', 'choiceb');
      const optCIdx = findCol('optionc', 'optc', 'choicec');
      const optDIdx = findCol('optiond', 'optd', 'choiced');

      // Starter code / Schema DDL
      const starterIdx = findCol('startercode', 'starter', 'boilerplate', 'schemaddl', 'ddl', 'schema');

      // Test cases
      const tc1InIdx = findCol('testcase1in', 'tc1in', 'samplein', 'opentestcase1in', 'sampleendpoint1in');
      const tc1OutIdx = findCol('testcase1out', 'tc1out', 'sampleout', 'opentestcase1out', 'sampleendpoint1out');
      const tc2InIdx = findCol('testcase2in', 'tc2in', 'hiddenin', 'hiddentestcase1in', 'hiddenendpoint1in');
      const tc2OutIdx = findCol('testcase2out', 'tc2out', 'hiddenout', 'hiddentestcase1out', 'hiddenendpoint1out');

      // Hints / Rubrics / Talking points
      const hint1Idx = findCol('hint1', 'hints', 'hint');
      const tip1Idx = findCol('interviewtip1', 'probingtip1', 'tip1', 'interviewtips', 'tips', 'tip');
      const rubric1Idx = findCol('rubric1', 'rubrics', 'rubric');
      const rubric2Idx = findCol('rubric2');
      const talkingPt1Idx = findCol('talkingpoint1', 'talkingpoints', 'talkingpoint');
      const talkingPt2Idx = findCol('talkingpoint2');
      const tradeoff1Idx = findCol('tradeoff1', 'tradeoffs', 'tradeoff');

      const startIndex = hasHeader ? 1 : 0;
      const preview = [];

      for (let i = startIndex; i < rows.length; i++) {
        const cols = rows[i];
        if (cols.length === 0 || (cols.length === 1 && !cols[0])) continue;

        const title = titleIdx !== -1 ? (cols[titleIdx] || '') : (cols[0] || '');
        const prompt = promptIdx !== -1 ? (cols[promptIdx] || '') : (cols[1] || '');
        const difficulty = diffIdx !== -1 && cols[diffIdx] ? cols[diffIdx] : 'Medium';
        const type = typeIdx !== -1 && cols[typeIdx] ? cols[typeIdx] : currentMode;

        const rawItem = {
          title: title.trim(),
          prompt: prompt.trim(),
          difficulty: difficulty.trim() || 'Medium',
          type,
          detail: {},
          templates: [],
          test_cases: [],
          hints: [],
          mcq_options: [],
        };

        // Populate detail according to mode
        if (constraintsIdx !== -1 && cols[constraintsIdx]) {
          rawItem.detail.constraints = cols[constraintsIdx];
        }
        if (approachIdx !== -1 && cols[approachIdx]) {
          rawItem.detail.expected_approach = cols[approachIdx];
        }
        if (complexityIdx !== -1 && cols[complexityIdx]) {
          rawItem.detail.expected_complexity = cols[complexityIdx];
        }
        if (idealAnswerIdx !== -1 && cols[idealAnswerIdx]) {
          rawItem.detail.ideal_answer = cols[idealAnswerIdx];
        }
        if (scenarioIdx !== -1 && cols[scenarioIdx]) {
          rawItem.detail.scenario = cols[scenarioIdx];
        }
        if (correctOptIdx !== -1 && cols[correctOptIdx]) {
          rawItem.detail.correct_option = cols[correctOptIdx].toUpperCase();
        }
        if (explanationIdx !== -1 && cols[explanationIdx]) {
          rawItem.detail.explanation = cols[explanationIdx];
        }

        // MCQ options
        if (type === 'mcq' || optAIdx !== -1) {
          const correctKey = (rawItem.detail.correct_option || 'A').toUpperCase();
          if (optAIdx !== -1 && cols[optAIdx]) {
            rawItem.mcq_options.push({ option_key: 'A', option_text: cols[optAIdx], is_correct: correctKey === 'A' });
          }
          if (optBIdx !== -1 && cols[optBIdx]) {
            rawItem.mcq_options.push({ option_key: 'B', option_text: cols[optBIdx], is_correct: correctKey === 'B' });
          }
          if (optCIdx !== -1 && cols[optCIdx]) {
            rawItem.mcq_options.push({ option_key: 'C', option_text: cols[optCIdx], is_correct: correctKey === 'C' });
          }
          if (optDIdx !== -1 && cols[optDIdx]) {
            rawItem.mcq_options.push({ option_key: 'D', option_text: cols[optDIdx], is_correct: correctKey === 'D' });
          }
        }

        // Starter code / templates
        if (starterIdx !== -1 && cols[starterIdx]) {
          const lang = type === 'database' ? 'sql' : 'javascript';
          rawItem.templates.push({
            language: lang,
            starter_code: cols[starterIdx],
          });
        }

        // Test cases
        if (tc1InIdx !== -1 && cols[tc1InIdx]) {
          rawItem.test_cases.push({
            input: cols[tc1InIdx],
            expected_output: tc1OutIdx !== -1 ? cols[tc1OutIdx] || '' : '',
            is_hidden: false,
          });
        }
        if (tc2InIdx !== -1 && cols[tc2InIdx]) {
          rawItem.test_cases.push({
            input: cols[tc2InIdx],
            expected_output: tc2OutIdx !== -1 ? cols[tc2OutIdx] || '' : '',
            is_hidden: true,
          });
        }

        // Hints / Tips / Rubrics / Talking points
        if (rubric1Idx !== -1 && cols[rubric1Idx]) {
          rawItem.hints.push({ type: 'rubric', content: cols[rubric1Idx] });
        }
        if (rubric2Idx !== -1 && cols[rubric2Idx]) {
          rawItem.hints.push({ type: 'rubric', content: cols[rubric2Idx] });
        }
        if (talkingPt1Idx !== -1 && cols[talkingPt1Idx]) {
          rawItem.hints.push({ type: 'talking_point', content: cols[talkingPt1Idx] });
        }
        if (talkingPt2Idx !== -1 && cols[talkingPt2Idx]) {
          rawItem.hints.push({ type: 'talking_point', content: cols[talkingPt2Idx] });
        }
        if (tradeoff1Idx !== -1 && cols[tradeoff1Idx]) {
          rawItem.hints.push({ type: 'tradeoff', content: cols[tradeoff1Idx] });
        }
        if (hint1Idx !== -1 && cols[hint1Idx]) {
          rawItem.hints.push({ type: 'hint', content: cols[hint1Idx] });
        }
        if (tip1Idx !== -1 && cols[tip1Idx]) {
          rawItem.hints.push({ type: 'interview_tip', content: cols[tip1Idx] });
        }

        let status = 'valid';
        let message = 'Ready to import';
        if (!title.trim()) {
          status = 'error';
          message = 'Missing title';
        } else if (!prompt.trim()) {
          status = 'error';
          message = 'Missing prompt';
        }

        preview.push({
          id: i + 1,
          title: title.trim(),
          prompt: prompt.trim(),
          difficulty: difficulty.trim() || 'Medium',
          type,
          testCasesCount: rawItem.test_cases.length,
          templatesCount: rawItem.templates.length,
          hintsCount: rawItem.hints.length,
          mcqOptionsCount: rawItem.mcq_options.length,
          rawItem,
          status,
          message,
        });
      }

      setParsedPreview(preview);
    }
  };

  const processFile = (file) => {
    if (!file) return;
    setUploadedFile(file);

    const isJson = file.name.toLowerCase().endsWith('.json') || file.type.includes('json');
    const fmt = isJson ? 'json' : 'csv';
    setImportFormat(fmt);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target.result;
      parseContent(text, fmt);
    };
    reader.readAsText(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
    e.target.value = '';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleTextChange = (text) => {
    setRawText(text);
    parseContent(text, importFormat);
  };

  const handleFormatSwitch = (fmt) => {
    setImportFormat(fmt);
    if (rawText) {
      parseContent(rawText, fmt);
    }
  };

  const handleResetUpload = () => {
    setUploadedFile(null);
    setParsedPreview([]);
    setParseError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // ============================================================
  // SUBMIT BATCH
  // ============================================================
  const handleSubmit = async () => {
    const validItems = parsedPreview.filter((p) => p.status === 'valid');
    if (validItems.length === 0) {
      alert('No valid questions to import.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        questions: validItems.map((p) => ({
          ...p.rawItem,
          level_id: currentLevel.id,
          type: p.rawItem.type || currentMode,
        })),
      };

      const res = await api.post(`/admin/interviews/levels/${currentLevel.id}/questions/bulk`, payload);
      setImportResult(res.data || res);
      if (onSuccess) onSuccess();
    } catch (err) {
      alert(err.message || 'Failed to bulk import questions');
    } finally {
      setLoading(false);
    }
  };

  const validCount = parsedPreview.filter((p) => p.status === 'valid').length;
  const errorCount = parsedPreview.filter((p) => p.status === 'error').length;

  const modePlaceholder =
    importFormat === 'json'
      ? JSON.stringify(getModeSampleJSON(currentMode), null, 2)
      : getModeSampleCSV(currentMode);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex min-h-full items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-[var(--bg-card)] border border-[var(--border-strong)] rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] flex flex-col my-auto overflow-hidden animate-scaleUp">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] shrink-0 bg-[var(--bg-card)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-[17px] font-bold text-[var(--text-primary)]">
                Bulk Upload Questions
              </h3>
              <p className="text-[12px] text-[var(--text-secondary)]">
                Import question bank for <strong>{currentTrack?.title}</strong> • Level {currentLevel?.level_number} (<span className="uppercase font-semibold text-[var(--accent)]">{currentMode}</span> mode)
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-input)] transition cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6 space-y-4 custom-scrollbar">
          {importResult ? (
            <div className="space-y-4 py-2">
              <div className="p-4 bg-[var(--green-bg)] border border-[var(--green)]/30 rounded-[var(--radius-md)] flex items-center gap-4">
                <div className="w-12 h-12 shrink-0">
                  <DotLottieReact
                    src="/lotties/success_tick.lottie"
                    loop={false}
                    autoplay
                    style={{ width: '100%', height: '100%' }}
                  />
                </div>
                <div>
                  <h4 className="text-[15px] font-bold text-[var(--green)]">
                    Questions Imported Successfully!
                  </h4>
                  <p className="text-[12px] text-[var(--text-primary)] mt-0.5">
                    <strong>{importResult.created_count || 0}</strong> questions were added into Level {currentLevel?.level_number}.
                    {importResult.skipped_count > 0 && ` (${importResult.skipped_count} items skipped)`}
                  </p>
                </div>
              </div>

              {importResult.skipped_details && importResult.skipped_details.length > 0 && (
                <div className="panel-card p-4 space-y-2">
                  <p className="text-[12px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Skipped Details ({importResult.skipped_details.length}):</span>
                  </p>
                  <div className="max-h-48 overflow-y-auto font-mono text-[11px] space-y-1 text-[var(--text-secondary)] bg-[var(--bg-input)] p-3 rounded">
                    {importResult.skipped_details.map((msg, idx) => (
                      <div key={idx} className="border-b border-[var(--border)]/50 pb-1">
                        • {msg}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setImportResult(null);
                    setParsedPreview([]);
                    setUploadedFile(null);
                    setRawText('');
                  }}
                  className="btn btn-secondary text-xs py-2 px-4 cursor-pointer"
                >
                  Upload Another Batch
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="btn btn-primary text-xs py-2 px-4 cursor-pointer"
                >
                  Done & Close
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Sample Templates Download Card */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-[var(--bg-raised)] rounded-[var(--radius-md)] border border-[var(--border)]">
                <div>
                  <p className="text-[12px] font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                    <span>Sample Templates for {currentMode.toUpperCase()} Mode:</span>
                  </p>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    Download sample formats tailored specifically with only relevant fields for this mode.
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleDownloadJSONTemplate}
                    className="btn btn-secondary text-[11px] py-1.5 px-3 flex items-center gap-1.5 font-bold hover:text-indigo-500 cursor-pointer"
                  >
                    <FileCode className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Sample JSON ({currentMode})</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadCSVTemplate}
                    className="btn btn-secondary text-[11px] py-1.5 px-3 flex items-center gap-1.5 font-bold hover:text-emerald-500 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Sample CSV ({currentMode})</span>
                  </button>
                </div>
              </div>

              {/* Format & Input Mode Selectors */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
                {/* Format selection */}
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <span className="text-[11px] text-[var(--text-muted)] font-mono uppercase">Format:</span>
                  <div className="flex items-center p-0.5 bg-[var(--bg-input)] rounded-lg">
                    <button
                      type="button"
                      onClick={() => handleFormatSwitch('json')}
                      className={`py-1.5 px-3 rounded-md transition cursor-pointer flex items-center gap-1.5 text-xs ${
                        importFormat === 'json'
                          ? 'bg-[var(--bg-card)] text-[var(--accent)] font-bold shadow-xs'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <FileCode className="w-3.5 h-3.5" />
                      <span>JSON (Structured)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFormatSwitch('csv')}
                      className={`py-1.5 px-3 rounded-md transition cursor-pointer flex items-center gap-1.5 text-xs ${
                        importFormat === 'csv'
                          ? 'bg-[var(--bg-card)] text-[var(--accent)] font-bold shadow-xs'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>CSV (Spreadsheet)</span>
                    </button>
                  </div>
                </div>

                {/* Input mode selection */}
                <div className="flex items-center p-0.5 bg-[var(--bg-input)] rounded-lg text-xs">
                  <button
                    type="button"
                    onClick={() => setInputMode('file')}
                    className={`py-1.5 px-3 rounded-md transition cursor-pointer flex items-center gap-1.5 ${
                      inputMode === 'file'
                        ? 'bg-[var(--bg-card)] text-[var(--text-primary)] font-bold shadow-xs'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <Upload className="w-3 h-3" />
                    <span>Upload File</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputMode('text')}
                    className={`py-1.5 px-3 rounded-md transition cursor-pointer flex items-center gap-1.5 ${
                      inputMode === 'text'
                        ? 'bg-[var(--bg-card)] text-[var(--text-primary)] font-bold shadow-xs'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <FileText className="w-3 h-3" />
                    <span>Paste Text</span>
                  </button>
                </div>
              </div>

              {/* Upload Input Area */}
              {inputMode === 'file' ? (
                <div>
                  <input
                    id="bulk-question-file-input"
                    ref={fileInputRef}
                    type="file"
                    accept={importFormat === 'json' ? '.json' : '.csv'}
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  {uploadedFile ? (
                    <div className="p-4 bg-[var(--bg-raised)] border border-[var(--border-accent)] rounded-[var(--radius-lg)] flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-[var(--accent-dim)] text-[var(--accent)] flex items-center justify-center shrink-0">
                          {importFormat === 'json' ? <FileCode className="w-5 h-5" /> : <FileSpreadsheet className="w-5 h-5" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] font-bold text-[var(--text-primary)] truncate">
                            {uploadedFile.name}
                          </p>
                          <p className="text-[11px] text-[var(--text-muted)] font-mono">
                            {(uploadedFile.size / 1024).toFixed(1)} KB • {importFormat.toUpperCase()} format
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <label
                          htmlFor="bulk-question-file-input"
                          className="btn btn-secondary text-xs py-1.5 px-3 cursor-pointer"
                        >
                          Change File
                        </label>
                        <button
                          type="button"
                          onClick={handleResetUpload}
                          className="p-1.5 text-[var(--text-muted)] hover:text-rose-500 rounded transition cursor-pointer"
                          title="Remove file"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label
                      htmlFor="bulk-question-file-input"
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={`block border-2 border-dashed rounded-[var(--radius-lg)] p-8 text-center transition cursor-pointer space-y-2.5 ${
                        isDragging
                          ? 'border-[var(--accent)] bg-[var(--accent-dim)]'
                          : 'border-[var(--border-strong)] hover:border-[var(--accent)] bg-[var(--bg-input)]/40 hover:bg-[var(--bg-input)]'
                      }`}
                    >
                      <div className="w-12 h-12 mx-auto rounded-full bg-[var(--accent-dim)] text-[var(--accent)] flex items-center justify-center">
                        <Upload className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="text-[13px] font-bold text-[var(--text-primary)]">
                          Click to browse or drop your {importFormat.toUpperCase()} file
                        </p>
                        <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                          Accepts valid <strong>.{importFormat}</strong> format for {currentMode.toUpperCase()} mode
                        </p>
                      </div>
                    </label>
                  )}
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[12px] font-semibold text-[var(--text-secondary)]">
                      Paste {importFormat.toUpperCase()} Content ({currentMode.toUpperCase()} mode):
                    </label>
                    {rawText && (
                      <button
                        type="button"
                        onClick={() => handleTextChange('')}
                        className="text-[11px] text-[var(--text-muted)] hover:text-rose-500 cursor-pointer"
                      >
                        Clear Text
                      </button>
                    )}
                  </div>
                  <textarea
                    rows={7}
                    value={rawText}
                    onChange={(e) => handleTextChange(e.target.value)}
                    placeholder={modePlaceholder}
                    className="custom-input font-mono text-[11px] w-full p-3 resize-y"
                  />
                </div>
              )}

              {/* Parse Error Notification */}
              {parseError && (
                <div className="p-3 bg-[var(--red-bg)] border border-[var(--red)]/20 rounded-[var(--radius-sm)] text-[12px] text-[var(--red)] font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{parseError}</span>
                </div>
              )}

              {/* Preview Table */}
              {parsedPreview.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-bold text-[var(--text-primary)]">
                        Parsed Questions Preview:
                      </span>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[var(--bg-input)] text-[var(--text-secondary)]">
                        Total: {parsedPreview.length}
                      </span>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">
                        ✓ {validCount} Valid
                      </span>
                      {errorCount > 0 && (
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold border border-rose-500/20">
                          ✕ {errorCount} Missing Title/Prompt
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="max-h-60 overflow-y-auto border border-[var(--border)] rounded-[var(--radius-md)] overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead className="bg-[var(--bg-input)] text-[var(--text-muted)] font-mono uppercase sticky top-0 border-b border-[var(--border)]">
                        <tr>
                          <th className="py-2 px-3">Status</th>
                          <th className="py-2 px-3">Title</th>
                          <th className="py-2 px-3">Difficulty</th>
                          <th className="py-2 px-3">Prompt Excerpt</th>
                          {currentMode === 'mcq' ? (
                            <>
                              <th className="py-2 px-3 text-center">Choices & Key</th>
                              <th className="py-2 px-3">Explanation</th>
                            </>
                          ) : currentMode === 'verbal_qa' ? (
                            <>
                              <th className="py-2 px-3">Model Answer</th>
                              <th className="py-2 px-3 text-center">Rubrics & Tips</th>
                            </>
                          ) : currentMode === 'whiteboard' || currentMode === 'discussion' ? (
                            <>
                              <th className="py-2 px-3">Scenario</th>
                              <th className="py-2 px-3 text-center">Points & Tradeoffs</th>
                            </>
                          ) : currentMode === 'database' ? (
                            <>
                              <th className="py-2 px-3">Schema DDL</th>
                              <th className="py-2 px-3">Expected SQL</th>
                            </>
                          ) : currentMode === 'frontend' ? (
                            <>
                              <th className="py-2 px-3">Starter Component</th>
                              <th className="py-2 px-3">Constraints</th>
                            </>
                          ) : (
                            <>
                              <th className="py-2 px-3 text-center">Test Cases</th>
                              <th className="py-2 px-3 text-center">Templates</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border)]">
                        {parsedPreview.map((item, i) => (
                          <tr key={i} className="hover:bg-[var(--bg-hover)]">
                            <td className="py-2 px-3 whitespace-nowrap">
                              {item.status === 'valid' ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                  <CheckCircle2 className="w-3 h-3" /> Ready
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-rose-600 dark:text-rose-400" title={item.message}>
                                  <AlertCircle className="w-3 h-3" /> {item.message}
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 font-semibold text-[var(--text-primary)]">
                              {item.title || <span className="text-rose-500 italic">Empty</span>}
                            </td>
                            <td className="py-2 px-3">
                              <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                                item.difficulty === 'Easy' ? 'bg-emerald-500/10 text-emerald-600' :
                                item.difficulty === 'Hard' ? 'bg-rose-500/10 text-rose-600' : 'bg-amber-500/10 text-amber-600'
                              }`}>
                                {item.difficulty}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-[var(--text-secondary)] truncate max-w-[180px]">
                              {item.prompt || <span className="text-rose-500 italic">Empty</span>}
                            </td>

                            {/* Mode specific dynamic columns */}
                            {currentMode === 'mcq' ? (
                              <>
                                <td className="py-2 px-3 text-center font-mono">
                                  {item.mcqOptionsCount > 0 ? (
                                    <span className="text-emerald-600 font-bold">
                                      {item.mcqOptionsCount} Options (Key: {item.rawItem?.detail?.correct_option || '—'})
                                    </span>
                                  ) : (
                                    <span className="text-[var(--text-muted)]">—</span>
                                  )}
                                </td>
                                <td className="py-2 px-3 text-[var(--text-secondary)] truncate max-w-[160px]">
                                  {item.rawItem?.detail?.explanation || '—'}
                                </td>
                              </>
                            ) : currentMode === 'verbal_qa' ? (
                              <>
                                <td className="py-2 px-3 text-[var(--text-secondary)] truncate max-w-[180px]">
                                  {item.rawItem?.detail?.ideal_answer || '—'}
                                </td>
                                <td className="py-2 px-3 font-mono text-center text-[var(--text-muted)]">
                                  {item.hintsCount > 0 ? (
                                    <span className="text-amber-600 font-bold">{item.hintsCount} rubrics/tips</span>
                                  ) : '—'}
                                </td>
                              </>
                            ) : currentMode === 'whiteboard' || currentMode === 'discussion' ? (
                              <>
                                <td className="py-2 px-3 text-[var(--text-secondary)] truncate max-w-[180px]">
                                  {item.rawItem?.detail?.scenario || '—'}
                                </td>
                                <td className="py-2 px-3 font-mono text-center text-[var(--text-muted)]">
                                  {item.hintsCount > 0 ? (
                                    <span className="text-indigo-600 font-bold">{item.hintsCount} points/tradeoffs</span>
                                  ) : '—'}
                                </td>
                              </>
                            ) : currentMode === 'database' ? (
                              <>
                                <td className="py-2 px-3 font-mono text-[var(--text-secondary)] truncate max-w-[160px]">
                                  {item.rawItem?.templates?.[0]?.starter_code ? '✓ Schema DDL' : '—'}
                                </td>
                                <td className="py-2 px-3 font-mono text-[var(--text-secondary)] truncate max-w-[160px]">
                                  {item.rawItem?.detail?.expected_approach || '—'}
                                </td>
                              </>
                            ) : currentMode === 'frontend' ? (
                              <>
                                <td className="py-2 px-3 font-mono text-[var(--text-secondary)] truncate max-w-[160px]">
                                  {item.rawItem?.templates?.[0]?.starter_code ? '✓ React JSX' : '—'}
                                </td>
                                <td className="py-2 px-3 text-[var(--text-secondary)] truncate max-w-[160px]">
                                  {item.rawItem?.detail?.constraints || '—'}
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="py-2 px-3 font-mono text-center text-[var(--text-muted)]">
                                  {item.testCasesCount > 0 ? (
                                    <span className="text-[var(--accent)] font-bold">{item.testCasesCount} cases</span>
                                  ) : '—'}
                                </td>
                                <td className="py-2 px-3 font-mono text-center text-[var(--text-muted)]">
                                  {item.templatesCount > 0 ? (
                                    <span className="text-indigo-600 font-bold">{item.templatesCount} langs</span>
                                  ) : '—'}
                                </td>
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        {!importResult && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--border)] shrink-0 bg-[var(--bg-raised)]/70">
            <div className="text-[12px] text-[var(--text-muted)]">
              {validCount > 0 ? (
                <span><strong>{validCount}</strong> questions ready for Level {currentLevel?.level_number}</span>
              ) : (
                <span>Upload or paste question content to validate</span>
              )}
            </div>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleClose}
                className="btn btn-secondary text-xs py-2 px-4 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={validCount === 0 || loading}
                onClick={handleSubmit}
                className="btn btn-primary text-xs py-2 px-5 flex items-center gap-1.5 shadow-[var(--shadow-sm)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Importing {validCount} Questions...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5" />
                    <span>Import {validCount} Questions</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
