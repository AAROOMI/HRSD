import * as React from 'react';
import { DocumentObject, Policy, DocumentStatus, TourState } from '../types';
import { useTranslation } from '../context/LanguageContext';
import PolicyRing from './PolicyRing';

interface ComplianceDashboardProps {
  documents: DocumentObject[];
  policies: Policy[];
  onView: (docId: string) => void;
  tourState: TourState;
  performanceDocId?: string;
}

const getStatusChipClass = (status: string) => {
    switch (status) {
        case 'Published': return 'bg-green-500/20 text-green-300';
        case 'Approved': return 'bg-sky-500/20 text-sky-300';
        case 'Pending Approval': return 'bg-yellow-500/20 text-yellow-300';
        case 'Revisions Requested': return 'bg-orange-500/20 text-orange-300';
        case 'Archived': return 'bg-gray-500/20 text-gray-400';
        case 'Not Generated': return 'bg-red-500/20 text-red-300';
        default: return 'bg-purple-500/20 text-purple-300'; // Draft
    }
};

const getStatusPercentage = (status: DocumentStatus | 'Not Generated'): number => {
    switch (status) {
        case 'Published': return 100;
        case 'Approved': return 80;
        case 'Pending Approval': return 60;
        case 'Revisions Requested': return 40;
        case 'Draft': return 20;
        case 'Archived': return 0;
        case 'Not Generated': return 0;
        default: return 0;
    }
};

const ComplianceDashboard: React.FC<ComplianceDashboardProps> = ({ documents, policies, onView, tourState, performanceDocId }) => {
  const { t } = useTranslation();

  const complianceData = policies.map(policy => {
      const doc = documents.find(d => d.policyTitle === policy.title);
      const status = doc?.status ?? 'Not Generated';
      const percentage = getStatusPercentage(status);
      return {
          policy,
          doc,
          status,
          percentage
      };
  });

  return (
    <div className="flex-grow w-full bg-black/30 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl flex flex-col p-6 overflow-hidden">
        <div className="flex justify-between items-center mb-6 flex-shrink-0">
            <h2 className="text-3xl font-bold tracking-wider">{t('complianceDashboard.title')}</h2>
            <button className="px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-sm text-gray-300 hover:bg-white/10 transition-colors">
                {t('complianceDashboard.filter')}
            </button>
        </div>

        {/* Rings section */}
        <div className={`bg-white/5 p-4 md:p-6 rounded-lg border border-white/10 mb-6 flex-shrink-0 ${tourState.isActive && tourState.step === 2 ? 'highlight-tour-element' : ''}`}>
            <h3 className="font-semibold text-lg mb-4 text-gray-300">{t('complianceDashboard.controlStatus')}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-11 gap-4 justify-items-center">
                 {complianceData.map(data => (
                    <PolicyRing 
                        key={data.policy.id}
                        title={data.policy.title}
                        percentage={data.percentage}
                        onClick={() => data.doc && onView(data.doc.id)}
                        isClickable={!!data.doc}
                    />
                ))}
            </div>
        </div>

        {/* Table section */}
        <div className={`bg-white/5 p-4 md:p-6 rounded-lg border border-white/10 flex-grow flex flex-col overflow-hidden ${tourState.isActive && tourState.step === 3 ? 'highlight-tour-element' : ''}`}>
            <h3 className="font-semibold text-lg mb-4 text-gray-300">{t('complianceDashboard.policyDocuments')}</h3>
            <div className="flex-grow overflow-y-auto -mx-4 md:-mx-6 px-4 md:px-6">
                <table className="w-full text-left">
                    <thead className="sticky top-0 bg-black/30 backdrop-blur-sm">
                        <tr className="border-b border-white/20 text-sm text-gray-400">
                            <th className="p-3 font-semibold">{t('complianceDashboard.table.title')}</th>
                            <th className="p-3 font-semibold">{t('complianceDashboard.table.status')}</th>
                            <th className="p-3 font-semibold text-center">{t('complianceDashboard.table.version')}</th>
                            <th className="p-3 font-semibold">{t('complianceDashboard.table.lastUpdated')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                        {complianceData.map(({ policy, doc, status }) => (
                            <tr key={policy.id} onClick={() => doc && onView(doc.id)} className={`transition-colors ${doc ? 'cursor-pointer hover:bg-white/10' : 'opacity-60'} ${tourState.isActive && tourState.step === 3 && doc?.id === performanceDocId ? 'bg-sky-500/20' : ''}`}>
                                <td className="p-3 font-medium text-white">{policy.title}</td>
                                <td className="p-3">
                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusChipClass(status)}`}>
                                        {status}
                                    </span>
                                </td>
                                <td className="p-3 text-center text-gray-300">{doc ? doc.version.toFixed(1) : '–'}</td>
                                <td className="p-3 text-gray-400">{doc ? new Date(doc.updatedAt).toLocaleDateString() : '–'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
  );
};

export default ComplianceDashboard;
