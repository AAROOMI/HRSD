export interface Policy {
  id: string;
  title: string;
  frameworkText: string;
}

export interface PolicyArticle {
  title:string;
  content: string;
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
  user: string;
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

export type View = 'complianceDashboard' | 'documentList' | 'viewer' | 'compliance' | 'liveAssistant' | 'riskAssessment';

export interface TourState {
  isActive: boolean;
  step: number;
}

// --- Risk Assessment Types ---
export type RiskLikelihood = 'Low' | 'Medium' | 'High';
export type RiskImpact = 'Low' | 'Medium' | 'High';
export type RiskComplianceStatus = 'Compliant' | 'Partially Compliant' | 'Non-Compliant';
export type RiskLevel = 'Low' | 'Moderate' | 'High' | 'Severe';

export interface RiskAssessmentItem {
  id: string;
  category: string;
  riskDescription: string;
  frameworkReference: string;
  likelihood: RiskLikelihood;
  impact: RiskImpact;
  mitigationControls: string;
  complianceStatus: RiskComplianceStatus;
  actionItems: string;
}