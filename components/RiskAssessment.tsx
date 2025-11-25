
// Fix for SpeechRecognition API which is not in standard TS lib
// These interfaces are based on the Web Speech API specification.
interface SpeechRecognitionEvent extends Event {
    readonly results: SpeechRecognitionResultList;
}
interface SpeechRecognitionResultList {
    readonly length: number;
    item(index: number): SpeechRecognitionResult;
    [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionResult {
    readonly isFinal: boolean;
    readonly length: number;
    item(index: number): SpeechRecognitionAlternative;
    [index: number]: SpeechRecognitionAlternative;
}
interface SpeechRecognitionAlternative {
    readonly transcript: string;
}
interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
}
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  start(): void;
  stop(): void;
}
interface SpeechRecognitionStatic {
  new (): SpeechRecognition;
}
// FIX: Wrap the `Window` interface in `declare global` to augment the global window object.
// This resolves TypeScript errors because this file is a module.
declare global {
    interface Window {
      SpeechRecognition: SpeechRecognitionStatic;
      webkitSpeechRecognition: SpeechRecognitionStatic;
    }
}


// FIX: Updated React import to use named imports for hooks like `useState` and `useRef`. This provides proper TypeScript type definitions for these generic hooks and resolves "Untyped function calls may not accept type arguments" errors.
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from '../context/LanguageContext';
import { RiskAssessmentItem, RiskLikelihood, RiskImpact, RiskLevel, RiskComplianceStatus, View, TourState, ApprovalStatus } from '../types';
import { analyzeRisks, refineTextForRiskAssessment, extractRiskDataFromConversation } from '../services/geminiService';
import QRCode from './QRCode';
import Barcode from './Barcode';
import LoadingSpinner from './LoadingSpinner';

