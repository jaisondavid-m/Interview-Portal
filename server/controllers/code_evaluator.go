package controllers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"math/rand"
	"os/exec"
	"strings"
	"time"
)

// EvalTestCase represents an input test case to be verified
type EvalTestCase struct {
	Index          int    `json:"index"`
	IsHidden       bool   `json:"is_hidden"`
	Name           string `json:"name"`
	Input          string `json:"input"`
	ExpectedOutput string `json:"expected"`
}

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

// ExecuteTestCases runs candidate code against the test case queue with actual runtime evaluation
func ExecuteTestCases(code string, lang string, testCases []EvalTestCase) ([]EvalResult, error) {
	trimmedCode := strings.TrimSpace(code)
	if trimmedCode == "" {
		// Empty code -> all test cases fail
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

	normLang := strings.ToLower(strings.TrimSpace(lang))
	switch normLang {
	case "python", "py":
		return executePython(trimmedCode, testCases)
	case "javascript", "js", "node", "nodejs", "":
		return executeJavaScript(trimmedCode, testCases)
	default:
		return executeJavaScript(trimmedCode, testCases)
	}
}

func findNodeExecutable() (string, error) {
	candidates := []string{
		"node",
		"nodejs",
		"/usr/bin/node",
		"/usr/local/bin/node",
		"/usr/bin/nodejs",
		"/usr/local/bin/nodejs",
		`C:\Program Files\nodejs\node.exe`,
		`C:\Program Files (x86)\nodejs\node.exe`,
	}
	for _, c := range candidates {
		if path, err := exec.LookPath(c); err == nil {
			return path, nil
		}
	}
	return "", fmt.Errorf("Node.js runtime ('node' or 'nodejs') not found in $PATH. Please ensure Node.js is installed or rebuild docker container")
}

func findPythonExecutable() (string, error) {
	candidates := []string{
		"python3",
		"python",
		"py",
		"/usr/bin/python3",
		"/usr/local/bin/python3",
		"/usr/bin/python",
		`C:\Python312\python.exe`,
		`C:\Python311\python.exe`,
		`C:\Python310\python.exe`,
	}
	for _, c := range candidates {
		if path, err := exec.LookPath(c); err == nil {
			return path, nil
		}
	}
	return "", fmt.Errorf("Python runtime ('python3' or 'python') not found in $PATH. Please ensure Python is installed or rebuild docker container")
}

// executeJavaScript executes the JS code in Node.js
func executeJavaScript(code string, testCases []EvalTestCase) ([]EvalResult, error) {
	nodePath, nodeErr := findNodeExecutable()
	if nodeErr != nil {
		results := make([]EvalResult, len(testCases))
		for i, tc := range testCases {
			results[i] = EvalResult{
				Index:       tc.Index,
				IsHidden:    tc.IsHidden,
				Name:        tc.Name,
				Input:       tc.Input,
				Expected:    tc.ExpectedOutput,
				Actual:      "Execution Error: " + nodeErr.Error(),
				Passed:      false,
				ExecutionMs: 0,
			}
		}
		return results, nil
	}

	casesJSON, err := json.Marshal(testCases)
	if err != nil {
		return nil, err
	}

	// Wrapper harness script
	harness := fmt.Sprintf(`
const vm = require('vm');

const candidateCode = %q;
const cases = %s;
const output = [];

try {
  const contextObj = {
    console: console,
    Math: Math,
    Map: Map,
    Set: Set,
    Array: Array,
    Object: Object,
    String: String,
    Number: Number,
    Boolean: Boolean,
    RegExp: RegExp,
    Date: Date,
    JSON: JSON,
    parseInt: parseInt,
    parseFloat: parseFloat,
    isNaN: isNaN,
    isFinite: isFinite
  };
  vm.createContext(contextObj);

  // Execute candidate declarations in isolated context
  vm.runInContext(candidateCode, contextObj, { timeout: 3000 });

  // Locate the candidate entry function or class
  let targetFn = null;
  if (typeof contextObj.Solution === 'function') {
    try {
      const inst = new contextObj.Solution();
      const methods = Object.getOwnPropertyNames(contextObj.Solution.prototype).filter(m => m !== 'constructor');
      if (methods.length > 0 && typeof inst[methods[0]] === 'function') {
        targetFn = inst[methods[0]].bind(inst);
      }
    } catch(e) {}
  }

  if (!targetFn) {
    const candidateNames = [
      'twoSum', 'isPalindrome', 'isAnagram', 'solution', 'solve', 
      'maxSubArray', 'lengthOfLongestSubstring', 'isValid', 'mergeTwoLists',
      'maxProfit', 'containsDuplicate', 'productExceptSelf', 'search'
    ];
    for (const name of candidateNames) {
      if (typeof contextObj[name] === 'function') {
        targetFn = contextObj[name];
        break;
      }
    }
  }

  // Fallback: search any user-defined function in context
  if (!targetFn) {
    for (const key of Object.keys(contextObj)) {
      if (typeof contextObj[key] === 'function' && !['parseInt', 'parseFloat', 'isNaN', 'isFinite'].includes(key)) {
        targetFn = contextObj[key];
        break;
      }
    }
  }

  if (!targetFn) {
    throw new Error('No executable function found. Please define your solution function.');
  }

  // Evaluate each test case one-by-one in the queue
  for (let i = 0; i < cases.length; i++) {
    const tc = cases[i];
    const startTime = Date.now();
    try {
      let inputClean = (tc.input || '').trim();
      // Extract variable names from assignments like 'nums = [2,7], target = 9'
      const varMatches = [...inputClean.matchAll(/([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=/g)];
      const varNames = varMatches.map(m => m[1]);

      let runnerScript;
      if (varNames.length > 0) {
        runnerScript = '(function(__fn) { let ' + inputClean + '; return __fn(' + varNames.join(', ') + '); })';
      } else {
        runnerScript = '(function(__fn) { return __fn(' + inputClean + '); })';
      }

      const runner = vm.runInContext(runnerScript, contextObj, { timeout: 2000 });
      const rawRes = runner(targetFn);

      let actualStr;
      if (rawRes === undefined) {
        actualStr = 'undefined';
      } else if (typeof rawRes === 'object' && rawRes !== null) {
        actualStr = JSON.stringify(rawRes);
      } else {
        actualStr = String(rawRes);
      }

      const expectedStr = String(tc.expected || '').trim();

      // Normalize string comparisons
      const normActual = actualStr.replace(/\s+/g, '');
      const normExpected = expectedStr.replace(/\s+/g, '');
      const passed = (normActual.toLowerCase() === normExpected.toLowerCase()) || (normActual === normExpected);

      output.push({
        index: tc.index,
        is_hidden: !!tc.is_hidden,
        name: tc.name || ('Case ' + tc.index),
        input: tc.input,
        expected: expectedStr,
        actual: actualStr,
        passed: passed,
        execution_ms: Math.max(1, Date.now() - startTime)
      });
    } catch(caseErr) {
      output.push({
        index: tc.index,
        is_hidden: !!tc.is_hidden,
        name: tc.name || ('Case ' + tc.index),
        input: tc.input,
        expected: tc.expected,
        actual: 'Runtime Error: ' + caseErr.message,
        passed: false,
        execution_ms: Math.max(1, Date.now() - startTime)
      });
    }
  }
} catch(globalErr) {
  for (let i = 0; i < cases.length; i++) {
    const tc = cases[i];
    output.push({
      index: tc.index,
      is_hidden: !!tc.is_hidden,
      name: tc.name || ('Case ' + tc.index),
      input: tc.input,
      expected: tc.expected,
      actual: 'Compilation / Syntax Error: ' + globalErr.message,
      passed: false,
      execution_ms: 0
    });
  }
}

console.log(JSON.stringify(output));
`, code, string(casesJSON))

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	cmd := exec.CommandContext(ctx, nodePath, "-e", harness)
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err = cmd.Run()
	if err != nil && stdout.Len() == 0 {
		// Execution failure or Node error
		errMessage := stderr.String()
		if errMessage == "" {
			errMessage = err.Error()
		}
		results := make([]EvalResult, len(testCases))
		for i, tc := range testCases {
			results[i] = EvalResult{
				Index:       tc.Index,
				IsHidden:    tc.IsHidden,
				Name:        tc.Name,
				Input:       tc.Input,
				Expected:    tc.ExpectedOutput,
				Actual:      "Execution Error: " + strings.TrimSpace(errMessage),
				Passed:      false,
				ExecutionMs: 0,
			}
		}
		return results, nil
	}

	var results []EvalResult
	if jsonErr := json.Unmarshal(stdout.Bytes(), &results); jsonErr != nil {
		results = make([]EvalResult, len(testCases))
		for i, tc := range testCases {
			results[i] = EvalResult{
				Index:       tc.Index,
				IsHidden:    tc.IsHidden,
				Name:        tc.Name,
				Input:       tc.Input,
				Expected:    tc.ExpectedOutput,
				Actual:      "Evaluation Parse Error",
				Passed:      false,
				ExecutionMs: 0,
			}
		}
	}

	return results, nil
}

// executePython executes Python candidate code
func executePython(code string, testCases []EvalTestCase) ([]EvalResult, error) {
	pyPath, pyErr := findPythonExecutable()
	if pyErr != nil {
		results := make([]EvalResult, len(testCases))
		for i, tc := range testCases {
			results[i] = EvalResult{
				Index:       tc.Index,
				IsHidden:    tc.IsHidden,
				Name:        tc.Name,
				Input:       tc.Input,
				Expected:    tc.ExpectedOutput,
				Actual:      "Execution Error: " + pyErr.Error(),
				Passed:      false,
				ExecutionMs: 0,
			}
		}
		return results, nil
	}

	casesJSON, err := json.Marshal(testCases)
	if err != nil {
		return nil, err
	}

	harness := fmt.Sprintf(`
import json, time, re, sys

candidate_code = %q
cases = json.loads(%q)
output = []

try:
    loc = {}
    exec(candidate_code, loc)

    target_fn = None
    if 'Solution' in loc:
        try:
            inst = loc['Solution']()
            methods = [m for m in dir(inst) if not m.startswith('__') and callable(getattr(inst, m))]
            if methods:
                target_fn = getattr(inst, methods[0])
        except Exception:
            pass

    if not target_fn:
        for name in ['twoSum', 'isPalindrome', 'isAnagram', 'solution', 'solve', 'maxSubArray', 'isValid']:
            if name in loc and callable(loc[name]):
                target_fn = loc[name]
                break

    if not target_fn:
        for k, v in loc.items():
            if callable(v) and not k.startswith('__'):
                target_fn = v
                break

    if not target_fn:
        raise Exception("No executable function found in Python code.")

    for tc in cases:
        start = time.time()
        try:
            input_clean = tc.get('input', '').strip()
            # Execute variable assignments in isolated local dict
            case_loc = {}
            # Replace comma separated declarations if needed
            lines = input_clean.replace(',', '\n')
            exec(lines, case_loc)

            var_names = list(case_loc.keys())
            args = [case_loc[k] for k in var_names]
            res = target_fn(*args)

            actual_str = json.dumps(res) if isinstance(res, (list, dict, bool, int, float)) else str(res)
            expected_str = str(tc.get('expected', '')).strip()

            norm_actual = actual_str.replace(' ', '').lower()
            norm_expected = expected_str.replace(' ', '').lower()
            passed = (norm_actual == norm_expected)

            output.append({
                "index": tc.get("index", 1),
                "is_hidden": bool(tc.get("is_hidden", False)),
                "name": tc.get("name", "Case"),
                "input": tc.get("input", ""),
                "expected": expected_str,
                "actual": actual_str,
                "passed": passed,
                "execution_ms": max(1, int((time.time() - start) * 1000))
            })
        except Exception as case_err:
            output.append({
                "index": tc.get("index", 1),
                "is_hidden": bool(tc.get("is_hidden", False)),
                "name": tc.get("name", "Case"),
                "input": tc.get("input", ""),
                "expected": str(tc.get("expected", "")),
                "actual": f"Runtime Error: {str(case_err)}",
                "passed": False,
                "execution_ms": max(1, int((time.time() - start) * 1000))
            })
except Exception as global_err:
    for tc in cases:
        output.append({
            "index": tc.get("index", 1),
            "is_hidden": bool(tc.get("is_hidden", False)),
            "name": tc.get("name", "Case"),
            "input": tc.get("input", ""),
            "expected": str(tc.get("expected", "")),
            "actual": f"Compilation Error: {str(global_err)}",
            "passed": False,
            "execution_ms": 0
        })

print(json.dumps(output))
`, code, string(casesJSON))

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	cmd := exec.CommandContext(ctx, pyPath, "-c", harness)
	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err = cmd.Run()
	if err != nil && stdout.Len() == 0 {
		errMessage := stderr.String()
		if errMessage == "" {
			errMessage = err.Error()
		}
		results := make([]EvalResult, len(testCases))
		for i, tc := range testCases {
			results[i] = EvalResult{
				Index:       tc.Index,
				IsHidden:    tc.IsHidden,
				Name:        tc.Name,
				Input:       tc.Input,
				Expected:    tc.ExpectedOutput,
				Actual:      "Python Execution Error: " + strings.TrimSpace(errMessage),
				Passed:      false,
				ExecutionMs: 0,
			}
		}
		return results, nil
	}

	var results []EvalResult
	if jsonErr := json.Unmarshal(stdout.Bytes(), &results); jsonErr != nil {
		results = make([]EvalResult, len(testCases))
		for i, tc := range testCases {
			results[i] = EvalResult{
				Index:       tc.Index,
				IsHidden:    tc.IsHidden,
				Name:        tc.Name,
				Input:       tc.Input,
				Expected:    tc.ExpectedOutput,
				Actual:      "Evaluation Parse Error",
				Passed:      false,
				ExecutionMs: 0,
			}
		}
	}

	return results, nil
}

// ExecuteCustomInput runs custom input against candidate code
func ExecuteCustomInput(code string, lang string, customInput string) (EvalResult, error) {
	tc := []EvalTestCase{
		{
			Index:          1,
			IsHidden:       false,
			Name:           "Custom Input Case",
			Input:          customInput,
			ExpectedOutput: "Custom Output",
		},
	}
	results, err := ExecuteTestCases(code, lang, tc)
	if err != nil || len(results) == 0 {
		return EvalResult{
			Index:       1,
			IsHidden:    false,
			Name:        "Custom Input Case",
			Input:       customInput,
			Expected:    "Custom Output",
			Actual:      "Execution failed",
			Passed:      false,
			ExecutionMs: rand.Intn(20) + 10,
		}, err
	}
	// For custom input, if it ran without error, mark passed = true
	res := results[0]
	if !strings.HasPrefix(res.Actual, "Compilation") && !strings.HasPrefix(res.Actual, "Runtime Error") && !strings.HasPrefix(res.Actual, "No executable") && !strings.HasPrefix(res.Actual, "No code") {
		res.Passed = true
	}
	return res, nil
}
