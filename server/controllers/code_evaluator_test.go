package controllers

import (
	"testing"
)

func TestExecuteTestCasesStandardIO_JS(t *testing.T) {
	testCases := []EvalTestCase{
		{
			Index:          1,
			IsHidden:       false,
			Name:           "Sample Case 1",
			Input:          "5 7\n",
			ExpectedOutput: "12",
		},
		{
			Index:          2,
			IsHidden:       false,
			Name:           "Sample Case 2",
			Input:          "-3 10\n",
			ExpectedOutput: "7",
		},
	}

	// 1. Correct JS Code reading stdin and printing to stdout
	correctCode := `
const fs = require('fs');
const input = fs.readFileSync(0, 'utf-8').trim().split(/\s+/);
const a = parseInt(input[0], 10);
const b = parseInt(input[1], 10);
console.log(a + b);
`
	results, err := ExecuteTestCases(correctCode, "javascript", testCases)
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}
	if len(results) != 2 {
		t.Fatalf("Expected 2 results, got %d", len(results))
	}
	if !results[0].Passed || !results[1].Passed {
		t.Errorf("Expected correct code to PASS test cases, but got: Case 1: %v (%s), Case 2: %v (%s)",
			results[0].Passed, results[0].Actual, results[1].Passed, results[1].Actual)
	}

	// 2. Incorrect JS Code
	wrongCode := `
const fs = require('fs');
console.log(999);
`
	resultsWrong, err := ExecuteTestCases(wrongCode, "javascript", testCases)
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}
	if resultsWrong[0].Passed || resultsWrong[1].Passed {
		t.Errorf("Expected wrong code to FAIL test cases, but got: %v, %v", resultsWrong[0].Passed, resultsWrong[1].Passed)
	}
}

func TestExecuteTestCasesStandardIO_Python(t *testing.T) {
	testCases := []EvalTestCase{
		{
			Index:          1,
			IsHidden:       false,
			Name:           "Sample Case 1",
			Input:          "5 7\n",
			ExpectedOutput: "12",
		},
	}

	correctPy := `
import sys
parts = sys.stdin.read().split()
if parts:
    print(int(parts[0]) + int(parts[1]))
`
	results, err := ExecuteTestCases(correctPy, "python", testCases)
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}
	if len(results) != 1 {
		t.Fatalf("Expected 1 result, got %d", len(results))
	}
	if !results[0].Passed {
		t.Errorf("Expected Python code to PASS test case, but got: %v (%s)", results[0].Passed, results[0].Actual)
	}
}
