
import React, { useState, useMemo } from 'react';
import { useTranslation } from '../context/LanguageContext';
import { RiskAssessmentItem, RiskLikelihood, RiskImpact, RiskLevel, RiskComplianceStatus, View } from '../types';
import QRCode from './QRCode';
import Barcode from './Barcode';

const initialRiskData: RiskAssessmentItem[] = [
    // Performance Management
    { id: 'PERF-001', category: 'Performance Management', riskDescription: 'Failure to inform an employee in writing after receiving an "Unsatisfactory" rating for the first time, potentially leading to wrongful termination claims.', frameworkReference: 'Perf. Mgmt. Art. 14', likelihood: 'Medium', impact: 'High', mitigationControls: 'Automated notification system triggered by HRIS upon entry of an "Unsatisfactory" rating. HRBP audit of all such cases.', complianceStatus: 'Partially Compliant', actionItems: 'Implement and test automated notification system by Q3. Train managers on the importance of this step.' },
    { id: 'PERF-002', category: 'Performance Management', riskDescription: 'Performance evaluation for a displaced employee is not conducted by the correct organizational unit after the three-month threshold.', frameworkReference: 'Perf. Mgmt. Art. 4', likelihood: 'Low', impact: 'Medium', mitigationControls: 'Employee transfer checklist includes a mandatory performance evaluation handover step signed by both old and new managers.', complianceStatus: 'Compliant', actionItems: '' },
    { id: 'PERF-003', category: 'Performance Management', riskDescription: 'Grievance committee for performance reviews is improperly formed or fails to issue recommendations within the one-month deadline.', frameworkReference: 'Perf. Mgmt. Art. 15', likelihood: 'Medium', impact: 'High', mitigationControls: 'Standing grievance committee with pre-defined members and substitutes. Case management system tracks deadlines.', complianceStatus: 'Partially Compliant', actionItems: 'Review and formalize committee membership. Implement deadline tracking in HR case management tool.' },
    { id: 'PERF-004', category: 'Performance Management', riskDescription: 'Forced distribution for performance ratings is applied to a department with fewer than 20 employees, violating regulations.', frameworkReference: 'Perf. Mgmt. Art. 10-2', likelihood: 'Medium', impact: 'Medium', mitigationControls: 'HRIS system to block forced distribution application for teams under the 20-employee threshold.', complianceStatus: 'Non-Compliant', actionItems: 'Conduct an audit of the last performance cycle. Configure HRIS controls.' },
    
    // Amending Job Title
    { id: 'TITLE-001', category: 'Amending Job Title', riskDescription: 'A job title amendment results in the loss of an allowance for an employee without obtaining their prior written consent.', frameworkReference: 'Job Title Art. 1-K', likelihood: 'High', impact: 'High', mitigationControls: 'Job title change request form includes a mandatory, signed acknowledgment section if compensation is affected.', complianceStatus: 'Non-Compliant', actionItems: 'Audit all job title changes from the past year. Immediately implement the updated form.' },
    { id: 'TITLE-002', category: 'Amending Job Title', riskDescription: 'An engineer\'s job title is amended to a non-engineering role, which is strictly prohibited by the framework.', frameworkReference: 'Job Title Art. 1-M', likelihood: 'Low', impact: 'High', mitigationControls: 'HRIS job classification system has hard-coded career path restrictions for regulated professions like engineering.', complianceStatus: 'Compliant', actionItems: '' },
    { id: 'TITLE-003', category: 'Amending Job Title', riskDescription: 'A technical job is amended to an administrative role without an approved medical report, violating health-based transfer protocols.', frameworkReference: 'Job Title Art. 1-L', likelihood: 'Low', impact: 'Medium', mitigationControls: 'HRBPs must attach an approved General Medical Authority report to any change request moving technical staff to administrative roles.', complianceStatus: 'Compliant', actionItems: '' },
    { id: 'TITLE-004', category: 'Amending Job Title', riskDescription: 'Amending a job title to an \'excluded\' category to grant an allowance, bypassing the required specialized committee approval.', frameworkReference: 'Job Title Art. 1-N', likelihood: 'Medium', impact: 'High', mitigationControls: 'HRIS system flags any title change moving a job to an \'excluded\' status for mandatory review by the compensation team.', complianceStatus: 'Partially Compliant', actionItems: 'Develop a formal review workflow for all \'excluded\' job title amendments.' },
    { id: 'TITLE-005', category: 'Amending Job Title', riskDescription: 'Failure to document job title amendments in the Ministry of Civil Service\'s systems, leading to outdated official records and audit failures.', frameworkReference: 'Job Title Art. 2-A', likelihood: 'High', impact: 'Medium', mitigationControls: 'Process is not complete until a confirmation receipt from the Ministry\'s system is attached to the employee\'s file.', complianceStatus: 'Non-Compliant', actionItems: 'Establish a quarterly audit to reconcile internal records with the Ministry\'s system.' },

    // Sick Leave & Injury
    { id: 'LEAVE-001', category: 'Sick Leave & Injury', riskDescription: 'Medical reports for sick leave exceeding 30 days are not referred to the General Medical Authority within the required three-day period.', frameworkReference: 'Sick Leave Art. 7', likelihood: 'Medium', impact: 'Medium', mitigationControls: 'Centralized HR admin team has a daily task to check for and escalate all new medical reports.', complianceStatus: 'Partially Compliant', actionItems: 'Create a dedicated email/portal for medical report submissions to ensure timely processing.' },
    { id: 'LEAVE-002', category: 'Sick Leave & Injury', riskDescription: 'Leave for employees with chronic conditions (e.g., renal failure) is incorrectly counted against their standard sick leave balance.', frameworkReference: 'Sick Leave Art. 141-F', likelihood: 'High', impact: 'Medium', mitigationControls: 'Separate leave categories in HRIS for chronic conditions as specified by regulations. HRBPs trained to identify these cases.', complianceStatus: 'Non-Compliant', actionItems: 'Audit leave records for known cases. Update HRIS and retrain HR team on special leave provisions.' },

    // Job Occupation
    { id: 'JOB-001', category: 'Job Occupation', riskDescription: 'Job announcements are not published at least 5 days before the submission date, leading to insufficient applicant pools and claims of unfair practice.', frameworkReference: 'Job Occ. Art. 2-A', likelihood: 'Low', impact: 'Medium', mitigationControls: 'Recruitment calendar is planned and approved a quarter in advance. Posting system has a 5-day minimum rule.', complianceStatus: 'Compliant', actionItems: '' },
    { id: 'JOB-002', category: 'Job Occupation', riskDescription: 'A selected candidate is not given the minimum 15-day period to submit required documents, potentially causing them to be unfairly excluded.', frameworkReference: 'Job Occ. Art. 5', likelihood: 'Medium', impact: 'High', mitigationControls: 'Standardized offer letter template includes the 15-day deadline clearly stated. Automated reminders sent to candidates.', complianceStatus: 'Partially Compliant', actionItems: 'Review and update offer letter templates. Configure automated reminders in the applicant tracking system.' },

    // Human Resources Planning
    { id: 'PLAN-001', category: 'Human Resources Planning', riskDescription: 'The annual HR plan is not based on accurate, current data (vacancies, employee demographics, skills), leading to poor workforce planning.', frameworkReference: 'HR Plan Art. 1-C, 2-A', likelihood: 'High', impact: 'High', mitigationControls: 'A formal HR planning cycle is initiated with a mandatory data validation phase using live HRIS dashboards.', complianceStatus: 'Non-Compliant', actionItems: 'Develop standardized HR planning templates and data dashboards. Mandate their use for the next planning cycle.' },

    // Medical Examination
    { id: 'MED-001', category: 'Medical Examination', riskDescription: 'A candidate for a position with special fitness requirements is re-examined after failing three times.', frameworkReference: 'Med. Exam Art. 3', likelihood: 'Low', impact: 'Medium', mitigationControls: 'Recruitment and medical systems are integrated to flag candidates who have reached their examination limit.', complianceStatus: 'Compliant', actionItems: '' },
    
    // Training & Scholarships
    { id: 'TRAIN-001', category: 'Training & Scholarships', riskDescription: 'A scholarship candidate older than 45 (who is not a doctor) is approved, violating age limit regulations.', frameworkReference: 'Training Art. 7-A', likelihood: 'Low', impact: 'Medium', mitigationControls: 'Scholarship application portal automatically validates age based on date of birth and program type.', complianceStatus: 'Compliant', actionItems: '' },
    { id: 'TRAIN-002', category: 'Training & Scholarships', riskDescription: 'An employee is denied an excellence reward for a training program because their grade was below 90%, even though they ranked first in their group.', frameworkReference: 'Reward Art. 1', likelihood: 'Medium', impact: 'Low', mitigationControls: 'Reward eligibility process includes a cross-check of both final grade and class ranking provided by the training body.', complianceStatus: 'Partially Compliant', actionItems: 'Update reward policy and checklist to include the "first in group" clause.' },

    // Outstanding Qualification Program
    { id: 'QUAL-001', category: 'Outstanding Qualification Program', riskDescription: 'A graduate from over 4 years ago is accepted into the program, violating eligibility criteria.', frameworkReference: 'Qual. Prog. Art. 1-B', likelihood: 'Medium', impact: 'Medium', mitigationControls: 'Application system automatically calculates graduation date against program announcement date and rejects ineligible candidates.', complianceStatus: 'Non-Compliant', actionItems: 'Manually audit current program participants. Implement system validation for next intake.' },
    { id: 'QUAL-002', category: 'Outstanding Qualification Program', riskDescription: 'A program enrollee is terminated for absence without being notified in writing at least one week prior to exclusion.', frameworkReference: 'Qual. Prog. Art. 10', likelihood: 'High', impact: 'High', mitigationControls: 'Termination process for program enrollees includes a mandatory, tracked "Notification of Intent to Terminate" step with a 7-day waiting period.', complianceStatus: 'Partially Compliant', actionItems: 'Create and socialize the termination checklist for this program.' },

    // Allowances
    { id: 'ALLOW-001', category: 'Disbursement of Allowance', riskDescription: 'Assignment allowance for a delegated doctor is paid for a program that is less than 50% clinical.', frameworkReference: 'Allowance Art. 1-A', likelihood: 'Medium', impact: 'Medium', mitigationControls: 'Program approval form for medical staff requires confirmation of the clinical training percentage from the providing institution.', complianceStatus: 'Partially Compliant', actionItems: 'Update delegation request forms to include this mandatory field.' }
];

