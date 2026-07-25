/**
 * Code Analysis Tool
 * Analyzes ExpressoTS code for issues and improvement suggestions
 */

import * as fs from 'fs';
import type { CodeAnalysisResult, CodeIssue, CodeSuggestion } from '../types/index.js';

/** Analyze a file for issues and suggestions */
export function analyzeCode(filePath: string): CodeAnalysisResult {
  let content: string;
  try {
    content = fs.readFileSync(filePath, 'utf-8');
  } catch {
    return {
      file: filePath,
      issues: [{ type: 'error', message: `Could not read file: ${filePath}` }],
      suggestions: [],
    };
  }

  const issues: CodeIssue[] = [];
  const suggestions: CodeSuggestion[] = [];
  const lines = content.split('\n');

  // Run all analyzers
  analyzeImports(content, lines, issues, suggestions);
  analyzeSecurityPatterns(content, lines, issues, suggestions);
  analyzePerformancePatterns(content, lines, issues, suggestions);
  analyzeBestPractices(content, lines, issues, suggestions);
  analyzeExpressoTSPatterns(content, lines, issues, suggestions);

  return { file: filePath, issues, suggestions };
}

/** Analyze import statements */
function analyzeImports(
  content: string,
  _lines: string[],
  issues: CodeIssue[],
  _suggestions: CodeSuggestion[]
): void {
  // Check for unused imports (simple heuristic)
  const importRegex = /import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/g;
  let match;

  while ((match = importRegex.exec(content)) !== null) {
    const imports = match[1].split(',').map((i) => i.trim());
    const fromModule = match[2];

    for (const imp of imports) {
      const cleanName = imp.split(' as ')[0].trim();
      // Count occurrences (excluding the import line itself)
      const occurrences = content.split(cleanName).length - 1;
      
      if (occurrences === 1) {
        const line = getLineNumber(content, match.index);
        issues.push({
          type: 'warning',
          message: `Potentially unused import: ${cleanName}`,
          line,
          rule: 'no-unused-imports',
        });
      }
    }

    // Check for circular dependency potential
    if (fromModule.startsWith('./') || fromModule.startsWith('../')) {
      if (fromModule.includes('..') && fromModule.split('..').length > 3) {
        issues.push({
          type: 'info',
          message: `Deep relative import detected. Consider using path aliases.`,
          line: getLineNumber(content, match.index),
          rule: 'prefer-path-alias',
        });
      }
    }
  }
}

/** Analyze security patterns */
function analyzeSecurityPatterns(
  content: string,
  _lines: string[],
  issues: CodeIssue[],
  suggestions: CodeSuggestion[]
): void {
  // Check for hardcoded secrets
  const secretPatterns = [
    { pattern: /password\s*[:=]\s*['"][^'"]+['"]/gi, name: 'password' },
    { pattern: /api[_-]?key\s*[:=]\s*['"][^'"]+['"]/gi, name: 'API key' },
    { pattern: /secret\s*[:=]\s*['"][^'"]+['"]/gi, name: 'secret' },
    { pattern: /token\s*[:=]\s*['"][^'"]+['"]/gi, name: 'token' },
  ];

  for (const { pattern, name } of secretPatterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      // Skip if it looks like a type or parameter
      if (!match[0].includes('process.env')) {
        issues.push({
          type: 'error',
          message: `Possible hardcoded ${name} detected. Use environment variables.`,
          line: getLineNumber(content, match.index),
          rule: 'no-hardcoded-secrets',
        });
      }
    }
  }

  // Check for SQL injection risk
  if (content.includes('query(') || content.includes('execute(')) {
    const templateLiteralRegex = /(?:query|execute)\s*\(\s*`[^`]*\$\{/g;
    let match;
    while ((match = templateLiteralRegex.exec(content)) !== null) {
      issues.push({
        type: 'error',
        message: 'Potential SQL injection: Use parameterized queries instead of template literals.',
        line: getLineNumber(content, match.index),
        rule: 'no-sql-injection',
      });
    }
  }

  // Check for missing input validation
  if (content.includes('@controller') || content.includes('@Controller')) {
    if (!content.includes('class-validator') && !content.includes('validate')) {
      suggestions.push({
        type: 'security',
        message: 'Consider adding input validation using class-validator',
        fix: "Import and use class-validator decorators for DTOs",
      });
    }
  }
}

