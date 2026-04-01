
import React, { useEffect, useState } from 'react';
import { Block } from '../types';
import { blockchainInstance } from '../services/blockchain';
import { Box, ArrowRight, Clock, List, Grid, Search, FileText, Building2, Globe, Lock, ImageIcon, X, Maximize2 } from 'lucide-react';

interface BlockchainViewerProps {
  filterOrg?: string;
}

const BlockchainViewer: React.FC<BlockchainViewerProps> = ({ filterOrg }) => {
  const [blocks, setBlocks] = useState<Block[]>([]);
  // Default to list view for "History" requests
  const [viewMode, setViewMode] = useState<'visual' | 'list'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Initial sync and simple polling
  useEffect(() => {
    // Force sync on mount to ensure we have data from backend
    blockchainInstance.sync();

    const fetchBlocks = () => {
        const fullChain = blockchainInstance.getChain();
        // Strictly filter if filterOrg is provided
        const filtered = filterOrg 
          ? fullChain.filter(b => b.data.university === filterOrg)
          : fullChain;
        setBlocks(filtered);
    };
    
    fetchBlocks();
    const interval = setInterval(fetchBlocks, 1000);
    return () => clearInterval(interval);
  }, [filterOrg]);

  // Filter blocks for table view (exclude Genesis block usually, and apply search)
  const tableBlocks = blocks.filter(b => {
    if (b.index === 0 && !filterOrg) return false; // Hide genesis from main table list
    if (b.data.studentName === "Genesis Block") return false; 

    // Split search term into individual keywords (tokens)
    const terms = searchTerm.toLowerCase().split(/\s+/).filter(t => t.length > 0);
    
    // If no search terms, show all
    if (terms.length === 0) return true;

    // Create a searchable string containing all relevant fields
    const recordData = `
      ${b.data.studentName} 
      ${b.data.id} 
      ${b.data.course} 
      ${b.data.university} 
      ${b.data.issueDate}
    `.toLowerCase();

    // Check if EVERY keyword exists in the record (AND logic)
    // This allows searching "Stanford John" to find "John Doe" at "Stanford University"
    return terms.every(term => recordData.includes(term));
  });

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
         <div>
            <h2 className="text-2xl font-bold text-meta-blue flex items-center">
               {filterOrg ? <Building2 className="w-6 h-6 mr-3 text-meta-blue/70" /> : <Globe className="w-6 h-6 mr-3 text-meta-blue/70" />}
               {filterOrg ? `${filterOrg} Ledger` : 'Global Blockchain Ledger'}
            </h2>
            <p className="text-meta-blue/60 mt-1">
              {filterOrg 
                ? 'Immutable history of certificates issued by your organization.'
                : 'Real-time immutable history of all certificates issued by universities on the network.'}
            </p>
         </div>
         
         <div className="flex items-center space-x-3 bg-white p-1 rounded-lg border border-meta-blue/10 shadow-sm">
            <button
               onClick={() => setViewMode('list')}
               className={`flex items-center px-4 py-2 rounded-md text-sm font-bold transition-all ${
                  viewMode === 'list' ? 'bg-meta-blue text-white shadow-sm' : 'text-meta-blue/60 hover:bg-meta-blue/5'
               }`}
            >
               <List className="w-4 h-4 mr-2" />
               History List
            </button>
            <button
               onClick={() => setViewMode('visual')}
               className={`flex items-center px-4 py-2 rounded-md text-sm font-bold transition-all ${
                  viewMode === 'visual' ? 'bg-meta-blue text-white shadow-sm' : 'text-meta-blue/60 hover:bg-meta-blue/5'
               }`}
            >
               <Grid className="w-4 h-4 mr-2" />
               Chain Visual
            </button>
         </div>
      </div>

      {viewMode === 'list' ? (
         <div className="bg-white rounded-3xl shadow-xl border border-meta-blue/10 overflow-hidden animate-fade-in">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
               <div className="relative max-w-sm w-full">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                     <Search className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                     type="text"
                     className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-xl leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-meta-blue/20 focus:border-meta-blue sm:text-sm transition-all"
                     placeholder="Search by Name, University, ID..."
                     value={searchTerm}
                     onChange={(e) => setSearchTerm(e.target.value)}
                  />
               </div>
               <div className="text-sm text-gray-500 font-medium bg-white px-3 py-1 rounded-lg border border-gray-100 shadow-sm">
                  Total Blocks: <span className="text-meta-blue font-bold">{tableBlocks.length}</span>
               </div>
            </div>
            
            <div className="overflow-x-auto">
               <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                     <tr>
                        <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Index</th>
                        {!filterOrg && <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">University (Issuer)</th>}
                        <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Cert ID</th>
                        <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Student</th>
                        <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Course</th>
                        <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                        <th scope="col" className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Certificate</th>
                     </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                     {tableBlocks.length === 0 ? (
                        <tr>
                           <td colSpan={filterOrg ? 6 : 7} className="px-6 py-16 text-center text-gray-400 italic">
                              <div className="flex flex-col items-center justify-center">
                                 <FileText className="w-12 h-12 text-gray-200 mb-2" />
                                 {searchTerm ? 'No matching records found.' : 'The ledger is currently empty.'}
                              </div>
                           </td>
                        </tr>
                     ) : (
                        tableBlocks.map((block) => (
                           <tr key={block.hash} className="hover:bg-blue-50/30 transition-colors group">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">
                                 #{block.index}
                              </td>
                              {!filterOrg && (
                                <td className="px-6 py-4 whitespace-nowrap">
                                   <div className="flex items-center">
                                      <Building2 className="w-4 h-4 text-indigo-400 mr-2" />
                                      <span className="text-sm font-bold text-indigo-900">{block.data.university}</span>
                                   </div>
                                </td>
                              )}
                              <td className="px-6 py-4 whitespace-nowrap">
                                 <span className="px-2.5 py-1 inline-flex text-xs leading-5 font-bold rounded-md bg-gray-100 text-gray-600 font-mono border border-gray-200">
                                    {block.data.id}
                                 </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-800">
                                 {block.data.studentName}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                 {block.data.course}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                 {block.data.issueDate}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                 {block.data.certificateImage ? (
                                    <button 
                                        onClick={() => setSelectedImage(block.data.certificateImage)}
                                        className="relative group/btn inline-block focus:outline-none"
                                        title="Click to expand"
                                    >
                                        <div className="h-10 w-14 overflow-hidden rounded-md border border-gray-200 shadow-sm transition-all duration-200 group-hover/btn:scale-110 group-hover/btn:shadow-md bg-gray-50">
                                            <img src={block.data.certificateImage} alt="Cert" className="h-full w-full object-cover" />
                                        </div>
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover/btn:bg-black/10 transition-all rounded-md pointer-events-none">
                                            <Maximize2 className="w-3 h-3 text-white opacity-0 group-hover/btn:opacity-100 drop-shadow-sm" />
                                        </div>
                                    </button>
                                 ) : (
                                    <span className="text-xs text-gray-300 italic">N/A</span>
                                 )}
                              </td>
                           </tr>
                        ))
                     )}
                  </tbody>
               </table>
            </div>
         </div>
      ) : (
         /* Visual Block View */
         <div className="overflow-x-auto pb-6">
           <div className="flex space-x-6 min-w-max px-2">
             {blocks.length === 0 ? (
                <div className="w-full flex justify-center py-10 text-meta-blue/40 italic font-medium">
                  No blocks found for {filterOrg || 'network'}.
                </div>
             ) : (
               blocks.map((block, i) => (
                 <div key={block.hash} className="flex items-center">
                   <div className="w-80 bg-white rounded-xl shadow-lg shadow-meta-blue/5 border border-meta-blue/10 overflow-hidden flex flex-col hover:-translate-y-1 transition-all duration-300">
                     <div className="bg-meta-blue px-4 py-3 border-b border-meta-blue/10 flex justify-between items-center text-white">
                         <span className="font-mono text-xs font-bold opacity-70">BLOCK #{block.index}</span>
                         <span className="text-xs opacity-70 flex items-center">
                             <Clock className="w-3 h-3 mr-1" />
                             {new Date(block.timestamp).toLocaleTimeString()}
                         </span>
                     </div>
                     <div className="p-4 space-y-3 flex-1 bg-white">
                         <div>
                             <span className="text-xs text-gray-400 uppercase tracking-wider font-bold">Previous Hash</span>
                             <div className="text-xs font-mono text-gray-500 truncate mt-1 bg-gray-50 p-1 rounded" title={block.previousHash}>
                                 {block.previousHash.substring(0, 20)}...
                             </div>
                         </div>
                         
                         <div className="bg-blue-50/50 rounded-lg p-3 border border-blue-100">
                             <div className="flex items-center mb-2">
                                 <Building2 className="w-3 h-3 text-meta-blue mr-2" />
                                 <span className="text-xs font-bold text-meta-blue">{block.data.university}</span>
                             </div>
                             <div className="text-xs text-gray-600 space-y-1">
                                 <p><span className="text-gray-400 font-semibold">ID:</span> {block.data.id}</p>
                                 <p><span className="text-gray-400 font-semibold">To:</span> {block.data.studentName}</p>
                                 <p><span className="text-gray-400 font-semibold">Course:</span> {block.data.course}</p>
                             </div>
                             {block.data.certificateImage && (
                                <div className="mt-3 pt-2 border-t border-blue-100">
                                    <div className="flex items-center text-[10px] text-gray-400 uppercase font-bold mb-1">
                                        <ImageIcon className="w-3 h-3 mr-1" /> Digital Copy
                                    </div>
                                    <div 
                                        className="cursor-pointer overflow-hidden rounded border border-blue-200 hover:opacity-90 transition-opacity relative group"
                                        onClick={() => setSelectedImage(block.data.certificateImage)}
                                    >
                                        <img src={block.data.certificateImage} alt="Certificate" className="w-full h-20 object-cover" />
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/10 transition-all">
                                             <Maximize2 className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 drop-shadow-md" />
                                        </div>
                                    </div>
                                </div>
                             )}
                         </div>
   
                         <div>
                             <span className="text-xs text-gray-400 uppercase tracking-wider font-bold">Hash</span>
                             <div className="text-xs font-mono text-green-600 truncate mt-1 bg-green-50 p-1 rounded font-medium" title={block.hash}>
                                 {block.hash.substring(0, 20)}...
                             </div>
                         </div>
                     </div>
                     <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
                         <span className="text-xs text-gray-400 font-medium">Nonce: {block.nonce}</span>
                     </div>
                   </div>
                   
                   {i < blocks.length - 1 && (
                     <div className="mx-2 text-meta-blue/20">
                       <ArrowRight className="w-6 h-6" />
                     </div>
                   )}
                 </div>
               ))
             )}
           </div>
         </div>
      )}

      {/* Full Image Modal */}
      {selectedImage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setSelectedImage(null)}>
            <button className="absolute top-6 right-6 p-2 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors z-[110]">
                <X className="w-8 h-8" />
            </button>
            <img 
                src={selectedImage} 
                alt="Full Certificate" 
                className="max-w-full max-h-[90vh] rounded-lg shadow-2xl border border-white/10"
                onClick={(e) => e.stopPropagation()} 
            />
        </div>
      )}
    </div>
  );
};

export default BlockchainViewer;
