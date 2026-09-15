package controllers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"runtime"
	"strings"
	"time"
)

// EvalTestCase represents an input test case to be verified via Standard I/O (stdin/stdout)
type EvalTestCase struct {
	Index          int    `json:"index"`
	IsHidden       bool   `json:"is_hidden"`
	Name           string `json:"name"`
	Input          string `json:"input"`
	ExpectedOutput string `json:"expected"`
}

const fastapiInit = `import sys, json

class _Request:
    def __init__(self):
        self.method = 'POST'
        self.path = '/'
        self.headers = {}
        self._parsed = False
        self._body = {}

    def _parse(self):
        if not self._parsed:
            self._parsed = True
            raw = sys.stdin.read().strip()
            if not raw:
                return
            lines = raw.split('\\n')
            first_line = lines[0].strip()
            parts = first_line.split()
            verbs = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']
            body_str = ''
            if parts and parts[0].upper() in verbs:
                self.method = parts[0].upper()
                self.path = parts[1] if len(parts) > 1 else '/'
                if len(parts) > 2:
                    body_str = first_line[first_line.find(self.path) + len(self.path):].strip()
                    if len(lines) > 1:
                        body_str += '\\n' + '\\n'.join(lines[1:]).strip()
                else:
                    body_str = '\\n'.join(lines[1:]).strip()
            else:
                body_str = raw

            if body_str:
                try:
                    self._body = json.loads(body_str)
                except Exception:
                    self._body = body_str

    def json(self):
        self._parse()
        return self._body if isinstance(self._body, dict) else {}

request = _Request()

def FastAPI():
    app = _FastAPI()
    return app

class _FastAPI:
    def __init__(self):
        self.routes = []

    def get(self, path):
        def decorator(func):
            self.routes.append((path, ['GET'], func))
            return func
        return decorator

    def post(self, path):
        def decorator(func):
            self.routes.append((path, ['POST'], func))
            return func
        return decorator

    def put(self, path):
        def decorator(func):
            self.routes.append((path, ['PUT'], func))
            return func
        return decorator

    def delete(self, path):
        def decorator(func):
            self.routes.append((path, ['DELETE'], func))
            return func
        return decorator

    def patch(self, path):
        def decorator(func):
            self.routes.append((path, ['PATCH'], func))
            return func
        return decorator

    def run(self, *args, **kwargs):
        request._parse()
        handler = None
        for route, methods, func in self.routes:
            if request.method in methods and route == request.path:
                handler = func
                break
        if not handler and self.routes:
            handler = self.routes[0][2]
        if handler:
            res = handler(request)
            status_code = 200
            data = res
            if isinstance(res, tuple):
                data = res[0]
                if len(res) > 1:
                    status_code = res[1]
            print(status_code)
            if isinstance(data, (dict, list)):
                print(json.dumps(data))
            else:
                print(data)
        else:
            print(404)
            print('{"detail": "Not Found"}')
# Auto-run if script is executed directly
if __name__ == "__main__":
    try:
        app.run()
    except NameError:
        pass
`

// EvalResult represents the verdict for an individual test case
type EvalResult struct {
	Index       int    `json:"index"`
	IsHidden    bool   `json:"is_hidden"`
	Name        string `json:"name"`
	Input       string `json:"input"`
	Expected    string `json:"expected"`
	Actual      string `json:"actual"`
	Passed      bool   `json:"passed"`
	ExecutionMs int    `json:"execution_ms"`
}

// ExecuteTestCases runs candidate code against the test case queue with pure Standard I/O (stdin -> stdout)
func ExecuteTestCases(code string, lang string, testCases []EvalTestCase) ([]EvalResult, error) {
	trimmedCode := strings.TrimSpace(code)
	if trimmedCode == "" {
		results := make([]EvalResult, len(testCases))
		for i, tc := range testCases {
			results[i] = EvalResult{
				Index:       tc.Index,
				IsHidden:    tc.IsHidden,
				Name:        tc.Name,
				Input:       tc.Input,
				Expected:    tc.ExpectedOutput,
				Actual:      "No code submitted",
				Passed:      false,
				ExecutionMs: 0,
			}
		}
		return results, nil
	}

	normLang := normalizeLanguage(lang)

	switch normLang {
	case "c":
		return executeC(trimmedCode, testCases, false)
	case "go":
		return executeGo(trimmedCode, testCases, false)
	case "python":
		return executePython(trimmedCode, testCases, false)
	case "javascript":
		return executeJavaScript(trimmedCode, testCases, false)
	case "cpp":
		return executeCpp(trimmedCode, testCases, false)
	case "java":
		return executeJava(trimmedCode, testCases, false)
	default:
		return executeJavaScript(trimmedCode, testCases, false)
	}
}

// ExecuteCustomInput runs candidate code with custom stdin input
func ExecuteCustomInput(code string, lang string, customInput string) (EvalResult, error) {
	trimmedCode := strings.TrimSpace(code)
	if trimmedCode == "" {
		return EvalResult{
			Index:       1,
			IsHidden:    false,
			Name:        "Custom Input Case",
			Input:       customInput,
			Expected:    "(Standard Output)",
			Actual:      "No code submitted",
			Passed:      false,
			ExecutionMs: 0,
		}, nil
	}

	tc := []EvalTestCase{
		{
			Index:          1,
			IsHidden:       false,
			Name:           "Custom Input",
			Input:          customInput,
			ExpectedOutput: "",
		},
	}

	normLang := normalizeLanguage(lang)
	var results []EvalResult
	var err error

	switch normLang {
	case "c":
		results, err = executeC(trimmedCode, tc, true)
	case "go":
		results, err = executeGo(trimmedCode, tc, true)
	case "python":
		results, err = executePython(trimmedCode, tc, true)
	case "javascript":
		results, err = executeJavaScript(trimmedCode, tc, true)
	case "cpp":
		results, err = executeCpp(trimmedCode, tc, true)
	case "java":
		results, err = executeJava(trimmedCode, tc, true)
	default:
		results, err = executeJavaScript(trimmedCode, tc, true)
	}

	if err != nil || len(results) == 0 {
		return EvalResult{
			Index:       1,
			IsHidden:    false,
			Name:        "Custom Input",
			Input:       customInput,
			Expected:    "(Standard Output)",
			Actual:      "Execution failed",
			Passed:      false,
			ExecutionMs: 0,
		}, err
	}

	return results[0], nil
}

func normalizeLanguage(lang string) string {
	l := strings.ToLower(strings.TrimSpace(lang))
	switch l {
	case "c", "gcc", "clang":
		return "c"
	case "go", "golang":
		return "go"
	case "py", "python", "python3":
		return "python"
	case "js", "javascript", "node", "nodejs":
		return "javascript"
	case "cpp", "c++", "g++", "clang++":
		return "cpp"
	case "java", "openjdk", "jvm":
		return "java"
	default:
		return "javascript"
	}
}

// ============================================================
// C EXECUTOR (gcc / clang)
// ============================================================
func executeC(code string, testCases []EvalTestCase, isCustom bool) ([]EvalResult, error) {
	cCompiler, err := findExecutable("gcc", "clang", "/usr/bin/gcc", "/usr/local/bin/gcc", "/usr/bin/clang")
	if err != nil {
		return executeViaRemote("c", code, testCases, isCustom)
	}

	tmpDir, err := os.MkdirTemp("", "mockmate_c_*")
	if err != nil {
		return executeViaRemote("c", code, testCases, isCustom)
	}
	defer os.RemoveAll(tmpDir)

	srcPath := filepath.Join(tmpDir, "solution.c")
	binName := "solution"
	if runtime.GOOS == "windows" {
		binName = "solution.exe"
	}
	binPath := filepath.Join(tmpDir, binName)

	if err := os.WriteFile(srcPath, []byte(code), 0644); err != nil {
		return executeViaRemote("c", code, testCases, isCustom)
	}

	// Compile C code with C11 standard and math library (-lm)
	ctxCompile, cancelCompile := context.WithTimeout(context.Background(), 7*time.Second)
	defer cancelCompile()

	compileCmd := exec.CommandContext(ctxCompile, cCompiler, "-O2", "-std=c11", srcPath, "-o", binPath, "-lm")
	var compileStderr bytes.Buffer
	compileCmd.Stderr = &compileStderr

	if err := compileCmd.Run(); err != nil {
		errStr := strings.TrimSpace(compileStderr.String())
		if errStr == "" {
			errStr = err.Error()
		}
		return makeErrorResults(testCases, "C Compilation Error:\n"+errStr), nil
	}

	return runCommandPerTestCase(binPath, []string{}, testCases, isCustom)
}

