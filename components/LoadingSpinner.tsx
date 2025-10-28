import * as React from 'react';
import { useTranslation } from '../context/LanguageContext';

interface LoadingSpinnerProps {
    isInitializing?: boolean;
    policyCount?: number;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ isInitializing = false, policyCount = 0 }) => {
  const { t } = useTranslation();
  
  return (
    <div className="flex flex-col items-center justify-center gap-4 text-center">
        <div className="w-16 h-16 border-4 border-t-sky-400 border-r-sky-400 border-b-white/20 border-l-white/20 rounded-full animate-spin"></div>
        {isInitializing ? (
            <>
                <h3 className="text-xl font-semibold text-gray-300">{t('agentStatus.title')}</h3>
                <p className="text-gray-400">{t('agentStatus.generating', { count: policyCount })}</p>
            </>
        ) : (
            <>
                <h3 className="text-xl font-semibold text-gray-300">{t('loading.generating')}</h3>
                <p className="text-gray-400">{t('loading.wait')}</p>
            </>
        )}
    </div>
  );
};

export default LoadingSpinner;