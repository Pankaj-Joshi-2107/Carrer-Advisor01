import React from 'react';

const Features = () => {
  return (
    <div className="mb-20 z-1 relative">
      <div className="text-center relative">
        <h2 className="text-3xl font-bold text-slate-800 mb-4 relative inline-block mb-10">
          Advanced Career Roadmapping
          <div className="absolute h-1 w-24 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full -bottom-2 left-1/2 transform -translate-x-1/2"></div>
        </h2>
        <p className="text-slate-600 max-w-2xl mx-auto mb-12">
          Unlock your professional potential with our cutting-edge tool designed to visualize and plan your ideal career path.
        </p>
      </div>
      
      <div className="grid md:grid-cols-3 gap-8">
        <div className="group bg-white p-8 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 border border-slate-100 transform hover:-translate-y-1 relative overflow-hidden">
          <div className="absolute top-0 right-0 h-32 w-32 bg-blue-50 rounded-bl-full opacity-50 transition-all duration-300 group-hover:scale-125"></div>
          <div className="w-16 h-16 bg-blue-100 rounded-lg text-blue-600 flex items-center justify-center mb-6 relative z-10 group-hover:scale-110 transition-transform duration-300">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-slate-800 mb-3 relative z-10">Comprehensive Roadmaps</h3>
          <p className="text-slate-600 relative z-10 mb-4">Download detailed career progression plans with structured skills hierarchy and clear milestones for your growth journey.</p>
          <div className="w-16 h-1 bg-blue-100 group-hover:w-full transition-all duration-500"></div>
        </div>
        
        <div className="group bg-white p-8 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 border border-slate-100 transform hover:-translate-y-1 relative overflow-hidden">
          <div className="absolute top-0 right-0 h-32 w-32 bg-indigo-50 rounded-bl-full opacity-50 transition-all duration-300 group-hover:scale-125"></div>
          <div className="w-16 h-16 bg-indigo-100 rounded-lg text-indigo-600 flex items-center justify-center mb-6 relative z-10 group-hover:scale-110 transition-transform duration-300">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-slate-800 mb-3 relative z-10">AI-Powered Skills Mapping</h3>
          <p className="text-slate-600 relative z-10 mb-4">Access detailed technical skill recommendations prioritized by importance level with modern industry relevance scores.</p>
          <div className="w-16 h-1 bg-indigo-100 group-hover:w-full transition-all duration-500"></div>
        </div>
        
        <div className="group bg-white p-8 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 border border-slate-100 transform hover:-translate-y-1 relative overflow-hidden">
          <div className="absolute top-0 right-0 h-32 w-32 bg-purple-50 rounded-bl-full opacity-50 transition-all duration-300 group-hover:scale-125"></div>
          <div className="w-16 h-16 bg-purple-100 rounded-lg text-purple-600 flex items-center justify-center mb-6 relative z-10 group-hover:scale-110 transition-transform duration-300">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-slate-800 mb-3 relative z-10">Universal Career Planning</h3>
          <p className="text-slate-600 relative z-10 mb-4">Get tailored roadmaps for any profession, from tech to healthcare, finance to education, and beyond.</p>
          <div className="w-16 h-1 bg-purple-100 group-hover:w-full transition-all duration-500"></div>
        </div>
      </div>
    </div>
  );
};

export default Features; 