package controllers

import (
	"bytes"
	"context"
	"fmt"
	"os/exec"
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

	normLang := strings.ToLower(strings.TrimSpace(lang))
	switch normLang {
	case "python", "py", "python3":
		return executeProgram("python", trimmedCode, testCases, false)
	case "javascript", "js", "node", "nodejs", "":
		return executeProgram("javascript", trimmedCode, testCases, false)
	default:
		return executeProgram("javascript", trimmedCode, testCases, false)
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

	normLang := strings.ToLower(strings.TrimSpace(lang))
	var results []EvalResult
	var err error
	switch normLang {
	case "python", "py", "python3":
		results, err = executeProgram("python", trimmedCode, tc, true)
	default:
		results, err = executeProgram("javascript", trimmedCode, tc, true)
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
	return "", fmt.Errorf("Node.js runtime ('node' or 'nodejs') not found in $PATH")
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
	return "", fmt.Errorf("Python runtime ('python3' or 'python') not found in $PATH")
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

// executeProgram runs candidate code through standard I/O (stdin -> stdout) for each test case
func executeProgram(lang string, code string, testCases []EvalTestCase, isCustom bool) ([]EvalResult, error) {
	var execPath string
	var execArgs []string
	var err error

	if lang == "python" {
		execPath, err = findPythonExecutable()
		if err != nil {
			return makeErrorResults(testCases, "Python Runtime Not Found: "+err.Error()), nil
		}
		execArgs = []string{"-c", code}
	} else {
		execPath, err = findNodeExecutable()
		if err != nil {
			return makeErrorResults(testCases, "Node.js Runtime Not Found: "+err.Error()), nil
		}
		execArgs = []string{"-e", code}
	}

	results := make([]EvalResult, len(testCases))

	for i, tc := range testCases {
		ctx, cancel := context.WithTimeout(context.Background(), 3500*time.Millisecond)
		cmd := exec.CommandContext(ctx, execPath, execArgs...)

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

		// 2. Check Runtime / Compilation Error
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

		// 3. Compare Standard Output with Expected Output
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
