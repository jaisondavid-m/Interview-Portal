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
	case "py", "python", "python3":
		return "python"
	case "js", "javascript", "node", "nodejs":
		return "javascript"
	case "cpp", "c++", "g++", "c", "clang++":
		return "cpp"
	case "java", "openjdk", "jvm":
		return "java"
	default:
		return "javascript"
	}
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

	scriptPath := filepath.Join(tmpDir, "solution.py")
	if err := os.WriteFile(scriptPath, []byte(code), 0644); err != nil {
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

	scriptPath := filepath.Join(tmpDir, "solution.js")
	if err := os.WriteFile(scriptPath, []byte(code), 0644); err != nil {
		return executeViaRemote("javascript", code, testCases, isCustom)
	}

	return runCommandPerTestCase(nodePath, []string{scriptPath}, testCases, isCustom)
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

	// Detect class name from Java code (default to Solution or Main)
	className := "Solution"
	re := regexp.MustCompile(`(?:public\s+)?class\s+([A-Za-z0-9_]+)`)
	matches := re.FindStringSubmatch(code)
	if len(matches) > 1 && matches[1] != "" {
		className = matches[1]
	}

	srcPath := filepath.Join(tmpDir, className+".java")
	if err := os.WriteFile(srcPath, []byte(code), 0644); err != nil {
		return executeViaRemote("java", code, testCases, isCustom)
	}

	// Try javac compilation first if available
	javacPath, javacErr := findExecutable("javac", "/usr/bin/javac", "/usr/local/bin/javac")
	if javacErr == nil {
		ctxCompile, cancelCompile := context.WithTimeout(context.Background(), 8*time.Second)
		defer cancelCompile()

		compileCmd := exec.CommandContext(ctxCompile, javacPath, srcPath)
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
		ctx, cancel := context.WithTimeout(context.Background(), 3500*time.Millisecond)
		cmd := exec.CommandContext(ctx, execPath, baseArgs...)

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
				Actual:      "Time Limit Exceeded (> 3.5s)",
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
			normActual := normalizeOutput(actualStdout)
			normExpected := normalizeOutput(tc.ExpectedOutput)
			passed := (normActual == normExpected)

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

// ============================================================
// REMOTE CODE EXECUTION FALLBACK (Judge0 CE API)
// ============================================================
func executeViaRemote(lang string, code string, testCases []EvalTestCase, isCustom bool) ([]EvalResult, error) {
	var langID int
	switch lang {
	case "cpp", "c++":
		langID = 54 // C++ (GCC 9.2.0)
	case "python", "python3", "py":
		langID = 71 // Python 3.8.1
	case "javascript", "js", "node":
		langID = 63 // JavaScript (Node.js 12.14.0)
	case "java":
		langID = 62 // Java (OpenJDK 13.0.1)
	default:
		langID = 63
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
			normActual := normalizeOutput(actualStdout)
			normExpected := normalizeOutput(tc.ExpectedOutput)
			passed := (normActual == normExpected)

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