interface RiskAssessmentProps {
  setView: (view: View) => void;
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

const RiskAssessment: React.FC<RiskAssessmentProps> = ({ setView }) => {
    const { t } = useTranslation();
    const [risks, setRisks] = useState<RiskAssessmentItem[]>(initialRiskData);
    const [categoryFilter, setCategoryFilter] = useState('All');
    const [riskLevelFilter, setRiskLevelFilter] = useState('All');
    const [statusFilter, setStatusFilter] = useState('All');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedRisk, setSelectedRisk] = useState<RiskAssessmentItem | null>(null);

    const initialNewRiskState: Omit<RiskAssessmentItem, 'id'> = {
        category: '',
        riskDescription: '',
        frameworkReference: '',
        likelihood: 'Low',
        impact: 'Low',
        mitigationControls: '',
        complianceStatus: 'Compliant',
        actionItems: '',
    };
    const [newRisk, setNewRisk] = useState<Omit<RiskAssessmentItem, 'id'>>(initialNewRiskState);

    const handleRiskChange = (id: string, field: keyof RiskAssessmentItem, value: string) => {
        setRisks(prevRisks => prevRisks.map(risk => risk.id === id ? { ...risk, [field]: value } : risk));
    };

    const categories = useMemo(() => ['All', ...Array.from(new Set(initialRiskData.map(r => r.category)))], []);
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
    
