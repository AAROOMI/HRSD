import * as React from 'react';
const { useState } = React;
import { DocumentObject, Policy, ComplianceStep, DocumentContent } from '../types';
import { useTranslation } from '../context/LanguageContext';
import { generateCompliancePlan } from '../services/geminiService';
import LoadingSpinner from './LoadingSpinner';

interface ComplianceJourneyProps {
  documents: DocumentObject[];
  policies: Policy[];
  onBack: () => void;
}

const Stepper: React.FC<{ currentStep: number }> = ({ currentStep }) => {
    const { t } = useTranslation();
    const steps = [t('journey.steps.select'), t('journey.steps.review')];
    return (
        <div className="flex items-center w-full max-w-md mx-auto mb-8">
            {steps.map((label, index) => {
                const stepNumber = index + 1;
                const isActive = stepNumber === currentStep;
                const isCompleted = stepNumber < currentStep;
                return (
                    <React.Fragment key={label}>
                        <div className="flex flex-col items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                                isActive ? 'bg-sky-500 text-white ring-4 ring-sky-500/30' : 
                                isCompleted ? 'bg-teal-500 text-white' : 
                                'bg-gray-700 text-gray-400'
                            } transition-all duration-300`}>
                                {isCompleted ? '✓' : stepNumber}
                            </div>
                            <p className={`mt-2 text-xs font-semibold ${isActive || isCompleted ? 'text-white' : 'text-gray-500'}`}>{label}</p>
                        </div>
                        {index < steps.length - 1 && <div className={`flex-1 h-1 mx-4 ${isCompleted ? 'bg-teal-500' : 'bg-gray-700'}`}></div>}
                    </React.Fragment>
                );
            })}
        </div>
    );
};

const ComplianceJourney: React.FC<ComplianceJourneyProps> = ({ documents, policies, onBack }) => {
    const { t } = useTranslation();
    const [step, setStep] = useState(0); // 0: Intro, 1: Select, 2: Loading/Analyzing, 3: Plan/Error
    const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [compliancePlan, setCompliancePlan] = useState<ComplianceStep[] | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleAnalyzePolicy = async (policy: Policy) => {
        setSelectedPolicy(policy);
        setStep(2);
        setIsLoading(true);
        setError(null);
        setCompliancePlan(null);

        const relatedDocument = documents.find(d => d.policyTitle === policy.title);
        if (!relatedDocument) {
            setError(t('journey.error.description')); // A more specific error could be useful
            setIsLoading(false);
            setStep(3);
            return;
        }

        try {
            const plan = await generateCompliancePlan(policy, relatedDocument.content);
            setCompliancePlan(plan.steps);
        } catch (err) {
            setError(t('journey.error.description'));
            console.error(err);
        } finally {
            setIsLoading(false);
            setStep(3);
        }
    };

    const resetJourney = () => {
        setStep(1);
        setSelectedPolicy(null);
        setCompliancePlan(null);
        setError(null);
    };

    const renderContent = () => {
        if (isLoading) {
             return (
                 <div className="text-center">
                    <LoadingSpinner />
                    <h3 className="text-2xl font-bold mt-4">{t('journey.analyzing.title')}</h3>
                    <p className="text-gray-400 mt-2">{t('journey.analyzing.description', { policyTitle: selectedPolicy?.title || '' })}</p>
                </div>
            );
        }

        switch (step) {
            case 0: // Intro
                return (
                    <div className="text-center max-w-2xl mx-auto">
                        <h2 className="text-3xl font-bold mb-4">{t('journey.welcome.title')}</h2>
                        <p className="text-gray-300 mb-8">{t('journey.welcome.description')}</p>
                        <button onClick={() => setStep(1)} className="bg-sky-500 hover:bg-sky-400 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-300">
                            {t('journey.welcome.begin')}
                        </button>
                    </div>
                );
            
            case 1: // Select Policy
                return (
                    <div>
                        <Stepper currentStep={1} />
                        <h2 className="text-2xl font-bold text-center mb-2">{t('journey.select.title')}</h2>
                        <p className="text-gray-400 text-center mb-8">{t('journey.select.description')}</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {policies.map(p => (
                                <div key={p.id} onClick={() => handleAnalyzePolicy(p)}
                                     className="bg-white/5 p-4 rounded-lg border border-white/10 hover:bg-white/10 hover:border-sky-500/50 cursor-pointer transition-all duration-300 text-center">
                                    <h3 className="font-semibold text-sky-300">{p.title}</h3>
                                </div>
                            ))}
                        </div>
                    </div>
                );

            case 3: // Plan or Error
                 return (
                    <div>
                        <Stepper currentStep={2} />
                        {error ? (
                             <div className="text-center max-w-xl mx-auto">
                                <h2 className="text-2xl font-bold text-red-400 mb-2">{t('journey.error.title')}</h2>
                                <p className="text-gray-400 mb-6">{error}</p>
                                <button onClick={resetJourney} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-5 rounded-lg transition-colors duration-300">
                                     {t('journey.error.tryAgain')}
                                </button>
                            </div>
                        ) : (
                            <div>
                                <h2 className="text-2xl font-bold text-center mb-2">{t('journey.plan.title')}</h2>
                                <p className="text-gray-400 text-center mb-8">{t('journey.plan.description')}</p>
                                <div className="bg-black/20 border border-white/10 p-6 rounded-lg max-w-4xl mx-auto">
                                    <h3 className="font-bold text-xl text-teal-300 mb-6">{t('journey.plan.forPolicy', { policyTitle: selectedPolicy?.title || '' })}</h3>
                                    <ul className="space-y-6">
                                        {compliancePlan?.map((s, index) => (
                                            <li key={index} className="flex gap-4">
                                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-sky-500/20 border border-sky-400/50 text-sky-300 flex items-center justify-center font-bold">{index + 1}</div>
                                                <div>
                                                    <h4 className="font-bold text-white">{s.title}</h4>
                                                    <p className="text-gray-300 mt-1">{s.description}</p>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                 <div className="text-center mt-8">
                                    <button onClick={resetJourney} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-5 rounded-lg transition-colors duration-300">
                                         {t('journey.error.tryAgain')}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                );
        }
    };

    return (
        <div className="flex-grow w-full bg-black/30 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl flex flex-col p-6 overflow-hidden">
            <div className="flex-shrink-0 flex justify-start mb-4">
                <button onClick={onBack} className="text-sky-300 hover:text-sky-100 self-start">{t('journey.backToDashboard')}</button>
            </div>
            <div className="flex-grow flex items-center justify-center overflow-y-auto">
                {renderContent()}
            </div>
        </div>
    );
};

export default ComplianceJourney;