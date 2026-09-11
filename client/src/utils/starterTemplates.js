// Helper utility to produce clean starter boilerplate for coding questions in JavaScript, Python, C++, Java

export function getStarterTemplate(question, language = 'javascript') {
  const title = question?.title || '';
  const payload = question?.payload || {};

  // 1. Priority: Check relational templates array (question.templates)
  if (Array.isArray(question?.templates)) {
    const matched = question.templates.find((t) => t.language === language);
    if (matched && matched.starter_code && matched.starter_code.trim()) {
      return matched.starter_code;
    }
  }

  // 2. Secondary: Check if admin configured a custom starter template in payload
  if (payload?.starter_templates && payload.starter_templates[language] && payload.starter_templates[language].trim()) {
    return payload.starter_templates[language];
  }

  // If question title matches Two Sum
  if (title.toLowerCase().includes('two sum')) {
    switch (language) {
      case 'python':
        return `class Solution:\n    def twoSum(self, nums: list[int], target: int) -> list[int]:\n        # Write your optimal solution here\n        pass\n`;
      case 'cpp':
        return `#include <vector>\n#include <unordered_map>\nusing namespace std;\n\nclass Solution {\npublic:\n    vector<int> twoSum(vector<int>& nums, int target) {\n        // Write your optimal solution here\n        return {};\n    }\n};\n`;
      case 'java':
        return `import java.util.HashMap;\n\nclass Solution {\n    public int[] twoSum(int[] nums, int target) {\n        // Write your optimal solution here\n        return new int[]{};\n    }\n}\n`;
      case 'javascript':
      default:
        return `/**\n * @param {number[]} nums\n * @param {number} target\n * @return {number[]}\n */\nfunction twoSum(nums, target) {\n    // Write your optimal solution here\n    \n}\n`;
    }
  }

  // If question title matches Valid Palindrome
  if (title.toLowerCase().includes('palindrome')) {
    switch (language) {
      case 'python':
        return `class Solution:\n    def isPalindrome(self, s: str) -> bool:\n        # Write your two-pointer solution here\n        pass\n`;
      case 'cpp':
        return `#include <string>\n#include <cctype>\nusing namespace std;\n\nclass Solution {\npublic:\n    bool isPalindrome(string s) {\n        // Write your two-pointer solution here\n        return false;\n    }\n};\n`;
      case 'java':
        return `class Solution {\n    public boolean isPalindrome(String s) {\n        // Write your two-pointer solution here\n        return false;\n    }\n}\n`;
      case 'javascript':
      default:
        return `/**\n * @param {string} s\n * @return {boolean}\n */\nfunction isPalindrome(s) {\n    // Write your two-pointer solution here\n    \n}\n`;
    }
  }

  // If question title matches Valid Anagram
  if (title.toLowerCase().includes('anagram')) {
    switch (language) {
      case 'python':
        return `class Solution:\n    def isAnagram(self, s: str, t: str) -> bool:\n        # Write your solution here\n        pass\n`;
      case 'cpp':
        return `#include <string>\n#include <vector>\nusing namespace std;\n\nclass Solution {\npublic:\n    bool isAnagram(string s, string t) {\n        // Write your solution here\n        return false;\n    }\n};\n`;
      case 'java':
        return `class Solution {\n    public boolean isAnagram(String s, String t) {\n        // Write your solution here\n        return false;\n    }\n}\n`;
      case 'javascript':
      default:
        return `/**\n * @param {string} s\n * @param {string} t\n * @return {boolean}\n */\nfunction isAnagram(s, t) {\n    // Write your solution here\n    \n}\n`;
    }
  }

  // Default fallback if custom question
  if (payload?.starter_code) {
    return payload.starter_code;
  }

  switch (language) {
    case 'python':
      return `def solution():\n    # Write your solution here\n    pass\n`;
    case 'cpp':
      return `#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write your solution here\n    return 0;\n}\n`;
    case 'java':
      return `class Solution {\n    public void solve() {\n        // Write your solution here\n    }\n}\n`;
    case 'javascript':
    default:
      return `function solution() {\n    // Write your solution here\n    \n}\n`;
  }
}
