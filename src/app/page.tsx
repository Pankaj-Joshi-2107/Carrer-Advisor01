'use client';

import { useState, useEffect, useRef } from 'react';
import { JobTitleSchema } from '../schemas/jobTitleSchema';
import SearchInput from '@/components/SearchInput';
import RoadmapVisualizer from '@/components/RoadmapVisualizer';
import CommunityRoadmaps from '@/components/CommunityRoadmaps';
import CustomRoadmapBuilder from '@/components/CustomRoadmapBuilder';
import LoadingAnimation from '@/components/LoadingAnimation';
import Footer from '@/components/Footer';
import Features from '@/components/Features';
import { fetchRoadmap } from '@/utils/api';
import Header from '@/components/Header';
import { RoadmapData } from '@/types/roadmap';
import { loadRecentRoadmap, PublishedRoadmap, saveRecentRoadmap } from '@/utils/learningStore';
import Script from 'next/script';
import dynamic from 'next/dynamic';

const Lottie = dynamic(() => import('lottie-react'), { ssr: false });

function CareerRiskAlert({ warning }: { warning: string }) {
  return (
    <div
      role="alert"
      className="mb-4 flex items-start gap-3 rounded-lg border border-amber-400 bg-yellow-100 p-4 text-amber-950 shadow-sm"
    >
      <span className="text-xl" aria-hidden="true">⚠️</span>
      <p className="text-sm leading-relaxed">
        <strong>Industry Alert:</strong> This role faces significant automation risks. Here is how to adapt:{' '}
        {warning}
      </p>
    </div>
  );
}

function getCareerRiskWarning(data: RoadmapData): string | null {
  if (data.riskLevel !== 'high') return null;
  return typeof data.warning === 'string' && data.warning.trim()
    ? data.warning.trim()
    : 'Consider building complementary skills that combine your expertise with human judgment, communication, or oversight.';
}

