import React from 'react';
import { DocumentObject, DocumentStatus } from '../types';
import { useTranslation } from '../context/LanguageContext';
import QRCode from './QRCode';
import Barcode from './Barcode';

interface DocumentViewerProps {
  document: DocumentObject;
  onUpdate: (docId: string, status: DocumentStatus, notes: string) => void;
  onBack: () => void;
}

const StatusIcon: React.FC<{ status: DocumentStatus }> = ({ status }) => {
    const iconProps = {
        className: "w-4 h-4 text-gray-300",
        'aria-hidden': "true",
        xmlns: "http://www.w3.org/2000/svg",
        fill: "none",
        viewBox: "0 0 24 24",
        strokeWidth: "2",
        stroke: "currentColor"
    };

    switch (status) {
        case 'Draft':
            return <svg {...iconProps}><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" /></svg>;
        case 'Pending Approval':
            return <svg {...iconProps}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>;
        case 'Revisions Requested':
            return <svg {...iconProps}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" /></svg>;
        case 'Approved':
            return <svg {...iconProps}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>;
        case 'Published':
            return <svg {...iconProps}><path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.916 17.916 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" /></svg>;
        case 'Archived':
            return <svg {...iconProps}><path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4" /></svg>;
        default:
            return null;
    }
};


const DocumentViewer: React.FC<DocumentViewerProps> = ({ document, onUpdate, onBack }) => {
    const { t } = useTranslation();
    
    const handleAction = (status: DocumentStatus) => {
        const notes = prompt(t('documentViewer.notesPromptTitle', { status }), t('documentViewer.notesPromptDefault'));
        if (notes) {
            onUpdate(document.id, status, notes);
        }
    };

    const renderActions = () => {
        switch (document.status) {
            case 'Draft':
            case 'Revisions Requested':
                return <button onClick={() => handleAction('Pending Approval')} className="action-button bg-yellow-500">{t('actions.requestApproval')}</button>;
            case 'Pending Approval':
                return (
                    <>
                        <button onClick={() => handleAction('Approved')} className="action-button bg-green-500">{t('actions.approve')}</button>
                        <button onClick={() => handleAction('Revisions Requested')} className="action-button bg-orange-500">{t('actions.requestRevisions')}</button>
                    </>
                );
            case 'Approved':
                 return <button onClick={() => handleAction('Published')} className="action-button bg-sky-500">{t('actions.publish')}</button>;
            case 'Published':
                 return <button onClick={() => handleAction('Archived')} className="action-button bg-gray-500">{t('actions.archive')}</button>;
            default:
                return null;
        }
    }
    
  return (
    <div className="flex-grow w-full bg-black/30 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl flex flex-row-reverse lg:flex-row overflow-hidden">
        {/* Main Content */}
        <div id="document-content" className="flex-grow p-8 overflow-y-auto">
            <h1 className="text-4xl font-bold mb-2 text-sky-300">{document.policyTitle}</h1>
            <p className="text-sm text-gray-400 mb-6">{t('dashboard.idLabel')}: {document.id} | {t('dashboard.versionLabel')}: {document.version.toFixed(1)}</p>

            <section className="mb-6">
                <h2 className="section-title">{t('documentViewer.description')}</h2>
                <p className="section-content">{document.content.description}</p>
            </section>
            <section className="mb-6">
                <h2 className="section-title">{t('documentViewer.purpose')}</h2>
                <p className="section-content">{document.content.purpose}</p>
            </section>
            <section className="mb-6">
                <h2 className="section-title">{t('documentViewer.scope')}</h2>
                <p className="section-content">{document.content.scope}</p>
            </section>
            
            <section className="mb-6 space-y-6">
                <h2 className="section-title">{t('documentViewer.articles')}</h2>
                {document.content.articles.map((article, index) => (
                    <div key={index} className="pl-4 border-l-2 border-sky-500/30">
                        <h3 className="font-semibold text-lg text-teal-300 mb-2">{article.title}</h3>
                        <div className="section-content whitespace-pre-wrap">
                            <p>{article.content}</p>
                        </div>
                    </div>
                ))}
            </section>
        </div>

        {/* Sidebar */}
        <div className="w-1/3 min-w-[320px] bg-black/20 border-s border-white/10 p-6 flex flex-col gap-6 overflow-y-auto">
            <button onClick={onBack} className="text-sky-300 hover:text-sky-100 self-start mb-2">{t('documentViewer.backToDashboard')}</button>
            
            <div>
                <h3 className="sidebar-title">{t('documentViewer.status')}</h3>
                <p className="font-bold text-lg text-teal-300">{document.status}</p>
            </div>

            <div>
                <h3 className="sidebar-title">{t('documentViewer.lifecycleActions')}</h3>
                <div className="flex flex-col gap-2">{renderActions()}</div>
            </div>
            
            <div>
                 <h3 className="sidebar-title">{t('documentViewer.export')}</h3>
                <div className="flex gap-2">
                    <button className="export-button" disabled>{t('documentViewer.exportPdf')}</button>
                    <button className="export-button" disabled>{t('documentViewer.exportWord')}</button>
                </div>
                 <p className="text-xs text-gray-500 mt-1">{t('documentViewer.exportComingSoon')}</p>
            </div>

            <div>
                <h3 className="sidebar-title">{t('documentViewer.trackingCodes')}</h3>
                <div className="bg-white p-2 rounded-lg flex items-center justify-around">
                    <QRCode value={document.id} />
                    <Barcode value={document.id} />
                </div>
            </div>

            <div>
                <h3 className="sidebar-title">{t('documentViewer.auditTrail')}</h3>
                <ul className="space-y-4 text-xs">
                    {document.history.slice().reverse().map(log => (
                       <li key={log.timestamp} className="flex gap-3">
                           <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-700/50 flex items-center justify-center ring-1 ring-white/10">
                               <StatusIcon status={log.status} />
                           </div>
                           <div className="flex-grow">
                               <p className="font-semibold text-gray-200">{log.status}</p>
                               <p className="text-gray-400">
                                   {new Date(log.timestamp).toLocaleString(undefined, {year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'})}
                                   <span className="text-gray-500"> by </span>
                                   <span className="font-medium text-gray-300">User</span>
                                </p>
                               <p className="text-gray-400 italic mt-1">"{log.notes}"</p>
                           </div>
                       </li>
                    ))}
                </ul>
            </div>
        </div>
    </div>
  );
};

export default DocumentViewer;