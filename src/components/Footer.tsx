export default function Footer() {
  return (
    <footer className="bg-white/85 border-t border-slate-200 shadow-footer relative overflow-hidden">
      <div className="absolute inset-0 z-0">
        <div className="absolute left-0 bottom-0 w-64 h-64 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 rounded-full opacity-40 transform -translate-x-1/2 translate-y-1/2 blur-3xl"></div>
        <div className="absolute right-0 bottom-0 w-64 h-64 bg-gradient-to-r from-indigo-600/20 to-blue-600/20 rounded-full opacity-40 transform translate-x-1/2 translate-y-1/2 blur-3xl"></div>
      </div>
      
      <div className="container mx-auto px-6 py-6 xl:max-w-7xl relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-8">
          <div>
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <div className="relative group">
                <div className="absolute -inset-2 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 rounded-full blur opacity-0 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
                <svg
                  className="w-8 h-8 text-blue-600 relative"
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
              <span className="text-lg font-bold text-slate-800">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Lumina</span>
              </span>
            </div>
            <p className="text-slate-600 text-sm md:max-w-md">
              Create the roadmap you need to reach your professional goals with our AI-powered career planning tool.
            </p>
          </div>
          
        </div>
        
        <div className="pt-6 border-t border-slate-200">
          <p className="text-gray-800 text-sm text-center mb-3">
            Career roadmaps are generated using AI and should be used as general guidance only. Please verify information with industry professionals.
          </p>
        </div>
      </div>
    </footer>
  );
} 