    const handleOpenModal = () => {
        setNewRisk(initialNewRiskState);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => setIsModalOpen(false);

    const handleNewRiskChange = (field: keyof Omit<RiskAssessmentItem, 'id'>, value: string) => {
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
        
        const newRiskItem: RiskAssessmentItem = { id: newId, ...newRisk };
        setRisks(prev => [...prev, newRiskItem].sort((a, b) => a.category.localeCompare(b.category) || a.id.localeCompare(b.id)));
        handleCloseModal();
    };

    return (
        <div className="flex-grow w-full bg-black/30 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl flex flex-col p-6 overflow-hidden">
            <h2 className="text-3xl font-bold tracking-wider mb-6 flex-shrink-0">{t('riskAssessment.title')}</h2>

            {/* Filters & Actions */}
            <div className="flex flex-wrap gap-4 mb-6 flex-shrink-0 items-center">
                <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="bg-gray-800 border border-gray-600 rounded-md px-3 py-1.5 text-white focus:ring-sky-500 focus:border-sky-500">
                    <option className="bg-gray-900 text-white" value="All">{t('riskAssessment.filters.all')} {t('riskAssessment.table.category')}</option>
                    {categories.slice(1).map(c => <option className="bg-gray-900 text-white" key={c} value={c}>{c}</option>)}
                </select>
                <select value={riskLevelFilter} onChange={e => setRiskLevelFilter(e.target.value)} className="bg-gray-800 border border-gray-600 rounded-md px-3 py-1.5 text-white focus:ring-sky-500 focus:border-sky-500">
                    <option className="bg-gray-900 text-white" value="All">{t('riskAssessment.filters.all')} {t('riskAssessment.table.riskLevel')}</option>
                    {riskLevels.map(l => <option className="bg-gray-900 text-white" key={l} value={l}>{t(`riskAssessment.levels.${l.toLowerCase()}`)}</option>)}
                </select>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-gray-800 border border-gray-600 rounded-md px-3 py-1.5 text-white focus:ring-sky-500 focus:border-sky-500">
                    <option className="bg-gray-900 text-white" value="All">{t('riskAssessment.filters.all')} {t('riskAssessment.table.status')}</option>
                     {complianceStatuses.map(s => <option className="bg-gray-900 text-white" key={s} value={s}>{s}</option>)}
                </select>
                <div className="ml-auto flex items-center gap-4">
                    <button onClick={() => setView('liveAssistant')} className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-4 py-1.5 rounded-md flex items-center gap-2 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                           <path d="M7 4a3 3 0 016 0v6a3 3 0 11-6 0V4z" />
                           <path fillRule="evenodd" d="M5.5 8.5a.5.5 0 01.5.5v1a3.5 3.5 0 003.5 3.5h1a3.5 3.5 0 003.5-3.5v-1a.5.5 0 011 0v1a4.5 4.5 0 01-4.5 4.5h-1A4.5 4.5 0 015 9.5v-1a.5.5 0 01.5-.5z" clipRule="evenodd" />
                        </svg>
                        {t('riskAssessment.voiceAssessment')}
                    </button>
                    <button onClick={handleOpenModal} className="bg-sky-600 hover:bg-sky-500 text-white font-bold px-4 py-1.5 rounded-md flex items-center gap-2 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                        </svg>
                        {t('riskAssessment.addNewRisk')}
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="flex-grow overflow-auto">
                <table className="w-full text-sm text-left border-collapse">
                    <thead className="sticky top-0 bg-black/50 backdrop-blur-sm">
                        <tr className="border-b border-white/20 text-gray-300">
                            <th className="p-3 font-semibold">{t('riskAssessment.table.category')}</th>
                            <th className="p-3 font-semibold">{t('riskAssessment.table.riskId')}</th>
                            <th className="p-3 font-semibold w-1/4">{t('riskAssessment.table.description')}</th>
                            <th className="p-3 font-semibold">{t('riskAssessment.table.reference')}</th>
                            <th className="p-3 font-semibold">{t('riskAssessment.table.likelihood')}</th>
                            <th className="p-3 font-semibold">{t('riskAssessment.table.impact')}</th>
                            <th className="p-3 font-semibold">{t('riskAssessment.table.riskLevel')}</th>
                            <th className="p-3 font-semibold w-1/6">{t('riskAssessment.table.controls')}</th>
                            <th className="p-3 font-semibold">{t('riskAssessment.table.status')}</th>
                            <th className="p-3 font-semibold w-1/6">{t('riskAssessment.table.actions')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10 text-gray-200">
                        {filteredRisks.map(risk => {
                            const { level, className } = calculateRiskLevel(risk.likelihood, risk.impact);
                            return (
                                <tr key={risk.id} className="hover:bg-white/5 transition-colors">
                                    <td className="p-3 align-top">{risk.category}</td>
                                    <td className="p-3 align-top font-mono text-xs">
                                        <button onClick={() => setSelectedRisk(risk)} className="text-sky-400 hover:text-sky-200 hover:underline">
                                            {risk.id}
                                        </button>
                                    </td>
                                    <td className="p-3 align-top">{risk.riskDescription}</td>
                                    <td className="p-3 align-top text-gray-400">{risk.frameworkReference}</td>
                                    <td className="p-3 align-top">
                                        <select value={risk.likelihood} onChange={e => handleRiskChange(risk.id, 'likelihood', e.target.value)} className="w-full bg-gray-800/50 border border-gray-600/50 rounded-md p-1 text-white focus:ring-sky-500 focus:border-sky-500">
                                            {['Low', 'Medium', 'High'].map(l => <option className="bg-gray-900 text-white" key={l} value={l}>{t(`riskAssessment.levels.${l.toLowerCase()}`)}</option>)}
                                        </select>
                                    </td>
                                    <td className="p-3 align-top">
                                        <select value={risk.impact} onChange={e => handleRiskChange(risk.id, 'impact', e.target.value)} className="w-full bg-gray-800/50 border border-gray-600/50 rounded-md p-1 text-white focus:ring-sky-500 focus:border-sky-500">
                                            {['Low', 'Medium', 'High'].map(l => <option className="bg-gray-900 text-white" key={l} value={l}>{t(`riskAssessment.levels.${l.toLowerCase()}`)}</option>)}
                                        </select>
                                    </td>
                                    <td className="p-3 align-top text-center">
                                        <span className={`px-3 py-1 rounded-full font-bold text-xs ${className}`}>
                                            {t(`riskAssessment.levels.${level.toLowerCase()}`)}
                                        </span>
                                    </td>
                                    <td className="p-3 align-top">
                                        <textarea value={risk.mitigationControls} onChange={e => handleRiskChange(risk.id, 'mitigationControls', e.target.value)} className="w-full bg-gray-800/50 border border-gray-600/50 rounded-md p-1 text-white focus:ring-sky-500 focus:border-sky-500 resize-none h-24" />
                                    </td>
                                    <td className="p-3 align-top">
                                        <select value={risk.complianceStatus} onChange={e => handleRiskChange(risk.id, 'complianceStatus', e.target.value)} className={`w-full p-1 rounded-md border border-transparent focus:ring-sky-500 focus:border-sky-500 ${getComplianceStatusClass(risk.complianceStatus)}`}>
                                            {complianceStatuses.map(s => <option className="bg-gray-900 text-white" key={s} value={s}>{s}</option>)}
                                        </select>
                                    </td>
                                    <td className="p-3 align-top">
                                        <textarea value={risk.actionItems} onChange={e => handleRiskChange(risk.id, 'actionItems', e.target.value)} className="w-full bg-gray-800/50 border border-gray-600/50 rounded-md p-1 text-white focus:ring-sky-500 focus:border-sky-500 resize-none h-24" />
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* View Risk Details Modal */}
            {selectedRisk && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedRisk(null)}>
                    <div className="bg-gray-900 border border-white/20 rounded-2xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-white/10 flex justify-between items-center">
                            <h3 className="text-2xl font-bold">{t('riskAssessment.modal.title')}</h3>
                            <button onClick={() => setSelectedRisk(null)} className="text-gray-400 hover:text-white text-3xl leading-none">&times;</button>
                        </div>
                        <div className="p-6 space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-400">{t('riskAssessment.modal.riskId')}</label>
                                <p className="font-mono text-lg text-white">{selectedRisk.id}</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400">{t('riskAssessment.modal.description')}</label>
                                <p className="text-gray-200">{selectedRisk.riskDescription}</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">{t('riskAssessment.modal.trackingCodes')}</label>
                                <div className="bg-white p-3 rounded-lg flex items-center justify-around">
                                    <QRCode value={selectedRisk.id} />
                                    <Barcode value={selectedRisk.id} />
                                </div>
                            </div>
                        </div>
                        <div className="flex-shrink-0 flex justify-end gap-4 p-6 border-t border-white/10">
                            <button type="button" onClick={() => setSelectedRisk(null)} className="px-5 py-2 bg-gray-700 hover:bg-gray-600 rounded-md font-semibold transition-colors">{t('riskAssessment.modal.close')}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add New Risk Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={handleCloseModal}>
                    <div className="bg-gray-900 border border-white/20 rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-white/10">
                            <h3 className="text-2xl font-bold">Add New Risk Item</h3>
                        </div>
                        <form onSubmit={handleAddNewRisk} id="add-risk-form" className="flex-grow overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                            {/* Column 1 */}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-300 mb-1">Category</label>
                                <input type="text" value={newRisk.category} onChange={e => handleNewRiskChange('category', e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-1.5 text-white focus:ring-sky-500 focus:border-sky-500" required />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-300 mb-1">Risk Description</label>
                                <textarea value={newRisk.riskDescription} onChange={e => handleNewRiskChange('riskDescription', e.target.value)} rows={3} className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-1.5 text-white focus:ring-sky-500 focus:border-sky-500" required />
                            </div>
                             <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-300 mb-1">Framework Reference</label>
                                <input type="text" value={newRisk.frameworkReference} onChange={e => handleNewRiskChange('frameworkReference', e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-1.5 text-white focus:ring-sky-500 focus:border-sky-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Likelihood</label>
                                <select value={newRisk.likelihood} onChange={e => handleNewRiskChange('likelihood', e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-1.5 text-white focus:ring-sky-500 focus:border-sky-500">
                                    {['Low', 'Medium', 'High'].map(l => <option className="bg-gray-900 text-white" key={l} value={l}>{t(`riskAssessment.levels.${l.toLowerCase()}`)}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Impact</label>
                                <select value={newRisk.impact} onChange={e => handleNewRiskChange('impact', e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-1.5 text-white focus:ring-sky-500 focus:border-sky-500">
                                     {['Low', 'Medium', 'High'].map(l => <option className="bg-gray-900 text-white" key={l} value={l}>{t(`riskAssessment.levels.${l.toLowerCase()}`)}</option>)}
                                </select>
                            </div>
                             <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-300 mb-1">Compliance Status</label>
                                <select value={newRisk.complianceStatus} onChange={e => handleNewRiskChange('complianceStatus', e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-1.5 text-white focus:ring-sky-500 focus:border-sky-500">
                                    {complianceStatuses.map(s => <option className="bg-gray-900 text-white" key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            {/* Column 2 */}
                             <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-300 mb-1">Mitigation Controls</label>
                                <textarea value={newRisk.mitigationControls} onChange={e => handleNewRiskChange('mitigationControls', e.target.value)} rows={3} className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-1.5 text-white focus:ring-sky-500 focus:border-sky-500" />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-300 mb-1">Action Items</label>
                                <textarea value={newRisk.actionItems} onChange={e => handleNewRiskChange('actionItems', e.target.value)} rows={3} className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-1.5 text-white focus:ring-sky-500 focus:border-sky-500" />
                            </div>
                        </form>
                        <div className="flex-shrink-0 flex justify-end gap-4 p-6 border-t border-white/10">
                            <button type="button" onClick={handleCloseModal} className="px-5 py-2 bg-gray-700 hover:bg-gray-600 rounded-md font-semibold transition-colors">Cancel</button>
                            <button type="submit" form="add-risk-form" className="px-5 py-2 bg-sky-600 hover:bg-sky-500 rounded-md font-semibold transition-colors">Save Risk</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RiskAssessment;