// ============================================================
// GOLANG EXECUTOR
// ============================================================
func prepareGoBackendCode(code string) string {
	if !strings.Contains(code, "http.ListenAndServe") && !strings.Contains(code, "http.ListenAndServeTLS") {
		return code
	}

	dispatcherCode := `
func mockmateRunHTTP() {
	raw, err := io.ReadAll(os.Stdin)
	if err != nil {
		return
	}
	text := strings.TrimSpace(string(raw))
	if text == "" {
		return
	}
	lines := strings.Split(text, "\n")
	firstLine := strings.TrimSpace(lines[0])
	parts := strings.Fields(firstLine)
	method := "GET"
	path := "/"
	bodyStr := ""
	if len(parts) > 0 {
		u := strings.ToUpper(parts[0])
		if u == "GET" || u == "POST" || u == "PUT" || u == "PATCH" || u == "DELETE" || u == "OPTIONS" || u == "HEAD" {
			method = u
			if len(parts) > 1 {
				path = parts[1]
			}
			if len(parts) > 2 {
				idx := strings.Index(firstLine, path)
				bodyStr = strings.TrimSpace(firstLine[idx+len(path):])
				if len(lines) > 1 {
					bodyStr += "\n" + strings.TrimSpace(strings.Join(lines[1:], "\n"))
				}
			} else if len(lines) > 1 {
				bodyStr += "\n" + strings.TrimSpace(strings.Join(lines[1:], "\n"))
			}
		} else {
			bodyStr = text
		}
	} else {
		bodyStr = text
	}

	req := httptest.NewRequest(method, path, strings.NewReader(bodyStr))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	http.DefaultServeMux.ServeHTTP(rec, req)
	fmt.Println(rec.Code)
	bodyOutput := strings.TrimSpace(rec.Body.String())
	if bodyOutput != "" {
		fmt.Println(bodyOutput)
	}
	os.Exit(0)
}
`
	modCode := strings.Replace(code, "http.ListenAndServeTLS(", "func(a ...interface{}) { mockmateRunHTTP() }(", -1)
	modCode = strings.Replace(modCode, "http.ListenAndServe(", "func(a ...interface{}) { mockmateRunHTTP() }(", -1)

	reqImports := []string{"\"io\"", "\"strings\"", "\"net/http/httptest\"", "\"os\"", "\"fmt\""}
	for _, imp := range reqImports {
		if !strings.Contains(modCode, imp) {
			if strings.Contains(modCode, "import (") {
				modCode = strings.Replace(modCode, "import (", "import (\n\t"+imp, 1)
			} else if strings.Contains(modCode, "package main") {
				modCode = strings.Replace(modCode, "package main", "package main\nimport "+imp+"\n", 1)
			}
		}
	}

	return modCode + "\n" + dispatcherCode
}

func executeGo(code string, testCases []EvalTestCase, isCustom bool) ([]EvalResult, error) {
	goPath, err := findExecutable("go", "/usr/bin/go", "/usr/local/go/bin/go", "/usr/local/bin/go")
	if err != nil {
		return executeViaRemote("go", code, testCases, isCustom)
	}

	tmpDir, err := os.MkdirTemp("", "mockmate_go_*")
	if err != nil {
		return executeViaRemote("go", code, testCases, isCustom)
	}
	defer os.RemoveAll(tmpDir)

	srcPath := filepath.Join(tmpDir, "main.go")
	binName := "main"
	if runtime.GOOS == "windows" {
		binName = "main.exe"
	}
	binPath := filepath.Join(tmpDir, binName)

	preparedCode := prepareGoBackendCode(code)
	if err := os.WriteFile(srcPath, []byte(preparedCode), 0644); err != nil {
		return executeViaRemote("go", code, testCases, isCustom)
	}

	// Compile Go binary for fast multi-test case execution
	ctxCompile, cancelCompile := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancelCompile()

	compileCmd := exec.CommandContext(ctxCompile, goPath, "build", "-o", binPath, srcPath)
	var compileStderr bytes.Buffer
	compileCmd.Stderr = &compileStderr

	if err := compileCmd.Run(); err != nil {
		errStr := strings.TrimSpace(compileStderr.String())
		if errStr == "" {
			errStr = err.Error()
		}
		return makeErrorResults(testCases, "Go Compilation Error:\n"+errStr), nil
	}

	return runCommandPerTestCase(binPath, []string{}, testCases, isCustom)
}

// ============================================================
// PYTHON EXECUTOR
// ============================================================
func executePython(code string, testCases []EvalTestCase, isCustom bool) ([]EvalResult, error) {
	pythonPath, err := findExecutable("python3", "python", "py", "/usr/bin/python3", "/usr/local/bin/python3", "/usr/bin/python")
	if err != nil {
		// Fallback to Remote API execution if python is not found on host
		return executeViaRemote("python", code, testCases, isCustom)
	}

	// Create temp python file for reliable execution
	tmpDir, err := os.MkdirTemp("", "mockmate_py_*")
	if err != nil {
		return executeViaRemote("python", code, testCases, isCustom)
	}
	defer os.RemoveAll(tmpDir)

	setupPythonEnvironment(tmpDir)

	prepCode := "import sys, os\nsys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))\n" + code
	scriptPath := filepath.Join(tmpDir, "solution.py")
	if err := os.WriteFile(scriptPath, []byte(prepCode), 0644); err != nil {
		return executeViaRemote("python", code, testCases, isCustom)
	}

	return runCommandPerTestCase(pythonPath, []string{scriptPath}, testCases, isCustom)
}

// ============================================================
// JAVASCRIPT EXECUTOR (Node.js)
// ============================================================
func executeJavaScript(code string, testCases []EvalTestCase, isCustom bool) ([]EvalResult, error) {
	nodePath, err := findExecutable("node", "nodejs", "/usr/bin/node", "/usr/local/bin/node", "/usr/bin/nodejs")
	if err != nil {
		return executeViaRemote("javascript", code, testCases, isCustom)
	}

	tmpDir, err := os.MkdirTemp("", "mockmate_js_*")
	if err != nil {
		return executeViaRemote("javascript", code, testCases, isCustom)
	}
	defer os.RemoveAll(tmpDir)

	setupNodeEnvironment(tmpDir)

	scriptPath := filepath.Join(tmpDir, "solution.js")
	if err := os.WriteFile(scriptPath, []byte(code), 0644); err != nil {
		return executeViaRemote("javascript", code, testCases, isCustom)
	}

	return runCommandPerTestCase(nodePath, []string{scriptPath}, testCases, isCustom)
}

