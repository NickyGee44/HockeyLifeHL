'use client';

/**
 * Password Strength Meter Component
 *
 * Visual indicator for password strength with requirements checklist
 * Uses BRAND-KIT gold/black theme
 */

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Check, X } from 'lucide-react';

interface PasswordStrengthMeterProps {
  password: string;
  showRequirements?: boolean;
}

interface Requirement {
  label: string;
  met: boolean;
}

export function PasswordStrengthMeter({
  password,
  showRequirements = true,
}: PasswordStrengthMeterProps) {
  const t = useTranslations('auth');

  const analysis = useMemo(() => {
    const requirements: Requirement[] = [
      { label: t('requirementLength'), met: password.length >= 8 },
      { label: t('requirementUppercase'), met: /[A-Z]/.test(password) },
      { label: t('requirementLowercase'), met: /[a-z]/.test(password) },
      { label: t('requirementNumber'), met: /[0-9]/.test(password) },
      { label: t('requirementSpecial'), met: /[^A-Za-z0-9]/.test(password) },
    ];

    let score = 0;
    requirements.forEach((req) => {
      if (req.met) score++;
    });

    // Bonus points for length
    if (password.length >= 12) score++;
    if (password.length >= 16) score++;

    // Penalty for common patterns
    if (/^(password|123456|qwerty|abc123|letmein)/i.test(password)) {
      score = Math.max(0, score - 2);
    }

    let strength: 'empty' | 'weak' | 'fair' | 'good' | 'strong';
    let color: string;
    let label: string;

    if (password.length === 0) {
      strength = 'empty';
      color = 'bg-neutral-700';
      label = '';
    } else if (score <= 2) {
      strength = 'weak';
      color = 'bg-red-500';
      label = t('strengthWeak');
    } else if (score <= 4) {
      strength = 'fair';
      color = 'bg-orange-500';
      label = t('strengthFair');
    } else if (score <= 5) {
      strength = 'good';
      color = 'bg-yellow-500';
      label = t('strengthGood');
    } else {
      strength = 'strong';
      color = 'bg-green-500';
      label = t('strengthStrong');
    }

    const percentage = password.length === 0 ? 0 : Math.min(100, (score / 7) * 100);

    return {
      requirements,
      score,
      strength,
      color,
      label,
      percentage,
      allMet: requirements.every((r) => r.met),
    };
  }, [password, t]);

  if (password.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* Strength Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-neutral-400">{t('passwordStrength')}</span>
          <span
            className={`text-xs font-medium ${
              analysis.strength === 'weak'
                ? 'text-red-400'
                : analysis.strength === 'fair'
                ? 'text-orange-400'
                : analysis.strength === 'good'
                ? 'text-yellow-400'
                : 'text-green-400'
            }`}
          >
            {analysis.label}
          </span>
        </div>
        <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ease-out ${analysis.color}`}
            style={{ width: `${analysis.percentage}%` }}
          />
        </div>
      </div>

      {/* Requirements Checklist */}
      {showRequirements && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {analysis.requirements.map((req, index) => (
            <div
              key={index}
              className={`flex items-center gap-2 text-xs transition-colors ${
                req.met ? 'text-green-400' : 'text-neutral-500'
              }`}
            >
              {req.met ? (
                <Check className="w-3.5 h-3.5 flex-shrink-0" />
              ) : (
                <X className="w-3.5 h-3.5 flex-shrink-0" />
              )}
              <span>{req.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default PasswordStrengthMeter;
