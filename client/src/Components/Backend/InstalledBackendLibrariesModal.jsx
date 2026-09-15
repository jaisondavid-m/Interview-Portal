import React, { useState } from 'react';
import {
  Package,
  Check,
  Copy,
  X,
  Search,
  CheckCircle2,
  Sparkles,
  ExternalLink,
  Code2,
  Server,
  Layers,
  Terminal
} from 'lucide-react';

export const INSTALLED_BACKEND_LIBRARIES = {
  javascript: [
    {
      id: 'express',
      name: 'express',
      version: '4.19.2',
      category: 'Web Frameworks',
      description: 'Fast, unopinionated, minimalist web framework for building robust RESTful APIs, routes, and middleware pipelines.',
      importExample: "const express = require('express');\nconst app = express();\napp.use(express.json());\napp.get('/api/tasks', (req, res) => res.json({ tasks: [] }));",
      badgeColor: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
    },
    {
      id: 'fastify',
      name: 'fastify',
      version: '4.26.2',
      category: 'Web Frameworks',
      description: 'Extremely fast and low overhead web framework focused on speed and JSON schema compilation.',
      importExample: "const fastify = require('fastify')({ logger: true });\nfastify.get('/ping', async (request, reply) => ({ pong: true }));",
      badgeColor: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
    },
    {
      id: 'jsonwebtoken',
      name: 'jsonwebtoken (JWT)',
      version: '9.0.2',
      category: 'Auth & Security',
      description: 'Industry standard JSON Web Token generator and verifier for stateless authentication & role-based authorization.',
      importExample: "const jwt = require('jsonwebtoken');\nconst token = jwt.sign({ userId: 123, role: 'admin' }, 'secret_key', { expiresIn: '1h' });\nconst payload = jwt.verify(token, 'secret_key');",
      badgeColor: 'bg-purple-500/10 text-purple-500 border-purple-500/30',
    },
    {
      id: 'bcryptjs',
      name: 'bcryptjs',
      version: '2.4.3',
      category: 'Auth & Security',
      description: 'Cryptographic password hashing library implementing Blowfish cipher with salt rounds for secure credentials storage.',
      importExample: "const bcrypt = require('bcryptjs');\nconst hash = await bcrypt.hash('mySecretPassword', 10);\nconst isValid = await bcrypt.compare('mySecretPassword', hash);",
      badgeColor: 'bg-rose-500/10 text-rose-500 border-rose-500/30',
    },
    {
      id: 'zod',
      name: 'zod',
      version: '3.22.4',
      category: 'Validation',
      description: 'TypeScript/JavaScript schema validation library with strict type checking, regex rules, and error formatting.',
      importExample: "const { z } = require('zod');\nconst TaskSchema = z.object({ title: z.string().min(3), completed: z.boolean().default(false) });\nconst parsed = TaskSchema.safeParse(req.body);",
      badgeColor: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/30',
    },
    {
      id: 'joi',
      name: 'joi',
      version: '17.12.2',
      category: 'Validation',
      description: 'Powerful schema description language and data validator for JavaScript request bodies and query parameters.',
      importExample: "const Joi = require('joi');\nconst schema = Joi.object({ username: Joi.string().alphanum().min(3).required(), email: Joi.string().email().required() });",
      badgeColor: 'bg-sky-500/10 text-sky-500 border-sky-500/30',
    },
    {
      id: 'sqlite3',
      name: 'sqlite3 / better-sqlite3',
      version: '5.1.7',
      category: 'Databases & Cache',
      description: 'Embedded synchronous/asynchronous SQL database engine for fast in-memory transactions and table storage.',
      importExample: "const sqlite3 = require('sqlite3').verbose();\nconst db = new sqlite3.Database(':memory:');\ndb.run('CREATE TABLE users (id INT, name TEXT)');",
      badgeColor: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
    },
    {
      id: 'pg',
      name: 'pg (node-postgres)',
      version: '8.11.3',
      category: 'Databases & Cache',
      description: 'Non-blocking PostgreSQL client for Node.js with connection pooling and parameterized query execution.',
      importExample: "const { Pool } = require('pg');\nconst pool = new Pool();\nconst res = await pool.query('SELECT * FROM accounts WHERE id = $1', [userId]);",
      badgeColor: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/30',
    },
    {
      id: 'ioredis',
      name: 'ioredis',
      version: '5.3.2',
      category: 'Databases & Cache',
      description: 'Robust, full-featured Redis client supporting clusters, pipelines, Pub/Sub, and sliding window rate limiting.',
      importExample: "const Redis = require('ioredis');\nconst redis = new Redis();\nawait redis.set('session:123', 'active', 'EX', 3600);\nconst status = await redis.get('session:123');",
      badgeColor: 'bg-red-500/10 text-red-500 border-red-500/30',
    },
    {
      id: 'supertest',
      name: 'supertest / axios',
      version: '6.3.4',
      category: 'Testing & Mocking',
      description: 'High-level HTTP assertion library for testing Node.js API endpoints and response status codes.',
      importExample: "const request = require('supertest');\nconst res = await request(app).post('/api/tasks').send({ title: 'Test Task' }).expect(201);",
      badgeColor: 'bg-teal-500/10 text-teal-500 border-teal-500/30',
    },
    {
      id: 'lodash',
      name: 'lodash',
      version: '4.17.21',
      category: 'Concurrency & Utilities',
      description: 'Utility library providing debounce, throttle, deep cloning, chunking, memoization, and data manipulation.',
      importExample: "const _ = require('lodash');\nconst grouped = _.groupBy(tasks, 'status');\nconst throttled = _.throttle(processBatch, 1000);",
      badgeColor: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
    },
    {
      id: 'uuid',
      name: 'uuid / nanoid',
      version: '9.0.1',
      category: 'Concurrency & Utilities',
      description: 'Cryptographically secure unique identifier generator for idempotency keys, task IDs, and distributed tracing.',
      importExample: "const { v4: uuidv4 } = require('uuid');\nconst transactionId = uuidv4();",
      badgeColor: 'bg-violet-500/10 text-violet-500 border-violet-500/30',
    },
  ],
  python: [
    {
      id: 'fastapi',
      name: 'FastAPI',
      version: '0.110.0',
      category: 'Web Frameworks',
      description: 'Modern, high-performance web framework for building APIs with Python 3.8+ based on standard Python type hints.',
      importExample: "from fastapi import FastAPI, HTTPException\napp = FastAPI()\n\n@app.get('/api/items/{item_id}')\ndef read_item(item_id: int): return {'item_id': item_id}",
      badgeColor: 'bg-teal-500/10 text-teal-500 border-teal-500/30',
    },
    {
      id: 'flask',
      name: 'Flask',
      version: '3.0.2',
      category: 'Web Frameworks',
      description: 'Lightweight WSGI web application framework designed to make getting started quick and easy with REST routes.',
      importExample: "from flask import Flask, request, jsonify\napp = Flask(__name__)\n\n@app.route('/api/tasks', methods=['POST'])\ndef create_task(): return jsonify({'success': True}), 201",
      badgeColor: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
    },
    {
      id: 'pydantic',
      name: 'Pydantic',
      version: '2.6.4',
      category: 'Validation',
      description: 'Data validation and settings management using Python type annotations with fast Rust core validation.',
      importExample: "from pydantic import BaseModel, Field, EmailStr\n\nclass UserPayload(BaseModel):\n    name: str = Field(min_length=2)\n    email: EmailStr\n    age: int = Field(ge=18)",
      badgeColor: 'bg-rose-500/10 text-rose-500 border-rose-500/30',
    },
    {
      id: 'sqlalchemy',
      name: 'SQLAlchemy',
      version: '2.0.28',
      category: 'Databases & Cache',
      description: 'The Python SQL toolkit and Object Relational Mapper (ORM) providing full power and flexibility of SQL.',
      importExample: "from sqlalchemy import create_engine, Column, Integer, String\nfrom sqlalchemy.orm import declarative_base, sessionmaker\n\nBase = declarative_base()\nengine = create_engine('sqlite:///:memory:')",
      badgeColor: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
    },
    {
      id: 'pyjwt',
      name: 'PyJWT / passlib',
      version: '2.8.0',
      category: 'Auth & Security',
      description: 'JSON Web Token implementation and password hashing context (bcrypt / argon2) for security and auth middleware.',
      importExample: "import jwt\nfrom passlib.context import CryptContext\n\npwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto')\ntoken = jwt.encode({'sub': 'user123', 'role': 'admin'}, 'secret', algorithm='HS256')",
      badgeColor: 'bg-purple-500/10 text-purple-500 border-purple-500/30',
    },
    {
      id: 'httpx',
      name: 'httpx / pytest',
      version: '0.27.0',
      category: 'Testing & Mocking',
      description: 'Fully featured HTTP client for Python 3 with synchronous and asynchronous API testing support.',
      importExample: "import httpx\nwith httpx.Client(base_url='http://localhost:8000') as client:\n    response = client.post('/api/tasks', json={'title': 'Build API'})\n    assert response.status_code == 201",
      badgeColor: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
    },
  ],
  go: [
    {
      id: 'net-http',
      name: 'net/http & encoding/json',
      version: 'Standard Lib',
      category: 'Web Frameworks',
      description: 'Standard Go HTTP server and JSON encoding/decoding package offering high concurrency and native zero-dependency speed.',
      importExample: "package main\nimport (\n  \"encoding/json\"\n  \"net/http\"\n)\nfunc handler(w http.ResponseWriter, r *http.Request) {\n  w.WriteHeader(http.StatusOK)\n  json.NewEncoder(w).Encode(map[string]string{\"status\": \"ok\"})\n}",
      badgeColor: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/30',
    },
    {
      id: 'gin',
      name: 'gin-gonic/gin',
      version: '1.9.1',
      category: 'Web Frameworks',
      description: 'High performance HTTP web framework featuring a Martini-like API with up to 40 times faster performance.',
      importExample: "package main\nimport \"github.com/gin-gonic/gin\"\n\nfunc main() {\n  r := gin.Default()\n  r.GET(\"/api/tasks\", func(c *gin.Context) { c.JSON(200, gin.H{\"tasks\": []}) })\n  r.Run(\":8080\")\n}",
      badgeColor: 'bg-teal-500/10 text-teal-500 border-teal-500/30',
    },
    {
      id: 'chi',
      name: 'go-chi/chi',
      version: '5.0.12',
      category: 'Web Frameworks',
      description: 'Lightweight, idiomatic and composable router for building Go HTTP services with middleware chaining.',
      importExample: "package main\nimport (\n  \"net/http\"\n  \"github.com/go-chi/chi/v5\"\n)\nfunc main() {\n  r := chi.NewRouter()\n  r.Get(\"/health\", func(w http.ResponseWriter, r *http.Request) { w.Write([]byte(\"OK\")) })\n}",
      badgeColor: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
    },
    {
      id: 'gorm',
      name: 'gorm.io/gorm',
      version: '1.25.7',
      category: 'Databases & Cache',
      description: 'Developer-friendly ORM library for Golang featuring associations, hooks, preloading, and transactions.',
      importExample: "import (\n  \"gorm.io/gorm\"\n  \"gorm.io/driver/sqlite\"\n)\ntype User struct { gorm.Model; Name string }\ndb, _ := gorm.Open(sqlite.Open(\":memory:\"), &gorm.Config{})\ndb.AutoMigrate(&User{})",
      badgeColor: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/30',
    },
    {
      id: 'sync-concurrency',
      name: 'sync / goroutines / channels',
      version: 'Standard Lib',
      category: 'Concurrency & Utilities',
      description: 'Native Go synchronization primitives including sync.Mutex, sync.RWMutex, sync.WaitGroup, worker pools, and buffered channels.',
      importExample: "var mu sync.Mutex\nvar wg sync.WaitGroup\nch := make(chan int, 100)\n\nwg.Add(1)\ngo func() {\n  defer wg.Done()\n  mu.Lock()\n  defer mu.Unlock()\n  ch <- 42\n}()\nwg.Wait()",
      badgeColor: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
    },
  ],
  java: [
    {
      id: 'java-http',
      name: 'java.net.http & com.sun.net.httpserver',
      version: 'Java 17+',
      category: 'Web Frameworks',
      description: 'Built-in JDK HTTP server and HttpClient for building lightweight endpoints without heavy framework dependencies.',
      importExample: "HttpServer server = HttpServer.create(new InetSocketAddress(8080), 0);\nserver.createContext(\"/api/tasks\", exchange -> {\n    String res = \"{\\\"status\\\":\\\"ok\\\"}\";\n    exchange.sendResponseHeaders(200, res.length());\n    exchange.getResponseBody().write(res.getBytes());\n});\nserver.start();",
      badgeColor: 'bg-orange-500/10 text-orange-500 border-orange-500/30',
    },
    {
      id: 'org-json',
      name: 'org.json / Jackson',
      version: '2.17.0',
      category: 'Validation',
      description: 'JSON parsing, object mapping, and serialization library for Java REST services.',
      importExample: "JSONObject json = new JSONObject(requestBody);\nString title = json.getString(\"title\");\nboolean completed = json.optBoolean(\"completed\", false);",
      badgeColor: 'bg-purple-500/10 text-purple-500 border-purple-500/30',
    },
    {
      id: 'java-concurrency',
      name: 'java.util.concurrent',
      version: 'Java 17+',
      category: 'Concurrency & Utilities',
      description: 'ExecutorService, ConcurrentHashMap, ReentrantLock, BlockingQueue, and Atomic variables for multi-threaded server pipelines.',
      importExample: "ExecutorService pool = Executors.newFixedThreadPool(10);\nConcurrentMap<String, Object> cache = new ConcurrentHashMap<>();\nBlockingQueue<Task> queue = new LinkedBlockingQueue<>();",
      badgeColor: 'bg-rose-500/10 text-rose-500 border-rose-500/30',
    },
  ],
};