func setupNodeEnvironment(tmpDir string) {
	nodeModulesDir := filepath.Join(tmpDir, "node_modules")
	_ = os.MkdirAll(nodeModulesDir, 0755)

	// 1. Express
	expressDir := filepath.Join(nodeModulesDir, "express")
	_ = os.MkdirAll(expressDir, 0755)
	expressCode := `const fs = require('fs');

let inputRead = false;
let rawStdin = '';
function getStdin() {
  if (!inputRead) {
    inputRead = true;
    try {
      rawStdin = fs.readFileSync(0, 'utf-8');
    } catch (e) {
      rawStdin = '';
    }
  }
  return rawStdin;
}

function express() {
  const routes = [];
  const middlewares = [];
  let dispatched = false;

  const app = function(req, res, next) {
    if (typeof next === 'function') next();
  };

  app.use = function(fn) {
    if (typeof fn === 'function') middlewares.push(fn);
    return app;
  };

  const register = (method, path, ...handlers) => {
    const handler = handlers[handlers.length - 1];
    routes.push({
      method: method.toUpperCase(),
      path: typeof path === 'string' ? path : String(path),
      handler
    });
    return app;
  };

  app.get = (path, ...handlers) => register('GET', path, ...handlers);
  app.post = (path, ...handlers) => register('POST', path, ...handlers);
  app.put = (path, ...handlers) => register('PUT', path, ...handlers);
  app.patch = (path, ...handlers) => register('PATCH', path, ...handlers);
  app.delete = (path, ...handlers) => register('DELETE', path, ...handlers);
  app.all = (path, ...handlers) => register('ALL', path, ...handlers);

  function matchRoute(routePath, reqPath) {
    if (routePath === reqPath) return { match: true, params: {} };
    const routeParts = routePath.split('/').filter(Boolean);
    const reqParts = reqPath.split('/').filter(Boolean);
    if (routeParts.length !== reqParts.length) return { match: false, params: {} };
    const params = {};
    for (let i = 0; i < routeParts.length; i++) {
      if (routeParts[i].startsWith(':')) {
        params[routeParts[i].slice(1)] = reqParts[i];
      } else if (routeParts[i] !== reqParts[i]) {
        return { match: false, params: {} };
      }
    }
    return { match: true, params };
  }

  app.__dispatch = function() {
    if (dispatched) return;
    dispatched = true;

    const input = getStdin();
    const lines = input.trim().split('\n');
    let method = 'POST';
    let path = '/';
    let bodyRaw = '';

    if (lines.length > 0 && lines[0].trim()) {
      const firstLine = lines[0].trim();
      const parts = firstLine.split(/\s+/);
      const httpVerbs = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
      if (httpVerbs.includes(parts[0].toUpperCase())) {
        method = parts[0].toUpperCase();
        path = parts[1] || '/';
        if (parts.length > 2) {
          bodyRaw = firstLine.substring(firstLine.indexOf(path) + path.length).trim();
          if (lines.length > 1) {
            bodyRaw += (bodyRaw ? '\n' : '') + lines.slice(1).join('\n').trim();
          }
        } else {
          bodyRaw = lines.slice(1).join('\n').trim();
        }
      } else {
        bodyRaw = input.trim();
      }
    }

    let parsedBody = {};
    if (bodyRaw) {
      try {
        parsedBody = JSON.parse(bodyRaw);
      } catch (e) {
        parsedBody = bodyRaw;
      }
    }

    let matched = null;
    let matchedParams = {};
    for (const r of routes) {
      if (r.method === method || r.method === 'ALL') {
        const { match, params } = matchRoute(r.path, path);
        if (match) {
          matched = r;
          matchedParams = params;
          break;
        }
      }
    }

    if (!matched && routes.length > 0) {
      matched = routes[0];
    }

    let statusCode = 200;
    let headers = {};

    const req = {
      method,
      url: path,
      path: path,
      headers: { 'content-type': 'application/json' },
      body: parsedBody,
      params: matchedParams,
      query: {},
    };

    const res = {
      status: function(code) {
        statusCode = code;
        return res;
      },
      sendStatus: function(code) {
        statusCode = code;
        console.log(statusCode);
        process.exit(0);
      },
      setHeader: function(k, v) {
        headers[k] = v;
        return res;
      },
      json: function(data) {
        console.log(statusCode);
        console.log(typeof data === 'object' ? JSON.stringify(data) : data);
        process.exit(0);
      },
      send: function(data) {
        console.log(statusCode);
        console.log(typeof data === 'object' ? JSON.stringify(data) : data);
        process.exit(0);
      },
      end: function(data) {
        console.log(statusCode);
        if (data) console.log(typeof data === 'object' ? JSON.stringify(data) : data);
        process.exit(0);
      }
    };

    if (matched && typeof matched.handler === 'function') {
      try {
        matched.handler(req, res);
      } catch (err) {
        console.error(err);
        process.exit(1);
      }
    } else {
      res.status(404).json({ error: 'Not Found' });
    }
  };

  app.listen = function(port, cb) {
    app.__dispatch();
  };

  process.on('beforeExit', () => {
    app.__dispatch();
  });

  return app;
}

express.json = () => (req, res, next) => next && next();
express.urlencoded = () => (req, res, next) => next && next();
express.Router = () => express();

module.exports = express;`
	_ = os.WriteFile(filepath.Join(expressDir, "index.js"), []byte(expressCode), 0644)
	_ = os.WriteFile(filepath.Join(expressDir, "package.json"), []byte(`{"name":"express","main":"index.js"}`), 0644)

	// 2. jsonwebtoken
	jwtDir := filepath.Join(nodeModulesDir, "jsonwebtoken")
	_ = os.MkdirAll(jwtDir, 0755)
	jwtCode := `module.exports = {
  sign: (payload, secret, opts) => 'mock_jwt_' + Buffer.from(JSON.stringify(payload)).toString('base64'),
  verify: (token, secret) => {
    if (!token || typeof token !== 'string') throw new Error('jwt must be provided');
    if (!token.startsWith('mock_jwt_')) return { userId: 1, role: 'admin' };
    try {
      return JSON.parse(Buffer.from(token.replace('mock_jwt_', ''), 'base64').toString());
    } catch(e) {
      return { userId: 1, role: 'admin' };
    }
  },
  decode: (token) => {
    try {
      return JSON.parse(Buffer.from(token.replace('mock_jwt_', ''), 'base64').toString());
    } catch(e) {
      return { userId: 1, role: 'admin' };
    }
  }
};`
	_ = os.WriteFile(filepath.Join(jwtDir, "index.js"), []byte(jwtCode), 0644)
	_ = os.WriteFile(filepath.Join(jwtDir, "package.json"), []byte(`{"name":"jsonwebtoken","main":"index.js"}`), 0644)

	// 3. bcryptjs & bcrypt
	bcryptDir := filepath.Join(nodeModulesDir, "bcryptjs")
	_ = os.MkdirAll(bcryptDir, 0755)
	bcryptCode := `module.exports = {
  hash: async (pwd, salt) => '$2a$10$mock_' + Buffer.from(pwd || '').toString('hex'),
  hashSync: (pwd, salt) => '$2a$10$mock_' + Buffer.from(pwd || '').toString('hex'),
  compare: async (pwd, hash) => hash.includes(Buffer.from(pwd || '').toString('hex')) || pwd === 'password' || true,
  compareSync: (pwd, hash) => hash.includes(Buffer.from(pwd || '').toString('hex')) || pwd === 'password' || true,
  genSalt: async () => 10,
  genSaltSync: () => 10
};`
	_ = os.WriteFile(filepath.Join(bcryptDir, "index.js"), []byte(bcryptCode), 0644)
	_ = os.WriteFile(filepath.Join(bcryptDir, "package.json"), []byte(`{"name":"bcryptjs","main":"index.js"}`), 0644)

	// 4. cors
	corsDir := filepath.Join(nodeModulesDir, "cors")
	_ = os.MkdirAll(corsDir, 0755)
	_ = os.WriteFile(filepath.Join(corsDir, "index.js"), []byte(`module.exports = () => (req, res, next) => next && next();`), 0644)
	_ = os.WriteFile(filepath.Join(corsDir, "package.json"), []byte(`{"name":"cors","main":"index.js"}`), 0644)

	// 5. lodash
	lodashDir := filepath.Join(nodeModulesDir, "lodash")
	_ = os.MkdirAll(lodashDir, 0755)
	lodashCode := `module.exports = {
  groupBy: (arr, key) => (arr || []).reduce((acc, x) => { (acc[typeof key === 'function' ? key(x) : x[key]] = acc[typeof key === 'function' ? key(x) : x[key]] || []).push(x); return acc; }, {}),
  sortBy: (arr, fn) => [...(arr || [])].sort((a, b) => (typeof fn === 'function' ? fn(a) - fn(b) : a[fn] - b[fn])),
  cloneDeep: (x) => JSON.parse(JSON.stringify(x)),
  uniq: (arr) => Array.from(new Set(arr || [])),
  chunk: (arr, s) => (arr || []).reduce((a, c, i) => (i % s === 0 ? a.push([c]) : a[a.length - 1].push(c), a), []),
  debounce: (fn, ms) => fn,
  throttle: (fn, ms) => fn
};`
	_ = os.WriteFile(filepath.Join(lodashDir, "index.js"), []byte(lodashCode), 0644)
	_ = os.WriteFile(filepath.Join(lodashDir, "package.json"), []byte(`{"name":"lodash","main":"index.js"}`), 0644)

	// 6. uuid
	uuidDir := filepath.Join(nodeModulesDir, "uuid")
	_ = os.MkdirAll(uuidDir, 0755)
	uuidCode := `module.exports = {
  v4: () => '110ec58a-a0f2-4ac4-8393-c866d813b8d1',
  v1: () => '110ec58a-a0f2-11ef-8393-c866d813b8d1'
};`
	_ = os.WriteFile(filepath.Join(uuidDir, "index.js"), []byte(uuidCode), 0644)
	_ = os.WriteFile(filepath.Join(uuidDir, "package.json"), []byte(`{"name":"uuid","main":"index.js"}`), 0644)
}

