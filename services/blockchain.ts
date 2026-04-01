

import { CertificateData, Transaction, VerificationResult, Block } from '../types';

// Points to our Fabric Simulator Middleware
const API_URL = 'http://127.0.0.1:3001/api';
const LOCAL_WORLD_STATE = 'fabric_world_state';
const LOCAL_LEDGER = 'fabric_ledger';

export class BlockchainService {
  private isOnline: boolean = false;
  private chain: Block[] = [];

  constructor() {
    this.checkConnection();
    this.initLocalStorage();
  }

  private initLocalStorage() {
    if (!localStorage.getItem(LOCAL_WORLD_STATE)) {
      localStorage.setItem(LOCAL_WORLD_STATE, JSON.stringify([]));
    }
    if (!localStorage.getItem(LOCAL_LEDGER)) {
      localStorage.setItem(LOCAL_LEDGER, JSON.stringify([]));
    }
  }

  private async checkConnection() {
    try {
      // Short timeout to fail fast if offline
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      
      await fetch(`${API_URL}/ledger`, { 
        method: 'GET',
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      this.isOnline = true;
      console.log("Connected to Fabric Backend.");
    } catch (e) {
      console.warn("Fabric backend offline. Switching to Browser Simulation Mode.");
      this.isOnline = false;
    }
  }

  // --- FABRIC INVOKE (WRITE) ---
  public async issueCertificate(data: CertificateData, caller: string): Promise<{txId: string, dataHash?: string}> {
    // 1. Try Backend
    if (this.isOnline) {
      try {
        const response = await fetch(`${API_URL}/invoke`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            functionName: 'IssueCertificate',
            // Updated ARGS to include Date of Birth AND Student Email AND University Email
            // Note: dataHash is generated on backend
            args: [
              data.id,
              data.registrationNumber, 
              data.studentName,
              data.dateOfBirth,
              data.course,
              data.university,
              data.issueDate,
              data.certificateImage,
              data.studentEmail,
              data.universityEmail // 10th Arg
            ],
            caller
          })
        });
        const res = await response.json();
        if (!response.ok) throw new Error(res.error || "Invoke Failed");
        this.sync(); 
        return { txId: res.txId, dataHash: res.dataHash };
      } catch (e) {
        console.error("Backend failed, falling back to local:", e);
        this.isOnline = false; // Switch to offline if call fails
      }
    }

    // 2. Offline Fallback (Local Simulation)
    const worldState: CertificateData[] = JSON.parse(localStorage.getItem(LOCAL_WORLD_STATE) || '[]');
    if (worldState.find(a => a.id === data.id)) {
      throw new Error(`Asset ${data.id} already exists (Local Simulation)`);
    }

    // Simulate Hash
    const simHash = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    // Update World State
    const asset = { ...data, dataHash: simHash, ownerOrg: 'LocalOrg' };
    worldState.push(asset);
    localStorage.setItem(LOCAL_WORLD_STATE, JSON.stringify(worldState));

    // Update Ledger
    const ledger: Transaction[] = JSON.parse(localStorage.getItem(LOCAL_LEDGER) || '[]');
    const txId = Math.random().toString(36).substring(2, 15);
    const tx: Transaction = {
      txId,
      timestamp: new Date().toISOString(),
      type: 'INVOKE',
      function: 'IssueCertificate',
      args: [data.id, data.registrationNumber, data.studentName, data.dateOfBirth, data.course, data.university, data.issueDate, data.certificateImage, data.studentEmail, data.universityEmail, simHash],
      caller
    };
    ledger.push(tx);
    localStorage.setItem(LOCAL_LEDGER, JSON.stringify(ledger));

    this.sync();
    return { txId, dataHash: simHash };
  }

  // --- FABRIC QUERY (READ) ---
  public async queryCertificate(id: string): Promise<VerificationResult> {
    if (this.isOnline) {
      try {
        const response = await fetch(`${API_URL}/query`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            functionName: 'ReadCertificate',
            args: [id]
          })
        });
        const res = await response.json();
        if (res.success) {
          return { isValid: true, message: "Asset found in World State", record: res.result };
        } else {
          return { isValid: false, message: "Asset does not exist in World State" };
        }
      } catch (e) { this.isOnline = false; }
    }

    // Offline Query
    const worldState: CertificateData[] = JSON.parse(localStorage.getItem(LOCAL_WORLD_STATE) || '[]');
    const asset = worldState.find(a => a.id === id);
    if (asset) {
      return { isValid: true, message: "Asset found (Local Simulation)", record: asset };
    }
    return { isValid: false, message: "Asset does not exist (Local Simulation)" };
  }

  public async getStudentWallet(registrationNumber: string): Promise<CertificateData[]> {
    if (this.isOnline) {
      try {
        const response = await fetch(`${API_URL}/query`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            functionName: 'GetStudentCertificates',
            args: [registrationNumber] // USN/RegNum
          })
        });
        const res = await response.json();
        return res.result || [];
      } catch (e) { this.isOnline = false; }
    }

    // Offline Query
    const worldState: CertificateData[] = JSON.parse(localStorage.getItem(LOCAL_WORLD_STATE) || '[]');
    return worldState.filter(a => a.registrationNumber === registrationNumber);
  }

  public async getLedger(): Promise<Transaction[]> {
    if (this.isOnline) {
      try {
        const res = await fetch(`${API_URL}/ledger`);
        return await res.json();
      } catch (e) { this.isOnline = false; }
    }

    // Offline Ledger
    const ledger = JSON.parse(localStorage.getItem(LOCAL_LEDGER) || '[]');
    return ledger.reverse(); // Newest first
  }

  // --- LOCAL CHAIN SIMULATION FOR VISUALIZATION ---
  public async sync(): Promise<void> {
    const transactions = await this.getLedger();
    // Sort chronological (oldest first for block construction)
    const sortedTxs = [...transactions].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const newChain: Block[] = [this.createGenesisBlock()];
    
    sortedTxs.forEach((tx) => {
      // Map IssueCertificate transactions to blocks
      if (tx.function === 'IssueCertificate' && tx.args && tx.args.length >= 6) {
         const prevBlock = newChain[newChain.length - 1];
         // Use txId as hash or fallback
         const hash = tx.txId || Math.random().toString(36).substring(7);
         
         const block: Block = {
            index: newChain.length,
            timestamp: tx.timestamp,
            data: {
               id: tx.args[0],
               studentName: tx.args[2],
               // Args[3] is DOB now
               course: tx.args[4],
               university: tx.args[5],
               issueDate: tx.args[6],
               certificateImage: tx.args[7], // Added image mapping
               studentEmail: tx.args[8], // Added email mapping
               universityEmail: tx.args[9], // Added university email
               dataHash: tx.args[10] // Added Data Hash mapping
            },
            previousHash: prevBlock.hash || '00000',
            hash: hash,
            nonce: Math.floor(Math.random() * 100000)
         };
         newChain.push(block);
      }
    });
    
    this.chain = newChain;
  }

  public getChain(): Block[] {
    return this.chain;
  }

  private createGenesisBlock(): Block {
    return {
      index: 0,
      timestamp: new Date().toISOString(),
      data: {
        id: "GENESIS",
        studentName: "Genesis Block",
        course: "System Initialization",
        university: "System",
        issueDate: "2023-01-01"
      },
      previousHash: "00000000000000000000000000000000",
      hash: "000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f",
      nonce: 0
    };
  }
}

export const blockchainInstance = new BlockchainService();
