package controllers

import (
	"testing"
)

func TestExecuteTestCases(t *testing.T) {
	testCases := []EvalTestCase{
		{
			Index:          1,
			IsHidden:       false,
			Name:           "Sample Case 1",
			Input:          "nums = [2,7,11,15], target = 9",
			ExpectedOutput: "[0,1]",
		},
		{
			Index:          2,
			IsHidden:       false,
			Name:           "Sample Case 2",
			Input:          "nums = [3,2,4], target = 6",
			ExpectedOutput: "[1,2]",
		},
	}

	// 1. Unimplemented Starter Code
	starterCode := `function twoSum(nums, target) {
		// Write your optimal solution here
	}`
	results, err := ExecuteTestCases(starterCode, "javascript", testCases)
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}
	if len(results) != 2 {
		t.Fatalf("Expected 2 results, got %d", len(results))
	}
	if results[0].Passed || results[1].Passed {
		t.Errorf("Expected starter code to FAIL test cases, but got passed: %v, %v", results[0].Passed, results[1].Passed)
	}

	// 2. Correct Implementation
	correctCode := `function twoSum(nums, target) {
		const map = new Map();
		for (let i = 0; i < nums.length; i++) {
			const diff = target - nums[i];
			if (map.has(diff)) return [map.get(diff), i];
			map.set(nums[i], i);
		}
		return [];
	}`
	resultsCorrect, err := ExecuteTestCases(correctCode, "javascript", testCases)
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}
	if !resultsCorrect[0].Passed || !resultsCorrect[1].Passed {
		t.Errorf("Expected correct code to PASS test cases, but got: %v (%s), %v (%s)",
			resultsCorrect[0].Passed, resultsCorrect[0].Actual,
			resultsCorrect[1].Passed, resultsCorrect[1].Actual)
	}

	// 3. Incorrect Implementation
	wrongCode := `function twoSum(nums, target) {
		return [99, 99];
	}`
	resultsWrong, err := ExecuteTestCases(wrongCode, "javascript", testCases)
	if err != nil {
		t.Fatalf("Unexpected error: %v", err)
	}
	if resultsWrong[0].Passed || resultsWrong[1].Passed {
		t.Errorf("Expected wrong code to FAIL test cases, but got: %v, %v", resultsWrong[0].Passed, resultsWrong[1].Passed)
	}
}