const CATEGORIES = [
  'All',
  'Web Frameworks',
  'Auth & Security',
  'Validation',
  'Databases & Cache',
  'Testing & Mocking',
  'Concurrency & Utilities',
];

export default function InstalledBackendLibrariesModal({ isOpen, onClose, activeLang = 'javascript' }) {
  const [selectedLang, setSelectedLang] = useState(activeLang || 'javascript');
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [copiedId, setCopiedId] = useState(null);

  if (!isOpen) return null;

  const currentLibraries = INSTALLED_BACKEND_LIBRARIES[selectedLang] || INSTALLED_BACKEND_LIBRARIES.javascript;

  const filtered = currentLibraries.filter((pkg) => {
    const matchesCat = selectedCategory === 'All' || pkg.category === selectedCategory;
    const matchesSearch =
      pkg.name.toLowerCase().includes(search.toLowerCase()) ||
      pkg.description.toLowerCase().includes(search.toLowerCase()) ||
      pkg.category.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleCopy = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-4xl max-h-[90vh] bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-[var(--text-primary)]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--border)] bg-[var(--bg-raised)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--accent)]/15 border border-[var(--accent)]/30 flex items-center justify-center text-[var(--accent)] shadow-sm">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-[var(--text-primary)]">Pre-installed Backend Libraries</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Ready in Sandbox
                </span>
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Full-featured frameworks, validation, authentication, and database modules ready to import in candidate code.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Language Tabs & Filters Bar */}
        <div className="p-4 border-b border-[var(--border)] bg-[var(--bg-card)] space-y-3">
          {/* Language Switcher */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1.5 p-1 bg-[var(--bg-raised)] rounded-xl border border-[var(--border)]">
              {[
                { id: 'javascript', label: 'Node.js / JavaScript' },
                { id: 'python', label: 'Python 3' },
                { id: 'go', label: 'Go (Golang)' },
                { id: 'java', label: 'Java 17+' },
              ].map((lang) => (
                <button
                  key={lang.id}
                  type="button"
                  onClick={() => setSelectedLang(lang.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition ${
                    selectedLang === lang.id
                      ? 'bg-[var(--accent)] text-white shadow-sm'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)]'
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search packages, modules..."
                className="w-full bg-[var(--bg-raised)] border border-[var(--border)] rounded-xl pl-9 pr-3 py-1.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition"
              />
            </div>
          </div>

          {/* Category Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition ${
                  selectedCategory === cat
                    ? 'bg-[var(--bg-raised)] text-[var(--text-primary)] font-bold border border-[var(--border)] shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-raised)]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Packages Grid */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3 max-h-[60vh]">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-[var(--text-muted)]">
              <Package className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium">No matching packages found</p>
              <p className="text-xs mt-1">Try clearing your search or switching categories</p>
            </div>
          ) : (
            filtered.map((pkg) => {
              const isCopied = copiedId === pkg.id;
              return (
                <div
                  key={pkg.id}
                  className="panel-card p-4 border border-[var(--border)] hover:border-[var(--accent)]/50 transition-all group relative bg-[var(--bg-card)] rounded-xl shadow-xs"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-sm text-[var(--text-primary)] group-hover:text-[var(--accent)] transition">
                          {pkg.name}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--bg-raised)] text-[var(--text-muted)] border border-[var(--border)]">
                          v{pkg.version}
                        </span>
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${pkg.badgeColor}`}>
                          {pkg.category}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                        {pkg.description}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCopy(pkg.id, pkg.importExample)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition shrink-0 ${
                        isCopied
                          ? 'bg-emerald-500 text-white'
                          : 'bg-[var(--bg-raised)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] border border-[var(--border)]'
                      }`}
                      title="Copy code snippet to clipboard"
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Snippet</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Code snippet display */}
                  <div className="mt-3 p-2.5 rounded-lg bg-[var(--bg-raised)] border border-[var(--border)] font-mono text-[11px] text-[var(--text-muted)] overflow-x-auto whitespace-pre leading-relaxed select-all">
                    {pkg.importExample}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[var(--border)] bg-[var(--bg-raised)] flex items-center justify-between text-xs text-[var(--text-muted)]">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[var(--accent)]" />
            <span>All modules are pre-cached in the local sandbox compiler for fast execution.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-primary text-xs py-1.5 px-4 font-bold"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
