import React from 'react';
import { ConfidenceLevel } from '../types';

interface Props {
  level: ConfidenceLevel;
  className?: string;
}

export const ConfidenceBadge: React.FC<Props> = ({ level, className = '' }) => {
  const styles: Record<ConfidenceLevel, { bg: string; text: string; dot: string }> = {
    Detected: {
      bg: 'bg-emerald-950/60 border-emerald-800/60',
      text: 'text-emerald-400',
      dot: 'bg-emerald-400',
    },
    Likely: {
      bg: 'bg-amber-950/60 border-amber-800/60',
      text: 'text-amber-400',
      dot: 'bg-amber-400',
    },
    Inferred: {
      bg: 'bg-cyan-950/60 border-cyan-800/60',
      text: 'text-cyan-400',
      dot: 'bg-cyan-400',
    },
    Unknown: {
      bg: 'bg-zinc-900 border-zinc-700/60',
      text: 'text-zinc-400',
      dot: 'bg-zinc-500',
    },
    Unavailable: {
      bg: 'bg-rose-950/40 border-rose-800/50',
      text: 'text-rose-400',
      dot: 'bg-rose-400',
    },
  };

  const current = styles[level] || styles.Unknown;

  return (
    <span
      id={`confidence-badge-${level.toLowerCase()}`}
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-mono tracking-tight border whitespace-nowrap ${current.bg} ${current.text} ${className}`}
      title={`Confidence rating: ${level}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${current.dot}`} />
      <span>{level}</span>
    </span>
  );
};
