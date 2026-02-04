interface ProgressBarProps {
  value: number;
  maxValue: number;
  color?: string;
  height?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
  className?: string;
}

const heightMap = {
  sm: 4,
  md: 8,
  lg: 12,
} as const;

/**
 * ProgressBar - Horizontal progress bar for stats comparisons
 *
 * Displays a filled bar representing the ratio of value to maxValue.
 * Useful for visualizing player stats relative to league leaders.
 */
export function ProgressBar({
  value,
  maxValue,
  color,
  height = 'md',
  showValue = false,
  className = '',
}: ProgressBarProps) {
  // Prevent division by zero and negative values
  const safeMaxValue = Math.max(maxValue, 1);
  const safeValue = Math.max(0, Math.min(value, safeMaxValue));
  const percentage = (safeValue / safeMaxValue) * 100;
  const pixelHeight = heightMap[height];

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div
        className="flex-1 rounded-full overflow-hidden"
        style={{
          height: pixelHeight,
          backgroundColor: 'var(--color-surface-hover)',
        }}
        role="progressbar"
        aria-valuenow={safeValue}
        aria-valuemin={0}
        aria-valuemax={safeMaxValue}
      >
        <div
          className="h-full rounded-full transition-all duration-300 ease-out"
          style={{
            width: `${percentage}%`,
            backgroundColor: color || 'var(--league-primary)',
          }}
        />
      </div>
      {showValue && (
        <span className="text-sm font-medium text-[var(--color-text-secondary)] min-w-[2rem] text-right">
          {safeValue}
        </span>
      )}
    </div>
  );
}

export default ProgressBar;
