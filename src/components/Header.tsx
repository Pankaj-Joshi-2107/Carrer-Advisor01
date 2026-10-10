import React, { useState, useRef, useEffect } from 'react';

const Header = () => {
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (detailsRef.current && !detailsRef.current.contains(event.target as Node)) {
        setIsAboutOpen(false);
      }
    };

    if (isAboutOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isAboutOpen]);

  return (
    <header className="bg-white/85 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4 md:px-6 py-4 xl:max-w-7xl">
        <nav className="flex items-center justify-between">
        <div className="flex items-center space-x-3 group">
            <div className="relative">
              <svg
                className="w-10 h-10 text-blue-600 relative"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 21v-6m0 6l4-4m-4 4l-4-4" />
                <path d="M12 3v6m0-6l4 4m-4-4l-4 4" />
                <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
                <path d="M19 12a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold text-slate-800 md:leading-tight leading-[18px]">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Career</span> Advisor
              </span>
              <span className="text-xs text-slate-500">Your Path to Success</span>
            </div>
          </div>
          <div className="flex items-center">
            <details
              ref={detailsRef}
              open={isAboutOpen}
              onToggle={(e) => {
                if (detailsRef.current) {
                  setIsAboutOpen(detailsRef.current.open);
                }
              }}
              className="relative group"
            >
              <summary
                className="list-none cursor-pointer text-slate-600 hover:text-slate-900 transition-all flex items-center hover:scale-110 duration-300 p-3 relative"
                onClick={(e) => {
                  e.preventDefault();
                  setIsAboutOpen(!isAboutOpen);
                }}
              >
                <span className="absolute -inset-2 -z-10 rounded-full bg-slate-100 scale-0 group-hover:scale-80 transition-transform duration-300"></span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="relative"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </summary>
              {isAboutOpen && (
                <div className="absolute right-0 mt-3 w-72 bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl shadow-lg p-5 z-10 animate-fadeIn">
                  <div className="absolute -top-2 right-4 w-4 h-4 bg-white/95 border-t border-l border-slate-200 transform rotate-45"></div>
                  <h3 className="text-lg font-semibold text-slate-800 mb-2">
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">About</span> Career Advisor
                  </h3>
                  <p className="text-sm text-slate-600">
                    Career Advisor provides AI-driven career roadmaps. Enter a job title to get a personalized, step-by-step guide for your chosen profession, including essential skills, relevant technologies, and potential career milestones based on industry trends.
                  </p>
                </div>
              )}
            </details>
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Header; 