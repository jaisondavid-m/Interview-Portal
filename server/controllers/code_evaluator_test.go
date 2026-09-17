package controllers

import (
	"testing"
)

func TestExecuteGoDSA(t *testing.T) {
	code := `package main

import (
	"bufio"
	"fmt"
	"os"
	"strconv"
	"strings"
)

func main() {
	scanner := bufio.NewScanner(os.Stdin)
	for scanner.Scan() {
		line := scanner.Text()
		parts := strings.Fields(line)
		if len(parts) >= 2 {
			a, _ := strconv.Atoi(parts[0])
			b, _ := strconv.Atoi(parts[1])
			fmt.Println(a + b)
		}
	}
}
`

	testCases := []EvalTestCase{
		{
			Index:          1,
			IsHidden:       false,
			Name:           "Sample Case 1",
			Input:          "2 3",
			ExpectedOutput: "5",
		},
		{
			Index:          2,
			IsHidden:       false,
			Name:           "Sample Case 2",
			Input:          "10 20",
			ExpectedOutput: "30",
		},
	}

	results, err := ExecuteTestCases(code, "go", testCases)
	if err != nil {
		t.Fatalf("ExecuteTestCases failed: %v", err)
	}

	if len(results) != 2 {
		t.Fatalf("expected 2 results, got %d", len(results))
	}

	for i, r := range results {
		if !r.Passed {
			t.Errorf("test case %d failed: expected %q, got %q", i+1, r.Expected, r.Actual)
		}
	}
}

func TestExecuteGoWithoutPackageMain(t *testing.T) {
	code := `import (
	"fmt"
)

func main() {
	fmt.Println("Auto package main works")
}
`

	testCases := []EvalTestCase{
		{
			Index:          1,
			IsHidden:       false,
			Name:           "Sample Case 1",
			Input:          "",
			ExpectedOutput: "Auto package main works",
		},
	}

	results, err := ExecuteTestCases(code, "go", testCases)
	if err != nil {
		t.Fatalf("ExecuteTestCases failed: %v", err)
	}

	if len(results) != 1 || !results[0].Passed {
		t.Fatalf("expected test case to pass, got %+v", results)
	}
}

func TestExecuteGoCustomInput(t *testing.T) {
	code := `package main

import (
	"fmt"
	"os"
	"io"
)

func main() {
	b, _ := io.ReadAll(os.Stdin)
	fmt.Printf("Received: %s", string(b))
}
`
	res, err := ExecuteCustomInput(code, "go", "custom test payload")
	if err != nil {
		t.Fatalf("ExecuteCustomInput failed: %v", err)
	}

	if res.Actual != "Received: custom test payload" {
		t.Fatalf("expected 'Received: custom test payload', got %q", res.Actual)
	}
}
