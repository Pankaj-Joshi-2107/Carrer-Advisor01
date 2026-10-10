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
      
      <div 
        className="px-4 py-3 rounded-lg transition-all duration-200 group-hover:scale-105 min-w-[200px] max-w-[240px]"
        style={{ 
          backgroundColor: colors.background,
          borderColor: colors.border,
          borderWidth: '2px',
          boxShadow: `0 4px 10px ${colors.shadow}`,
        }}
      >
        <div className="flex items-center mb-2">
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
      </div>

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