const initialRiskDataEn: RiskAssessmentItem[] = [
    // Data extracted and generated from user-provided document
    { id: 'JOBTITLE-001', category: 'Amending Job Title', riskDescription: 'Amending a job title or demoting a post without a decision from the competent minister.', frameworkReference: 'Job Title Art. 1-A', likelihood: 'Medium', impact: 'High', mitigationControls: 'All job title and rank changes must be processed through an HR workflow that requires explicit approval from a designated senior authority.', complianceStatus: 'Partially Compliant', actionItems: 'Implement a mandatory digital approval step in the HRIS for all job title modifications.', approvalStatus: 'Draft' },
    { id: 'JOBTITLE-002', category: 'Amending Job Title', riskDescription: 'An employee\'s job title is changed, resulting in cancellation of an allowance or a transfer, without obtaining prior written acknowledgment from the incumbent.', frameworkReference: 'Job Title Art. 1-K', likelihood: 'High', impact: 'High', mitigationControls: 'A mandatory, signed "Impact Acknowledgment Form" must be attached to any change request that affects compensation or location.', complianceStatus: 'Non-Compliant', actionItems: 'Create and enforce the use of the Impact Acknowledgment Form for all relevant job changes immediately.', approvalStatus: 'Draft' },
    { id: 'JOBTITLE-003', category: 'Amending Job Title', riskDescription: 'Failure to document job title changes in the Ministry of Civil Service\'s electronic systems, leading to data discrepancies.', frameworkReference: 'Job Title Art. 2-A', likelihood: 'High', impact: 'Medium', mitigationControls: 'HR closing procedure for job changes must include uploading the confirmation from the Ministry\'s system.', complianceStatus: 'Partially Compliant', actionItems: 'Conduct a quarterly audit to reconcile internal HRIS data with Ministry records.', approvalStatus: 'Approved', managementComments: 'Audit frequency confirmed. Good control.' },
    { id: 'HRPLAN-001', category: 'Human Resources Planning', riskDescription: 'The annual HR plan is not based on accurate employee and vacancy data, leading to ineffective workforce strategy.', frameworkReference: 'HR Plan Art. 1-C', likelihood: 'High', impact: 'High', mitigationControls: 'The HR planning process must begin with a formal data validation phase, using live HRIS dashboards and reports.', complianceStatus: 'Non-Compliant', actionItems: 'Develop standardized HR data dashboards for the planning committee.', approvalStatus: 'Pending Approval' },
    { id: 'JOBOCC-001', category: 'Job Occupation Process', riskDescription: 'Job announcements are published less than five days before the submission date, creating legal risks and limiting the applicant pool.', frameworkReference: 'Job Occ. Art. 2-A', likelihood: 'Medium', impact: 'Medium', mitigationControls: 'The recruitment portal must have a system rule preventing the selection of a submission date less than 5 days from the publication date.', complianceStatus: 'Compliant', actionItems: '', approvalStatus: 'Approved' },
    { id: 'JOBOCC-002', category: 'Job Occupation Process', riskDescription: 'A candidate is not given the mandatory minimum of 15 days to submit required documents after selection.', frameworkReference: 'Job Occ. Art. 5', likelihood: 'Medium', impact: 'High', mitigationControls: 'Standardized offer letters and onboarding portal must clearly state the 15-day deadline. Automated reminders should be sent to candidates.', complianceStatus: 'Partially Compliant', actionItems: 'Update all offer letter templates and configure reminders in the ATS.', approvalStatus: 'Draft' },
    { id: 'MEDEXAM-001', category: 'Medical Examination', riskDescription: 'A candidate for a government position is not given the right to be medically examined up to three times.', frameworkReference: 'Med. Exam Art. 2', likelihood: 'Low', impact: 'Medium', mitigationControls: 'Recruitment files must track the number of medical examinations for each candidate. Medical providers should be notified of the attempt number.', complianceStatus: 'Compliant', actionItems: '', approvalStatus: 'Approved' },
    { id: 'PERF-001', category: 'Performance Management', riskDescription: 'Failure to inform an employee in writing after they receive an "Unsatisfactory" rating for the first time.', frameworkReference: 'Perf. Mgmt. Art. 14', likelihood: 'High', impact: 'High', mitigationControls: 'HRIS to generate an automated notification to HR and the line manager upon submission of an "Unsatisfactory" rating to trigger the formal written communication process.', complianceStatus: 'Non-Compliant', actionItems: 'Implement automated HRIS alerts and a formal acknowledgment process for unsatisfactory ratings by next quarter.', approvalStatus: 'Pending Approval' },
    { id: 'PERF-002', category: 'Performance Management', riskDescription: 'A grievance committee fails to submit its recommendations within the one-month deadline from the date a grievance is submitted.', frameworkReference: 'Perf. Mgmt. Art. 15', likelihood: 'Medium', impact: 'High', mitigationControls: 'HR case management system must be used to log all performance grievances and track the 30-day resolution deadline with automated alerts.', complianceStatus: 'Partially Compliant', actionItems: 'Configure deadline tracking for grievance cases in the HR service desk software.', approvalStatus: 'Draft' },
    { id: 'SICKLV-001', category: 'Proofing Sick Leave', riskDescription: 'An employee on sick leave for a serious disease is not correctly allocated one year with full salary.', frameworkReference: 'Sick Leave Art. 141-B', likelihood: 'Medium', impact: 'High', mitigationControls: 'The payroll and leave system must have a specific leave category for "Serious Disease" that automatically applies the correct pay rules.', complianceStatus: 'Partially Compliant', actionItems: 'Audit current long-term sick leave cases and configure the specific leave type in the HRIS.', approvalStatus: 'Rejected', managementComments: 'The proposed action item is not specific enough. Define the exact configuration changes required.' },
    { id: 'SICKLV-002', category: 'Proofing Sick Leave', riskDescription: 'An employee is injured at work, but the line manager fails to prepare a formal investigation report with all required details.', frameworkReference: 'Sick Leave Art. 11-A', likelihood: 'High', impact: 'High', mitigationControls: 'An online, mandatory "Workplace Incident Report Form" must be immediately filled out by the manager upon notification of an injury.', complianceStatus: 'Non-Compliant', actionItems: 'Develop and deploy the digital incident report form and train all line managers on its use.', approvalStatus: 'Draft' },
    { id: 'SICKLV-003', category: 'Proofing Sick Leave', riskDescription: 'An employee is terminated for failure to report to work, but a later medical report justifies the absence. The process to amend the termination reason is not followed.', frameworkReference: 'Sick Leave Art. 15', likelihood: 'Low', impact: 'High', mitigationControls: 'A formal process for post-termination review must be in place for employees who provide subsequent justification for their absence.', complianceStatus: 'Partially Compliant', actionItems: 'Document and communicate a formal post-termination review process for HR and legal teams.', approvalStatus: 'Approved' },
    { id: 'NATLEAVE-001', category: 'National Participation Leave', riskDescription: 'An employee participating in national sports events is granted leave exceeding the specified maximum days for their category (e.g., educational staff vs. others).', frameworkReference: 'Nat. Part. Leave Art. 1', likelihood: 'Medium', impact: 'Medium', mitigationControls: 'The HR leave system must have specific sub-categories for National Participation Leave that are tied to employee job categories and have hard-coded maximums.', complianceStatus: 'Partially Compliant', actionItems: 'Update the HRIS leave module with categorized limits for national participation.', approvalStatus: 'Pending Approval' },
    { id: 'EXCREWARD-001', category: 'Excellence Reward for Interns', riskDescription: 'An employee who ranked first in a training program is denied an excellence reward because their grade was below 90%.', frameworkReference: 'Excellence Reward Art. 1', likelihood: 'Medium', impact: 'Low', mitigationControls: 'The reward application process must require both the final grade and the final ranking to be submitted for consideration.', complianceStatus: 'Partially Compliant', actionItems: 'Update the training reward policy and forms to include class ranking as a primary eligibility criterion.', approvalStatus: 'Draft' },
    { id: 'TRAINING-001', category: 'Training & Scholarships', riskDescription: 'An employee is approved for a scholarship to study abroad despite having a "Good" performance rating in the last year, instead of "Very Good".', frameworkReference: 'Training Abroad Art. 179-C', likelihood: 'Medium', impact: 'Medium', mitigationControls: 'The scholarship application system must automatically check the applicant\'s most recent performance rating and block applications that do not meet the "Very Good" criteria.', complianceStatus: 'Non-Compliant', actionItems: 'Integrate the performance management module with the scholarship application portal.', approvalStatus: 'Pending Approval' },
    { id: 'QUALPROG-001', category: 'Outstanding Qualification Program', riskDescription: 'A recent graduate who graduated more than 4 years ago is accepted into the Outstanding Qualification Program.', frameworkReference: 'Qual. Prog. Art. 1-B', likelihood: 'Medium', impact: 'Medium', mitigationControls: 'The application portal for the program must validate the graduation date against the application date and automatically reject ineligible candidates.', complianceStatus: 'Partially Compliant', actionItems: 'Implement a validation rule in the application system for the next intake cycle.', approvalStatus: 'Approved' },
    { id: 'QUALPROG-002', category: 'Outstanding Qualification Program', riskDescription: 'An enrollee is terminated from the program for obtaining a rating of (2) out of (5) just once, instead of for two consecutive times.', frameworkReference: 'Qual. Prog. Art. 10-B', likelihood: 'High', impact: 'High', mitigationControls: 'The performance management system must track consecutive ratings for program enrollees and only flag for termination review after the second consecutive low score.', complianceStatus: 'Partially Compliant', actionItems: 'Configure the performance management system to track consecutive rating history for program participants.', approvalStatus: 'Draft' },
    { id: 'ALLOWANCE-001', category: 'Disbursement of Allowance', riskDescription: 'Assignment allowance is paid to a doctor for a training program that consists of less than 50% clinical or laboratory work.', frameworkReference: 'Assign. Allowance Art. 1-A', likelihood: 'Medium', impact: 'Medium', mitigationControls: 'The training delegation request form for medical staff must include a mandatory field, certified by the training provider, stating the percentage of clinical work.', complianceStatus: 'Non-Compliant', actionItems: 'Update all medical delegation forms to include a mandatory "Clinical Percentage" field.', approvalStatus: 'Pending Approval' },
];

