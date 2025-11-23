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
}

export interface TestCase {
  name: string;
  checkDescription: string;
  objectJsonSchema: {
    type: 'object';
    required: string[];
    properties: Record<string, { type: string; items?: { type: string } }>;
  };
  testData: TestData[];
  referenceConfig: ConfigSchema;
}

export interface CaseResult {
  caseName: string;
  model: string;
  mode: Mode;
  error?: string;
  testResults: TestResult[];
  duration: number; // Duration in milliseconds
}

export interface ModelScore {
  model: string;
  totalCases: number;
  successfulCases: number;
  score: number;
  averageTime: number; // Average time in milliseconds
}

export interface ModelSummary {
  model: string;
  score: ModelScore;
  caseResults: CaseResult[];
}
