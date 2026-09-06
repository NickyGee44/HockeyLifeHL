import Image from 'next/image';
import { UserCircle, Mail, Phone } from 'lucide-react';
import type { StaffMember } from '@/lib/types';

interface StaffGridProps {
  staff: StaffMember[];
}

export function StaffGrid({ staff }: StaffGridProps) {
  if (staff.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {staff.map((member) => (
        <div
          key={member.id}
          className="glass-card overflow-hidden rounded-[24px] transition-colors hover:border-[var(--league-primary)]/30"
        >
          {/* Photo */}
          <div className="relative aspect-[4/3] bg-[var(--color-surface)]/35">
            {member.photo_url ? (
              <Image
                src={member.photo_url}
                alt={member.name}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <UserCircle className="w-20 h-20 text-[var(--color-text-muted)]" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="p-4">
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
              {member.name}
            </h3>
            <p className="text-sm font-medium text-[var(--league-primary)] mb-2">
              {member.role_title}
            </p>

            {member.bio && (
              <p className="text-sm text-[var(--color-text-secondary)] mb-3 line-clamp-3">
                {member.bio}
              </p>
            )}

            <div className="flex flex-wrap gap-3 text-sm text-[var(--color-text-secondary)]">
              {member.email && (
                <a
                  href={`mailto:${member.email}`}
                  className="inline-flex items-center gap-1 hover:text-[var(--league-primary)] transition-colors"
                >
                  <Mail className="w-3.5 h-3.5" />
                  {member.email}
                </a>
              )}
              {member.phone && (
                <a
                  href={`tel:${member.phone}`}
                  className="inline-flex items-center gap-1 hover:text-[var(--league-primary)] transition-colors"
                >
                  <Phone className="w-3.5 h-3.5" />
                  {member.phone}
                </a>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