const initialRiskDataAr: RiskAssessmentItem[] = [
    { id: 'JOBTITLE-001', category: 'تعديل المسميات الوظيفية', riskDescription: 'تعديل مسمى وظيفي أو خفض وظيفة دون قرار من الوزير المختص.', frameworkReference: 'المادة 1-أ', likelihood: 'Medium', impact: 'High', mitigationControls: 'يجب معالجة جميع تغييرات المسميات والمراتب الوظيفية من خلال سير عمل الموارد البشرية الذي يتطلب موافقة صريحة من جهة عليا معينة.', complianceStatus: 'Partially Compliant', actionItems: 'تنفيذ خطوة موافقة رقمية إلزامية في نظام الموارد البشرية لجميع تعديلات المسميات الوظيفية.', approvalStatus: 'Draft' },
    { id: 'JOBTITLE-002', category: 'تعديل المسميات الوظيفية', riskDescription: 'تغيير مسمى وظيفة موظف، مما يؤدي إلى إلغاء بدل أو نقل، دون الحصول على إقرار كتابي مسبق من شاغل الوظيفة.', frameworkReference: 'المادة 1-ك', likelihood: 'High', impact: 'High', mitigationControls: 'يجب إرفاق "نموذج إقرار بالأثر" إلزامي وموقع مع أي طلب تغيير يؤثر على التعويض أو الموقع.', complianceStatus: 'Non-Compliant', actionItems: 'إنشاء وفرض استخدام نموذج إقرار الأثر لجميع التغييرات الوظيفية ذات الصلة على الفور.', approvalStatus: 'Draft' },
    { id: 'HRPLAN-001', category: 'تخطيط الموارد البشرية', riskDescription: 'الخطة السنوية للموارد البشرية لا تستند إلى بيانات دقيقة للموظفين والوظائف الشاغرة، مما يؤدي إلى استراتيجية قوى عاملة غير فعالة.', frameworkReference: 'المادة 1-ج', likelihood: 'High', impact: 'High', mitigationControls: 'يجب أن تبدأ عملية تخطيط الموارد البشرية بمرحلة رسمية للتحقق من البيانات، باستخدام لوحات معلومات وتقارير نظام الموارد البشرية المباشرة.', complianceStatus: 'Non-Compliant', actionItems: 'تطوير لوحات معلومات بيانات الموارد البشرية الموحدة للجنة التخطيط.', approvalStatus: 'Pending Approval' },
    { id: 'PERF-001', category: 'إدارة الأداء', riskDescription: 'عدم إبلاغ الموظف كتابياً بعد حصوله على تقدير "غير مرضي" للمرة الأولى.', frameworkReference: 'المادة 14', likelihood: 'High', impact: 'High', mitigationControls: 'يجب أن يقوم نظام الموارد البشرية بإنشاء إشعار آلي للموارد البشرية والمدير المباشر عند تقديم تقدير "غير مرضي" لبدء عملية الاتصال الكتابي الرسمي.', complianceStatus: 'Non-Compliant', actionItems: 'تطبيق تنبيهات نظام الموارد البشرية الآلية وعملية إقرار رسمية للتقديرات غير المرضية بحلول الربع القادم.', approvalStatus: 'Pending Approval' },
    { id: 'SICKLV-002', category: 'إثبات الإجازة المرضية', riskDescription: 'إصابة موظف في العمل، لكن المدير المباشر يفشل في إعداد تقرير تحقيق رسمي بكامل التفاصيل المطلوبة.', frameworkReference: 'المادة 11-أ', likelihood: 'High', impact: 'High', mitigationControls: 'يجب ملء "نموذج تقرير حادثة العمل" الإلكتروني الإلزامي على الفور من قبل المدير عند الإبلاغ عن إصابة.', complianceStatus: 'Non-Compliant', actionItems: 'تطوير ونشر نموذج تقرير الحادثة الرقمي وتدريب جميع المديرين المباشرين على استخدامه.', approvalStatus: 'Draft' },
    { id: 'TRAINING-001', category: 'التدريب والابتعاث', riskDescription: 'الموافقة لموظف على بعثة دراسية في الخارج رغم حصوله على تقدير أداء "جيد" في السنة الأخيرة، بدلاً من "جيد جداً".', frameworkReference: 'المادة 179-ج', likelihood: 'Medium', impact: 'Medium', mitigationControls: 'يجب أن يتحقق نظام طلب الابتعاث تلقائياً من أحدث تقدير أداء للمتقدم ويمنع الطلبات التي لا تستوفي معيار "جيد جداً".', complianceStatus: 'Non-Compliant', actionItems: 'دمج وحدة إدارة الأداء مع بوابة طلب الابتعاث.', approvalStatus: 'Pending Approval' },
];

