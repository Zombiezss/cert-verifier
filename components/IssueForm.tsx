import React, { useState } from 'react';
import { CertificateData } from '../types';
import {
  CheckCircle,
  Camera,
  ScanLine,
  AlertCircle,
  Info,
  Upload,
  Download,
  Image as ImageIcon,
  Eye,
  EyeOff,
  Calendar
} from 'lucide-react';
import { blockchainInstance } from '../services/blockchain';
import { extractCertificateData } from '../services/gemini';

interface IssueFormProps {
  onSuccess: () => void;
}

// 🔹 Backend API base URL
const API_BASE = 'http://localhost:4000/api';

const IssueForm: React.FC<IssueFormProps> = ({ onSuccess }) => {
  const [formData, setFormData] = useState<CertificateData>({
    id: `Cert-${Math.floor(Math.random() * 1000000)}`,
    docType: 'certificate',
    registrationNumber: '',
    studentName: '',
    dateOfBirth: '',
    course: '',
    university: 'Technical Institute',
    issueDate: new Date().toISOString().split('T')[0],
    certificateImage: undefined,
    studentEmail: '',
    universityEmail: ''
  });
  const [isMining, setIsMining] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [scanFeedback, setScanFeedback] = useState<string>('');
  const [txId, setTxId] = useState<string | null>(null);
  const [dataHash, setDataHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const validateForm = (): boolean => {
    if (!formData.id.trim()) {
      setError('Certificate ID is required.');
      return false;
    }
    if (!formData.registrationNumber.trim()) {
      setError('USN / Registration Number is required.');
      return false;
    }
    if (!formData.studentName.trim()) {
      setError('Student Name is required.');
      return false;
    }
    if (!formData.course.trim()) {
      setError('Course is required.');
      return false;
    }
    if (!formData.university.trim()) {
      setError('University is required.');
      return false;
    }
    if (!formData.dateOfBirth) {
      setError('Date of Birth is required.');
      return false;
    }
    if (!formData.issueDate) {
      setError('Issue Date is required.');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.studentEmail) {
      setError('Student Email ID is required.');
      return false;
    }
    if (!emailRegex.test(formData.studentEmail)) {
      setError('Invalid Student Email ID format.');
      return false;
    }

    if (formData.universityEmail && !emailRegex.test(formData.universityEmail)) {
      setError('Invalid University Email ID format.');
      return false;
    }

    const dob = new Date(formData.dateOfBirth);
    const issue = new Date(formData.issueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (isNaN(dob.getTime())) {
      setError('Invalid Date of Birth.');
      return false;
    }
    if (isNaN(issue.getTime())) {
      setError('Invalid Issue Date.');
      return false;
    }

    if (dob > today) {
      setError('Date of Birth cannot be in the future.');
      return false;
    }
    if (issue > today) {
      setError('Issue Date cannot be in the future.');
      return false;
    }

    if (issue <= dob) {
      setError('Issue Date must be after Date of Birth.');
      return false;
    }

    return true;
  };

  // 🔹 Helper: send certificate to backend → MongoDB (+ email QR from backend)
  const issueToBackend = async () => {
    try {
      const payload = {
        // Map frontend fields to backend fields
        assetId: formData.id, // will become certId in backend
        studentName: formData.studentName,
        course: formData.course,
        grade: 'N/A',
        issueDate: formData.issueDate,
        registrationNumber: formData.registrationNumber,
        dateOfBirth: formData.dateOfBirth,
        university: formData.university,
        studentEmail: formData.studentEmail,
        universityEmail: formData.universityEmail,
        certificateImage: formData.certificateImage || '' // <-- IMPORTANT (stored in DB)
      };

      console.log('📤 Sending certificate to backend:', payload);

      const res = await fetch(`${API_BASE}/certificates/issue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      console.log('📥 Backend issue response:', data);

      if (!res.ok) {
        setError(
          data.message || data.error || 'Issue certificate failed on backend.'
        );
        return null;
      }

      // backend/server.cjs is responsible for generating QR + emailing to studentEmail
      return data.certificate;
    } catch (err: any) {
      console.error('Backend issue error:', err);
      setError('Failed to reach backend API. Check server or network.');
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) {
      return;
    }

    setIsMining(true);

    try {
      // 1️⃣ Save in backend (MongoDB + send QR via email)
      const issuedCert = await issueToBackend();
      if (!issuedCert) {
        // error already set by issueToBackend
        return;
      }

      // 2️⃣ Hyperledger / local blockchain simulation
      const res = await blockchainInstance.issueCertificate(
        formData,
        'Admin@Org1MSP'
      );
      setTxId(res.txId);
      setDataHash(res.dataHash || null);
    } catch (err: any) {
      console.error(err);
      setError('Chaincode Invoke Failed: ' + err.message);
    } finally {
      setIsMining(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError(null);
  };

  const isValidExtractedValue = (val?: string) => {
    return val && val !== 'N/A' && val.trim().length > 0;
  };

  // Robust Date Normalizer to prevent Timezone Shifts
  const normalizeDateForInput = (dateStr?: string) => {
    if (!dateStr || dateStr === 'N/A') return '';

    // 1. If strictly YYYY-MM-DD already, keep it
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }

    // 2. Parse using local time components
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    return '';
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setIsAnalyzing(true);
      setScanSuccess(false);
      setScanFeedback('');
      setError(null);

      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Result = reader.result as string;

        // Save Base64 into formData so backend can store it
        setFormData(prev => ({ ...prev, certificateImage: base64Result }));

        try {
          const mimeType =
            base64Result.split(';')[0].split(':')[1] || 'image/jpeg';
          const base64Data = base64Result.split(',')[1];

          const extractedData = await extractCertificateData(
            base64Data,
            mimeType
          );

          if (extractedData) {
            setFormData(prev => ({
              ...prev,
              id: isValidExtractedValue(extractedData.id)
                ? extractedData.id
                : prev.id,
              registrationNumber: isValidExtractedValue(
                extractedData.registrationNumber
              )
                ? extractedData.registrationNumber
                : prev.registrationNumber,
              studentName: isValidExtractedValue(extractedData.studentName)
                ? extractedData.studentName
                : prev.studentName,
              // Apply Normalizer to DOB and Issue Date
              dateOfBirth: isValidExtractedValue(extractedData.dateOfBirth)
                ? normalizeDateForInput(extractedData.dateOfBirth)
                : prev.dateOfBirth,
              course: isValidExtractedValue(extractedData.course)
                ? extractedData.course
                : prev.course,
              university: isValidExtractedValue(extractedData.university)
                ? extractedData.university
                : prev.university,
              issueDate: isValidExtractedValue(extractedData.issueDate)
                ? normalizeDateForInput(extractedData.issueDate)
                : prev.issueDate,
              universityEmail: isValidExtractedValue(
                extractedData.universityEmail
              )
                ? extractedData.universityEmail
                : prev.universityEmail
            }));

            setShowPreview(true);

            const fieldsToCheck = [
              { key: 'id', label: 'Certificate ID' },
              { key: 'registrationNumber', label: 'USN/Reg No' },
              { key: 'studentName', label: 'Name' },
              { key: 'dateOfBirth', label: 'DOB' },
              { key: 'course', label: 'Course' },
              { key: 'university', label: 'University' },
              { key: 'issueDate', label: 'Date' }
            ];

            const missingFields: string[] = [];
            let foundCount = 0;

            fieldsToCheck.forEach(field => {
              // @ts-ignore
              if (isValidExtractedValue(extractedData[field.key])) {
                foundCount++;
              } else {
                missingFields.push(field.label);
              }
            });

            if (missingFields.length > 0) {
              setScanFeedback(
                `⚠️ Extracted ${foundCount}/7 key fields. Missing: ${missingFields.join(
                  ', '
                )}. Please fill manually.`
              );
            } else {
              setScanFeedback(
                '✅ AI Analysis Complete. All fields extracted successfully.'
              );
            }

            setScanSuccess(true);
          } else {
            setError(
              'AI could not identify certificate details. Please enter manually.'
            );
          }
        } catch (err: any) {
          console.error('AI Analysis Failed:', err);
          setError('Scan failed: Check API Key or Internet Connection.');
        } finally {
          setIsAnalyzing(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDownloadQr = async () => {
    // Priority: ID and DOB must be present for verification
    const qrData = JSON.stringify({
      id: formData.id,
      dob: formData.dateOfBirth, // Required for scan verification
      name: formData.studentName,
      course: formData.course,
      uni: formData.university,
      usn: formData.registrationNumber,
      issued: formData.issueDate
    });
    // Request higher resolution 500x500 for better clarity
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(
      qrData
    )}`;

    try {
      const response = await fetch(qrUrl);
      const blob = await response.blob();
      const imgUrl = URL.createObjectURL(blob);

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.crossOrigin = 'Anonymous';

      img.onload = () => {
        // Set canvas to high resolution
        canvas.width = 600;
        canvas.height = 800;
        if (ctx) {
          // Background
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // Draw QR Image centered
          // 500px QR in 600px width -> 50px margin
          ctx.drawImage(img, 50, 50, 500, 500);

          ctx.fillStyle = '#000000';
          ctx.textAlign = 'center';

          // Certificate ID
          ctx.font = 'bold 24px monospace';
          ctx.fillText(`ID: ${formData.id}`, canvas.width / 2, 600);

          // Issue Date
          ctx.font = '20px sans-serif';
          ctx.fillStyle = '#333333';
          ctx.fillText(
            `Issued: ${formData.issueDate}`,
            canvas.width / 2,
            640
          );

          // Scan Instruction
          ctx.fillStyle = '#666666';
          ctx.font = 'italic 16px sans-serif';
          ctx.fillText('SCAN TO VERIFY', canvas.width / 2, 700);

          // Footer
          ctx.fillStyle = '#100A38';
          ctx.font = 'bold 20px sans-serif';
          ctx.fillText('Cert-verifier Secured', canvas.width / 2, 750);

          const url = canvas.toDataURL('image/png');
          const link = document.createElement('a');
          link.href = url;
          link.download = `QR-${formData.id}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          URL.revokeObjectURL(imgUrl);
        }
      };
      img.src = imgUrl;
    } catch (e) {
      console.error('Failed to download QR', e);
      setError('Failed to download QR code. Please check internet.');
    }
  };

  if (txId) {
    // Reconstruct QR Data exactly matching download logic
    const qrData = JSON.stringify({
      id: formData.id,
      dob: formData.dateOfBirth,
      name: formData.studentName,
      course: formData.course,
      uni: formData.university,
      usn: formData.registrationNumber,
      issued: formData.issueDate
    });
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
      qrData
    )}`;

    return (
      <div className="max-w-lg mx-auto bg-[#100A38] p-8 rounded-3xl shadow-xl border border-gray-800 text-center animate-fade-in">
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-900/30 mb-6">
          <CheckCircle className="h-8 w-8 text-green-500" />
        </div>
        <h3 className="text-2xl font-bold text-white mb-2">Asset Created!</h3>
        <p className="text-gray-400 mb-6">
          Transaction committed. QR code and certificate copy have been sent to{' '}
          <span className="text-white font-bold">{formData.studentEmail}</span>.
        </p>

        <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 mb-6 flex flex-col items-center">
          <div className="bg-white p-3 rounded-xl mb-3 shadow-lg">
            <img src={qrUrl} alt="Certificate QR" className="w-40 h-40" />
          </div>
          <p className="text-gray-400 text-xs font-mono mb-1">{formData.id}</p>
          <p className="text-gray-500 text-[10px] uppercase tracking-wide font-bold mb-3">
            Scan to Verify
          </p>

          <button
            onClick={handleDownloadQr}
            className="flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-colors shadow-lg"
          >
            <Download className="w-4 h-4 mr-2" /> Download QR Code
          </button>
        </div>

        <div className="bg-gray-900 p-4 rounded-md text-left mb-2 break-all border border-gray-800">
          <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Certificate ID
          </span>
          <span className="font-mono text-sm text-indigo-400">
            {formData.id}
          </span>
        </div>

        {dataHash && (
          <div className="bg-gray-900 p-4 rounded-md text-left mb-6 break-all border border-gray-800">
            <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Certificate Hash (SHA-256)
            </span>
            <span className="font-mono text-[10px] text-green-400">
              {dataHash}
            </span>
          </div>
        )}

        <button
          onClick={onSuccess}
          className="w-full py-3 bg-[#100A38] text-white rounded-full font-bold hover:bg-indigo-900 transition-colors border border-indigo-900/50"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-[#100A38] p-8 rounded-3xl shadow-xl border border-gray-800">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white">
            Issue Certificate Asset
          </h2>
          <p className="mt-1 text-sm text-gray-400">
            Invoke &apos;IssueCertificate&apos; chaincode.
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-900/20 text-red-200 p-4 rounded-xl text-sm flex items-center border border-red-900/30">
            <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div
            className={`mb-6 p-6 rounded-2xl border flex flex-col items-center justify-center text-center transition-all ${
              scanSuccess
                ? 'bg-green-900/10 border-green-900/30'
                : 'bg-gray-900 border-gray-800'
            }`}
          >
            <div
              className={`p-3 rounded-full mb-3 ${
                scanSuccess ? 'bg-green-500/20' : 'bg-indigo-900/30'
              }`}
            >
              {scanSuccess ? (
                <CheckCircle className="w-8 h-8 text-green-500" />
              ) : (
                <ScanLine className="w-8 h-8 text-indigo-400" />
              )}
            </div>
            <p className="text-gray-300 font-medium mb-1">
              {scanSuccess ? 'Scan Analysis Complete' : 'Scan or Upload Certificate'}
            </p>
            <p
              className={`text-xs mb-6 max-w-sm ${
                scanSuccess
                  ? scanFeedback.includes('Missing')
                    ? 'text-amber-400 font-bold'
                    : 'text-green-400 font-bold'
                  : 'text-gray-500'
              }`}
            >
              {scanSuccess
                ? scanFeedback
                : 'Auto-fills details using AI. Use camera for fresh scans or gallery for existing files.'}
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-4 w-full max-w-md">
              <label
                className={`flex items-center justify-center px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full cursor-pointer transition-colors font-bold text-sm shadow-lg shadow-indigo-900/50 flex-1 ${
                  isAnalyzing ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <Camera className="w-4 h-4 mr-2" />
                <span>Camera</span>
                <input
                  type="file"
                  className="sr-only"
                  onChange={handleImageChange}
                  accept="image/*"
                  capture="environment"
                  disabled={isAnalyzing}
                />
              </label>

              <label
                className={`flex items-center justify-center px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-full cursor-pointer transition-colors font-bold text-sm shadow-lg border border-gray-600 flex-1 ${
                  isAnalyzing ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <ImageIcon className="w-4 h-4 mr-2" />
                <span>Gallery</span>
                <input
                  type="file"
                  className="sr-only"
                  onChange={handleImageChange}
                  accept="image/*"
                  disabled={isAnalyzing}
                />
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300">
                Certificate ID
              </label>
              <input
                type="text"
                name="id"
                required
                value={formData.id}
                onChange={handleChange}
                className="mt-1 w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white outline-none focus:border-indigo-500 transition-colors"
                placeholder="e.g. Cert-12345"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300">
                Issue Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-4 top-3.5 text-gray-500 w-5 h-5" />
                <input
                  type="date"
                  name="issueDate"
                  required
                  value={formData.issueDate}
                  onChange={handleChange}
                  className="pl-12 pr-4 py-3 w-full bg-gray-900 border border-gray-700 rounded-xl text-white outline-none focus:border-indigo-500 transition-colors"
                  style={{ colorScheme: 'dark' }}
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300">
              USN / Registration Number
            </label>
            <input
              type="text"
              name="registrationNumber"
              required
              value={formData.registrationNumber}
              onChange={handleChange}
              className="mt-1 w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white outline-none focus:border-indigo-500 transition-colors"
              placeholder="e.g. USN123456"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300">
                Student Name
              </label>
              <input
                type="text"
                name="studentName"
                required
                value={formData.studentName}
                onChange={handleChange}
                className="mt-1 w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300">
                Date of Birth
              </label>
              <div className="relative">
                <Calendar className="absolute left-4 top-3.5 text-gray-500 w-5 h-5" />
                <input
                  type="date"
                  name="dateOfBirth"
                  required
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                  className="pl-12 pr-4 py-3 w-full bg-gray-900 border border-gray-700 rounded-xl text-white outline-none focus:border-indigo-500 transition-colors"
                  max={new Date().toISOString().split('T')[0]}
                  style={{ colorScheme: 'dark' }}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300">
                Student Email ID
              </label>
              <input
                type="email"
                name="studentEmail"
                required
                value={formData.studentEmail}
                onChange={handleChange}
                className="mt-1 w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white outline-none focus:border-indigo-500 transition-colors"
                placeholder="student@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300">
                University Official Email
              </label>
              <input
                type="email"
                name="universityEmail"
                value={formData.universityEmail}
                onChange={handleChange}
                className="mt-1 w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white outline-none focus:border-indigo-500 transition-colors"
                placeholder="admin@university.edu"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300">
              Course
            </label>
            <input
              type="text"
              name="course"
              required
              value={formData.course}
              onChange={handleChange}
              className="mt-1 w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div className="pt-2">
            <label className="block text-sm font-medium text-gray-300">
              University / Institution
            </label>
            <input
              type="text"
              name="university"
              required
              value={formData.university}
              onChange={handleChange}
              className="mt-1 w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div className="pt-4 border-t border-gray-800">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">
                Certificate Preview
              </h3>
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className="text-indigo-400 hover:text-white text-xs flex items-center transition-colors focus:outline-none"
              >
                {showPreview ? (
                  <>
                    <EyeOff className="w-4 h-4 mr-1" />
                    Hide Preview
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4 mr-1" />
                    Show Preview
                  </>
                )}
              </button>
            </div>

            {showPreview && (
              <div className="mb-6 animate-fade-in flex justify-center">
                <div className="relative w-full max-w-md bg-[#FDFBF7] text-[#100A38] p-6 rounded-lg shadow-2xl border-4 border-double border-[#100A38] aspect-[1.4/1] flex flex-col items-center text-center overflow-hidden select-none">
                  <div className="absolute top-2 left-2 w-8 h-8 border-t-2 border-l-2 border-[#100A38]" />
                  <div className="absolute top-2 right-2 w-8 h-8 border-t-2 border-r-2 border-[#100A38]" />
                  <div className="absolute bottom-2 left-2 w-8 h-8 border-b-2 border-l-2 border-[#100A38]" />
                  <div className="absolute bottom-2 right-2 w-8 h-8 border-b-2 border-r-2 border-[#100A38]" />

                  <div className="flex-1 flex flex-col justify-between py-2 w-full z-10">
                    <div>
                      <h2 className="text-sm font-serif font-bold tracking-[0.2em] uppercase border-b-2 border-[#C5A059] inline-block pb-1 mb-1">
                        {formData.university || 'UNIVERSITY NAME'}
                      </h2>
                    </div>

                    <div className="my-auto">
                      <p className="font-serif italic text-gray-500 text-[10px] mb-1">
                        This is to certify that
                      </p>
                      <h1 className="text-xl font-serif font-bold text-[#100A38] capitalize mb-1">
                        {formData.studentName || 'Student Name'}
                      </h1>
                      <p className="font-serif italic text-gray-500 text-[10px] mb-1">
                        has successfully completed
                      </p>
                      <h3 className="text-sm font-bold text-[#100A38] uppercase tracking-wide">
                        {formData.course || 'COURSE NAME'}
                      </h3>
                    </div>

                    <div className="flex justify-between items-end px-2 mt-2 w-full">
                      <div className="text-center">
                        <div className="border-t border-gray-400 w-24 pt-1 text-[10px] font-mono">
                          {formData.dateOfBirth || 'YYYY-MM-DD'}
                        </div>
                        <div className="text-[8px] uppercase text-gray-400">
                          Date of Birth
                        </div>
                      </div>

                      <div className="w-12 h-12 rounded-full border-2 border-[#C5A059] flex items-center justify-center opacity-50 rotate-[-10deg]">
                        <span className="text-[6px] font-bold text-[#C5A059] text-center leading-tight">
                          OFFICIAL
                          <br />
                          SEAL
                        </span>
                      </div>

                      <div className="text-center">
                        <div className="border-t border-gray-400 w-20 pt-1 text-[10px] font-serif italic text-gray-600">
                          Signature
                        </div>
                        <div className="text-[8px] uppercase text-gray-400">
                          Authority
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
                    <div className="w-40 h-40 rounded-full border-8 border-black" />
                  </div>
                  <div className="absolute bottom-1 w-full text-center">
                    <p className="text-[8px] font-mono text-gray-300">
                      ID: {formData.id}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isMining}
            className="w-full py-4 rounded-full font-bold text-white bg-indigo-700 hover:bg-indigo-600 shadow-lg transition-all hover:scale-[1.02]"
          >
            {isMining ? 'Invoking Chaincode...' : 'Submit Transaction'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default IssueForm;