func setupPythonEnvironment(tmpDir string) {
	// 1. Flask mock module
	flaskPath := filepath.Join(tmpDir, "flask.py")
	flaskCode := `import sys, json, atexit, re

class _Request:
    def __init__(self):
        self.method = 'POST'
        self.path = '/'
        self.headers = {}
        self._parsed = False
        self._body = {}

    def _parse(self):
        if not self._parsed:
            self._parsed = True
            raw = sys.stdin.read().strip()
            if not raw:
                return
            lines = raw.split('\n')
            first_line = lines[0].strip()
            parts = first_line.split()
            verbs = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']
            body_str = ''
            if parts and parts[0].upper() in verbs:
                self.method = parts[0].upper()
                self.path = parts[1] if len(parts) > 1 else '/'
                if len(parts) > 2:
                    body_str = first_line[first_line.find(self.path) + len(self.path):].strip()
                    if len(lines) > 1:
                        body_str += '\n' + '\n'.join(lines[1:]).strip()
                else:
                    body_str = '\n'.join(lines[1:]).strip()
            else:
                body_str = raw

            if body_str:
                try:
                    self._body = json.loads(body_str)
                except Exception:
                    self._body = body_str

    def get_json(self, silent=True):
        self._parse()
        return self._body if isinstance(self._body, dict) else {}

request = _Request()

def jsonify(data):
    return data

_flask_apps = []

class Flask:
    def __init__(self, name):
        self.name = name
        self.routes = []
        self._dispatched = False
        _flask_apps.append(self)

    def route(self, rule, methods=['GET']):
        def decorator(f):
            self.routes.append((rule, methods, f))
            return f
        return decorator

    def run(self, *args, **kwargs):
        self.__dispatch()

    def __dispatch(self):
        if self._dispatched:
            return
        self._dispatched = True
        request._parse()
        handler = None
        for rule, methods, f in self.routes:
            if request.method in methods and (rule == request.path or rule == request.path.rstrip('/')):
                handler = f
                break
        if not handler and self.routes:
            handler = self.routes[0][2]

        if handler:
            try:
                res = handler()
                status_code = 200
                data = res
                if isinstance(res, tuple):
                    data = res[0]
                    status_code = res[1] if len(res) > 1 else 200
                print(status_code)
                if isinstance(data, (dict, list)):
                    print(json.dumps(data))
                else:
                    print(data)
                sys.stdout.flush()
            except Exception as e:
                print(500)
                print(json.dumps({"error": str(e)}))
                sys.stdout.flush()

def _auto_flask():
    for app in _flask_apps:
        if not app._dispatched:
            app.__dispatch()
            break

atexit.register(_auto_flask)
`
	_ = os.WriteFile(flaskPath, []byte(flaskCode), 0644)

	// 2. FastAPI mock package
	fastapiDir := filepath.Join(tmpDir, "fastapi")
	_ = os.MkdirAll(fastapiDir, 0755)
	fastapiInit := `import sys, json, re, inspect, atexit

class _Request:
    def __init__(self):
        self.method = 'POST'
        self.path = '/'
        self.headers = {}
        self._parsed = False
        self._body = {}
        self._raw_body = ''

    def _parse(self):
        if not self._parsed:
            self._parsed = True
            raw = sys.stdin.read().strip()
            if not raw:
                return
            lines = raw.split('\n')
            first_line = lines[0].strip()
            parts = first_line.split()
            verbs = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']
            body_str = ''
            if parts and parts[0].upper() in verbs:
                self.method = parts[0].upper()
                self.path = parts[1] if len(parts) > 1 else '/'
                if len(parts) > 2:
                    body_str = first_line[first_line.find(self.path) + len(self.path):].strip()
                    if len(lines) > 1:
                        body_str += '\n' + '\n'.join(lines[1:]).strip()
                else:
                    body_str = '\n'.join(lines[1:]).strip()
            else:
                body_str = raw

            self._raw_body = body_str
            if body_str:
                try:
                    self._body = json.loads(body_str)
                except Exception:
                    self._body = body_str

    def json(self):
        self._parse()
        return self._body if isinstance(self._body, dict) else {}

request = _Request()
Request = _Request

class HTTPException(Exception):
    def __init__(self, status_code=400, detail="Error", headers=None):
        self.status_code = status_code
        self.detail = detail
        self.headers = headers
        super().__init__(str(detail))

class _Status:
    HTTP_200_OK = 200
    HTTP_201_CREATED = 201
    HTTP_204_NO_CONTENT = 204
    HTTP_400_BAD_REQUEST = 400
    HTTP_401_UNAUTHORIZED = 401
    HTTP_403_FORBIDDEN = 403
    HTTP_404_NOT_FOUND = 404
    HTTP_422_UNPROCESSABLE_ENTITY = 422
    HTTP_500_INTERNAL_SERVER_ERROR = 500

status = _Status()

def Depends(dependency=None):
    return dependency

def Query(default=None, **kwargs):
    return default

def Path(default=None, **kwargs):
    return default

def Body(default=None, **kwargs):
    return default

def Header(default=None, **kwargs):
    return default

class APIRouter:
    def __init__(self, *args, **kwargs):
        self.routes = []

    def _add_route(self, path, methods, func, status_code=200):
        self.routes.append((path, methods, func, status_code))

    def get(self, path, status_code=200, **kwargs):
        def dec(f):
            self._add_route(path, ['GET'], f, status_code)
            return f
        return dec

    def post(self, path, status_code=200, **kwargs):
        def dec(f):
            self._add_route(path, ['POST'], f, status_code)
            return f
        return dec

    def put(self, path, status_code=200, **kwargs):
        def dec(f):
            self._add_route(path, ['PUT'], f, status_code)
            return f
        return dec

    def patch(self, path, status_code=200, **kwargs):
        def dec(f):
            self._add_route(path, ['PATCH'], f, status_code)
            return f
        return dec

    def delete(self, path, status_code=200, **kwargs):
        def dec(f):
            self._add_route(path, ['DELETE'], f, status_code)
            return f
        return dec

_active_apps = []

class FastAPI:
    def __init__(self, *args, **kwargs):
        self.routes = []
        self._dispatched = False
        _active_apps.append(self)

    def _add_route(self, path, methods, func, status_code=200):
        self.routes.append((path, methods, func, status_code))

    def get(self, path, status_code=200, **kwargs):
        def dec(f):
            self._add_route(path, ['GET'], f, status_code)
            return f
        return dec

    def post(self, path, status_code=200, **kwargs):
        def dec(f):
            self._add_route(path, ['POST'], f, status_code)
            return f
        return dec

    def put(self, path, status_code=200, **kwargs):
        def dec(f):
            self._add_route(path, ['PUT'], f, status_code)
            return f
        return dec

    def patch(self, path, status_code=200, **kwargs):
        def dec(f):
            self._add_route(path, ['PATCH'], f, status_code)
            return f
        return dec

    def delete(self, path, status_code=200, **kwargs):
        def dec(f):
            self._add_route(path, ['DELETE'], f, status_code)
            return f
        return dec

    def include_router(self, router, **kwargs):
        prefix = kwargs.get('prefix', '')
        for path, methods, func, code in router.routes:
            self._add_route(prefix + path, methods, func, code)

    def _match_route(self, route_pattern, actual_path):
        pattern = re.sub(r'\{([a-zA-Z0-9_]+)\}|:([a-zA-Z0-9_]+)|<([a-zA-Z0-9_]+)>', lambda m: '(?P<' + (m.group(1) or m.group(2) or m.group(3)) + '>[^/]+)', route_pattern)
        regex = '^' + pattern + '$'
        m = re.match(regex, actual_path)
        if m:
            return True, m.groupdict()
        return False, {}

    def run(self, *args, **kwargs):
        self._dispatch()

    def _dispatch(self):
        if self._dispatched:
            return
        self._dispatched = True

        request._parse()
        matched_handler = None
        matched_params = {}
        default_status_code = 200

        for r_path, methods, func, code in self.routes:
            if request.method in methods or 'ALL' in methods:
                ok, params = self._match_route(r_path, request.path)
                if ok:
                    matched_handler = func
                    matched_params = params
                    default_status_code = code
                    break

        if not matched_handler and self.routes:
            for r_path, methods, func, code in self.routes:
                if request.method in methods:
                    matched_handler = func
                    default_status_code = code
                    break
            if not matched_handler:
                matched_handler = self.routes[0][2]
                default_status_code = self.routes[0][3]

        if not matched_handler:
            print(404)
            print(json.dumps({"detail": "Not Found"}))
            sys.stdout.flush()
            return

        sig = inspect.signature(matched_handler)
        call_args = {}
        body = request.json()

        for name, param in sig.parameters.items():
            if name in matched_params:
                val = matched_params[name]
                if param.annotation == int or (isinstance(val, str) and val.isdigit()):
                    try:
                        val = int(val)
                    except Exception:
                        pass
                call_args[name] = val
            elif param.annotation != inspect.Parameter.empty and hasattr(param.annotation, '__name__') and param.annotation.__name__ not in ('Request', '_Request', 'dict', 'Any'):
                try:
                    if isinstance(body, dict):
                        call_args[name] = param.annotation(**body)
                    else:
                        call_args[name] = param.annotation(body)
                except Exception:
                    call_args[name] = body
            elif name in ('data', 'payload', 'body', 'item', 'task'):
                if hasattr(param.annotation, '__name__') and param.annotation.__name__ not in ('Request', '_Request', 'dict', 'Any'):
                    try:
                        call_args[name] = param.annotation(**body) if isinstance(body, dict) else body
                    except Exception:
                        call_args[name] = body
                else:
                    call_args[name] = body
            elif name in ('request', 'req'):
                call_args[name] = request
            elif isinstance(body, dict) and name in body:
                call_args[name] = body[name]

        try:
            if len(sig.parameters) == 0:
                res = matched_handler()
            elif len(call_args) == len(sig.parameters):
                res = matched_handler(**call_args)
            else:
                try:
                    res = matched_handler(**call_args)
                except Exception:
                    try:
                        res = matched_handler(body)
                    except Exception:
                        res = matched_handler(request)

            status_code = default_status_code
            data = res
            if isinstance(res, tuple):
                data = res[0]
                if len(res) > 1:
                    status_code = res[1]

            print(status_code)
            if hasattr(data, 'model_dump'):
                print(json.dumps(data.model_dump()))
            elif hasattr(data, 'dict') and callable(getattr(data, 'dict')):
                print(json.dumps(data.dict()))
            elif isinstance(data, (dict, list)):
                print(json.dumps(data))
            elif data is not None:
                print(data)
            sys.stdout.flush()
        except HTTPException as e:
            print(e.status_code)
            print(json.dumps({"detail": e.detail}))
            sys.stdout.flush()
        except SystemExit:
            sys.stdout.flush()
        except Exception as e:
            print(500)
            print(json.dumps({"detail": str(e)}))
            sys.stdout.flush()

def _auto_dispatch():
    for app in _active_apps:
        if not app._dispatched:
            app._dispatch()
            break

atexit.register(_auto_dispatch)
`
	_ = os.WriteFile(filepath.Join(fastapiDir, "__init__.py"), []byte(fastapiInit), 0644)

	// 3. Pydantic mock package
	pydanticDir := filepath.Join(tmpDir, "pydantic")
	_ = os.MkdirAll(pydanticDir, 0755)
	pydanticInit := `class BaseModel:
    def __init__(self, **kwargs):
        for k, v in self.__class__.__dict__.items():
            if not k.startswith('_') and not callable(v):
                setattr(self, k, v)
        for k, v in kwargs.items():
            setattr(self, k, v)

    def dict(self):
        return {k: v for k, v in self.__dict__.items() if not k.startswith('_')}

    def model_dump(self):
        return self.dict()

    def json(self):
        import json
        return json.dumps(self.dict())

    def __repr__(self):
        return f"{self.__class__.__name__}({self.dict()})"

def Field(default=None, default_factory=None, **kwargs):
    if default_factory is not None:
        return default_factory()
    return default

def validator(*fields, **kwargs):
    def dec(fn):
        return fn
    return dec

def root_validator(*args, **kwargs):
    def dec(fn):
        return fn
    return dec

def field_validator(*args, **kwargs):
    def dec(fn):
        return fn
    return dec

EmailStr = str
`
	_ = os.WriteFile(filepath.Join(pydanticDir, "__init__.py"), []byte(pydanticInit), 0644)
}

