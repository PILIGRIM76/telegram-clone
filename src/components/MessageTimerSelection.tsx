import React from 'react';

interface MessageTimerSelectionProps {
  currentValue: number | undefined;
  onSelect: (seconds: number | undefined) => void;
}

const options = [
  { label: 'Off', value: undefined },
  { label: '5 seconds', value: 5 },
  { label: '30 seconds', value: 30 },
  { label: '1 hour', value: 3600 },
  { label: '1 day', value: 86400 },
  { label: '1 week', value: 604800 },
];

const MessageTimerSelection: React.FC<MessageTimerSelectionProps> = ({
  currentValue,
  onSelect,
}) => {
  return (
    <div className="bg-tg-dark-menuBg border border-tg-dark-sidebarBorder rounded-lg shadow-xl overflow-hidden w-48 dark:bg-tg-menuBg dark:border-tg-sidebarBorder">
      <div className="p-2 bg-tg-dark-menuHover text-xs text-tg-dark-textSecondary font-bold border-b border-tg-dark-sidebarBorder dark:bg-tg-menuHover dark:text-tg-textSecondary">
        Disappearing Messages
      </div>
      {options.map(option => (
        <button
          key={String(option.value)}
          onClick={() => onSelect(option.value)}
          className={`w-full text-left px-4 py-2 text-sm transition-colors ${
            currentValue === option.value
              ? 'text-tg-primary dark:text-tg-primary bg-tg-hover dark:bg-tg-dark-hover'
              : 'text-tg-text dark:text-tg-dark-text hover:bg-tg-hover dark:hover:bg-tg-dark-hover'
          }`}
        >
          {option.label}
          {currentValue === option.value && ' ✓'}
        </button>
      ))}
    </div>
  );
};

export default MessageTimerSelection;
