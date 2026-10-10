import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

interface GroupItemProps {
  data: {
    name: string;
    description: string;
    type?: 'primary' | 'secondary' | 'tertiary';
    group?: string;
    hasIncoming?: boolean;
    hasOutgoing?: boolean;
    topicStatus?: 'Not started' | 'In progress' | 'Completed';
  };
}

const GroupItem = memo(({ data }: GroupItemProps) => {
  const getNodeColor = () => {
    switch (data.type) {
      case 'primary':
        return {
          background: 'rgb(219 234 254)',
          border: 'rgb(147 197 253)',
          text: 'rgb(29 78 216)',
          description: 'rgb(59 130 246)',
          shadow: 'rgba(29, 78, 216, 0.15)'
        };
      case 'secondary':
        return {
          background: 'rgb(254 240 138)',
          border: 'rgb(253 224 71)',
          text: 'rgb(161 98 7)',
          description: 'rgb(202 138 4)',
          shadow: 'rgba(161, 98, 7, 0.15)'
        };
      case 'tertiary':
        return {
          background: 'rgb(255 237 213)',
          border: 'rgb(254 215 170)',
          text: 'rgb(194 65 12)',
          description: 'rgb(234 88 12)',
          shadow: 'rgba(194, 65, 12, 0.15)'
        };
      default:
        return {
          background: 'rgb(243 244 246)',
          border: 'rgb(229 231 235)',
          text: 'rgb(55 65 81)',
          description: 'rgb(107 114 128)',
          shadow: 'rgba(55, 65, 81, 0.15)'
        };
    }
  };

  const colors = getNodeColor();

  const showLeftHandle = Boolean(data.hasIncoming);
  const showRightHandle = Boolean(data.hasOutgoing);

  return (
    <div className="group relative">
      {showLeftHandle && (
        <Handle 
          type="target" 
          position={Position.Left} 
          style={{
            background: colors.border,
            border: `2px solid ${colors.text}`,
            width: '10px',
            height: '10px'
          }}
        />
      )}
      
      <button
        type="button"
        aria-label={`Open ${data.name} topic details${data.topicStatus === 'Completed' ? ', completed' : ''}`}
        className="relative block cursor-pointer px-4 py-3 rounded-lg text-left transition-all duration-200 group-hover:scale-105 min-w-[200px] max-w-[240px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
        style={{ 
          backgroundColor: colors.background,
          borderColor: colors.border,
          borderWidth: '2px',
          boxShadow: `0 4px 10px ${colors.shadow}`,
        }}
      >
        <div className="mb-2 flex items-center pr-6">
          <div 
            className="w-3 h-3 rounded-full mr-2" 
            style={{ backgroundColor: colors.text }}
          />
          <h3 
            className="font-semibold text-sm truncate"
            style={{ color: colors.text }}
          >
            {data.name}
          </h3>
        </div>
        <p 
          className="text-xs leading-relaxed overflow-hidden"
          style={{ 
            color: colors.description,
            maxHeight: '80px'
          }}
        >
          {data.description}
        </p>
        <span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${
          data.topicStatus === 'Completed'
            ? 'bg-emerald-100 text-emerald-800'
            : data.topicStatus === 'In progress'
              ? 'bg-amber-100 text-amber-800'
              : 'bg-white/70 text-slate-600'
        }`}>
          {data.topicStatus ?? 'Not started'}
        </span>
        {data.topicStatus === 'Completed' && (
          <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white" aria-label="Completed">✓</span>
        )}
        {data.topicStatus === 'In progress' && (
          <span className="absolute right-2 top-2 h-3 w-3 rounded-full border-2 border-amber-500 bg-amber-100" aria-label="In progress" />
        )}
      </button>

      {showRightHandle && (
        <Handle 
          type="source" 
          position={Position.Right}
          style={{
            background: colors.border,
            border: `2px solid ${colors.text}`,
            width: '10px',
            height: '10px'
          }}
        />
      )}
    </div>
  );
});

GroupItem.displayName = 'GroupItem';
export default GroupItem; 