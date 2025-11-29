import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface PlayersCountOption {
  value: number;
  label: string;
  icon: string;
}

interface PlayersCountDropdownProps {
  value: number;
  onChange: (value: number) => void;
  options?: number[];
  label?: string;
}

const playerCounts = [2, 3, 4, 6, 8, 10, 12];

export default function PlayersCountDropdown({
  value,
  onChange,
  options,
  label
}: PlayersCountDropdownProps) {
  const { t } = useTranslation();
  
  const defaultOptions: PlayersCountOption[] = playerCounts.map(count => ({
    value: count,
    label: `${count} ${t('common.players')}`,
    icon: ''
  }));
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const availableOptions = options 
    ? defaultOptions.filter(opt => options.includes(opt.value))
    : defaultOptions;
  const finalOptions = availableOptions;
  const currentOption = finalOptions.find(opt => opt.value === value) || finalOptions[0];
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  const handleChange = (newValue: number) => {
    onChange(newValue);
    setIsOpen(false);
  };
  return (
    <div className="relative" ref={dropdownRef}>
      {label && (
        <label className="block text-slate-300 text-sm mb-2">
          {label}
        </label>
      )}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="group relative overflow-hidden rounded-lg px-4 py-2 bg-gradient-to-r from-slate-700/50 to-slate-600/50 border border-slate-500/30 hover:border-slate-400/50 transition-all duration-300 hover:scale-105 flex items-center gap-2 w-full">
        <div className="absolute inset-0 bg-gradient-to-r from-slate-600/0 to-slate-500/0 group-hover:from-slate-600/20 group-hover:to-slate-500/20 transition-all duration-300"></div>
        <span className="relative text-slate-300 group-hover:text-slate-200 font-medium text-sm flex-1 text-left">
          {currentOption.label}
        </span>        
        <svg 
          className={`relative w-4 h-4 text-slate-400 group-hover:text-slate-300 transition-all duration-300 ${
            isOpen ? 'rotate-180' : ''
          }`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-full bg-slate-800/95 backdrop-blur-md border border-slate-600/50 rounded-xl shadow-2xl z-50 overflow-hidden animate-settings-slide">
          <div className="py-2">
            {finalOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleChange(option.value)}
                className={`w-full px-4 py-3 text-left hover:bg-slate-700/50 transition-all duration-200 flex items-center gap-3 ${
                  value === option.value 
                    ? 'bg-cyan-600/20 text-cyan-300 border-r-2 border-cyan-500' 
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <div className="flex-1">
                  <div className="font-medium">{option.label}</div>
                </div>
                {value === option.value && (
                  <svg className="w-5 h-5 text-cyan-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            ))}
          </div>          
          <div className="h-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500"></div>
        </div>
      )}
    </div>
  );
}

