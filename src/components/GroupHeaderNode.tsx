import { memo } from 'react';

interface GroupHeaderNodeProps {
  data: {
    label: string;
  };
}

const GroupHeaderNode = memo(({ data }: GroupHeaderNodeProps) => {
  return (
    <div className="relative">
      <div
        style={{
          background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)',
          color: 'white',
          padding: '14px 28px',
          borderRadius: '10px',
          fontSize: '20px',
          fontWeight: 'bold',
          width: 'auto',
          minWidth: '300px',
          textAlign: 'center',
          boxShadow: '0 6px 12px rgba(29, 78, 216, 0.2)',
          border: '1px solid #1E40AF',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          position: 'relative',
          zIndex: 10,
        }}
      >
        <div className="flex items-center justify-center">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-6 w-6 mr-2" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" 
            />
          </svg>
          {data.label.replaceAll('_', ' ')}
        </div>
      </div>
    </div>
  );
});

GroupHeaderNode.displayName = 'GroupHeaderNode';
export default GroupHeaderNode; 