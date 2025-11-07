

// Add declarations for CDN libraries to satisfy TypeScript
declare global {
  interface Window {
    jspdf: any;
    html2canvas: any;
    docx: any;
  }
}

import * as React from 'react';
const { useState, useEffect } = React;
import { DocumentObject, DocumentStatus, TourState } from '../types';
import { useTranslation } from '../context/LanguageContext';
import QRCode from './QRCode';
import Barcode from './Barcode';
import { ExportAction } from '../App';

interface DocumentViewerProps {
  document: DocumentObject;
  onUpdate: (docId: string, status: DocumentStatus, notes: string) => void;
  onBack: () => void;
  tourState: TourState;
  actionRequest: { docId: string; action: ExportAction } | null;
  onActionComplete: () => void;
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


const DocumentViewer: React.FC<DocumentViewerProps> = ({ document, onUpdate, onBack, tourState, actionRequest, onActionComplete }) => {
    const { t } = useTranslation();
    const [isExporting, setIsExporting] = useState<'pdf' | 'word' | 'print' | null>(null);
    
    const handleAction = (status: DocumentStatus) => {
        const notes = prompt(t('documentViewer.notesPromptTitle', { status }), t('documentViewer.notesPromptDefault'));
        if (notes) {
            onUpdate(document.id, status, notes);
        }
    };
    
    useEffect(() => {
        if (actionRequest && actionRequest.docId === document.id) {
            setTimeout(() => {
                switch(actionRequest.action) {
                    case 'print': handlePrint(true); break;
                    case 'pdf': handleExportPDF(true); break;
                    case 'word': handleExportWord(true); break;
                }
            }, 500);
        }
    }, [actionRequest, document.id]);


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

    const qrData = {
        id: document.id,
        policyTitle: document.policyTitle,
        status: document.status,
        version: document.version,
    };

    const downloadBlob = (blob: Blob, fileName: string) => {
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handlePrint = (fromAction: boolean = false) => {
        setIsExporting('print');
        // The timeout gives the UI a moment to update to "Printing..." before the blocking print dialog appears.
        setTimeout(() => {
            window.print();
            setIsExporting(null);
            if (fromAction) {
                onActionComplete();
            }
        }, 100);
    };

    const handleExportPDF = async (fromAction: boolean = false) => {
        const { jsPDF } = window.jspdf;
        const input = document.getElementById('document-content');
        if (!input) {
            console.error("Document content element not found for PDF export.");
            if (fromAction) onActionComplete();
            return;
        }

        setIsExporting('pdf');
        
        // Temporarily modify styles for full content capture
        const originalOverflow = input.style.overflow;
        const originalHeight = input.style.height;
        input.style.overflow = 'visible';
        input.style.height = `${input.scrollHeight}px`;

        try {
            const canvas = await window.html2canvas(input, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#030712', // bg-gray-900
                windowWidth: input.scrollWidth,
                windowHeight: input.scrollHeight,
            });

            // Restore original styles
            input.style.overflow = originalOverflow;
            input.style.height = originalHeight;

            const imgData = canvas.toDataURL('image/png');
            
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const imgWidth = canvas.width;
            const imgHeight = canvas.height;
            const ratio = imgWidth / pdfWidth;
            const scaledHeight = imgHeight / ratio;
            
            let position = 0;
            let heightLeft = scaledHeight;

            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, scaledHeight);
            heightLeft -= pdfHeight;

            while (heightLeft > 0) {
                position -= pdfHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, scaledHeight);
                heightLeft -= pdfHeight;
            }
            
            pdf.save(`${document.id}_${document.policyTitle.replace(/\s/g, '_')}.pdf`);

        } catch (error) {
            console.error("Error generating PDF:", error);
            alert("Sorry, there was an error generating the PDF.");
        } finally {
             // Ensure styles are restored even if an error occurs
            input.style.overflow = originalOverflow;
            input.style.height = originalHeight;
            setIsExporting(null);
            if (fromAction) onActionComplete();
        }
    };

    const handleExportWord = async (fromAction: boolean = false) => {
        setIsExporting('word');
        try {
            const { Document, Packer, Paragraph, TextRun, HeadingLevel } = window.docx;

            const formatTitle = (text: string) => new Paragraph({
                children: [new TextRun({ text, bold: true, size: 48 })],
                heading: HeadingLevel.TITLE,
                spacing: { after: 200 },
            });

            const formatHeading = (text: string) => new Paragraph({
                children: [new TextRun({ text, bold: true, size: 32 })],
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 400, after: 200 },
            });
            
            const formatSubHeading = (text: string) => new Paragraph({
                 children: [new TextRun({ text, bold: true, size: 28 })],
                heading: HeadingLevel.HEADING_3,
                spacing: { before: 300, after: 150 },
            });

            const formatParagraph = (text: string) => new Paragraph({
                children: [new TextRun(text)],
                spacing: { after: 100 },
            });

            const docChildren: any[] = [
                formatTitle(document.policyTitle),
                formatParagraph(`ID: ${document.id} | Version: ${document.version.toFixed(1)}`),
                
                formatHeading(t('documentViewer.description')),
                formatParagraph(document.content.description),

                formatHeading(t('documentViewer.purpose')),
                formatParagraph(document.content.purpose),

                formatHeading(t('documentViewer.scope')),
                formatParagraph(document.content.scope),
                
                formatHeading(t('documentViewer.articles')),
            ];

            document.content.articles.forEach(article => {
                docChildren.push(formatSubHeading(article.title));
                article.content.split('\n').forEach(line => {
                    docChildren.push(formatParagraph(line));
                });
            });

            const doc = new Document({
                sections: [{
                    properties: {},
                    children: docChildren,
                }],
            });

            const blob = await Packer.toBlob(doc);
            downloadBlob(blob, `${document.id}_${document.policyTitle.replace(/\s/g, '_')}.docx`);

        } catch (error) {
            console.error("Error generating Word doc:", error);
            alert("Sorry, there was an error generating the Word document.");
        } finally {
            setIsExporting(null);
            if (fromAction) onActionComplete();
        }
    };
    
  return (
    <div className="flex-grow w-full bg-black/30 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl flex flex-row-reverse lg:flex-row overflow-hidden print:block print:shadow-none print:border-none print:bg-white print:text-black">
        {/* Main Content */}
        <div id="document-content" className="flex-grow p-8 overflow-y-auto bg-gray-900 print:!overflow-visible print:p-0 print:bg-white">
            <h1 className="text-4xl font-bold mb-2 text-sky-300 print:text-black">{document.policyTitle}</h1>
            <p className="text-sm text-gray-400 mb-6 print:text-gray-600">{t('dashboard.idLabel')}: {document.id} | {t('dashboard.versionLabel')}: {document.version.toFixed(1)}</p>

            <section className="mb-6">
                <h2 className="section-title print:text-black">{t('documentViewer.description')}</h2>
                <p className="section-content print:text-gray-800">{document.content.description}</p>
            </section>
            <section className="mb-6">
                <h2 className="section-title print:text-black">{t('documentViewer.purpose')}</h2>
                <p className="section-content print:text-gray-800">{document.content.purpose}</p>
            </section>
            <section className="mb-6">
                <h2 className="section-title print:text-black">{t('documentViewer.scope')}</h2>
                <p className="section-content print:text-gray-800">{document.content.scope}</p>
            </section>
            
            <section className="mb-6 space-y-6">
                <h2 className="section-title print:text-black">{t('documentViewer.articles')}</h2>
                {document.content.articles.map((article, index) => (
                    <div key={index} className="pl-4 border-l-2 border-sky-500/30 print:border-l-2 print:border-gray-300">
                        <h3 className="font-semibold text-lg text-teal-300 mb-2 print:text-black">{article.title}</h3>
                        <div className="section-content whitespace-pre-wrap print:text-gray-800">
                            <p>{article.content}</p>
                        </div>
                    </div>
                ))}
            </section>
        </div>

        {/* Sidebar */}
        <div className="w-1/3 min-w-[320px] bg-black/20 border-s border-white/10 p-6 flex flex-col gap-6 overflow-y-auto print:hidden">
            <button onClick={onBack} className="text-sky-300 hover:text-sky-100 self-start mb-2">{t('documentViewer.backToDashboard')}</button>
            
            <div>
                <h3 className="sidebar-title">{t('documentViewer.status')}</h3>
                <p className="font-bold text-lg text-teal-300">{document.status}</p>
            </div>

            <div className={tourState.isActive && tourState.step === 5 ? 'highlight-tour-element' : ''}>
                <h3 className="sidebar-title">{t('documentViewer.lifecycleActions')}</h3>
                <div className="flex flex-col gap-2">{renderActions()}</div>
            </div>
            
             <div>
                <h3 className="sidebar-title">{t('documentViewer.trackingAndExport')}</h3>
                <div className="bg-black/20 p-4 rounded-lg flex flex-col items-center justify-center gap-4 border border-white/10">
                    <div className="bg-white p-4 rounded-lg flex flex-col items-center justify-center gap-4 w-full">
                        <QRCode value={qrData} />
                        <Barcode value={document.id} />
                    </div>
                    <div className="w-full flex flex-col gap-3 mt-2">
                        <button 
                            onClick={() => handlePrint(false)} 
                            disabled={!!isExporting} 
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 bg-gray-600/50 hover:bg-gray-500/50 border border-gray-500/50 text-gray-200"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v6a2 2 0 002 2h12a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7v4h6v-4z" clipRule="evenodd" /></svg>
                            <span>{isExporting === 'print' ? t('documentViewer.printing') : t('documentViewer.print')}</span>
                        </button>
                        
                        <button 
                            onClick={() => handleExportPDF(false)} 
                            disabled={!!isExporting} 
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 bg-red-600/50 hover:bg-red-500/50 border border-red-500/50 text-red-200"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" /></svg>
                            <span>{isExporting === 'pdf' ? t('documentViewer.exporting') : t('documentViewer.exportPdf')}</span>
                        </button>
                        
                        <button 
                            onClick={() => handleExportWord(false)} 
                            disabled={!!isExporting} 
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 bg-sky-600/50 hover:bg-sky-500/50 border border-sky-500/50 text-sky-200"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" /></svg>
                            <span>{isExporting === 'word' ? t('documentViewer.exporting') : t('documentViewer.exportWord')}</span>
                        </button>
                    </div>
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
                                   <span className="font-medium text-gray-300">{log.user}</span>
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