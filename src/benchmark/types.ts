import type { ConfigSchema } from '../core/config-checker.js';

export type Mode = 'toolBased' | 'promptBased';

export type ScoringMethod = 'tests' | 'cases';

export interface TestResult {
  passed: boolean;
  expected: boolean;
  passedAsExpected: boolean;
}

export interface TestData {
  data: Record<string, unknown>;
  expectedResult: boolean;
  description?: string; // Optional description explaining what this test case checks
}

export interface TestCaseConfig {
  name: string;
  checkDescription: string;
  testData: TestData[];
  referenceConfig: ConfigSchema;
}

export interface TestCase {
  name: string;
  objectJsonSchema: {
    type: 'object';
    required: string[];
    properties: Record<string, { type: string; items?: { type: string } }>;
  };
  configs: TestCaseConfig[];
}

export interface CaseResult {
  caseName: string;
  configName: string;
  model: string;
  mode: Mode;
  error?: string;
  testResults: TestResult[];
  duration: number; // Duration in milliseconds
  llmCalls: number; // Number of LLM calls made (schema generation attempts)
}

export interface ModelScore {
  model: string;
  totalCases: number;
  successfulCases: number;
  score: number;
  averageTime: number; // Average time in milliseconds
  averageLlmCalls: number; // Average number of LLM calls per case
}

export interface ModelSummary {
  model: string;
  score: ModelScore;
  caseResults: CaseResult[];
}
