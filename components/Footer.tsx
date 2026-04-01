import React from 'react';

const Footer: React.FC = () => {
  const developers = ["Anil K K", "Suhail N A", "Ayan", "Mashuq"];

  return (
    <footer className="mt-auto border-t border-gray-200 bg-white">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center">
          <p className="text-center text-sm text-gray-600 mb-2">
            &copy; {new Date().getFullYear()} Cert-verifier. All rights reserved.
          </p>
          <p className="text-center text-sm text-[#100A38] font-bold">
            Developed by: {developers.join(", ")}
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;