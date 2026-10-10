'use client';

import { useState, useEffect } from 'react';
import { z } from 'zod';
import { JobTitleSchema } from '@/schemas/jobTitleSchema';

interface SearchInputProps {
  onSearch: (jobTitle: string) => void;
  isLoading?: boolean;
}

const examples = [
  "Full Stack Developer",
  "Legal Assistant",
  "Growth Marketing Manager",
  "SEO Specialist",
  "DevOps Engineer",
  "Human Resources Director",
  "Playable Ads Developer",
  "ML Engineer",
  "Blockchain Developer",
  "Cloud Solutions Architect",
  "Data Scientist",
  "Cybersecurity Specialist",
  "UI/UX Designer",
];

const searchSchema = z.object({
  jobTitle: JobTitleSchema
});

export default function SearchInput({ onSearch, isLoading }: SearchInputProps) {
  const [inputValue, setInputValue] = useState<string>('');
  const [placeholder, setPlaceholder] = useState<string>('');
  const [exampleIndex, setExampleIndex] = useState<number>(0);
  const [charIndex, setCharIndex] = useState<number>(0);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const typingInterval = setInterval(() => {
      if (isPaused) return;

      const currentExample = examples[exampleIndex];
      
      if (isDeleting) {
        setPlaceholder(currentExample.substring(0, charIndex - 1));
        setCharIndex(charIndex - 1);
        
        if (charIndex <= 1) {
          setIsDeleting(false);
          setExampleIndex((exampleIndex + 1) % examples.length);
        }
      } else {
        setPlaceholder(currentExample.substring(0, charIndex + 1));
        setCharIndex(charIndex + 1);
        
        if (charIndex >= currentExample.length) {
          setIsPaused(true);
          setTimeout(() => {
            setIsDeleting(true);
            setIsPaused(false);
          }, 1000);
        }
      }
    }, 30);
    
    return () => clearInterval(typingInterval);
  }, [charIndex, exampleIndex, isDeleting, isPaused]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = searchSchema.safeParse({ jobTitle: inputValue });
    
    if (result.success) {
      onSearch(result.data.jobTitle);
      setError(null);
    } else {
      setError(result.error.errors[0]?.message || "Please enter a valid job title.");
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.length <= 50) {
      setInputValue(value);
      setError(null);
      onSearch('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          maxLength={50}
          placeholder={placeholder}
          className={`w-full sm:flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            isLoading ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          disabled={isLoading}
        />
        <button
          type="submit"
          className={`w-full sm:w-auto px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-lg hover:from-blue-700 hover:to-indigo-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer ${
            isLoading ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          disabled={isLoading}
        >
          {isLoading ? 'Creating Roadmap...' : 'Plan My Career'}
        </button>
      </div>
      {error && (
        <div className="mt-4">
          <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded-lg" role="alert" aria-live="assertive">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </div>
      )}
    </form>
  );
} 