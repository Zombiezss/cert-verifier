
import React from 'react';
import { AppView, UserRole } from '../types';
import { ShieldCheck, LayoutDashboard, PlusCircle, Search, Database, Lock, LogOut, UserCircle, Hexagon, FileText, Home } from 'lucide-react';

interface HeaderProps {
  currentView: AppView;
  onChangeView: (view: AppView) => void;
  isLoggedIn: boolean;
  onLogout: () => void;
  userOrg?: string;
  role?: UserRole;
}

const Header: React.FC<HeaderProps> = ({ currentView, onChangeView, isLoggedIn, onLogout, userOrg, role }) => {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-white/80 border-b border-meta-blue/10 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <div className="flex items-center cursor-pointer" onClick={() => onChangeView(AppView.HOME)}>
            <div className="w-10 h-10 rounded-xl bg-meta-blue flex items-center justify-center text-white mr-3 shadow-lg shadow-indigo-200">
              <Hexagon className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-meta-blue tracking-tight">Cert-verifier</h1>
              <span className="text-[10px] font-bold text-meta-blue/60 uppercase tracking-widest">Hyperledger Fabric</span>
            </div>
          </div>
          
          <nav className="hidden md:flex space-x-1">
             <button 
                onClick={() => onChangeView(AppView.HOME)} 
                className={`p-2.5 rounded-full transition-colors ${currentView === AppView.HOME ? 'bg-meta-blue text-white' : 'text-meta-blue/60 hover:text-meta-blue hover:bg-meta-blue/5'}`}
                aria-label="Home"
                title="Home Dashboard"
             >
                <Home className="w-5 h-5" />
             </button>
             
             {/* Ledger: Only visible for University Users */}
             {isLoggedIn && role === UserRole.UNIVERSITY && (
               <button onClick={() => onChangeView(AppView.LEDGER)} className={`px-4 py-2 rounded-full text-sm font-bold transition-colors ${currentView === AppView.LEDGER ? 'bg-meta-blue text-white' : 'text-meta-blue/60 hover:text-meta-blue'}`}>
                  Ledger
               </button>
             )}

             {isLoggedIn && role === UserRole.STUDENT && (
               <button onClick={() => onChangeView(AppView.STUDENT_WALLET)} className={`px-4 py-2 rounded-full text-sm font-bold transition-colors ${currentView === AppView.STUDENT_WALLET ? 'bg-meta-blue text-white' : 'text-meta-blue/60 hover:text-meta-blue'}`}>
                  My Wallet
               </button>
             )}
          </nav>

          <div>
             {isLoggedIn ? (
               <div className="flex items-center space-x-4">
                 <div className="text-right hidden sm:block">
                    <div className="text-xs font-bold text-meta-blue">{role === UserRole.UNIVERSITY ? userOrg : 'User/HR Account'}</div>
                    <div className="text-[10px] text-green-600 font-mono">Connected Peer</div>
                 </div>
                 <button onClick={onLogout} className="p-2 rounded-full bg-red-50 text-red-500 hover:bg-red-100 transition-colors">
                    <LogOut className="w-5 h-5" />
                 </button>
               </div>
             ) : (
               <button onClick={() => onChangeView(AppView.LOGIN)} className="bg-meta-blue text-white px-5 py-2.5 rounded-full text-sm font-bold shadow-lg shadow-indigo-200 hover:-translate-y-0.5 transition-all">
                  Login
               </button>
             )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
