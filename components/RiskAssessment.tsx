import React, { useState, useMemo } from 'react';
import { useTranslation } from '../context/LanguageContext';
import { RiskAssessmentItem, RiskLikelihood, RiskImpact, RiskLevel, RiskComplianceStatus } from '../types';

const initialRiskData: RiskAssessmentItem[] = [
    { id: 'PERF-001', category: 'Performance Management', riskDescription: 'Failure to inform an employee in writing after receiving an "Unsatisfactory" rating for the first time.', frameworkReference: 'Perf. Mgmt. Art. 14', likelihood: 'Medium', impact: 'High', mitigationControls: 'HR Business Partners to audit all "Unsatisfactory" cases quarterly.', complianceStatus: 'Partially Compliant', actionItems: 'Implement automated notification system from HRIS.' },
    { id: 'PERF-002', category: 'Performance Management', riskDescription: 'Performance evaluation for a displaced employee is not conducted by the correct organizational unit after the three-month threshold.', frameworkReference: 'Perf. Mgmt. Art. 4', likelihood: 'Low', impact: 'Medium', mitigationControls: 'Employee transfer checklist includes a performance evaluation handover step.', complianceStatus: 'Compliant', actionItems: '' },
    { id: 'JOB-001', category: 'Job Occupation', riskDescription: 'Job announcements are not published at least 5 days before the submission date, leading to insufficient applicant pools.', frameworkReference: 'Job Occ. Art. 2', likelihood: 'Low', impact: 'Medium', mitigationControls: 'Recruitment calendar is planned a quarter in advance.', complianceStatus: 'Compliant', actionItems: '' },
    { id: 'JOB-002', category: 'Job Occupation', riskDescription: 'A candidate is not given the minimum 15-day period to submit required documents after selection.', frameworkReference: 'Job Occ. Art. 5', likelihood: 'High', impact: 'High', mitigationControls: 'Offer letter template includes the 15-day deadline clearly stated.', complianceStatus: 'Non-Compliant', actionItems: 'Audit recent hires to check compliance. Retrain recruitment team.' },
    { id: 'LEAVE-001', category: 'Sick Leave & Injury', riskDescription: 'Medical reports for sick leave are not referred to the General Medical Authority within the required three-day period.', frameworkReference: 'Sick Leave Art. 7', likelihood: 'Medium', impact: 'Medium', mitigationControls: 'HR admin has a daily task to check for new medical reports.', complianceStatus: 'Partially Compliant', actionItems: 'Create a shared mailbox for all medical reports to ensure no single point of failure.' },
    { id: 'TITLE-001', category: 'Amending Job Title', riskDescription: 'A job title is amended to a different salary scale, which is not permitted.', frameworkReference: 'Job Title Art. 1-D', likelihood: 'Low', impact: 'High', mitigationControls: 'All job title change requests require approval from Head of Compensation.', complianceStatus: 'Compliant', actionItems: '' },
];


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


const RiskAssessment: React.FC = () => {
    const { t } = useTranslation();
    const [risks, setRisks] = useState<RiskAssessmentItem[]>(initialRiskData);
    const [categoryFilter, setCategoryFilter] = useState('All');
    const [riskLevelFilter, setRiskLevelFilter] = useState('All');
    const [statusFilter, setStatusFilter] = useState('All');

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


    return (
        <div className="flex-grow w-full bg-black/30 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl flex flex-col p-6 overflow-hidden">
            <h2 className="text-3xl font-bold tracking-wider mb-6 flex-shrink-0">{t('riskAssessment.title')}</h2>

            {/* Filters */}
            <div className="flex flex-wrap gap-4 mb-6 flex-shrink-0">
                <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="filter-select">
                    <option value="All">{t('riskAssessment.filters.all')} {t('riskAssessment.table.category')}</option>
                    {categories.slice(1).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select value={riskLevelFilter} onChange={e => setRiskLevelFilter(e.target.value)} className="filter-select">
                    <option value="All">{t('riskAssessment.filters.all')} {t('riskAssessment.table.riskLevel')}</option>
                    {riskLevels.map(l => <option key={l} value={l}>{t(`riskAssessment.levels.${l.toLowerCase()}`)}</option>)}
                </select>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="filter-select">
                    <option value="All">{t('riskAssessment.filters.all')} {t('riskAssessment.table.status')}</option>
                     {complianceStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
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
                    <tbody className="divide-y divide-white/10">
                        {filteredRisks.map(risk => {
                            const { level, className } = calculateRiskLevel(risk.likelihood, risk.impact);
                            return (
                                <tr key={risk.id} className="hover:bg-white/5 transition-colors">
                                    <td className="p-3 align-top">{risk.category}</td>
                                    <td className="p-3 align-top font-mono text-xs">{risk.id}</td>
                                    <td className="p-3 align-top">{risk.riskDescription}</td>
                                    <td className="p-3 align-top text-gray-400">{risk.frameworkReference}</td>
                                    <td className="p-3 align-top">
                                        <select value={risk.likelihood} onChange={e => handleRiskChange(risk.id, 'likelihood', e.target.value)} className="interactive-select">
                                            {['Low', 'Medium', 'High'].map(l => <option key={l} value={l}>{t(`riskAssessment.levels.${l.toLowerCase()}`)}</option>)}
                                        </select>
                                    </td>
                                    <td className="p-3 align-top">
                                        <select value={risk.impact} onChange={e => handleRiskChange(risk.id, 'impact', e.target.value)} className="interactive-select">
                                            {['Low', 'Medium', 'High'].map(l => <option key={l} value={l}>{t(`riskAssessment.levels.${l.toLowerCase()}`)}</option>)}
                                        </select>
                                    </td>
                                    <td className="p-3 align-top text-center">
                                        <span className={`px-3 py-1 rounded-full font-bold text-xs ${className}`}>
                                            {t(`riskAssessment.levels.${level.toLowerCase()}`)}
                                        </span>
                                    </td>
                                    <td className="p-3 align-top">
                                        <textarea value={risk.mitigationControls} onChange={e => handleRiskChange(risk.id, 'mitigationControls', e.target.value)} className="interactive-textarea" />
                                    </td>
                                    <td className="p-3 align-top">
                                        <select value={risk.complianceStatus} onChange={e => handleRiskChange(risk.id, 'complianceStatus', e.target.value)} className={`interactive-select w-full ${getComplianceStatusClass(risk.complianceStatus)}`}>
                                            {complianceStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </td>
                                    <td className="p-3 align-top">
                                        <textarea value={risk.actionItems} onChange={e => handleRiskChange(risk.id, 'actionItems', e.target.value)} className="interactive-textarea" />
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default RiskAssessment;
