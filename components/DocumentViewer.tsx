// Add declarations for CDN libraries to satisfy TypeScript
declare global {
  interface Window {
    jspdf: any;
    html2canvas: any;
    docx: any;
  }
}

import * as React from 'react';
const { useState, useEffect, useRef } = React;
import { DocumentObject, DocumentStatus, TourState } from '../types';
import { useTranslation } from '../context/LanguageContext';
import QRCode from './QRCode';
import Barcode from './Barcode';
import { ExportAction } from '../App';
import { generateSpeech } from '../services/geminiService';


// --- Audio Helper Functions ---
function decode(base64: string) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

async function decodeAudioData(
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number,
): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
            channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
    }
    return buffer;
}


interface ReadAloudButtonProps {
    sectionId: string;
    text: string;
    onClick: (id: string, text: string) => void;
    playbackState: { id: string; status: 'loading' | 'playing' | 'idle' };
}

const ReadAloudButton: React.FC<ReadAloudButtonProps> = ({ sectionId, text, onClick, playbackState }) => {
    const { t } = useTranslation();
    const status = playbackState.id === sectionId ? playbackState.status : 'idle';

    let icon, label;
    switch (status) {
        case 'loading':
            icon = <div className="w-4 h-4 border-2 border-t-sky-400 border-r-sky-400 border-b-white/20 border-l-white/20 rounded-full animate-spin"></div>;
            label = t('readAloud.loading');
            break;
        case 'playing':
            icon = <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 5a1 1 0 011-1h8a1 1 0 011 1v8a1 1 0 01-1 1H6a1 1 0 01-1-1V5z" clipRule="evenodd" /></svg>;
            label = t('readAloud.stop');
            break;
        default: // idle
            icon = <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" /></svg>;
            label = t('readAloud.play');
    }

    return (
        <button 
            onClick={() => onClick(sectionId, text)} 
            title={label}
            className="p-1 rounded-full text-gray-400 hover:bg-white/10 hover:text-white transition-colors"
            aria-label={label}
        >
            {icon}
        </button>
    );
};


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
    const [playbackState, setPlaybackState] = useState<{ id: string, status: 'loading' | 'playing' | 'idle' }>({ id: '', status: 'idle' });
    const audioRef = useRef<{ context: AudioContext | null, source: AudioBufferSourceNode | null }>({ context: null, source: null });

    // Cleanup audio on unmount
    useEffect(() => {
        return () => {
            if (audioRef.current.source) {
                audioRef.current.source.stop();
            }
            if (audioRef.current.context) {
                audioRef.current.context.close().catch(console.error);
            }
        };
    }, []);

    const stopPlayback = () => {
        if (audioRef.current.source) {
            audioRef.current.source.onended = null; // Prevent onended from firing on manual stop
            audioRef.current.source.stop();
            audioRef.current.source.disconnect();
            audioRef.current.source = null;
        }
        if (audioRef.current.context) {
            audioRef.current.context.close().catch(console.error);
            audioRef.current.context = null;
        }
        setPlaybackState({ id: '', status: 'idle' });
    };

    const handleTogglePlayback = async (id: string, text: string) => {
        const isCurrentlyPlaying = playbackState.id === id && playbackState.status === 'playing';

        stopPlayback(); // Stop any current playback

        if (isCurrentlyPlaying) {
            return; // If it was playing, we just stop it.
        }
        
        setPlaybackState({ id, status: 'loading' });
        try {
            const base64Audio = await generateSpeech(text);
            
            const AudioCtor = window.AudioContext || (window as any).webkitAudioContext;
            const context = new AudioCtor({ sampleRate: 24000 });
            audioRef.current.context = context;

            const audioBuffer = await decodeAudioData(decode(base64Audio), context, 24000, 1);
            const source = context.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(context.destination);
            
            source.onended = stopPlayback;

            source.start();
            audioRef.current.source = source;
            setPlaybackState({ id, status: 'playing' });

        } catch (error) {
            console.error("Failed to play audio", error);
            alert('Failed to generate or play audio.');
            setPlaybackState({ id: '', status: 'idle' });
        }
    };
    
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
        const link = window.document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.download = fileName;
        window.document.body.appendChild(link);
        link.click();
        window.document.body.removeChild(link);
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
        if (!window.jspdf || !window.html2canvas) {
            alert('PDF export library is not available. Please try again later.');
            if (fromAction) onActionComplete();
            return;
        }
    
        const { jsPDF } = window.jspdf;
        const input = window.document.getElementById('document-content');
        if (!input) {
            console.error("Document content element not found for PDF export.");
            if (fromAction) onActionComplete();
            return;
        }
    
        setIsExporting('pdf');
    
        const parentContainers: HTMLElement[] = [];
        let current: HTMLElement | null = input.parentElement;
        while (current) {
            parentContainers.push(current);
            if (current.tagName === 'MAIN') break;
            current = current.parentElement;
        }
    
        const originalStyles = parentContainers.map(el => ({
            element: el,
            overflow: el.style.overflow,
            height: el.style.height,
        }));
    
        const inputOriginalHeight = input.style.height;
    
        // FIX: The `parentContainers` array contains HTMLElements directly.
        // The original code incorrectly tried to access `s.element`, which does not exist on an HTMLElement.
        // The `style` property should be accessed directly on the element `s`.
        parentContainers.forEach(s => {
            s.style.overflow = 'visible';
            s.style.height = 'auto';
        });
        input.style.height = 'auto';
    
        try {
            const canvas = await window.html2canvas(input, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#030712',
            });
    
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const imgProps = pdf.getImageProperties(imgData);
            const ratio = imgProps.width / pdfWidth;
            const imgHeight = imgProps.height / ratio;
    
            let heightLeft = imgHeight;
            let position = 0;
    
            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
            heightLeft -= pdfHeight;
    
            while (heightLeft > 0) {
                position -= pdfHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
                heightLeft -= pdfHeight;
            }
    
            pdf.save(`${document.id}_${document.policyTitle.replace(/\s/g, '_')}.pdf`);
    
        } catch (error) {
            console.error("Error generating PDF:", error);
            alert("Sorry, there was an error generating the PDF.");
        } finally {
            originalStyles.forEach(s => {
                s.element.style.overflow = s.overflow;
                s.element.style.height = s.height;
            });
            input.style.height = inputOriginalHeight;
    
            setIsExporting(null);
            if (fromAction) onActionComplete();
        }
    };

    const handleExportWord = async (fromAction: boolean = false) => {
        if (typeof window.docx === 'undefined') {
            alert('Word export library is not available. It might be loading or blocked. Please try again later.');
            if (fromAction) onActionComplete();
            return;
        }

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
        <div id="document-content" className="flex-grow p-8 overflow-y-auto bg-gray-900 print:overflow-visible print:bg-white">
            <h1 className="text-4xl font-bold mb-2 text-sky-300 print:text-black">{document.policyTitle}</h1>
            <p className="text-sm text-gray-400 mb-6 print:text-gray-600">{t('dashboard.idLabel')}: {document.id} | {t('dashboard.versionLabel')}: {document.version.toFixed(1)}</p>

            <section className="mb-6">
                <h2 className="section-title print:text-black flex items-center gap-2">
                    {t('documentViewer.description')}
                    <ReadAloudButton sectionId="desc" text={document.content.description} onClick={handleTogglePlayback} playbackState={playbackState} />
                </h2>
                <p className="section-content print:text-gray-800">{document.content.description}</p>
            </section>
            <section className="mb-6">
                <h2 className="section-title print:text-black flex items-center gap-2">
                    {t('documentViewer.purpose')}
                    <ReadAloudButton sectionId="purpose" text={document.content.purpose} onClick={handleTogglePlayback} playbackState={playbackState} />
                </h2>
                <p className="section-content print:text-gray-800">{document.content.purpose}</p>
            </section>
            <section className="mb-6">
                 <h2 className="section-title print:text-black flex items-center gap-2">
                    {t('documentViewer.scope')}
                    <ReadAloudButton sectionId="scope" text={document.content.scope} onClick={handleTogglePlayback} playbackState={playbackState} />
                </h2>
                <p className="section-content print:text-gray-800">{document.content.scope}</p>
            </section>
            
            <section className="mb-6 space-y-6">
                 <h2 className="section-title print:text-black">{t('documentViewer.articles')}</h2>
                {document.content.articles.map((article, index) => (
                    <div key={index} className="pl-4 border-l-2 border-sky-500/30 print:border-l-2 print:border-gray-300">
                        <h3 className="font-semibold text-lg text-teal-300 mb-2 flex items-center gap-2 print:text-black">
                            {article.title}
                            <ReadAloudButton sectionId={`article-${index}`} text={`${article.title}. ${article.content}`} onClick={handleTogglePlayback} playbackState={playbackState} />
                        </h3>
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