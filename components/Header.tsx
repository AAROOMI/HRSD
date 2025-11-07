
import * as React from 'react';
import { useTranslation } from '../context/LanguageContext';
import LanguageSwitcher from './LanguageSwitcher';

interface HeaderProps {
    onHomeClick: () => void;
    onStartTour: () => void;
}

const Header: React.FC<HeaderProps> = ({ onHomeClick, onStartTour }) => {
    const { t } = useTranslation();

    return (
        <header className="flex-shrink-0 w-full p-4 md:px-8 bg-black/20 backdrop-blur-lg border-b border-white/10 flex justify-between items-center print:hidden">
            <div className="flex items-center gap-4 cursor-pointer" onClick={onHomeClick}>
                 <div className="w-10 h-10 bg-gradient-to-br from-sky-400 to-teal-400 rounded-lg flex items-center justify-center">
                    <span className="text-xl font-bold">HR</span>
                </div>
                <div>
                    <h1 className="text-lg md:text-xl font-bold tracking-wider">{t('header.title')}</h1>
                    <p className="text-xs text-gray-400">{t('header.subtitle')}</p>
                </div>
            </div>
            <div className="flex items-center gap-4">
                 <button 
                    onClick={onStartTour}
                    className="px-4 py-2 bg-sky-600/50 border border-sky-500/50 rounded-lg text-sm font-semibold text-sky-200 hover:bg-sky-500/50 transition-colors"
                 >
                    {t('tour.startTour')}
                </button>
                <LanguageSwitcher />
            </div>
        </header>
    );
};

export default Header;
