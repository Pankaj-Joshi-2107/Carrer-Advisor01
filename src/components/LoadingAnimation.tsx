'use client';

import { useEffect, useState } from 'react';

interface LoadingAnimationProps {
  stage: number;
}

export default function LoadingAnimation({ stage }: LoadingAnimationProps) {
  const [loadingMessage, setLoadingMessage] = useState('');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const messages = [
      'Analyzing your job title...',
      'Identifying career paths for your role...',
      'Creating roadmap structure...',
      'Researching industry requirements...',
      'Mapping essential skills and technologies...',
      'Analyzing technology trends in your field...',
      'Prioritizing learning objectives...',
      'Finding optimal career progression...',
      'Organizing your professional development plan...',
      'Finalizing your personalized roadmap...'
    ];
    
    const messageIndex = Math.min(stage - 1, messages.length - 1);
    if (messageIndex >= 0) {
      setLoadingMessage(messages[messageIndex]);
      setProgress(Math.round(((messageIndex + 1) / messages.length) * 100));
    } else {
      setLoadingMessage('');
      setProgress(0);
    }
  }, [stage]);

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-xl border border-blue-100">
      <div className="relative mb-8">
        <div className="w-24 h-24 rounded-full bg-gradient-to-r from-blue-400 to-indigo-600 animate-pulse flex items-center justify-center">
          <svg 
            className="w-14 h-14 text-white animate-spin-slow" 
            viewBox="0 0 24 24" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <path 
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
            <path 
              d="M12 15a3 3 0 100-6 3 3 0 000 6z" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className="absolute -top-2 -left-2 w-28 h-28 border-t-4 border-l-4 border-blue-500 rounded-full animate-spin"></div>
        <div className="absolute -bottom-2 -right-2 w-28 h-28 border-b-4 border-r-4 border-indigo-500 rounded-full animate-spin" style={{ animationDirection: 'reverse' }}></div>
      </div>
      
      <h3 className="text-2xl font-bold text-blue-800 mb-4">Building Your Career Roadmap</h3>
      
      <div className="w-full bg-gray-200 rounded-full h-2.5 mb-6 overflow-hidden">
        <div 
          className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2.5 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      
      <div className="h-16 flex items-center justify-center">
        <p 
          className="text-lg text-gray-700 font-medium animate-fadeIn" 
          key={loadingMessage} 
        >
          {loadingMessage}
        </p>
      </div>
      
      <div className="flex space-x-2 mt-4">
        <div className="w-3 h-3 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0ms' }}></div>
        <div className="w-3 h-3 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '150ms' }}></div>
        <div className="w-3 h-3 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '300ms' }}></div>
        <div className="w-3 h-3 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '450ms' }}></div>
        <div className="w-3 h-3 rounded-full bg-indigo-600 animate-bounce" style={{ animationDelay: '600ms' }}></div>
      </div>
    </div>
  );
} 