import * as React from 'react';
const { useEffect } = React;
import { TourState, View, DocumentStatus, DocumentObject } from '../types';
import { useTranslation } from '../context/LanguageContext';

interface TourAgentProps {
  tourState: TourState;
  setTourState: React.Dispatch<React.SetStateAction<TourState>>;
  setView: (view: View) => void;
  handleViewDocument: (docId: string) => void;
  handleUpdateDocument: (docId: string, status: DocumentStatus, notes: string) => void;
  documents: DocumentObject[];
}

const TourAgent: React.FC<TourAgentProps> = ({
  tourState,
  setTourState,
  setView,
  handleViewDocument,
  handleUpdateDocument,
  documents,
}) => {
  const { t } = useTranslation();
  const performanceDoc = documents.find(d => d.policyTitle === 'Performance Management');

  const advanceStep = () => setTourState(prev => ({ ...prev, step: prev.step + 1 }));
  const endTour = () => setTourState({ isActive: false, step: 0 });

  useEffect(() => {
    const { step } = tourState;
    if (step === 4 && performanceDoc) {
      handleViewDocument(performanceDoc.id);
    }
    if (step === 7) {
        setView('riskAssessment');
    }
    if (step === 8) {
        setView('liveAssistant');
    }
  }, [tourState.step]);

  const handleAction = (action: string) => {
    switch (action) {
      case 'openPerfDoc':
        if (performanceDoc) {
          advanceStep();
        } else {
            // If doc not found, maybe skip or end tour
            endTour(); 
        }
        break;
      case 'requestApproval':
        if (performanceDoc) {
          handleUpdateDocument(performanceDoc.id, 'Pending Approval', 'Status changed by AI Guide during tour.');
        }
        advanceStep();
        break;
      default:
        advanceStep();
    }
  };

  const renderStepContent = () => {
    const { step } = tourState;

    switch (step) {
      case 1:
        return {
          text: t('tour.steps.1'),
          buttons: [
            { label: t('tour.buttons.begin'), action: () => handleAction('next') },
            { label: t('tour.buttons.skip'), action: endTour, isSecondary: true },
          ],
        };
      case 2:
        return {
          text: t('tour.steps.2'),
          buttons: [{ label: t('tour.buttons.next'), action: () => handleAction('next') }],
        };
      case 3:
        return {
          text: t('tour.steps.3'),
          buttons: [
            { label: t('tour.buttons.yesDoIt'), action: () => handleAction('openPerfDoc') },
            { label: t('tour.buttons.noThanks'), action: endTour, isSecondary: true },
          ],
        };
      case 4:
         return {
          text: t('tour.steps.4'),
          buttons: [{ label: t('tour.buttons.next'), action: () => handleAction('next') }],
        };
      case 5:
        return {
          text: t('tour.steps.5'),
          buttons: [
            { label: t('tour.buttons.yesDoIt'), action: () => handleAction('requestApproval') },
            { label: t('tour.buttons.noThanks'), action: () => handleAction('next'), isSecondary: true },
          ],
        };
       case 6:
        return {
          text: t('tour.steps.6'),
          buttons: [{ label: t('tour.buttons.next'), action: () => handleAction('next') }],
        };
       case 7:
        return {
          text: t('tour.steps.7'),
          buttons: [{ label: t('tour.buttons.next'), action: () => handleAction('next') }],
        };
       case 8:
        return {
          text: t('tour.steps.8'),
          buttons: [{ label: t('tour.buttons.next'), action: () => handleAction('next') }],
        };
      case 9:
        return {
          text: t('tour.steps.9'),
          buttons: [{ label: t('tour.buttons.finish'), action: endTour }],
        };
      default:
        return null;
    }
  };

  const content = renderStepContent();
  if (!content) return null;

  return (
    <div className="tour-agent-container">
      <div className="tour-agent-bubble">
        <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-2">
                 <div className="w-6 h-6 bg-gradient-to-br from-sky-400 to-teal-400 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold">AI</span>
                </div>
                <h3 className="font-bold text-lg text-white">{t('tour.agentName')}</h3>
            </div>
             <button onClick={endTour} className="text-gray-400 hover:text-white">&times;</button>
        </div>
        
        <p className="text-gray-300 mb-4">{content.text}</p>
        
        <div className="flex gap-2 justify-end">
          {content.buttons.map(btn => (
            <button
              key={btn.label}
              onClick={btn.action}
              className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${
                btn.isSecondary
                  ? 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
                  : 'bg-sky-600 text-white hover:bg-sky-500'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TourAgent;
