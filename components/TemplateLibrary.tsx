// Add declarations for CDN libraries to satisfy TypeScript
declare global {
  interface Window {
    jspdf: any;
    html2canvas: any;
    docx: any;
  }
}

import * as React from 'react';
const { useState, useCallback } = React;
import { useTranslation } from '../context/LanguageContext';
import { Template } from '../types';
import { generateTemplateContent } from '../services/geminiService';
import LoadingSpinner from './LoadingSpinner';
import QRCode from './QRCode';
import Barcode from './Barcode';


const initialTemplates: Template[] = [
    { id: 'offer-letter', title: { en: 'Offer Letter', ar: 'خطاب عرض وظيفي' } },
    { id: 'warning-letter', title: { en: 'Warning Letter', ar: 'خطاب إنذار' } },
    { id: 'experience-certificate', title: { en: 'Experience Certificate', ar: 'شهادة خبرة' } },
    { id: 'promotion-letter', title: { en: 'Promotion Letter', ar: 'خطاب ترقية' } },
];

const TemplateLibrary: React.FC = () => {
    const { t, language } = useTranslation();
    const [templates, setTemplates] = useState<Template[]>(initialTemplates);
    const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentLang, setCurrentLang] = useState<'en' | 'ar'>(language);
    const [isExporting, setIsExporting] = useState<'pdf' | 'word' | 'print' | null>(null);


    const handleSelectTemplate = async (template: Template) => {
        setSelectedTemplate(template);
        setError(null);

        if (!template.content) {
            setIsLoading(true);
            try {
                const [contentEn, contentAr] = await Promise.all([
                    generateTemplateContent(template.title.en, 'en'),
                    generateTemplateContent(template.title.ar, 'ar'),
                ]);

                const updatedContent = { en: contentEn, ar: contentAr };

                setTemplates(prev =>
                    prev.map(t =>
                        t.id === template.id ? { ...t, content: updatedContent } : t
                    )
                );
                // Also update the selected template state
                setSelectedTemplate(prev => prev ? { ...prev, content: updatedContent } : null);
            } catch (err) {
                console.error(err);
                setError(t('templateLibrary.error'));
            } finally {
                setIsLoading(false);
            }
        }
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

    const handlePrint = () => {
        setIsExporting('print');
        const content = document.getElementById('template-modal-content');
        if(!content) return;
        
        const printWindow = window.open('', '_blank');
        printWindow?.document.write(`
            <html>
                <head>
                    <title>Print Template</title>
                    <script src="https://cdn.tailwindcss.com"></script>
                    <style>
                        body { font-family: sans-serif; margin: 2rem; }
                        .print-content { white-space: pre-wrap; line-height: 1.6; }
                    </style>
                </head>
                <body class="${currentLang === 'ar' ? 'rtl' : 'ltr'}" dir="${currentLang === 'ar' ? 'rtl' : 'ltr'}">
        `);
        printWindow?.document.write(content.innerHTML);
        printWindow?.document.write('</body></html>');
        printWindow?.document.close();
        
        setTimeout(() => {
            printWindow?.focus();
            printWindow?.print();
            printWindow?.close();
            setIsExporting(null);
        }, 250);
    };

    const handleExportPDF = async () => {
         if (!window.jspdf || !window.html2canvas) {
            alert('PDF export library is not available.');
            return;
        }
        const { jsPDF } = window.jspdf;
        const input = document.getElementById('template-document-for-export');
        if (!input) return;

        setIsExporting('pdf');
        try {
            const canvas = await window.html2canvas(input, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`${selectedTemplate?.id}.pdf`);
        } catch (error) {
            console.error("Error exporting PDF:", error);
        } finally {
            setIsExporting(null);
        }
    };

    const handleExportWord = async () => {
        if (typeof window.docx === 'undefined') {
            alert('Word export library is not available.');
            return;
        }
        setIsExporting('word');
        try {
            const { Document, Packer, Paragraph, TextRun, AlignmentType } = window.docx;
            
            const content = selectedTemplate?.content?.[currentLang] || '';
            const paragraphs = content.split('\n').map(text => new Paragraph({ 
                children: [new TextRun(text)],
                alignment: currentLang === 'ar' ? AlignmentType.RIGHT : AlignmentType.LEFT,
            }));

            const doc = new Document({
                sections: [{
                    properties: {},
                    children: [
                        new Paragraph({ text: selectedTemplate?.title[currentLang], alignment: AlignmentType.CENTER }),
                        ...paragraphs
                    ],
                }],
            });

            const blob = await Packer.toBlob(doc);
            downloadBlob(blob, `${selectedTemplate?.id}.docx`);
        } catch (error) {
            console.error("Error exporting Word:", error);
        } finally {
            setIsExporting(null);
        }
    };
    

    const renderModal = () => {
        if (!selectedTemplate) return null;
        
        const templateId = `${selectedTemplate.id}-${new Date().toISOString()}`;
        const qrData = { id: templateId, title: selectedTemplate.title[currentLang] };


        return (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedTemplate(null)}>
                <div className="bg-gray-800 border border-white/20 rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                    <div className="flex-shrink-0 p-4 border-b border-white/10 flex justify-between items-center">
                        <h3 className="text-xl font-bold text-sky-300">{selectedTemplate.title[currentLang]}</h3>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setCurrentLang('en')} className={`px-3 py-1 text-sm rounded-md ${currentLang === 'en' ? 'bg-sky-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>{t('templateLibrary.english')}</button>
                            <button onClick={() => setCurrentLang('ar')} className={`px-3 py-1 text-sm rounded-md ${currentLang === 'ar' ? 'bg-sky-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>{t('templateLibrary.arabic')}</button>
                        </div>
                        <button onClick={() => setSelectedTemplate(null)} className="text-gray-400 hover:text-white text-2xl">&times;</button>
                    </div>

                    <div className="flex-grow flex overflow-hidden">
                        <div className="flex-grow p-8 overflow-y-auto bg-gray-900" id="template-modal-content">
                             {isLoading ? (
                                <div className="h-full flex items-center justify-center">
                                    <LoadingSpinner />
                                </div>
                            ) : error ? (
                                <div className="h-full flex items-center justify-center text-red-400">{error}</div>
                            ) : (
                                <div 
                                  id="template-document-for-export"
                                  className={`bg-white text-black p-12 shadow-lg min-h-full font-serif ${currentLang === 'ar' ? 'rtl' : 'ltr'}`}
                                  dir={currentLang === 'ar' ? 'rtl' : 'ltr'}
                                >
                                    {/* Header */}
                                    <div className="flex justify-between items-center border-b pb-4 border-gray-300 mb-8">
                                         <svg className="w-24 h-auto text-gray-700" viewBox="0 0 100 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M20 0 L0 15 L20 30 L20 20 L80 20 L80 30 L100 15 L80 0 L80 10 L20 10 Z" fill="currentColor"/>
                                        </svg>
                                        <h2 className="text-2xl font-bold text-gray-800">{selectedTemplate.title[currentLang]}</h2>
                                    </div>
                                    
                                    {/* Body */}
                                    <div className="whitespace-pre-wrap text-base leading-relaxed print-content">
                                        {selectedTemplate.content?.[currentLang]}
                                    </div>
                                    
                                    {/* Footer */}
                                    <div className="mt-24 pt-8 flex justify-between items-end">
                                        <div>
                                            <svg className="w-48 h-12 text-gray-800" viewBox="0 0 200 50">
                                              <path d="M10 40 Q 55 10, 90 40 T 180 30" stroke="currentColor" fill="transparent" strokeWidth="2" strokeLinecap="round"/>
                                            </svg>
                                            <p className="border-t border-gray-400 pt-2 mt-2 font-semibold">{t('templateLibrary.hrManager')}</p>
                                            <p className="text-sm text-gray-600">Al-Saud Corp.</p>
                                        </div>
                                         <p className="text-xs text-gray-400">{new Date().toLocaleDateString()}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="w-1/4 min-w-[280px] bg-black/20 border-s border-white/10 p-6 flex flex-col gap-6 overflow-y-auto">
                             <h3 className="sidebar-title">{t('documentViewer.trackingAndExport')}</h3>
                                <div className="bg-black/20 p-4 rounded-lg flex flex-col items-center justify-center gap-4 border border-white/10">
                                    <div className="bg-white p-4 rounded-lg flex flex-col items-center justify-center gap-4 w-full">
                                        <QRCode value={qrData} />
                                        <Barcode value={templateId} />
                                    </div>
                                    <div className="w-full flex flex-col gap-3 mt-2">
                                        <button onClick={handlePrint} disabled={isLoading || !!isExporting} className="action-button-sm bg-gray-600/50 hover:bg-gray-500/50 border border-gray-500/50 text-gray-200 disabled:opacity-50">
                                            {isExporting === 'print' ? t('documentViewer.exporting') : t('documentViewer.print')}
                                        </button>
                                        <button onClick={handleExportPDF} disabled={isLoading || !!isExporting} className="action-button-sm bg-red-600/50 hover:bg-red-500/50 border border-red-500/50 text-red-200 disabled:opacity-50">
                                            {isExporting === 'pdf' ? t('documentViewer.exporting') : t('documentViewer.exportPdf')}
                                        </button>
                                        <button onClick={handleExportWord} disabled={isLoading || !!isExporting} className="action-button-sm bg-sky-600/50 hover:bg-sky-500/50 border border-sky-500/50 text-sky-200 disabled:opacity-50">
                                            {isExporting === 'word' ? t('documentViewer.exporting') : t('documentViewer.exportWord')}
                                        </button>
                                    </div>
                                </div>
                        </div>
                    </div>

                </div>
            </div>
        )
    };

    return (
        <div className="flex-grow w-full bg-black/30 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl flex flex-col p-6 overflow-hidden">
            <h2 className="text-3xl font-bold tracking-wider mb-2">{t('templateLibrary.title')}</h2>
            <p className="text-gray-400 mb-6">{t('templateLibrary.description')}</p>

            <div className="flex-grow overflow-y-auto pr-2">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {templates.map(template => (
                        <div key={template.id} className="bg-white/5 p-4 rounded-lg border border-white/10 hover:border-white/20 transition-all duration-300 flex flex-col justify-between">
                            <div>
                                <h3 className="text-lg font-semibold text-sky-300 truncate">{template.title.en}</h3>
                                <p className="text-sm text-gray-400 mb-4" dir="rtl">{template.title.ar}</p>
                            </div>
                            <button onClick={() => handleSelectTemplate(template)} className="mt-auto w-full text-center px-4 py-2 bg-sky-600/50 border border-sky-500/50 rounded-lg text-sm font-semibold text-sky-200 hover:bg-sky-500/50 transition-colors">
                                {t('templateLibrary.viewTemplate')}
                            </button>
                        </div>
                    ))}
                </div>
            </div>
            {renderModal()}
        </div>
    );
};

export default TemplateLibrary;