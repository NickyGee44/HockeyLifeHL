import * as React from 'react';
import { cn } from '../utils';

export interface ColorPickerProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  error?: boolean;
  onColorChange?: (color: string) => void;
}

const ColorPicker = React.forwardRef<HTMLInputElement, ColorPickerProps>(
  ({ className, error, onColorChange, onChange, value, ...props }, ref) => {
    const [localValue, setLocalValue] = React.useState(
      (value as string) || '#1E40AF'
    );

    React.useEffect(() => {
      if (value) {
        setLocalValue(value as string);
      }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newColor = e.target.value;
      setLocalValue(newColor);
      onChange?.(e);
      onColorChange?.(newColor);
    };

    return (
      <div className={cn('flex items-center gap-3', className)}>
        <div
          className={cn(
            'relative h-10 w-20 rounded-md border border-input overflow-hidden cursor-pointer',
            error && 'border-destructive'
          )}
        >
          <input
            ref={ref}
            type="color"
            value={localValue}
            onChange={handleChange}
            className="absolute inset-0 w-full h-full cursor-pointer"
            style={{
              WebkitAppearance: 'none',
              MozAppearance: 'none',
              appearance: 'none',
              background: 'transparent',
              border: 'none',
              padding: 0,
            }}
            {...props}
          />
        </div>
        <input
          type="text"
          value={localValue}
          onChange={(e) => {
            const newValue = e.target.value;
            setLocalValue(newValue);
            if (/^#[0-9A-Fa-f]{6}$/.test(newValue)) {
              onColorChange?.(newValue);
              // Create a synthetic event for the color input
              const syntheticEvent = {
                ...e,
                target: { ...e.target, value: newValue },
              } as React.ChangeEvent<HTMLInputElement>;
              onChange?.(syntheticEvent);
            }
          }}
          className={cn(
            'flex h-10 w-32 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono',
            error && 'border-destructive focus-visible:ring-destructive'
          )}
          placeholder="#000000"
          maxLength={7}
        />
      </div>
    );
  }
);
ColorPicker.displayName = 'ColorPicker';

export { ColorPicker };
