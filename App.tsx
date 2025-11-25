
import * as React from 'react';
const { useState, useCallback, useMemo, useEffect, useRef } = React;
import { Policy, DocumentObject, DocumentStatus, DocumentContent, TourState, View } from './types';
import { getPoliciesData, POLICY_TITLES_AR } from './constants';
import { generatePolicyDocument } from './services/geminiService';
import { useTranslation } from './context/LanguageContext';
import Header from './components/Header';
import DocumentList from './components/Dashboard';
import DocumentViewer from './components/DocumentViewer';
import LoadingSpinner from './components/LoadingSpinner';
import ComplianceJourney from './components/ComplianceJourney';
import Sidebar from './components/Sidebar';
import ComplianceDashboard from './components/ComplianceDashboard';
import LiveAssistant from './components/LiveAssistant';
import RiskAssessment from './components/RiskAssessment';
import TourAgent from './components/TourAgent';
import TemplateLibrary from './components/TemplateLibrary';

const getLocalStorageKey = (lang: string) => `hrsd-documents-${lang}`;

export type ExportAction = 'print' | 'pdf' | 'word';

const App: React.FC = () => {
    const { language } = useTranslation();
    
    const [documents, setDocuments] = useState<DocumentObject[]>([]);
    const [currentView, setCurrentView] = useState<View>('complianceDashboard');
    const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
    const [isInitializing, setIsInitializing] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [tourState, setTourState] = useState<TourState>({ isActive: false, step: 0 });

    const [actionRequest, setActionRequest] = useState<{ docId: string; action: ExportAction } | null>(null);
    const [viewBeforeAction, setViewBeforeAction] = useState<View>('complianceDashboard');

    const policies: Policy[] = useMemo(() => {
        const data = getPoliciesData(language);
        return Object.keys(data).map(key => ({
            id: key,
            title: language === 'ar' && POLICY_TITLES_AR[key] ? POLICY_TITLES_AR[key] : key.replace(/([A-Z])/g, ' $1').trim(),
            frameworkText: data[key as keyof typeof data],
        }));
    }, [language]);

    useEffect(() => {
        document.documentElement.lang = language;
        document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    }, [language]);

    // Load documents when language changes
    useEffect(() => {
        const key = getLocalStorageKey(language);
        try {
            const savedDocs = localStorage.getItem(key);
            if (savedDocs) {
                setDocuments(JSON.parse(savedDocs));
                setIsInitializing(false);
            } else {
                setDocuments([]);
                setIsInitializing(true);
            }
        } catch (error) {
            console.error("Failed to load documents from localStorage", error);
            setDocuments([]);
            setIsInitializing(true);
        }
    }, [language]);

    useEffect(() => {
        if (documents.length > 0) {
            try {
                localStorage.setItem(getLocalStorageKey(language), JSON.stringify(documents));
            } catch (error) {
                console.error("Failed to save documents to localStorage", error);
            }
            setIsInitializing(false);
            return;
        }

        if (!isInitializing) return; // Don't start if we think we are done or haven't started

        const initializeDocuments = async () => {
            setError(null);
            try {
                const newDocs: DocumentObject[] = [];
                const now = new Date();
                
                for (const [index, policy] of policies.entries()) {
                    try {
                        // For Arabic, we pass the Arabic framework text. 
                        // The prompt will instruct Gemini to use the language of the framework.
                        const content = await generatePolicyDocument(policy.title, policy.frameworkText);
                        
                        // If the title generated in content is different (e.g. Arabic), we could use it.
                        // But let's keep the key-based title for consistency in the list unless we update it.
                        // Better: use the policyTitle from the generated content if available, or fallback.
                        
                        const docTimestamp = new Date(now.getTime() + index * 1000).toISOString();
                        
                        newDocs.push({
                            id: `HRSD-${Date.now() + index}`,
                            policyTitle: policy.title, // Ideally this should be localized too, but we rely on the generated content for display details often.
                            content,
                            status: 'Draft',
                            version: 1,
                            createdAt: docTimestamp,
                            updatedAt: docTimestamp,
                            history: [{ timestamp: docTimestamp, status: 'Draft', notes: 'Document automatically generated by Agent AI.', user: 'Agent AI' }],
                        });
                    } catch (generationError) {
                         console.error(`Failed to generate document for: ${policy.title}`, generationError);
                    }
                }
                
                if (newDocs.length === 0 && policies.length > 0) {
                    throw new Error("All document generations failed.");
                }

                setDocuments(newDocs);

            } catch (err) {
                console.error("Initialization failed:", err);
                setError('Failed to generate initial documents. Please check your API key and network connection, then refresh the page.');
            } finally {
                setIsInitializing(false);
            }
        };

        // Trigger initialization only if we have no docs and we are in initializing state
        if (documents.length === 0 && policies.length > 0) {
            initializeDocuments();
        }
    }, [policies, documents.length, isInitializing, language]);


    const handleUpdateDocument = useCallback((docId: string, status: DocumentStatus, notes: string, user: string = 'User') => {
        setDocuments(docs => docs.map(doc => {
            if (doc.id === docId) {
                const now = new Date().toISOString();
                const newVersion = (status === 'Revisions Requested' || status === 'Draft') ? doc.version + 0.1 : doc.version;
                return {
                    ...doc,
                    status,
                    version: parseFloat(newVersion.toFixed(1)),
                    updatedAt: now,
                    history: [...doc.history, { timestamp: now, status, notes, user }],
                };
            }
            return doc;
        }));
    }, []);
    
    const handleViewDocument = (docId: string) => {
        setSelectedDocumentId(docId);
        setCurrentView('viewer');
    };

    const handleHomeClick = () => {
        setSelectedDocumentId(null);
        setCurrentView('complianceDashboard');
    }
    
    const setView = (view: View) => {
        setSelectedDocumentId(null);
        setCurrentView(view);
    }

    const startTour = () => {
        setView('complianceDashboard');
        setTourState({ isActive: true, step: 1 });
    };
    
    const handleActionRequest = (docId: string, action: ExportAction) => {
        setViewBeforeAction(currentView);
        setActionRequest({ docId, action });
        setSelectedDocumentId(docId);
        setCurrentView('viewer');
    };

    const handleActionComplete = useCallback(() => {
        setActionRequest(null);
        setCurrentView(viewBeforeAction);
    }, [viewBeforeAction]);


    const renderContent = () => {
        if (isInitializing) {
             return <div className="flex-grow w-full flex items-center justify-center"><LoadingSpinner isInitializing={true} policyCount={policies.length} /></div>;
        }

        if (error) {
            return <div className="flex-grow w-full flex items-center justify-center text-center text-red-400"><p>{error}</p></div>;
        }

        switch (currentView) {
            case 'viewer':
                const doc = documents.find(d => d.id === selectedDocumentId);
                const currentAction = actionRequest?.docId === doc?.id ? actionRequest : null;
                return doc ? <DocumentViewer document={doc} onUpdate={handleUpdateDocument} onBack={handleHomeClick} tourState={tourState} actionRequest={currentAction} onActionComplete={handleActionComplete} /> : <p>Document not found.</p>;
            
             case 'compliance':
                return <ComplianceJourney documents={documents} policies={policies} onBack={handleHomeClick} />;

            case 'documentList':
                return <DocumentList documents={documents} onView={handleViewDocument} onActionRequest={handleActionRequest} />;

            case 'liveAssistant':
                return <LiveAssistant tourState={tourState}/>;
            
            case 'riskAssessment':
                return <RiskAssessment setView={setView} tourState={tourState} />;

            case 'templateLibrary':
                return <TemplateLibrary />;

            case 'complianceDashboard':
            default:
                // We try to find a specific doc for the tour. 
                // The original code looked for 'Performance Management'. 
                // With Arabic, the title might match the key or be translated in content, but the generated doc title might be English key based on my App logic above.
                const performanceDoc = documents.find(d => d.policyTitle.includes('Performance') || d.policyTitle.includes('إدارة الأداء'));
                return <ComplianceDashboard documents={documents} policies={policies} onView={handleViewDocument} tourState={tourState} performanceDocId={performanceDoc?.id} onActionRequest={handleActionRequest}/>;
        }
    };
    
    return (
        <div className="min-h-screen bg-gray-900 text-white font-sans overflow-hidden relative print:overflow-visible">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 print:hidden">
                <div className="w-[80vw] h-[80vh] bg-gradient-to-tr from-sky-400 via-sky-600 to-teal-400 rounded-full blur-[150px] opacity-20 animate-pulse"></div>
            </div>
            
            <div className="relative z-10 flex h-screen print:block print:h-auto">
                <Sidebar currentView={currentView} setView={setView} tourState={tourState}/>
                <div className="flex-grow flex flex-col overflow-hidden print:overflow-visible">
                    <Header onHomeClick={handleHomeClick} onStartTour={startTour}/>
                    <main className="flex-grow flex p-4 md:p-8 overflow-hidden print:p-0 print:overflow-visible">
                        {renderContent()}
                    </main>
                </div>
            </div>
             {tourState.isActive && (
                <TourAgent
                    tourState={tourState}
                    setTourState={setTourState}
                    setView={setView}
                    handleViewDocument={handleViewDocument}
                    handleUpdateDocument={handleUpdateDocument}
                    documents={documents}
                />
            )}
        </div>
    );
};

export default App;