// ============================================================
// C++ EXECUTOR (g++ / clang++)
// ============================================================
func executeCpp(code string, testCases []EvalTestCase, isCustom bool) ([]EvalResult, error) {
	cppCompiler, err := findExecutable("g++", "clang++", "/usr/bin/g++", "/usr/local/bin/g++", "/usr/bin/clang++")
	if err != nil {
		return executeViaRemote("cpp", code, testCases, isCustom)
	}

	tmpDir, err := os.MkdirTemp("", "mockmate_cpp_*")
	if err != nil {
		return executeViaRemote("cpp", code, testCases, isCustom)
	}
	defer os.RemoveAll(tmpDir)

	srcPath := filepath.Join(tmpDir, "solution.cpp")
	binName := "solution"
	if runtime.GOOS == "windows" {
		binName = "solution.exe"
	}
	binPath := filepath.Join(tmpDir, binName)

	if err := os.WriteFile(srcPath, []byte(code), 0644); err != nil {
		return executeViaRemote("cpp", code, testCases, isCustom)
	}

	// Compile C++ code
	ctxCompile, cancelCompile := context.WithTimeout(context.Background(), 7*time.Second)
	defer cancelCompile()

	compileCmd := exec.CommandContext(ctxCompile, cppCompiler, "-O2", "-std=c++17", srcPath, "-o", binPath)
	var compileStderr bytes.Buffer
	compileCmd.Stderr = &compileStderr

	if err := compileCmd.Run(); err != nil {
		errStr := strings.TrimSpace(compileStderr.String())
		if errStr == "" {
			errStr = err.Error()
		}
		return makeErrorResults(testCases, "Compilation Error:\n"+errStr), nil
	}

	return runCommandPerTestCase(binPath, []string{}, testCases, isCustom)
}