/** Analyze performance patterns */
function analyzePerformancePatterns(
  content: string,
  _lines: string[],
  issues: CodeIssue[],
  suggestions: CodeSuggestion[]
): void {
  // Check for N+1 query patterns
  const forLoopWithAwait = /for\s*\([^)]+\)\s*\{[^}]*await\s+(?:this\.)?\w+\.(find|get|fetch|query)/g;
  let match;
  while ((match = forLoopWithAwait.exec(content)) !== null) {
    issues.push({
      type: 'warning',
      message: 'Potential N+1 query: Consider batching database calls',
      line: getLineNumber(content, match.index),
      rule: 'no-n-plus-one',
    });
    
    suggestions.push({
      type: 'performance',
      message: 'Replace loop with single batch query',
      line: getLineNumber(content, match.index),
      fix: 'Use findMany/getAll with an array of IDs instead of individual calls in a loop',
    });
  }

  // Check for missing async optimization
  const sequentialAwaits = /await\s+\w+\([^)]*\);\s*\n\s*await\s+\w+\([^)]*\)/g;
  while ((match = sequentialAwaits.exec(content)) !== null) {
    suggestions.push({
      type: 'performance',
      message: 'Sequential awaits detected. Consider using Promise.all() for independent operations',
      line: getLineNumber(content, match.index),
      fix: 'const [result1, result2] = await Promise.all([operation1(), operation2()])',
    });
  }

  // Check for large response without pagination
  if (content.includes('findAll') || content.includes('find({})')) {
    if (!content.includes('limit') && !content.includes('take') && !content.includes('pagination')) {
      suggestions.push({
        type: 'performance',
        message: 'findAll without pagination may cause performance issues with large datasets',
        fix: 'Add limit/offset or pagination parameters',
      });
    }
  }

  // Check for missing caching opportunities
  if (content.includes('@Get') || content.includes('@get')) {
    if (!content.includes('cache') && !content.includes('Cache')) {
      suggestions.push({
        type: 'performance',
        message: 'Consider adding caching for GET endpoints to improve response times',
        fix: 'Add a caching layer using Redis or in-memory cache',
      });
    }
  }
}

/** Analyze general best practices */
function analyzeBestPractices(
  content: string,
  _lines: string[],
  issues: CodeIssue[],
  suggestions: CodeSuggestion[]
): void {
  // Check for console.log in production code
  if (content.includes('console.log')) {
    const consoleRegex = /console\.log\(/g;
    let match;
    while ((match = consoleRegex.exec(content)) !== null) {
      issues.push({
        type: 'warning',
        message: 'Remove console.log from production code. Use a proper logger.',
        line: getLineNumber(content, match.index),
        rule: 'no-console-log',
      });
    }
  }

  // Check for any type usage
  const anyTypeRegex = /:\s*any(?:\s|;|,|\)|\])/g;
  let match;
  while ((match = anyTypeRegex.exec(content)) !== null) {
    issues.push({
      type: 'warning',
      message: 'Avoid using "any" type. Use proper typing.',
      line: getLineNumber(content, match.index),
      rule: 'no-explicit-any',
    });
  }

  // Check for proper error handling
  if (content.includes('async ')) {
    if (!content.includes('try') && !content.includes('catch')) {
      suggestions.push({
        type: 'best-practice',
        message: 'Async functions should have proper error handling',
        fix: 'Add try-catch blocks or use error handling middleware',
      });
    }
  }

  // Check for magic numbers
  const magicNumberRegex = /(?:if|while|for|===|!==|>|<|>=|<=)\s*\(?(\d{2,})\)?/g;
  while ((match = magicNumberRegex.exec(content)) !== null) {
    const number = match[1];
    if (!['100', '200', '201', '204', '400', '401', '403', '404', '500'].includes(number)) {
      suggestions.push({
        type: 'best-practice',
        message: `Consider extracting magic number ${number} into a named constant`,
        line: getLineNumber(content, match.index),
        fix: `const MEANINGFUL_NAME = ${number};`,
      });
    }
  }
}

/** Analyze ExpressoTS-specific patterns */
function analyzeExpressoTSPatterns(
  content: string,
  _lines: string[],
  issues: CodeIssue[],
  suggestions: CodeSuggestion[]
): void {
  // Check for proper decorator usage
  if (content.includes('class') && content.includes('Controller')) {
    if (!content.includes('@controller')) {
      issues.push({
        type: 'warning',
        message: 'Controller class should use @controller decorator',
        rule: 'require-controller-decorator',
      });
    }
  }

  // Check for proper dependency injection
  if (content.includes('new ') && content.includes('Controller')) {
    const newKeywordInController = /new\s+\w+Service\s*\(/g;
    let match;
    while ((match = newKeywordInController.exec(content)) !== null) {
      issues.push({
        type: 'warning',
        message: 'Avoid using "new" for services. Use dependency injection instead.',
        line: getLineNumber(content, match.index),
        rule: 'prefer-di',
      });
    }
  }

  // Check for proper scoping
  if (content.includes('@provide') && !content.includes('@scope')) {
    suggestions.push({
      type: 'best-practice',
      message: 'Consider adding @scope decorator to explicitly define service lifecycle',
    });
  }

  // Check for missing response types
  if (content.includes('@controller')) {
    const methodWithoutReturn = /@(?:Get|Post|Put|Delete|Patch)\s*\([^)]*\)\s*\n\s*\w+\s*\([^)]*\)(?!\s*:)/g;
    let match;
    while ((match = methodWithoutReturn.exec(content)) !== null) {
      issues.push({
        type: 'info',
        message: 'Consider adding explicit return type to controller method',
        line: getLineNumber(content, match.index),
        rule: 'explicit-return-type',
      });
    }
  }
}

/** Get line number for a position in content */
function getLineNumber(content: string, position: number): number {
  const lines = content.substring(0, position).split('\n');
  return lines.length;
}
