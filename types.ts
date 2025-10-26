export interface Policy {
  id: string;
  title: string;
  frameworkText: string;
}

export interface PolicyArticle {
  title: string;
  content: string[];
}

export interface DocumentContent {
  description: string;
  scope: string;
  purpose: string;
  articles: PolicyArticle[];
}

export type DocumentStatus = 'Draft' | 'Pending Approval' | 'Revisions Requested' | 'Approved' | 'Published' | 'Archived';

export interface HistoryLog {
  timestamp: string;
  status: DocumentStatus;
  notes: string;
}

export interface DocumentObject {
  id: string;
  policyTitle: string;
  content: DocumentContent;
  status: DocumentStatus;
  version: number;
  history: HistoryLog[];
  createdAt: string;
  updatedAt: string;
}

export interface ComplianceStep {
  title: string;
  description: string;
}

export interface CompliancePlan {
  steps: ComplianceStep[];
}