// ============================================================
// JAVA EXECUTOR (OpenJDK)
// ============================================================
func prepareJavaBackendCode(code string) string {
	if !strings.Contains(code, "HttpServer") {
		return code
	}

	rePort := regexp.MustCompile(`InetSocketAddress\s*\(\s*(?:\d+|"localhost"\s*,\s*\d+|"[^"]+"\s*,\s*\d+)\s*\)`)
	modCode := rePort.ReplaceAllString(code, "InetSocketAddress(0)")

	dispatcherCode := `
		// MockMate backend dispatcher
		try {
			java.io.BufferedReader mockmateReader = new java.io.BufferedReader(new java.io.InputStreamReader(System.in, java.nio.charset.StandardCharsets.UTF_8));
			StringBuilder mockmateInput = new StringBuilder();
			String mockmateLine;
			while ((mockmateLine = mockmateReader.readLine()) != null) {
				mockmateInput.append(mockmateLine).append("\n");
			}
			String mockmateRaw = mockmateInput.toString().trim();
			if (!mockmateRaw.isEmpty()) {
				String[] mockmateLines = mockmateRaw.split("\\r?\\n");
				String mockmateFirst = mockmateLines[0].trim();
				String[] mockmateParts = mockmateFirst.split("\\s+");
				String mockmateMethod = "GET";
				String mockmatePath = "/";
				String mockmateBody = "";
				if (mockmateParts.length > 0) {
					String u = mockmateParts[0].toUpperCase();
					if (u.equals("GET") || u.equals("POST") || u.equals("PUT") || u.equals("PATCH") || u.equals("DELETE") || u.equals("OPTIONS") || u.equals("HEAD")) {
						mockmateMethod = u;
						mockmatePath = mockmateParts.length > 1 ? mockmateParts[1] : "/";
						if (mockmateParts.length > 2) {
							int pIdx = mockmateFirst.indexOf(mockmatePath);
							mockmateBody = mockmateFirst.substring(pIdx + mockmatePath.length()).trim();
							if (mockmateLines.length > 1) {
								StringBuilder sb = new StringBuilder(mockmateBody);
								for (int i = 1; i < mockmateLines.length; i++) {
									if (sb.length() > 0) sb.append("\n");
									sb.append(mockmateLines[i]);
								}
								mockmateBody = sb.toString();
							}
						} else if (mockmateLines.length > 1) {
							StringBuilder sb = new StringBuilder();
							for (int i = 1; i < mockmateLines.length; i++) {
								if (sb.length() > 0) sb.append("\n");
								sb.append(mockmateLines[i]);
							}
							mockmateBody = sb.toString();
						}
					} else {
						mockmateBody = mockmateRaw;
					}
				} else {
					mockmateBody = mockmateRaw;
				}

				int mockmatePort = server.getAddress().getPort();
				java.net.URI mockmateUri = java.net.URI.create("http://127.0.0.1:" + mockmatePort + mockmatePath);
				java.net.http.HttpClient mockmateClient = java.net.http.HttpClient.newHttpClient();
				java.net.http.HttpRequest.Builder mockmateReqBuilder = java.net.http.HttpRequest.newBuilder(mockmateUri)
					.header("Content-Type", "application/json");

				if (mockmateMethod.equals("POST")) {
					mockmateReqBuilder.POST(java.net.http.HttpRequest.BodyPublishers.ofString(mockmateBody));
				} else if (mockmateMethod.equals("PUT")) {
					mockmateReqBuilder.PUT(java.net.http.HttpRequest.BodyPublishers.ofString(mockmateBody));
				} else if (mockmateMethod.equals("DELETE")) {
					mockmateReqBuilder.DELETE();
				} else if (mockmateMethod.equals("PATCH")) {
					mockmateReqBuilder.method("PATCH", java.net.http.HttpRequest.BodyPublishers.ofString(mockmateBody));
				} else {
					mockmateReqBuilder.GET();
				}

				java.net.http.HttpResponse<String> mockmateResp = mockmateClient.send(mockmateReqBuilder.build(), java.net.http.HttpResponse.BodyHandlers.ofString());
				System.out.println(mockmateResp.statusCode());
				String mockmateRespBody = mockmateResp.body();
				if (mockmateRespBody != null && !mockmateRespBody.trim().isEmpty()) {
					System.out.println(mockmateRespBody.trim());
				}
				System.out.flush();
				server.stop(0);
				System.exit(0);
			}
		} catch (Exception mockmateEx) {
			mockmateEx.printStackTrace();
			System.exit(1);
		}
`

	if strings.Contains(modCode, "server.start();") {
		modCode = strings.Replace(modCode, "server.start();", "server.start();\n"+dispatcherCode, 1)
	} else if strings.Contains(modCode, ".start();") {
		modCode = strings.Replace(modCode, ".start();", ".start();\n"+dispatcherCode, 1)
	}

	return modCode
}

func executeJava(code string, testCases []EvalTestCase, isCustom bool) ([]EvalResult, error) {
	javaPath, err := findExecutable("java", "/usr/bin/java", "/usr/local/bin/java")
	if err != nil {
		return executeViaRemote("java", code, testCases, isCustom)
	}

	tmpDir, err := os.MkdirTemp("", "mockmate_java_*")
	if err != nil {
		return executeViaRemote("java", code, testCases, isCustom)
	}
	defer os.RemoveAll(tmpDir)

	preparedCode := prepareJavaBackendCode(code)

	// Detect class name from Java code (default to Solution or Main)
	className := "Solution"
	re := regexp.MustCompile(`(?:public\s+)?class\s+([A-Za-z0-9_]+)`)
	matches := re.FindStringSubmatch(preparedCode)
	if len(matches) > 1 && matches[1] != "" {
		className = matches[1]
	}

	srcPath := filepath.Join(tmpDir, className+".java")
	if err := os.WriteFile(srcPath, []byte(preparedCode), 0644); err != nil {
		return executeViaRemote("java", code, testCases, isCustom)
	}

	// Try javac compilation first if available
	javacPath, javacErr := findExecutable("javac", "/usr/bin/javac", "/usr/local/bin/javac")
	if javacErr == nil {
		ctxCompile, cancelCompile := context.WithTimeout(context.Background(), 8*time.Second)
		defer cancelCompile()

		compileCmd := exec.CommandContext(ctxCompile, javacPath, "-cp", tmpDir, srcPath)
		var compileStderr bytes.Buffer
		compileCmd.Stderr = &compileStderr

		if err := compileCmd.Run(); err != nil {
			errStr := strings.TrimSpace(compileStderr.String())
			if errStr == "" {
				errStr = err.Error()
			}
			return makeErrorResults(testCases, "Compilation Error:\n"+errStr), nil
		}

		return runCommandPerTestCase(javaPath, []string{"-cp", tmpDir, className}, testCases, isCustom)
	}

	// Java 11+ single-source file execution fallback: java Solution.java
	return runCommandPerTestCase(javaPath, []string{srcPath}, testCases, isCustom)
}


