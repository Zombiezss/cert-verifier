import React, { useState } from 'react';
import {
  Building2,
  AlertCircle,
  CheckCircle,
  Upload,
  Globe,
  Mail,
  Phone,
  User,
  BadgeCheck
} from 'lucide-react';
import { UserRole, UniversityType } from '../types';

interface LoginFormProps {
  onLogin: (user: any) => void;
}

// 👉 BACKEND BASE URL (YOUR NODE SERVER)
const API_BASE = 'http://localhost:4000/api';

const LoginForm: React.FC<LoginFormProps> = ({ onLogin }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [role] = useState<UserRole>(UserRole.UNIVERSITY);

  // Login State
  const [username, setUsername] = useState(''); // we will send this as email
  const [password, setPassword] = useState('');

  // Registration State - Detailed Fields
  const [uniName, setUniName] = useState('');
  const [uniType, setUniType] = useState<UniversityType>(UniversityType.CENTRAL);
  const [website, setWebsite] = useState('');
  const [email, setEmail] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [designation, setDesignation] = useState('');
  const [phone, setPhone] = useState('');
  const [accreditationId, setAccreditationId] = useState('');
  const [accreditationFile, setAccreditationFile] = useState<string | null>(null);

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAccreditationFile(e.target.files[0].name);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccessMsg('');

    const endpoint = isRegistering ? 'register' : 'login';

    // 👉 For login: backend expects { email, password }
    // 👉 For register: your backend expects { name, email, usn, department, password }
    const payload = isRegistering
      ? {
          // These fields DO NOT match your current backend register route,
          // so registration may fail unless you update backend too.
          username,
          password,
          role,
          universityName: uniName,
          universityType: uniType,
          website,
          email,
          contactPerson,
          designation,
          phone,
          accreditationId
        }
      : {
          email: username, // 🔹 map username → email for backend
          password
        };

    try {
      const res = await fetch(`${API_BASE}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      // ✅ If backend responded (not offline)
      if (!res.ok) {
        // backend sends { message: '...' } on error
        setError(data.message || data.error || 'Authentication failed');
        return;
      }

      if (isRegistering) {
        setSuccessMsg('Registration Request Submitted (if backend supports it).');
        // you can redirect or auto-login later
      } else {
        // ✅ Login success: your backend returns { message, student }
        setSuccessMsg(data.message || 'Login success');

        // 🔹 VERY IMPORTANT: tell App that this is a UNIVERSITY user
        setTimeout(() => {
          onLogin({
            ...(data.student || {}),
            role: UserRole.UNIVERSITY
          });
        }, 1000);
      }
    } catch (err: any) {
      console.warn('Backend unreachable:', err);
      setError('Backend is offline or unreachable.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`mx-auto mt-6 ${isRegistering ? 'max-w-4xl' : 'max-w-md'}`}>
      <div className="bg-black rounded-3xl shadow-xl overflow-hidden border border-gray-800">
        <div className="px-8 py-10 text-center relative overflow-hidden bg-[#100A38]">
          <div className="relative z-10">
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm border border-white/20">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              {isRegistering ? 'Enroll New University' : 'University Login'}
            </h2>
            <p className="text-indigo-200 text-sm opacity-80">
              Hyperledger Fabric CA Authentication
            </p>
          </div>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex items-start p-3 bg-red-900/20 text-red-200 rounded-lg text-sm border border-red-900/30">
                <AlertCircle className="w-4 h-4 mr-2 mt-0.5" /> {error}
              </div>
            )}

            {successMsg && (
              <div className="flex items-center p-3 bg-green-900/20 text-green-200 rounded-lg text-sm border border-green-900/30">
                <CheckCircle className="w-4 h-4 mr-2" /> {successMsg}
              </div>
            )}

            {isRegistering ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                {/* University Details */}
                <div className="md:col-span-2 space-y-4 border-b border-gray-800 pb-4">
                  <h3 className="text-gray-400 font-bold text-sm uppercase flex items-center">
                    <Building2 className="w-4 h-4 mr-2" /> University Details
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                        University Name
                      </label>
                      <input
                        type="text"
                        required
                        value={uniName}
                        onChange={e => setUniName(e.target.value)}
                        className="block w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white focus:border-indigo-500 outline-none"
                        placeholder="e.g. Stanford University"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                        University Type
                      </label>
                      <select
                        value={uniType}
                        onChange={e => setUniType(e.target.value as UniversityType)}
                        className="block w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white focus:border-indigo-500 outline-none"
                      >
                        {Object.values(UniversityType).map(t => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                        Website URL
                      </label>
                      <div className="relative">
                        <Globe className="absolute left-3 top-3.5 w-4 h-4 text-gray-500" />
                        <input
                          type="url"
                          required
                          value={website}
                          onChange={e => setWebsite(e.target.value)}
                          className="block w-full pl-10 pr-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white focus:border-indigo-500 outline-none"
                          placeholder="https://..."
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                        Official Email
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3.5 w-4 h-4 text-gray-500" />
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          className="block w-full pl-10 pr-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white focus:border-indigo-500 outline-none"
                          placeholder="admin@univ.edu"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="md:col-span-1 space-y-4">
                  <h3 className="text-gray-400 font-bold text-sm uppercase flex items-center">
                    <User className="w-4 h-4 mr-2" /> Contact Information
                  </h3>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                      Contact Person
                    </label>
                    <input
                      type="text"
                      required
                      value={contactPerson}
                      onChange={e => setContactPerson(e.target.value)}
                      className="block w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white focus:border-indigo-500 outline-none"
                      placeholder="Registrar Name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                      Designation
                    </label>
                    <input
                      type="text"
                      required
                      value={designation}
                      onChange={e => setDesignation(e.target.value)}
                      className="block w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white focus:border-indigo-500 outline-none"
                      placeholder="e.g. Principal / Admin"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                      Official Phone
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3.5 w-4 h-4 text-gray-500" />
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        className="block w-full pl-10 pr-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white focus:border-indigo-500 outline-none"
                        placeholder="+91..."
                      />
                    </div>
                  </div>
                </div>

                {/* Accreditation */}
                <div className="md:col-span-1 space-y-4">
                  <h3 className="text-gray-400 font-bold text-sm uppercase flex items-center">
                    <BadgeCheck className="w-4 h-4 mr-2" /> Accreditation
                  </h3>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                      Registration / Accr. ID
                    </label>
                    <input
                      type="text"
                      required
                      value={accreditationId}
                      onChange={e => setAccreditationId(e.target.value)}
                      className="block w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white focus:border-indigo-500 outline-none"
                      placeholder="e.g. NAAC-A-123"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                      Accreditation Certificate
                    </label>
                    <label className="flex items-center justify-center w-full px-4 py-3 bg-gray-900 border border-dashed border-gray-600 rounded-xl text-gray-400 hover:text-white hover:border-gray-400 cursor-pointer transition-all">
                      <Upload className="w-4 h-4 mr-2" />
                      <span className="text-sm">
                        {accreditationFile ? 'File Selected' : 'Upload PDF/Image'}
                      </span>
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,image/*"
                        onChange={handleFileUpload}
                      />
                    </label>
                    {accreditationFile && (
                      <p className="text-xs text-green-500 mt-1 truncate">
                        {accreditationFile}
                      </p>
                    )}
                  </div>
                </div>

                {/* Credentials */}
                <div className="md:col-span-2 border-t border-gray-800 pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                      Create Admin Username
                    </label>
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      className="block w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white focus:border-indigo-500 outline-none"
                      placeholder="admin_user"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                      Create Password
                    </label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="block w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white focus:border-indigo-500 outline-none"
                      placeholder="••••••"
                    />
                  </div>
                </div>
              </div>
            ) : (
              // SIMPLE LOGIN FORM
              <>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                    Email / Username
                  </label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    className="block w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white focus:border-indigo-500 outline-none"
                    placeholder="your@email.com"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="block w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white focus:border-indigo-500 outline-none"
                    placeholder="••••••"
                  />
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 rounded-full font-bold text-white transition-all shadow-lg bg-indigo-700 hover:bg-indigo-600"
            >
              {isLoading
                ? 'Connecting to Peers...'
                : isRegistering
                ? 'Submit Registration'
                : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center pt-4 border-t border-gray-800">
            <button
              onClick={() => setIsRegistering(!isRegistering)}
              className="text-sm font-medium text-gray-400 hover:text-white transition-colors"
            >
              {isRegistering
                ? 'Already have an account? Login'
                : 'Register New University'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
