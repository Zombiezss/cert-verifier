

export interface CertificateData {
  id: string; // Asset ID
  docType: string; // 'certificate'
  registrationNumber: string; // Replaced studentId
  studentName: string;
  dateOfBirth: string; // New field for verification
  course: string;
  university: string;
  issueDate: string;
  description?: string;
  certificateImage?: string;
  studentEmail?: string; // New field for sending QR code
  universityEmail?: string; // New field for University sender context
  dataHash?: string; // SHA-256 Hash of the certificate data
}

export interface Transaction {
  txId: string;
  timestamp: string;
  type: 'INVOKE' | 'QUERY';
  function: string;
  args: any[];
  caller: string;
}

export interface VerificationResult {
  isValid: boolean;
  message: string;
  record?: CertificateData;
}

export interface Block {
  index: number;
  timestamp: string;
  data: {
    id: string;
    studentName: string;
    course: string;
    university: string;
    issueDate: string;
    certificateImage?: string; // Added field for ledger display
    studentEmail?: string;
    universityEmail?: string;
    dataHash?: string;
  };
  previousHash: string;
  hash: string;
  nonce: number;
}

export enum AppView {
  HOME = 'HOME',
  ISSUE = 'ISSUE',
  VERIFY = 'VERIFY',
  LEDGER = 'LEDGER',
  LOGIN = 'LOGIN',
  FEEDBACK = 'FEEDBACK',
  STUDENT_WALLET = 'STUDENT_WALLET'
}

export enum UserRole {
  UNIVERSITY = 'UNIVERSITY',
  STUDENT = 'STUDENT',
  VERIFIER = 'VERIFIER'
}

export enum UniversityType {
  CENTRAL = 'Central University',
  STATE = 'State University',
  DEEMED = 'Deemed University',
  PRIVATE = 'Private University'
}