// ============================================================
// COMMON TEST CASE RUNNER VIA OS SUBPROCESS
// ============================================================
func runCommandPerTestCase(execPath string, baseArgs []string, testCases []EvalTestCase, isCustom bool) ([]EvalResult, error) {
	results := make([]EvalResult, len(testCases))

	for i, tc := range testCases {
		ctx, cancel := context.WithTimeout(context.Background(), 15000*time.Millisecond)
		cmd := exec.CommandContext(ctx, execPath, baseArgs...)

		// Set working directory if script path is provided
		if len(baseArgs) > 0 {
			for _, arg := range baseArgs {
				if strings.Contains(arg, "solution") || strings.Contains(arg, "main") || strings.HasSuffix(arg, ".js") || strings.HasSuffix(arg, ".py") || strings.HasSuffix(arg, ".java") {
					scriptDir := filepath.Dir(arg)
					if scriptDir != "" && scriptDir != "." {
						cmd.Dir = scriptDir
						if strings.Contains(strings.ToLower(execPath), "python") || strings.Contains(strings.ToLower(execPath), "py") {
							cmd.Env = append(os.Environ(), "PYTHONPATH="+scriptDir)
						}
					}
					break
				}
			}
		}

		// Pipe test case input to Standard Input (stdin)
		cmd.Stdin = strings.NewReader(tc.Input)

		var stdout, stderr bytes.Buffer
		cmd.Stdout = &stdout
		cmd.Stderr = &stderr

		startTime := time.Now()
		runErr := cmd.Run()
		elapsedMs := int(time.Since(startTime).Milliseconds())
		if elapsedMs < 1 {
			elapsedMs = 1
		}
		cancel()

		actualStdout := stdout.String()
		errOutput := stderr.String()

		// 1. Check Timeout / TLE
		if ctx.Err() == context.DeadlineExceeded {
			results[i] = EvalResult{
				Index:       tc.Index,
				IsHidden:    tc.IsHidden,
				Name:        tc.Name,
				Input:       tc.Input,
				Expected:    tc.ExpectedOutput,
				Actual:      "Time Limit Exceeded (> 5.0s)",
				Passed:      false,
				ExecutionMs: elapsedMs,
			}
			continue
		}

		// 2. Check Runtime Error
		if runErr != nil {
			cleanErr := strings.TrimSpace(errOutput)
			if cleanErr == "" {
				cleanErr = runErr.Error()
			}
			results[i] = EvalResult{
				Index:       tc.Index,
				IsHidden:    tc.IsHidden,
				Name:        tc.Name,
				Input:       tc.Input,
				Expected:    tc.ExpectedOutput,
				Actual:      "Runtime Error:\n" + cleanErr,
				Passed:      false,
				ExecutionMs: elapsedMs,
			}
			continue
		}

		// 3. Process output
		if isCustom {
			cleanActual := strings.TrimRight(actualStdout, "\r\n")
			if cleanActual == "" {
				cleanActual = "(Process finished with code 0 - No output printed)"
			}
			results[i] = EvalResult{
				Index:       tc.Index,
				IsHidden:    tc.IsHidden,
				Name:        tc.Name,
				Input:       tc.Input,
				Expected:    "(Standard Output)",
				Actual:      cleanActual,
				Passed:      true,
				ExecutionMs: elapsedMs,
			}
		} else {
			passed := compareOutputs(actualStdout, tc.ExpectedOutput)

			displayActual := strings.TrimRight(actualStdout, "\r\n")
			if displayActual == "" {
				if strings.TrimSpace(errOutput) != "" {
					displayActual = "Runtime Error:\n" + strings.TrimSpace(errOutput)
				} else {
					displayActual = "(No output printed to stdout)"
				}
			}

			results[i] = EvalResult{
				Index:       tc.Index,
				IsHidden:    tc.IsHidden,
				Name:        tc.Name,
				Input:       tc.Input,
				Expected:    tc.ExpectedOutput,
				Actual:      displayActual,
				Passed:      passed,
				ExecutionMs: elapsedMs,
			}
		}
	}

	return results, nil
}

// ============================================================
// REMOTE CODE EXECUTION FALLBACK (Judge0 CE API)
// ============================================================
func executeViaRemote(lang string, code string, testCases []EvalTestCase, isCustom bool) ([]EvalResult, error) {
	var langID int
	switch lang {
	case "c", "gcc", "clang":
		langID = 50 // C (GCC 9.2.0)
	case "cpp", "c++":
		langID = 54 // C++ (GCC 9.2.0)
	case "go", "golang":
		langID = 60 // Go (1.13.5)
	case "python", "python3", "py":
		langID = 71 // Python 3.8.1
	case "javascript", "js", "node":
		langID = 63 // JavaScript (Node.js 12.14.0)
	case "java":
		langID = 62 // Java (OpenJDK 13.0.1)
	default:
		langID = 50
	}

	results := make([]EvalResult, len(testCases))
	client := &http.Client{Timeout: 10 * time.Second}

	for i, tc := range testCases {
		payload := map[string]interface{}{
			"source_code": code,
			"language_id": langID,
			"stdin":       tc.Input,
		}

		jsonBytes, _ := json.Marshal(payload)
		startTime := time.Now()
		resp, err := client.Post("https://ce.judge0.com/submissions?base64_encoded=false&wait=true", "application/json", bytes.NewBuffer(jsonBytes))
		elapsedMs := int(time.Since(startTime).Milliseconds())
		if elapsedMs < 1 {
			elapsedMs = 1
		}

		if err != nil {
			// Fallback to Piston API
			pistonRes, pErr := executeViaPiston(lang, code, tc, isCustom)
			if pErr == nil {
				results[i] = pistonRes
				continue
			}
			results[i] = EvalResult{
				Index:       tc.Index,
				IsHidden:    tc.IsHidden,
				Name:        tc.Name,
				Input:       tc.Input,
				Expected:    tc.ExpectedOutput,
				Actual:      "Execution Engine Unavailable: " + err.Error(),
				Passed:      false,
				ExecutionMs: elapsedMs,
			}
			continue
		}

		body, _ := io.ReadAll(resp.Body)
		resp.Body.Close()

		var judge0Resp struct {
			Stdout        *string `json:"stdout"`
			Stderr        *string `json:"stderr"`
			CompileOutput *string `json:"compile_output"`
			Message       *string `json:"message"`
			Status        struct {
				ID          int    `json:"id"`
				Description string `json:"description"`
			} `json:"status"`
			Time string `json:"time"`
		}

		if err := json.Unmarshal(body, &judge0Resp); err != nil {
			results[i] = EvalResult{
				Index:       tc.Index,
				IsHidden:    tc.IsHidden,
				Name:        tc.Name,
				Input:       tc.Input,
				Expected:    tc.ExpectedOutput,
				Actual:      "Response parse error: " + string(body),
				Passed:      false,
				ExecutionMs: elapsedMs,
			}
			continue
		}

		// Status ID 6 = Compilation Error
		if judge0Resp.Status.ID == 6 || (judge0Resp.CompileOutput != nil && *judge0Resp.CompileOutput != "") {
			errMsg := ""
			if judge0Resp.CompileOutput != nil {
				errMsg = *judge0Resp.CompileOutput
			}
			if errMsg == "" && judge0Resp.Stderr != nil {
				errMsg = *judge0Resp.Stderr
			}
			results[i] = EvalResult{
				Index:       tc.Index,
				IsHidden:    tc.IsHidden,
				Name:        tc.Name,
				Input:       tc.Input,
				Expected:    tc.ExpectedOutput,
				Actual:      "Compilation Error:\n" + strings.TrimSpace(errMsg),
				Passed:      false,
				ExecutionMs: elapsedMs,
			}
			continue
		}

		// Status ID 5 = Time Limit Exceeded
		if judge0Resp.Status.ID == 5 {
			results[i] = EvalResult{
				Index:       tc.Index,
				IsHidden:    tc.IsHidden,
				Name:        tc.Name,
				Input:       tc.Input,
				Expected:    tc.ExpectedOutput,
				Actual:      "Time Limit Exceeded (> 3.5s)",
				Passed:      false,
				ExecutionMs: elapsedMs,
			}
			continue
		}

		// Status ID != 3 (Accepted)
		if judge0Resp.Status.ID != 3 && judge0Resp.Status.ID != 0 {
			errText := ""
			if judge0Resp.Stderr != nil && *judge0Resp.Stderr != "" {
				errText = *judge0Resp.Stderr
			} else if judge0Resp.Message != nil && *judge0Resp.Message != "" {
				errText = *judge0Resp.Message
			} else {
				errText = judge0Resp.Status.Description
			}
			results[i] = EvalResult{
				Index:       tc.Index,
				IsHidden:    tc.IsHidden,
				Name:        tc.Name,
				Input:       tc.Input,
				Expected:    tc.ExpectedOutput,
				Actual:      "Runtime Error:\n" + strings.TrimSpace(errText),
				Passed:      false,
				ExecutionMs: elapsedMs,
			}
			continue
		}

		actualStdout := ""
		if judge0Resp.Stdout != nil {
			actualStdout = *judge0Resp.Stdout
		}


		if isCustom {
			cleanActual := strings.TrimRight(actualStdout, "\r\n")
			if cleanActual == "" {
				cleanActual = "(Process finished with code 0 - No output printed)"
			}
			results[i] = EvalResult{
				Index:       tc.Index,
				IsHidden:    tc.IsHidden,
				Name:        tc.Name,
				Input:       tc.Input,
				Expected:    "(Standard Output)",
				Actual:      cleanActual,
				Passed:      true,
				ExecutionMs: elapsedMs,
			}
		} else {
			passed := compareOutputs(actualStdout, tc.ExpectedOutput)

			displayActual := strings.TrimRight(actualStdout, "\r\n")
			if displayActual == "" {
				displayActual = "(No output printed to stdout)"
			}

			results[i] = EvalResult{
				Index:       tc.Index,
				IsHidden:    tc.IsHidden,
				Name:        tc.Name,
				Input:       tc.Input,
				Expected:    tc.ExpectedOutput,
				Actual:      displayActual,
				Passed:      passed,
				ExecutionMs: elapsedMs,
			}
		}
	}

	return results, nil
}

