export type NavTab = 'home' | 'tools' | 'jobs' | 'notes' | 'settings';

export type FieldOption = { label: string; value: string };

export type CalculatorField = {
  key: string;
  label: string;
  type?: 'number' | 'select' | 'checkbox' | 'text';
  unit?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  defaultValue?: string;
  options?: FieldOption[];
  required?: boolean;
  showWhen?: { key: string; equals: string | string[] };
};

export type CalculationResult = {
  headline: string;
  summary: string;
  rows: Array<{ label: string; value: string }>;
  warning?: string;
};

export type CalculatorDefinition = {
  id: string;
  title: string;
  subtitle: string;
  category: 'Design' | 'Testing' | 'General';
  accent: string;
  icon: string;
  fields: CalculatorField[];
  calculate(values: Record<string, string>): CalculationResult;
};

export type JobEntry = {
  id: string;
  calculatorId: string;
  title: string;
  result: CalculationResult;
  createdAt: string;
};

export type PhotoAsset = {
  id: string;
  src: string;
  label: string;
  createdAt: string;
};

export type Job = {
  id: string;
  name: string;
  customer: string;
  reference: string;
  address: string;
  date: string;
  notes: string;
  entries: JobEntry[];
  photos?: PhotoAsset[];
  signedBy?: string;
  signedDate?: string;
  signatureDataUrl?: string;
  createdAt: string;
  updatedAt: string;
};

export type Note = {
  id: string;
  title: string;
  body: string;
  photos?: PhotoAsset[];
  createdAt: string;
  updatedAt: string;
};

export type AppData = {
  version: 2;
  jobs: Job[];
  notes: Note[];
  pinnedTools: string[];
  disclaimerAccepted: boolean;
  theme?: 'dark' | 'light';
};
