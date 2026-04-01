import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import IssueForm from './components/IssueForm';
import VerifyForm from './components/VerifyForm';
import LoginForm from './components/LoginForm';
import FeedbackForm from './components/FeedbackForm';
import BlockchainViewer from './components/BlockchainViewer'; 
import { AppView, UserRole } from './types';
import { blockchainInstance } from './services/blockchain';
import { Shield, Lock, Wallet, ScanLine, Database, MessageSquare, GraduationCap, Share2, FileCheck, X, Calendar, Plus } from 'lucide-react';

// --- Student/User/HR Dashboard Component ---
interface StudentDashboardProps {
  currentUser: any;
}

const StudentDashboard: React.FC<StudentDashboardProps> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState<'wallet' | 'verify'>('wallet');
  const [certs, setCerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Sharing Modal State
  const [selectedCert, setSelectedCert] = useState<any | null>(null);
  const [shareFields, setShareFields] = useState({
    name: true,
    course: true,
    university: true,
    date: true,
    dob: true 
  });

  useEffect(() => {
    if (currentUser?.username) {
      // currentUser.username maps to registrationNumber
      blockchainInstance.getStudentWallet(currentUser.username).then(data => {
        setCerts(data);
        setLoading(false);
      });
    }
  }, [currentUser]);

  const handleShareClick = (cert: any) => {
    setSelectedCert(cert);
    setShareFields({ name: true, course: true, university: true, date: true, dob: true });
  };

  const toggleField = (field: string) => {
    setShareFields(prev => ({ ...prev, [field]: !prev[field as keyof typeof shareFields] }));
  };

  const getQrUrl = () => {
    if (!selectedCert) return '';
    const qrData = JSON.stringify({
      id: selectedCert.id,
      dob: shareFields.dob ? selectedCert.dateOfBirth : undefined,
      name: shareFields.name ? selectedCert.studentName : undefined,
      course: shareFields.course ? selectedCert.course : undefined,
      uni: shareFields.university ? selectedCert.university : undefined,
      issued: shareFields.date ? selectedCert.issueDate : undefined
    });
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}`;
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row justify-between items-end mb-8 border-b border-gray-200 pb-6">
          <div>
              <h2 className="text-3xl font-bold text-meta-blue">User/HR Portal</h2>
              <p className="text-gray-600">
                {activeTab === 'wallet' ? 'Manage and share your digital credentials.' : 'Use Asset ID & DOB to authorize certificates.'}
              </p>
          </div>
          
          <div className="flex space-x-2 mt-4 md:mt-0 bg-white p-1 rounded-xl border border-gray-200 shadow-sm">
              <button 
                onClick={() => setActiveTab('wallet')}
                className={`flex items-center px-4 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'wallet' ? 'bg-meta-blue text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                  <Wallet className="w-4 h-4 mr-2" /> My Wallet
              </button>
              <button 
                onClick={() => setActiveTab('verify')}
                className={`flex items-center px-4 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'verify' ? 'bg-meta-blue text-white shadow' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                  <FileCheck className="w-4 h-4 mr-2" /> Scan & Verify
              </button>
          </div>
      </div>
      
      {activeTab === 'wallet' ? (
          <>
              {loading ? <div className="text-center py-10">Loading assets from World State...</div> : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                   {certs.length === 0 ? (
                     <div className="col-span-3 text-center py-20 bg-white rounded-3xl border border-dashed border-gray-300">
                       <GraduationCap className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                       <p className="text-gray-500">No credentials found for your ID.</p>
                     </div>
                   ) : (
                     certs.map((cert) => (
                       <div key={cert.id} className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-shadow group">
                          <div className="h-3 bg-meta-blue group-hover:bg-indigo-600 transition-colors"></div>
                          <div className="p-6">
                             <div className="flex justify-between items-start mb-4">
                                <span className="bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded">VERIFIED</span>
                                <span className="text-gray-400 text-xs font-mono">{cert.id}</span>
                             </div>
                             <h3 className="font-bold text-xl text-gray-900 mb-1">{cert.course}</h3>
                             <p className="text-gray-500 text-sm mb-4">{cert.university}</p>
                             
                             <div className="flex items-center text-xs text-gray-400 mb-2">
                                <Calendar className="w-3 h-3 mr-1" />
                                <span>DOB: {cert.dateOfBirth || 'N/A'}</span>
                             </div>

                             <div className="border-t border-gray-100 pt-4 mt-2 flex justify-between items-center">
                                <span className="text-xs text-gray-400">Issued: {cert.issueDate}</span>
                                <button 
                                  onClick={() => handleShareClick(cert)}
                                  className="flex items-center text-meta-blue text-sm font-bold hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors"
                                >
                                  <Share2 className="w-4 h-4 mr-1.5" /> Share
                                </button>
                             </div>
                          </div>
                       </div>
                     ))
                   )}
                </div>
              )}
          </>
      ) : (
          <div className="animate-fade-in">
              <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 mb-6 text-sm text-blue-800 flex items-center">
                 <Shield className="w-5 h-5 mr-3 text-blue-600" />
                 Scan and verify document or use Asset ID & DOB to authorize.
              </div>
              <VerifyForm />
          </div>
      )}

      {selectedCert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in">
            <div className="bg-meta-blue p-6 text-white flex justify-between items-center">
              <h3 className="font-bold text-lg flex items-center">
                <Share2 className="w-5 h-5 mr-2" /> Share Credential
              </h3>
              <button onClick={() => setSelectedCert(null)} className="hover:bg-white/20 p-1 rounded-full"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="p-6">
              <p className="text-sm text-gray-500 mb-4">Select the data fields you wish to disclose to the verifier.</p>
              
              <div className="space-y-2 mb-6 max-h-40 overflow-y-auto">
                 <label className="flex items-center justify-between p-3 border rounded-xl cursor-pointer hover:bg-gray-50">
                    <span className="font-bold text-gray-700 text-sm">Student Name</span>
                    <input type="checkbox" checked={shareFields.name} onChange={() => toggleField('name')} className="w-5 h-5 accent-meta-blue" />
                 </label>
                 <label className="flex items-center justify-between p-3 border rounded-xl cursor-pointer hover:bg-gray-50">
                    <span className="font-bold text-gray-700 text-sm">Date of Birth</span>
                    <input type="checkbox" checked={shareFields.dob} onChange={() => toggleField('dob')} className="w-5 h-5 accent-meta-blue" />
                 </label>
                 <label className="flex items-center justify-between p-3 border rounded-xl cursor-pointer hover:bg-gray-50">
                    <span className="font-bold text-gray-700 text-sm">Course / Degree</span>
                    <input type="checkbox" checked={shareFields.course} onChange={() => toggleField('course')} className="w-5 h-5 accent-meta-blue" />
                 </label>
                 <label className="flex items-center justify-between p-3 border rounded-xl cursor-pointer hover:bg-gray-50">
                    <span className="font-bold text-gray-700 text-sm">University</span>
                    <input type="checkbox" checked={shareFields.university} onChange={() => toggleField('university')} className="w-5 h-5 accent-meta-blue" />
                 </label>
                 <label className="flex items-center justify-between p-3 border rounded-xl cursor-pointer hover:bg-gray-50">
                    <span className="font-bold text-gray-700 text-sm">Issue Date</span>
                    <input type="checkbox" checked={shareFields.date} onChange={() => toggleField('date')} className="w-5 h-5 accent-meta-blue" />
                 </label>
              </div>

              <div className="bg-gray-100 p-4 rounded-xl text-center mb-4">
                 <div className="bg-white w-40 h-40 mx-auto mb-2 p-2 shadow-sm rounded-lg flex items-center justify-center">
                   <img src={getQrUrl()} alt="Credential QR" className="w-full h-full object-contain" />
                 </div>
                 <p className="text-xs text-gray-500 font-mono">ID: {selectedCert.id}</p>
                 <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Scan to Verify</p>
              </div>

              <button className="w-full py-3 bg-meta-blue text-white rounded-xl font-bold hover:bg-indigo-900 transition-colors shadow-lg">
                Copy Link
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.HOME);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = (e.clientY / window.innerHeight) * 2 - 1;
      setMousePos({ x, y });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleLogin = (user: any) => {
    setIsLoggedIn(true);
    setCurrentUser(user);
    if (user.role === UserRole.UNIVERSITY) {
      setCurrentView(AppView.ISSUE);
    } else {
      setCurrentView(AppView.STUDENT_WALLET);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    setCurrentView(AppView.HOME);
  };

  const renderContent = () => {
    switch (currentView) {
      case AppView.HOME:
        return (
          <div ref={containerRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 relative min-h-[80vh] flex flex-col justify-center">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 relative z-10">
              
              <div 
                className="md:col-span-4 bg-meta-blue rounded-3xl p-8 text-white shadow-xl overflow-hidden relative cursor-pointer group hover:shadow-2xl transition-all"
                style={{ transform: `translate(${mousePos.x * -10}px, ${mousePos.y * -10}px)` }}
                onClick={() => {
                   if (isLoggedIn && currentUser.role === UserRole.UNIVERSITY) setCurrentView(AppView.ISSUE);
                   else setCurrentView(AppView.LOGIN);
                }}
              >
                <div className="relative z-10 h-full flex flex-col justify-between min-h-[280px]">
                  <div>
                    <h2 className="text-3xl font-bold leading-tight mb-2">Issue<br/>Credentials</h2>
                    <p className="text-indigo-200">For Universities & Institutions.</p>
                  </div>
                  <button className="bg-white text-meta-blue px-6 py-3 rounded-full font-bold w-max flex items-center mt-4">
                    {isLoggedIn && currentUser.role === UserRole.UNIVERSITY ? (
                        <>
                            <Plus className="w-4 h-4 mr-2" /> Add Certificates
                        </>
                    ) : (
                        <>
                            <Lock className="w-4 h-4 mr-2" /> University Login
                        </>
                    )}
                  </button>
                </div>
              </div>

              <div className="md:col-span-4 row-span-2 relative flex justify-center items-center">
                 <div className="bg-white rounded-[3rem] shadow-2xl border-8 border-white w-full max-w-[280px] h-[500px] flex flex-col overflow-hidden relative"
                      style={{ transform: `translate(${mousePos.x * 5}px, ${mousePos.y * 5}px)` }}>
                    <div className="bg-meta-blue p-6 text-white pb-8">
                       <h3 className="text-center font-bold text-xl">CertWallet</h3>
                       <p className="text-center text-xs opacity-70">Hyperledger Fabric</p>
                    </div>
                    <div className="p-6 space-y-4 flex-1 flex flex-col justify-center items-center bg-gray-50 text-center">
                        <div>
                           <Shield className="w-12 h-12 text-meta-blue mx-auto mb-3 opacity-90" />
                           <h4 className="font-bold text-lg text-meta-blue leading-tight mb-2">Secure.<br/>Verified.<br/>Trusted.</h4>
                        </div>
                        
                        <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 w-full">
                           <div className="flex items-center justify-center space-x-2">
                              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                              <span className="text-xs font-bold text-gray-700">No More Fake Certificates</span>
                           </div>
                        </div>

                        <button
                           onClick={() => setCurrentView(AppView.FEEDBACK)}
                           className="w-full py-3 bg-white border border-meta-blue/10 rounded-xl text-meta-blue text-xs font-bold shadow-sm hover:bg-gray-100 transition-colors flex items-center justify-center"
                        >
                           <MessageSquare className="w-3 h-3 mr-2" />
                           Suggestion & Help
                        </button>
                    </div>
                    <div className="absolute bottom-6 left-0 right-0 flex justify-center">
                       <div className="w-12 h-1 bg-gray-300 rounded-full"></div>
                    </div>
                 </div>
              </div>

              <div 
                className="md:col-span-4 bg-[#022B27] rounded-3xl p-8 text-white shadow-xl relative cursor-pointer group hover:shadow-2xl transition-all"
                style={{ transform: `translate(${mousePos.x * -15}px, ${mousePos.y * -15}px)` }}
                onClick={() => setCurrentView(AppView.VERIFY)}
              >
                <div className="relative z-10 h-full flex flex-col justify-between min-h-[280px]">
                   <div>
                      <h2 className="text-3xl font-bold leading-tight mb-2">Verify<br/>Authenticity</h2>
                      <p className="text-emerald-200">Public Verification Portal.</p>
                   </div>
                   <button className="bg-white text-[#022B27] px-6 py-3 rounded-full font-bold w-max flex items-center mt-4">
                     <ScanLine className="w-4 h-4 mr-2" /> Check ID
                   </button>
                </div>
              </div>

            </div>
          </div>
        );
      case AppView.LOGIN:
        return <div className="max-w-7xl mx-auto py-12"><LoginForm onLogin={handleLogin} /></div>;
      case AppView.ISSUE:
        return <div className="max-w-7xl mx-auto py-12"><IssueForm onSuccess={() => setCurrentView(AppView.HOME)} /></div>;
      case AppView.VERIFY:
        return <div className="max-w-7xl mx-auto py-12"><VerifyForm /></div>;
      case AppView.FEEDBACK:
        return <div className="max-w-7xl mx-auto py-12"><FeedbackForm currentUser={currentUser} /></div>;
      case AppView.STUDENT_WALLET:
        return <StudentDashboard currentUser={currentUser} />;
      case AppView.LEDGER:
         return <div className="max-w-7xl mx-auto py-12"><BlockchainViewer filterOrg={currentUser?.universityName || currentUser?.orgName} /></div>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans bg-transparent selection:bg-indigo-100">
      <Header currentView={currentView} onChangeView={setCurrentView} isLoggedIn={isLoggedIn} onLogout={handleLogout} userOrg={currentUser?.orgName} role={currentUser?.role} />
      <main className="flex-grow">{renderContent()}</main>
      <Footer />
    </div>
  );
}

export default App;