interface RiskAssessmentProps {
  setView: (view: View) => void;
  tourState: TourState;
}

const calculateRiskLevel = (likelihood: RiskLikelihood, impact: RiskImpact): { level: RiskLevel, className: string } => {
    if (impact === 'High') {
        if (likelihood === 'High') return { level: 'Severe', className: 'bg-red-700 text-red-100' };
        if (likelihood === 'Medium') return { level: 'High', className: 'bg-red-500 text-white' };
        return { level: 'Moderate', className: 'bg-orange-500 text-white' };
    }
    if (impact === 'Medium') {
        if (likelihood === 'High') return { level: 'High', className: 'bg-red-500 text-white' };
        if (likelihood === 'Medium') return { level: 'Moderate', className: 'bg-orange-500 text-white' };
        return { level: 'Low', className: 'bg-yellow-500 text-black' };
    }
    // Low Impact
    if (likelihood === 'High') return { level: 'Moderate', className: 'bg-orange-500 text-white' };
    return { level: 'Low', className: 'bg-teal-500 text-white' };
};

const isSpeechRecognitionSupported = !!(window.SpeechRecognition || window.webkitSpeechRecognition);

// ... (previous imports and helper functions)

const RiskAssessment: React.FC<RiskAssessmentProps> = ({ setView, tourState }) => {
    const { t, language } = useTranslation();
    
    const initialRiskData = useMemo(() => {
        return language === 'ar' ? initialRiskDataAr : initialRiskDataEn;
    }, [language]);

    const [risks, setRisks] = useState<RiskAssessmentItem[]>(initialRiskData);

    // Update risks when language changes
    useEffect(() => {
        setRisks(language === 'ar' ? initialRiskDataAr : initialRiskDataEn);
    }, [language]);

    const [categoryFilter, setCategoryFilter] = useState('All');
    const [riskLevelFilter, setRiskLevelFilter] = useState('All');
    const [statusFilter, setStatusFilter] = useState('All');
    const [isManualModalOpen, setIsManualModalOpen] = useState(false);
    const [isAIAssessmentOpen, setIsAIAssessmentOpen] = useState(false);
    const [selectedRisk, setSelectedRisk] = useState<RiskAssessmentItem | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisReport, setAnalysisReport] = useState<{ summary: string, onConfirm: () => void } | null>(null);
    
    const [listeningField, setListeningField] = useState<{ riskId: string; field: 'mitigationControls' | 'actionItems' } | null>(null);
    const [refiningField, setRefiningField] = useState<{ riskId: string; field: 'mitigationControls' | 'actionItems' } | null>(null);
    const recognitionRef = useRef<SpeechRecognition | null>(null);

    const initialNewRiskState: Omit<RiskAssessmentItem, 'id' | 'approvalStatus' | 'managementComments'> = {
        category: '',
        riskDescription: '',
        frameworkReference: '',
        likelihood: 'Low',
        impact: 'Low',
        mitigationControls: '',
        complianceStatus: 'Compliant',
        actionItems: '',
    };
    const [newRisk, setNewRisk] = useState<Omit<RiskAssessmentItem, 'id' | 'approvalStatus' | 'managementComments'>>(initialNewRiskState);

    useEffect(() => {
        return () => {
            recognitionRef.current?.stop();
        };
    }, []);

    const handleRiskChange = (id: string, field: keyof RiskAssessmentItem, value: any) => {
        setRisks(prevRisks => prevRisks.map(risk => risk.id === id ? { ...risk, [field]: value } : risk));
    };
    
    const handleResetFilters = () => {
        setCategoryFilter('All');
        setRiskLevelFilter('All');
        setStatusFilter('All');
    };

    const categories = useMemo(() => ['All', ...Array.from(new Set(risks.map(r => r.category)))], [risks]);
    const riskLevels: RiskLevel[] = ['Low', 'Moderate', 'High', 'Severe'];
    const complianceStatuses: RiskComplianceStatus[] = ['Compliant', 'Partially Compliant', 'Non-Compliant'];
    
    const filteredRisks = useMemo(() => {
        return risks.filter(risk => {
            const riskLevel = calculateRiskLevel(risk.likelihood, risk.impact).level;
            const categoryMatch = categoryFilter === 'All' || risk.category === categoryFilter;
            const riskLevelMatch = riskLevelFilter === 'All' || riskLevel === riskLevelFilter;
            const statusMatch = statusFilter === 'All' || risk.complianceStatus === statusFilter;
            return categoryMatch && riskLevelMatch && statusMatch;
        });
    }, [risks, categoryFilter, riskLevelFilter, statusFilter]);
    
    const getComplianceStatusClass = (status: RiskComplianceStatus) => {
      switch(status) {
        case 'Compliant': return 'bg-green-500/20 text-green-300';
        case 'Partially Compliant': return 'bg-yellow-500/20 text-yellow-300';
        case 'Non-Compliant': return 'bg-red-500/20 text-red-300';
        default: return 'bg-gray-500/20 text-gray-300';
      }
    };
    
    const getApprovalStatusClass = (status: ApprovalStatus) => {
        switch(status) {
            case 'Approved': return 'bg-green-500/20 text-green-300';
            case 'Pending Approval': return 'bg-yellow-500/20 text-yellow-300 animate-pulse';
            case 'Rejected': return 'bg-red-500/20 text-red-300';
            case 'Draft': return 'bg-sky-500/20 text-sky-300';
            default: return 'bg-gray-500/20 text-gray-300';
        }
    };
    
    const handleOpenManualModal = () => {
        setNewRisk(initialNewRiskState);
        setIsManualModalOpen(true);
    };

    const handleCloseManualModal = () => {
        setIsManualModalOpen(false);
        setNewRisk(initialNewRiskState);
    };

    const handleNewRiskChange = (field: keyof Omit<RiskAssessmentItem, 'id' | 'approvalStatus' | 'managementComments'>, value: string) => {
        setNewRisk(prev => ({ ...prev, [field]: value }));
    };

    const handleAddNewRisk = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newRisk.riskDescription.trim() || !newRisk.category.trim()) {
            alert('Category and Risk Description are required.');
            return;
        }

        const categoryPrefix = newRisk.category.substring(0, 5).toUpperCase().replace(/\s/g, '');
        const existingCategoryRisks = risks.filter(r => r.id.startsWith(categoryPrefix));
        const newIdNumber = existingCategoryRisks.length > 0
            ? Math.max(...existingCategoryRisks.map(r => parseInt(r.id.split('-')[1] || '0', 10))) + 1
            : 1;
        const newId = `${categoryPrefix}-${String(newIdNumber).padStart(3, '0')}`;
        
        const newRiskItem: RiskAssessmentItem = { id: newId, ...newRisk, approvalStatus: 'Draft' };
        setRisks(prev => [...prev, newRiskItem].sort((a, b) => a.category.localeCompare(b.category) || a.id.localeCompare(b.id)));
        handleCloseManualModal();
    };
    
    const handleRunAnalysis = async () => {
        setIsAnalyzing(true);
        setAnalysisReport(null);
        try {
            const { updatedRisks, summary } = await analyzeRisks(risks);
            setAnalysisReport({
                summary,
                onConfirm: () => {
                    setRisks(updatedRisks);
                    setAnalysisReport(null);
                }
            });
        } catch (error) {
            console.error("AI risk analysis failed:", error);
            alert(t('riskAssessment.analysis.error'));
        } finally {
            setIsAnalyzing(false);
        }
    };
    
    const handleVoiceInput = (riskId: string, field: 'mitigationControls' | 'actionItems') => {
        if (!isSpeechRecognitionSupported) {
            alert("Speech recognition is not supported in your browser.");
            return;
        }

        if (listeningField && listeningField.riskId === riskId && listeningField.field === field) {
            recognitionRef.current?.stop();
            return;
        }

        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;

        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = language === 'ar' ? 'ar-SA' : 'en-US';
        
        const startingText = risks.find(r => r.id === riskId)?.[field] || '';
        let lastTranscript = '';

        recognition.onstart = () => {
            setListeningField({ riskId, field });
        };

        recognition.onend = async () => {
            if (recognitionRef.current === recognition) {
                setListeningField(null);
                recognitionRef.current = null;
                
                const textToRefine = (startingText ? startingText + ' ' : '') + lastTranscript;

                if (lastTranscript.trim()) {
                    setRefiningField({ riskId, field });
                    try {
                        const fieldType = field === 'mitigationControls' ? 'mitigation' : 'action';
                        const refinedText = await refineTextForRiskAssessment(textToRefine, fieldType);
                        handleRiskChange(riskId, field, refinedText);
                    } catch (error) {
                        console.error("Failed to refine text:", error);
                    } finally {
                        setRefiningField(null);
                    }
                }
            }
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
            console.error("Speech recognition error", event.error);
            if (recognitionRef.current === recognition) {
                setListeningField(null);
                recognitionRef.current = null;
            }
        };

        recognition.onresult = (event: SpeechRecognitionEvent) => {
            const transcript = Array.from(event.results)
                .map(result => result[0])
                .map(result => result.transcript)
                .join('');
            
            lastTranscript = transcript;
            const newText = (startingText ? startingText + ' ' : '') + transcript;
            handleRiskChange(riskId, field, newText);
        };

        recognition.start();
    };

    const handleApprovalAction = (riskId: string, action: 'approve' | 'reject') => {
        const newStatus: ApprovalStatus = action === 'approve' ? 'Approved' : 'Rejected';
        let comments = '';
        if (action === 'reject') {
            comments = prompt(t('riskAssessment.modal.rejectionReason')) || 'No comments provided.';
        }
        setRisks(prev => prev.map(r => r.id === riskId ? { ...r, approvalStatus: newStatus, managementComments: action === 'reject' ? comments : undefined } : r));
        setSelectedRisk(prev => prev ? { ...prev, approvalStatus: newStatus, managementComments: action === 'reject' ? comments : undefined } : null);
    };

    const handleSubmitForApproval = (riskId: string) => {
        handleRiskChange(riskId, 'approvalStatus', 'Pending Approval');
    };
    
    const workflowCounts = useMemo(() => {
        return risks.reduce((acc, risk) => {
            acc[risk.approvalStatus] = (acc[risk.approvalStatus] || 0) + 1;
            return acc;
        }, {} as Record<ApprovalStatus, number>);
    }, [risks]);


    return (
        <div className="flex-grow w-full bg-black/30 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl flex flex-col p-6 overflow-hidden">
            <h2 className="text-3xl font-bold tracking-wider mb-2 flex-shrink-0">{t('riskAssessment.title')}</h2>
            
            {/* Workflow Tracker */}
            <div className="mb-6 flex-shrink-0">
                <h3 className="text-sm font-semibold text-gray-400 mb-2">{t('riskAssessment.workflow.title')}</h3>
                <div className="w-full bg-black/20 p-2 rounded-full flex items-center border border-white/10">
                    {(['Draft', 'Pending Approval', 'Approved', 'Rejected'] as ApprovalStatus[]).map(status => (
                         <div key={status} className="flex-1 text-center px-2">
                             <span className="font-bold text-lg text-white">{workflowCounts[status] || 0}</span>
                             <span className={`block text-xs font-semibold ${getApprovalStatusClass(status).replace(/bg-\S+\/\d+/, '')}`}>{t(`riskAssessment.approval.${status.replace(' ', '').toLowerCase()}`)}</span>
                         </div>
                    ))}
                </div>
            </div>

            {/* Filters & Actions */}
            <div className="flex flex-wrap gap-4 mb-6 flex-shrink-0 items-center">
                {/* ... (filters remain the same) */}
                 <div className="ml-auto flex items-center gap-4">
                    <button onClick={handleRunAnalysis} disabled={isAnalyzing} className="action-button-sm bg-purple-600 hover:bg-purple-500 text-white disabled:bg-purple-800 disabled:cursor-not-allowed">
                        {isAnalyzing ? <div className="w-5 h-5 border-2 border-t-white border-r-white border-b-white/20 border-l-white/20 rounded-full animate-spin"></div> : <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-.5a1.5 1.5 0 000 3h.5a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-.5a1.5 1.5 0 00-3 0v.5a1 1 0 01-1 1H6a1 1 0 01-1-1v-3a1 1 0 011-1h.5a1.5 1.5 0 000-3H6a1 1 0 01-1-1V6a1 1 0 011-1h3a1 1 0 001-1v-.5z" /></svg>}
                        {isAnalyzing ? t('riskAssessment.analysis.running') : t('riskAssessment.analysis.run')}
                    </button>
                    <div className="relative group">
                        <button className="action-button-sm bg-sky-600 hover:bg-sky-500 text-white">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                             {t('riskAssessment.addNewRisk')}
                        </button>
                        <div className="absolute top-full right-0 mt-2 w-48 bg-gray-800 border border-white/20 rounded-md shadow-lg z-20 py-1 invisible group-focus-within:visible group-hover:visible">
                             <button onClick={handleOpenManualModal} className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-sky-600">{t('riskAssessment.add.manual')}</button>
                             <button onClick={() => setIsAIAssessmentOpen(true)} className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-sky-600">{t('riskAssessment.add.aiGuided')}</button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className={`flex-grow overflow-auto ${tourState.isActive && tourState.step === 7 ? 'highlight-tour-element' : ''}`}>
                <table className="w-full text-sm text-left border-collapse">
                    <thead className="sticky top-0 bg-black/50 backdrop-blur-sm">
                        <tr className="border-b border-white/20 text-gray-300">
                             <th className="p-3 font-semibold">{t('riskAssessment.table.riskId')}</th>
                             <th className="p-3 font-semibold w-1/4">{t('riskAssessment.table.description')}</th>
                             <th className="p-3 font-semibold">{t('riskAssessment.table.riskLevel')}</th>
                             <th className="p-3 font-semibold">{t('riskAssessment.table.complianceStatus')}</th>
                             <th className="p-3 font-semibold">{t('riskAssessment.table.approvalStatus')}</th>
                             <th className="p-3 font-semibold w-1/5">{t('riskAssessment.table.actions')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10 text-gray-200">
                        {filteredRisks.map(risk => {
                            const { level, className } = calculateRiskLevel(risk.likelihood, risk.impact);
                            return (
                                <tr key={risk.id} className="hover:bg-white/5 transition-colors">
                                    <td className="p-3 align-top font-mono text-xs">
                                        <button onClick={() => setSelectedRisk(risk)} className="text-sky-400 hover:text-sky-200 hover:underline">
                                            {risk.id}
                                        </button>
                                    </td>
                                    <td className="p-3 align-top">
                                        <div className="font-semibold">{risk.riskDescription}</div>
                                        <div className="text-xs text-gray-400">{risk.category} / {risk.frameworkReference}</div>
                                    </td>
                                    <td className="p-3 align-top text-center">
                                        <span className={`px-3 py-1 rounded-full font-bold text-xs ${className}`}>{t(`riskAssessment.levels.${level.toLowerCase()}`)}</span>
                                    </td>
                                    <td className="p-3 align-top">
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getComplianceStatusClass(risk.complianceStatus)}`}>{t(`riskAssessment.compliance.${risk.complianceStatus === 'Partially Compliant' ? 'partially' : risk.complianceStatus === 'Non-Compliant' ? 'nonCompliant' : 'compliant'}`)}</span>
                                    </td>
                                     <td className="p-3 align-top">
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getApprovalStatusClass(risk.approvalStatus)}`}>{t(`riskAssessment.approval.${risk.approvalStatus.replace(' ', '').toLowerCase()}`)}</span>
                                    </td>
                                    <td className="p-3 align-top text-gray-300">{risk.actionItems}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            
            {/* ... (Modals would be here, mostly handled by state and generic components) */}
            
        </div>
    );
};

export default RiskAssessment;
