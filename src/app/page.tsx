'use client';

import { useState, useEffect, useRef } from 'react';
import { JobTitleSchema } from '../schemas/jobTitleSchema';
import SearchInput from '@/components/SearchInput';
import RoadmapVisualizer from '@/components/RoadmapVisualizer';
import LoadingAnimation from '@/components/LoadingAnimation';
import Footer from '@/components/Footer';
import Features from '@/components/Features';
import { fetchRoadmap } from '@/utils/api';
import Header from '@/components/Header';
import { RoadmapData } from '@/types/roadmap';
import Script from 'next/script';
import dynamic from 'next/dynamic';

const Lottie = dynamic(() => import('lottie-react'), { ssr: false });

export default function Home() {
  const [roadmapData, setRoadmapData] = useState<RoadmapData | null>(null);
  const [searchedJob, setSearchedJob] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingStage, setLoadingStage] = useState<number>(0);
  const [showPopup, setShowPopup] = useState<boolean>(false);
  const [isClosing, setIsClosing] = useState<boolean>(false);
  
  const [showLoadingPopup, setShowLoadingPopup] = useState<boolean>(false);
  const loadingPopupRef = useRef<HTMLDivElement>(null);
  const [animationData, setAnimationData] = useState<any>(null);

  const handleClosePopup = () => {
    setIsClosing(true);
    setTimeout(() => {
      setShowPopup(false);
      setIsClosing(false);
    }, 300);
  };

  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showPopup) {
        handleClosePopup();
      }
    };

    window.addEventListener('keydown', handleEscKey);
    return () => {
      window.removeEventListener('keydown', handleEscKey);
    };
  }, [showPopup]);

  useEffect(() => {
    if (showLoadingPopup || showPopup) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    } else {
      document.body.style.overflow = 'unset';
      document.body.style.paddingRight = '0px';
    }

    return () => {
      document.body.style.overflow = 'unset';
      document.body.style.paddingRight = '0px';
    };
  }, [showLoadingPopup, showPopup]);

  useEffect(() => {
    const loadAnimation = async () => {
      try {
        const response = await fetch('/businessman-rocket.json');
        const animationData = await response.json();
        setAnimationData(animationData);
      } catch (error) {
        console.error("Error loading Lottie animation:", error);
        setAnimationData(null);
      }
    };
    
    loadAnimation();
  }, []);

  const handleSearch = async (jobTitle: string) => {
    if (jobTitle === '') {
      setError(null);
      return;
    }

    const validationResult = JobTitleSchema.safeParse(jobTitle);

    if (!validationResult.success) {
      const errorMessage = validationResult.error.format()._errors.join(', ');
      setError(errorMessage);
      return;
    }

    setError(null);
    setRoadmapData(null);
    setShowPopup(false);
    setSearchedJob(validationResult.data);
    
    setShowLoadingPopup(true);
    setIsLoading(true);
    
    try {
      setLoadingStage(1);
      
      const loadingInterval = setInterval(() => {
        setLoadingStage(prevStage => {
          return prevStage < 10 ? prevStage + 1 : prevStage;
        });
      }, 2000);
      
      const data = await fetchRoadmap(validationResult.data);
      setRoadmapData(data);
      
      clearInterval(loadingInterval);
      
      setLoadingStage(10);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setShowLoadingPopup(false);
      setShowPopup(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setRoadmapData(null);
      
      setShowLoadingPopup(false);
    } finally {
      setIsLoading(false);
      setLoadingStage(0);
    }
  };

  return (
    <>
      <Script id="schema-data" type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebApplication",
          "name": "Career Advisor",
          "url": process.env.NEXT_PUBLIC_URL,
          "description": "AI-powered career planning tool that creates personalized roadmaps for professional growth.",
          "applicationCategory": "Career Development Tool",
          "operatingSystem": "Web Browser",
          "creator": {
            "@type": "Person",
            "name": "Özer Özdoğan",
            "url": process.env.NEXT_PUBLIC_URL,
            "logo": `${process.env.NEXT_PUBLIC_URL}/logo.svg`	
          }
        })}
      </Script>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
        <Header />
        <main className="py-0" role="main">
          <div className="container mx-auto px-4 md:px-6 xl:max-w-7xl flex flex-col h-full overflow-x-hidden">
          
            <section className="flex flex-col lg:flex-row items-center justify-center gap-12 min-h-[calc(100vh-80px)] mb-10 pt-20 lg:pt-0">
              <div className="lg:w-1/2 space-y-6 max-w-2xl z-1">
                <div className="relative">
                  <h1 className="text-4xl lg:text-5xl xl:text-6xl font-bold text-slate-800 tracking-tight leading-tight">
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                      Discover
                    </span>{" "}
                    your career,<br />plan your future
                  </h1>
                </div>
                <p className="text-xl text-slate-600 leading-relaxed">
                  Create the roadmap you need to reach your professional goals<br />with our AI-powered career planning tool.
                </p>
                
                <div className="mt-8 w-full">
                  <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-slate-100 p-4 sm:p-6 transform transition-all duration-300 hover:shadow-xl">
                    <SearchInput onSearch={handleSearch} isLoading={isLoading} />
                    
                    {error && (
                      <div className="mt-4">
                        <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded-lg" role="alert" aria-live="assertive">
                          <p className="text-red-700 text-sm">{error}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {roadmapData && !isLoading && (
                  <div className="mt-8 pt-6 border-t border-gray-200">
                    <div className="text-left">
                      <h3 className="text-xl font-semibold text-gray-800 mb-2">
                        Your career roadmap for <span className="text-emerald-600">{searchedJob}</span> is ready!
                      </h3>
                      <p className="text-gray-600 mb-4">
                        View the detailed career plan with recommended skills and milestones
                      </p>
                      <button
                        onClick={() => setShowPopup(true)}
                        className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-5 py-3 rounded-lg
                          hover:from-emerald-600 hover:to-teal-700 cursor-pointer 
                          transition-all duration-300 font-medium flex items-center
                          space-x-3 shadow-md group"
                        aria-label="View Career Plan"
                      >
                        <span>View Career Plan</span>
                        <svg 
                          className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                          aria-hidden="true"
                        >
                          <path 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            strokeWidth={2} 
                            d="M14 5l7 7m0 0l-7 7m7-7H3"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="lg:w-1/2 relative flex justify-center items-center max-w-2xl">
                <div className="absolute inset-0 w-full h-full opacity-90 z-0">
                  <div className="cloud-w-1"><div className="cloud"></div></div>
                  <div className="cloud-w-2"><div className="cloud"></div></div>
                  <div className="cloud-w-3"><div className="cloud"></div></div>
                  <div className="cloud-w-4"><div className="cloud"></div></div>
                  <div className="cloud-w-5"><div className="cloud"></div></div>
                </div>
                <div className="relative z-10 w-full max-w-[600px] z-1 rotate-y-180">
                  {animationData && (
                    <Lottie
                      animationData={animationData}
                      loop={true}
                      className="rocketman w-full h-[350px] md:h-[550px]"
                    />
                  )}
                </div>
              </div>
            </section>
            
            <Features />
          </div>
        </main>

        {showLoadingPopup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm popup-overlay">
            <div 
              ref={loadingPopupRef}
              className="w-full max-w-3xl mx-4 animate-scaleIn"
              onClick={(e) => e.stopPropagation()}
            >
              <LoadingAnimation stage={loadingStage} />
            </div>
          </div>
        )}

        {showPopup && (
          <div 
            className={`fixed inset-0 z-50 ${isClosing ? 'popup-overlay-exit' : 'popup-overlay'}`}
          >
            <div 
              className="absolute inset-0 bg-black/50"
              onClick={handleClosePopup}
            />
            <div 
              className="fixed inset-0 flex items-center justify-center p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div 
                className={`relative w-full h-full bg-white rounded-lg shadow-xl overflow-hidden ${
                  isClosing ? 'popup-content-exit' : 'popup-content'
                }`}
              >
                <button
                  onClick={handleClosePopup}
                  className="absolute top-4 right-4 z-10 bg-white/80 backdrop-blur-sm rounded-full p-2 
                            hover:bg-gray-100 transition-all duration-200 shadow-lg 
                            hover:shadow-xl hover:scale-110 active:scale-95 cursor-pointer"
                  aria-label="Close career roadmap"
                >
                  <svg
                    className="w-6 h-6 text-gray-600 hover:text-gray-900 transition-colors duration-200"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
                {roadmapData && <RoadmapVisualizer data={roadmapData} />}
              </div>
            </div>
          </div>
        )}

        <Footer />
      </div>
    </>
  );
}
