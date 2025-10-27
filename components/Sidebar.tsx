import React from 'react';
import { View } from '../types';

interface SidebarProps {
  currentView: View;
  setView: (view: View) => void;
}

const NavItem: React.FC<{
  label: string;
  view: View;
  currentView: View;
  setView: (view: View) => void;
  children: React.ReactNode;
}> = ({ label, view, currentView, setView, children }) => (
    <button
        onClick={() => setView(view)}
        className={`w-full flex items-center justify-center p-4 rounded-lg my-2 transition-colors duration-200 group relative ${
            currentView === view ? 'bg-sky-500/30 text-sky-300' : 'text-gray-400 hover:bg-white/10 hover:text-white'
        }`}
        aria-label={label}
    >
        {children}
        <span className="absolute left-full ml-4 px-2 py-1 bg-gray-900 text-white text-xs rounded-md invisible group-hover:visible whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-20">
            {label}
        </span>
    </button>
);

const Sidebar: React.FC<SidebarProps> = ({ currentView, setView }) => {
    return (
        <nav className="flex-shrink-0 w-20 bg-black/30 backdrop-blur-lg border-r border-white/10 p-2 flex flex-col items-center">
            <div className="w-12 h-12 bg-gradient-to-br from-sky-400 to-teal-400 rounded-lg flex items-center justify-center mb-6 flex-shrink-0">
                <span className="text-2xl font-bold text-white">HR</span>
            </div>

            <NavItem label="Dashboard" view="complianceDashboard" currentView={currentView} setView={setView}>
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
            </NavItem>

            <NavItem label="All Documents" view="documentList" currentView={currentView} setView={setView}>
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
            </NavItem>
            
            <NavItem label="Compliance Journey" view="compliance" currentView={currentView} setView={setView}>
                 <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            </NavItem>

            <NavItem label="Live Assistant" view="liveAssistant" currentView={currentView} setView={setView}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path>
                </svg>
            </NavItem>

            <NavItem label="Risk Assessment" view="riskAssessment" currentView={currentView} setView={setView}>
                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
            </NavItem>

        </nav>
    );
};

export default Sidebar;