export default function Home() {
  const [roadmapData, setRoadmapData] = useState<RoadmapData | null>(null);
  const [searchedJob, setSearchedJob] = useState<string>('');
  const [currentSkillLevel, setCurrentSkillLevel] = useState<'Beginner' | 'Intermediate' | 'Expert'>('Beginner');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [storageWarning, setStorageWarning] = useState<string | null>(null);
  const [loadingStage, setLoadingStage] = useState<number>(0);
  const [showPopup, setShowPopup] = useState<boolean>(false);
  const [isClosing, setIsClosing] = useState<boolean>(false);
  const [showCustomRoadmapBuilder, setShowCustomRoadmapBuilder] = useState(false);
  const careerRiskWarning = roadmapData ? getCareerRiskWarning(roadmapData) : null;
  
  const [showLoadingPopup, setShowLoadingPopup] = useState<boolean>(false);
  const loadingPopupRef = useRef<HTMLDivElement>(null);
  const [animationData, setAnimationData] = useState<any>(null);

  useEffect(() => {
    const recentRoadmap = loadRecentRoadmap();
    if (recentRoadmap) {
      setRoadmapData(recentRoadmap.data);
      setSearchedJob(recentRoadmap.jobTitle);
    }
  }, []);

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
    if (showLoadingPopup || showPopup || showCustomRoadmapBuilder) {
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
  }, [showCustomRoadmapBuilder, showLoadingPopup, showPopup]);

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
      setStorageWarning(null);
      return;
    }

    const validationResult = JobTitleSchema.safeParse(jobTitle);

    if (!validationResult.success) {
      const errorMessage = validationResult.error.format()._errors.join(', ');
      setError(errorMessage);
      return;
    }

    setError(null);
    setStorageWarning(null);
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
      
      const data = await fetchRoadmap(validationResult.data, currentSkillLevel);
      setRoadmapData(data);
      try {
        saveRecentRoadmap({ jobTitle: validationResult.data, data });
      } catch (storageError) {
        console.error('Could not save the generated roadmap locally:', storageError);
        setStorageWarning('This roadmap was generated, but this browser could not save it for reopening after a refresh.');
      }
      
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

  const handleOpenPublishedRoadmap = (roadmap: PublishedRoadmap) => {
    setRoadmapData(roadmap.data);
    setSearchedJob(roadmap.targetCareer);
    setError(null);
    setIsClosing(false);
    setShowPopup(true);
  };

  return (
    <>
      <Script id="schema-data" type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebApplication",
          "name": "Lumina",
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
                      Illuminate
                    </span>{" "}
                    Your Path.<br />Actionable Steps, Instantly.
                  </h1>
                </div>
                <p className="text-xl text-slate-600 leading-relaxed">
                  Create the roadmap you need to reach your professional goals<br />with our AI-powered career planning tool.
                </p>
                
                <div className="mt-8 w-full">
                  <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-slate-100 p-4 sm:p-6 transform transition-all duration-300 hover:shadow-xl">
                    <div className="mb-3">
                      <div className="mb-1 flex items-center gap-2">
                        <label htmlFor="current-skill-level" className="text-sm font-medium text-slate-700">
                          Current Skill Level
                        </label>
                        <span className="group relative inline-flex">
                          <button
                            type="button"
                            aria-label="About current skill level"
                            aria-describedby="skill-level-tooltip"
                            className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-slate-400 text-[10px] font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            i
                          </button>
                          <span
                            id="skill-level-tooltip"
                            role="tooltip"
                            className="invisible absolute left-6 top-1/2 z-10 w-64 -translate-y-1/2 rounded-md bg-slate-800 px-3 py-2 text-xs font-normal text-white opacity-0 shadow-lg transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100"
                          >
                            This helps us tailor the roadmap to your current knowledge.
                          </span>
                        </span>
                      </div>
                      <select
                        id="current-skill-level"
                        value={currentSkillLevel}
                        onChange={(event) => setCurrentSkillLevel(event.target.value as typeof currentSkillLevel)}
                        disabled={isLoading}
                        className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="Beginner">Beginner</option>
                        <option value="Intermediate">Intermediate</option>
                        <option value="Expert">Expert</option>
                      </select>
                    </div>
                    <SearchInput onSearch={handleSearch} isLoading={isLoading} />
                    <button
                      type="button"
                      onClick={() => setShowCustomRoadmapBuilder(true)}
                      className="mt-4 w-full rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm font-semibold text-indigo-800 transition hover:border-indigo-300 hover:bg-indigo-100"
                    >
                      Create Custom Roadmap
                    </button>
                    
                    {error && (
                      <div className="mt-4">
                        <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded-lg" role="alert" aria-live="assertive">
                          <p className="text-red-700 text-sm">{error}</p>
                        </div>
                      </div>
                    )}
                    {storageWarning && (
                      <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3" role="status">
                        <p className="text-sm text-amber-900">{storageWarning}</p>
                      </div>
                    )}
                  </div>
                </div>
                
                {roadmapData && !isLoading && (
                  <div className="mt-8 pt-6 border-t border-gray-200">
                    <div className="text-left">
                      {careerRiskWarning && <CareerRiskAlert warning={careerRiskWarning} />}
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
          <div className="container mx-auto max-w-7xl px-4 md:px-6">
            <CommunityRoadmaps onOpenRoadmap={handleOpenPublishedRoadmap} />
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

        {showCustomRoadmapBuilder && (
          <CustomRoadmapBuilder onClose={() => setShowCustomRoadmapBuilder(false)} />
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
                {roadmapData && (
                  <div className="h-full overflow-y-auto">
                    {careerRiskWarning && (
                      <div className="px-4 pt-4">
                        <CareerRiskAlert warning={careerRiskWarning} />
                      </div>
                    )}
                    <RoadmapVisualizer data={roadmapData} careerTitle={searchedJob} />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <Footer />
      </div>
    </>
  );
}