// Helper to find executable in PATH or known directories
func findExecutable(candidates ...string) (string, error) {
	for _, c := range candidates {
		if path, err := exec.LookPath(c); err == nil {
			return path, nil
		}
		if fi, err := os.Stat(c); err == nil && !fi.IsDir() {
			return c, nil
		}
	}
	return "", fmt.Errorf("executable not found for candidates: %v", candidates)
}

// compareOutputs performs exact or smart semantic comparison for text, JSON, and HTTP status+JSON responses
func compareOutputs(actual, expected string) bool {
	normActual := normalizeOutput(actual)
	normExpected := normalizeOutput(expected)

	if normActual == normExpected {
		return true
	}

	// 1. Try direct JSON equivalence (key order insensitive)
	if (strings.HasPrefix(normActual, "{") && strings.HasPrefix(normExpected, "{")) ||
		(strings.HasPrefix(normActual, "[") && strings.HasPrefix(normExpected, "[")) {
		var aObj, eObj interface{}
		if errA := json.Unmarshal([]byte(normActual), &aObj); errA == nil {
			if errE := json.Unmarshal([]byte(normExpected), &eObj); errE == nil {
				aBytes, _ := json.Marshal(aObj)
				eBytes, _ := json.Marshal(eObj)
				if string(aBytes) == string(eBytes) {
					return true
				}
			}
		}
	}

	// 2. Try HTTP Status Code + JSON Response equivalence (e.g. "201 {"id":2,...}")
	if len(normActual) >= 3 && len(normExpected) >= 3 {
		statusActual := normActual[:3]
		statusExpected := normExpected[:3]

		if statusActual == statusExpected {
			bodyActual := strings.TrimSpace(normActual[3:])
			bodyExpected := strings.TrimSpace(normExpected[3:])

			if bodyActual == bodyExpected {
				return true
			}

			var aObj, eObj interface{}
			if errA := json.Unmarshal([]byte(bodyActual), &aObj); errA == nil {
				if errE := json.Unmarshal([]byte(bodyExpected), &eObj); errE == nil {
					aBytes, _ := json.Marshal(aObj)
					eBytes, _ := json.Marshal(eObj)
					if string(aBytes) == string(eBytes) {
						return true
					}
				}
			}
		}
	}

	return false
}

// normalizeOutput trims whitespace, line-by-line trailing spaces, and standardizes newlines
func normalizeOutput(s string) string {
	s = strings.ReplaceAll(s, "\r\n", "\n")
	s = strings.ReplaceAll(s, "\r", "\n")
	lines := strings.Split(s, "\n")
	var cleaned []string
	for _, line := range lines {
		cleaned = append(cleaned, strings.TrimRight(line, " \t"))
	}
	return strings.TrimSpace(strings.Join(cleaned, "\n"))
}

func makeErrorResults(testCases []EvalTestCase, errMsg string) []EvalResult {
	results := make([]EvalResult, len(testCases))
	for i, tc := range testCases {
		results[i] = EvalResult{
			Index:       tc.Index,
			IsHidden:    tc.IsHidden,
			Name:        tc.Name,
			Input:       tc.Input,
			Expected:    tc.ExpectedOutput,
			Actual:      errMsg,
			Passed:      false,
			ExecutionMs: 0,
		}
	}
	return results
}

func executeViaPiston(lang string, code string, tc EvalTestCase, isCustom bool) (EvalResult, error) {
	pistonLang := lang
	switch lang {
	case "c", "gcc", "clang":
		pistonLang = "c"
	case "cpp", "c++":
		pistonLang = "cpp"
	case "go", "golang":
		pistonLang = "go"
	case "python", "python3", "py":
		pistonLang = "python"
	case "javascript", "js", "node":
		pistonLang = "javascript"
	case "java":
		pistonLang = "java"
	default:
		pistonLang = "c"
	}

	payload := map[string]interface{}{
		"language": pistonLang,
		"version":  "*",
		"files": []map[string]string{
			{"content": code},
		},
		"stdin": tc.Input,
	}

	jsonBytes, _ := json.Marshal(payload)
	client := &http.Client{Timeout: 10 * time.Second}
	startTime := time.Now()
	resp, err := client.Post("https://emkc.org/api/v2/piston/execute", "application/json", bytes.NewBuffer(jsonBytes))
	elapsedMs := int(time.Since(startTime).Milliseconds())
	if elapsedMs < 1 {
		elapsedMs = 1
	}

	if err != nil {
		return EvalResult{
			Index:       tc.Index,
			IsHidden:    tc.IsHidden,
			Name:        tc.Name,
			Input:       tc.Input,
			Expected:    tc.ExpectedOutput,
			Actual:      "Execution Engine Unavailable: " + err.Error(),
			Passed:      false,
			ExecutionMs: elapsedMs,
		}, err
	}

	body, _ := io.ReadAll(resp.Body)
	resp.Body.Close()

	var pistonResp struct {
		Compile struct {
			Stdout string `json:"stdout"`
			Stderr string `json:"stderr"`
			Code   int    `json:"code"`
			Output string `json:"output"`
		} `json:"compile"`
		Run struct {
			Stdout string `json:"stdout"`
			Stderr string `json:"stderr"`
			Code   int    `json:"code"`
			Output string `json:"output"`
		} `json:"run"`
		Message string `json:"message"`
	}

	if err := json.Unmarshal(body, &pistonResp); err != nil {
		return EvalResult{
			Index:       tc.Index,
			IsHidden:    tc.IsHidden,
			Name:        tc.Name,
			Input:       tc.Input,
			Expected:    tc.ExpectedOutput,
			Actual:      "Response parse error: " + string(body),
			Passed:      false,
			ExecutionMs: elapsedMs,
		}, err
	}

	if pistonResp.Compile.Code != 0 && pistonResp.Compile.Output != "" {
		return EvalResult{
			Index:       tc.Index,
			IsHidden:    tc.IsHidden,
			Name:        tc.Name,
			Input:       tc.Input,
			Expected:    tc.ExpectedOutput,
			Actual:      "Compilation Error:\n" + strings.TrimSpace(pistonResp.Compile.Output),
			Passed:      false,
			ExecutionMs: elapsedMs,
		}, nil
	}

	if pistonResp.Run.Code != 0 {
		errText := pistonResp.Run.Stderr
		if errText == "" {
			errText = pistonResp.Run.Output
		}
		if errText == "" {
			errText = pistonResp.Message
		}
		return EvalResult{
			Index:       tc.Index,
			IsHidden:    tc.IsHidden,
			Name:        tc.Name,
			Input:       tc.Input,
			Expected:    tc.ExpectedOutput,
			Actual:      "Runtime Error:\n" + strings.TrimSpace(errText),
			Passed:      false,
			ExecutionMs: elapsedMs,
		}, nil
	}

	actualStdout := pistonResp.Run.Stdout
	if isCustom {
		cleanActual := strings.TrimRight(actualStdout, "\r\n")
		if cleanActual == "" {
			cleanActual = "(Process finished with code 0 - No output printed)"
		}
		return EvalResult{
			Index:       tc.Index,
			IsHidden:    tc.IsHidden,
			Name:        tc.Name,
			Input:       tc.Input,
			Expected:    "(Standard Output)",
			Actual:      cleanActual,
			Passed:      true,
			ExecutionMs: elapsedMs,
		}, nil
	}

	passed := compareOutputs(actualStdout, tc.ExpectedOutput)

	displayActual := strings.TrimRight(actualStdout, "\r\n")
	if displayActual == "" {
		displayActual = "(No output printed to stdout)"
	}

	return EvalResult{
		Index:       tc.Index,
		IsHidden:    tc.IsHidden,
		Name:        tc.Name,
		Input:       tc.Input,
		Expected:    tc.ExpectedOutput,
		Actual:      displayActual,
		Passed:      passed,
		ExecutionMs: elapsedMs,
	}, nil
}
