
import React from 'react';
import { DocumentObject } from '../types';
import { useTranslation } from '../context/LanguageContext';

interface DocumentListProps {
  documents: DocumentObject[];
  onView: (docId: string) => void;
}

const getStatusChipClass = (status: string) => {
    switch (status) {
        case 'Published': return 'bg-green-500/20 text-green-300 border-green-400/30';
        case 'Approved': return 'bg-sky-500/20 text-sky-300 border-sky-400/30';
        case 'Pending Approval': return 'bg-yellow-500/20 text-yellow-300 border-yellow-400/30 animate-pulse';
        case 'Revisions Requested': return 'bg-orange-500/20 text-orange-300 border-orange-400/30';
        case 'Archived': return 'bg-gray-500/20 text-gray-400 border-gray-400/30';
        default: return 'bg-purple-500/20 text-purple-300 border-purple-400/30';
    }
};

const DocumentList: React.FC<DocumentListProps> = ({ documents, onView }) => {
  const { t } = useTranslation();

  return (
    <div className="flex-grow w-full bg-black/30 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl flex flex-col p-6 overflow-hidden">
        <h2 className="text-3xl font-bold tracking-wider mb-6">{t('dashboard.title')}</h2>

        <div className="flex-grow overflow-y-auto pe-2">
            {documents.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {documents.map(doc => (
                        <div key={doc.id} onClick={() => onView(doc.id)}
                             className="bg-white/5 p-4 rounded-lg border border-white/10 hover:bg-white/10 hover:border-white/20 cursor-pointer transition-all duration-300 flex flex-col justify-between">
                            <div>
                                <h3 className="text-lg font-semibold text-sky-300 truncate">{doc.policyTitle}</h3>
                                <p className="text-sm text-gray-400 mb-3">{t('dashboard.idLabel')}: {doc.id}</p>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className={`px-2 py-1 rounded-full border text-center ${getStatusChipClass(doc.status)}`}>
                                    {doc.status}
                                </span>
                                <span className="text-gray-400">{t('dashboard.versionLabel')}{doc.version.toFixed(1)}</span>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center text-gray-400 h-full flex flex-col justify-center items-center">
                    <p className="text-lg">{t('dashboard.noDocuments')}</p>
                    <p>{t('dashboard.noDocumentsAction')}</p>
                </div>
            )}
        </div>
        
        <div className="mt-6 pt-4 border-t border-white/10 text-xs text-gray-400">
            <p><span className="font-semibold text-teal-400">{t('agentStatus.title')}:</span> {t('agentStatus.monitoring', { count: documents.length })}</p>
        </div>
    </div>
  );
};

export default DocumentList;
