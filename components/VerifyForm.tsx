import React, { useState } from 'react';
import jsQR from 'jsqr';
import {
  Loader2,
  ShieldCheck,
  XCircle,
  Calendar,
  FileCheck,
  Eye,
  QrCode,
  Camera,
  ArrowDown
} from 'lucide-react';

// 🔹 Backend base URL
const API_BASE = 'http://localhost:4000/api';

const VerifyForm: React.FC = () => {
  const [certId, setCertId] = useState('');
  const [dob, setDob] = useState(''); // Date of Birth for manual verification
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  // Robust Date Normalizer (Timezone Safe)
  const normalizeDate = (dateStr: string): string => {
    if (!dateStr) return '';
    const cleanStr = dateStr.trim();

    // 1. Strict YYYY-MM-DD detection
    const isoMatch = cleanStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
    }

    // 2. DD-MM-YYYY or DD/MM/YYYY
    const dmyMatch = cleanStr.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
    if (dmyMatch) {
      const day = dmyMatch[1].padStart(2, '0');
      const month = dmyMatch[2].padStart(2, '0');
      const year = dmyMatch[3];
      return `${year}-${month}-${day}`;
    }

    // 3. Fallback: word dates
    try {
      const d = new Date(cleanStr);
      if (!isNaN(d.getTime())) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    } catch (e) {
      // ignore
    }

    return cleanStr;
  };

  // 🔹 Talk to backend /certificates/verify (MongoDB)
  const verifyLogic = async (idToVerify: string, dobToVerify: string) => {
    const trimmedId = idToVerify.trim();
    const normalizedInputDob = normalizeDate(dobToVerify);

    setIsProcessing(true);
    setResult(null);

    try {
      const res = await fetch(`${API_BASE}/certificates/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          certId: trimmedId,
          assetId: trimmedId, // backend accepts either
          dob: normalizedInputDob
        })
      });

      const data = await res.json();
      console.log('🔎 Verify response:', data);

      if (!res.ok) {
        // 404 or other error
        setResult({
          isValid: false,
          message: data.message || 'Verification failed',
          description:
            data.reason ||
            `Unable to verify this certificate (ID: ${trimmedId}).`
        });
        return;
      }

      if (data.valid && data.certificate) {
        const cert = data.certificate;

        // Build a record object compatible with your UI
        setResult({
          isValid: true,
          record: {
            studentName: cert.studentName || 'Candidate',
            dateOfBirth: normalizedInputDob || 'N/A',
            university: (cert.university as string) || 'University',
            course: cert.course || 'Course',
            certificateImage: cert.certificateImage || null
          }
        });
      } else {
        setResult({
          isValid: false,
          message: 'Certificate Not Found',
          description:
            data.reason ||
            `No certificate exists with the Asset ID: ${trimmedId}`
        });
      }
    } catch (err) {
      console.error('Verify error:', err);
      setResult({
        isValid: false,
        message: 'System Error',
        description: 'Network offline or backend unreachable.'
      });
    } finally {
      setIsProcessing(false);
      setScanMessage(null);
    }
  };

  const handleManualVerify = (e: React.FormEvent) => {
    e.preventDefault();
    verifyLogic(certId, dob);
  };

  // 🔹 QR Scan → decode locally with jsQR → auto-verify
  const handleQrScan = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    setScanError(null);
    setScanMessage('Decoding QR Code...');
    setResult(null);

    const reader = new FileReader();

    reader.onload = () => {
      const img = new Image();

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            throw new Error('Canvas not supported');
          }

          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

          // 🔍 Decode the QR from the image data
          const code = jsQR(imageData.data, imageData.width, imageData.height);

          if (!code || !code.data) {
            setScanMessage(null);
            setScanError(
              'Could not decode QR. Please upload a clear QR image or use manual verification below.'
            );
            return;
          }

          console.log('✅ Decoded QR payload:', code.data);

          let payload: any;
          try {
            // Our IssueForm encodes JSON like:
            // { id, dob, name, course, uni, usn, issued }
            payload = JSON.parse(code.data);
          } catch {
            setScanMessage(null);
            setScanError(
              'QR decoded, but data format is invalid. Please use manual verification.'
            );
            return;
          }

          const extractedId: string =
            payload.id || payload.certId || payload.assetId || '';
          const extractedDob: string =
            payload.dob || payload.dateOfBirth || payload.DOB || '';

          if (!extractedId && !extractedDob) {
            setScanMessage(null);
            setScanError(
              'QR decoded, but no Certificate ID / DOB found. Please use manual verification.'
            );
            return;
          }

          // Fill ID into the text box so user can see it
          if (extractedId) {
            setCertId(extractedId);
          }

          if (extractedId && extractedDob) {
            // Full data → auto-verify
            setScanMessage(
              `QR Detected! Found ID: ${extractedId}, DOB: ${extractedDob}. Verifying...`
            );
            verifyLogic(extractedId, extractedDob);
          } else if (extractedId) {
            // Only ID → ask for DOB manually
            setScanMessage(null);
            setScanError(
              'ID detected from QR. Please enter Date of Birth below to complete verification.'
            );
          } else {
            setScanMessage(null);
            setScanError(
              'QR decoded but missing ID. Please use manual verification below.'
            );
          }
        } catch (err) {
          console.error('QR Decode Failed:', err);
          setScanMessage(null);
          setScanError(
            'Scan failed while decoding QR. Please try again or use manual verification.'
          );
        } finally {
          setIsAnalyzing(false);
        }
      };

      img.onerror = () => {
        setIsAnalyzing(false);
        setScanMessage(null);
        setScanError(
          'Could not load image. Please upload a valid PNG/JPEG QR image.'
        );
      };

      img.src = reader.result as string;
    };

    reader.onerror = () => {
      setIsAnalyzing(false);
      setScanMessage(null);
      setScanError('Failed to read file. Please try again.');
    };

    reader.readAsDataURL(file);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-[#100A38]">
          Scan & Verify Certificate
        </h2>
        <p className="mt-2 text-gray-600">
          Scan QR Code directly or enter Asset ID & DOB manually.
        </p>
      </div>

      <div className="bg-[#100A38] p-8 rounded-3xl shadow-xl border border-gray-800">
        {/* QR Scan Section */}
        <div className="mb-8 p-8 bg-gray-900 rounded-2xl border border-gray-700 flex flex-col items-center text-center shadow-inner">
          <div className="bg-indigo-600/20 p-4 rounded-full mb-4">
            <QrCode className="w-10 h-10 text-indigo-400" />
          </div>
          <h3 className="text-white font-bold text-lg mb-1">Scan QR Code</h3>
          <p className="text-gray-400 text-sm mb-6">
            Instantly verify by uploading the certificate QR code image.
          </p>

          {scanError && (
            <div className="mb-4 text-amber-300 text-sm bg-amber-900/30 px-4 py-3 rounded-lg border border-amber-800 flex items-center shadow-sm">
              {scanError.includes('ID detected') ||
              scanError.includes('ID Detected') ? (
                <ArrowDown className="w-4 h-4 mr-2 animate-bounce" />
              ) : (
                <XCircle className="w-4 h-4 mr-2" />
              )}
              {scanError}
            </div>
          )}

          {scanMessage && !result && (
            <div className="mb-4 text-indigo-300 text-sm bg-indigo-900/30 px-3 py-2 rounded-lg border border-indigo-500/30 flex items-center animate-pulse">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {scanMessage}
            </div>
          )}

          <label className="flex items-center px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full cursor-pointer transition-all hover:scale-105 font-bold shadow-lg shadow-indigo-900/50">
            <Camera className="w-5 h-5 mr-2" />
            {isAnalyzing ? 'Decoding QR...' : 'Upload QR Code Image'}
            <input
              type="file"
              className="sr-only"
              onChange={handleQrScan}
              accept="image/*"
              disabled={isAnalyzing}
            />
          </label>
        </div>

        <div className="flex items-center my-8">
          <div className="flex-grow h-px bg-gray-700"></div>
          <span className="px-4 text-gray-500 text-xs font-bold uppercase tracking-widest">
            Manual Authorization
          </span>
          <div className="flex-grow h-px bg-gray-700"></div>
        </div>

        <form onSubmit={handleManualVerify} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1 ml-1">
              Certificate Asset ID
            </label>
            <div className="relative">
              <FileCheck className="absolute left-4 top-4 text-gray-500 w-5 h-5" />
              <input
                type="text"
                value={certId}
                onChange={e => setCertId(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-mono"
                placeholder="e.g. Cert-12345"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1 ml-1">
              Candidate Date of Birth
            </label>
            <div className="relative">
              <Calendar className="absolute left-4 top-4 text-gray-500 w-5 h-5" />
              <input
                type="date"
                value={dob}
                onChange={e => setDob(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                required
                max={new Date().toISOString().split('T')[0]}
                style={{ colorScheme: 'dark' }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2 ml-1">
              Strict requirement: DOB must match stored record.
            </p>
          </div>

          <button
            type="submit"
            disabled={isProcessing}
            className="w-full mt-4 py-4 bg-white text-black rounded-full font-bold hover:bg-gray-200 transition-colors shadow-lg hover:scale-[1.01] active:scale-[0.99]"
          >
            {isProcessing ? (
              <Loader2 className="animate-spin inline mr-2" />
            ) : (
              'Authorize & Verify'
            )}
          </button>
        </form>

        {result && (
          <div className="mt-8 animate-fade-in">
            {result.isValid ? (
              <div className="bg-green-900/20 border border-green-900/50 rounded-2xl p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <ShieldCheck className="w-24 h-24 text-green-500" />
                </div>
                <div className="flex items-center mb-4 relative z-10">
                  <div className="bg-green-500/20 p-2 rounded-full mr-3">
                    <ShieldCheck className="w-8 h-8 text-green-500" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-green-400">
                      Certificate Authorized
                    </h3>
                    <p className="text-xs text-green-300/70">
                      Record Found in Trusted Ledger
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm text-gray-300 border-t border-green-900/30 pt-4 relative z-10">
                  <div>
                    <span className="block text-gray-500 text-[10px] uppercase font-bold">
                      Candidate
                    </span>{' '}
                    <span className="text-white">
                      {result.record.studentName}
                    </span>
                  </div>
                  <div>
                    <span className="block text-gray-500 text-[10px] uppercase font-bold">
                      DOB
                    </span>{' '}
                    <span className="text-white">
                      {result.record.dateOfBirth}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="block text-gray-500 text-[10px] uppercase font-bold">
                      University
                    </span>{' '}
                    <span className="text-white">
                      {result.record.university}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="block text-gray-500 text-[10px] uppercase font-bold">
                      Course
                    </span>{' '}
                    <span className="text-white">
                      {result.record.course}
                    </span>
                  </div>
                </div>

                {result.record.certificateImage && (
                  <div className="mt-6 pt-4 border-t border-green-900/30 relative z-10">
                    <div className="flex items-center mb-3">
                      <Eye className="w-4 h-4 text-green-400 mr-2" />
                      <span className="text-xs font-bold text-green-400 uppercase tracking-wide">
                        Immutable Digital Copy
                      </span>
                    </div>
                    <div className="rounded-xl overflow-hidden border border-green-500/30 shadow-lg">
                      <img
                        src={result.record.certificateImage}
                        alt="Stored Certificate"
                        className="w-full h-auto object-contain bg-white"
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-red-900/20 border border-red-900/50 rounded-2xl p-6 text-center">
                <div className="bg-red-900/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <XCircle className="w-8 h-8 text-red-500" />
                </div>
                <h3 className="text-lg font-bold text-red-400">
                  {result.message}
                </h3>
                <p className="text-red-200/80 text-sm mt-2">
                  {result.description}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyForm;
