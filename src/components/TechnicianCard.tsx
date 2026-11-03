import React, { useState } from 'react';
import { Bookmark, ShieldCheck } from 'lucide-react';
import type { PublicTechnician } from '../types/marketplace';
import { resolveTechnicianPhotoUrl } from '../assets/media';

interface TechnicianCardProps {
  technician: PublicTechnician;
  isSaved?: boolean;
  onToggleSave?: (techId: string) => void;
  onViewProfile: (tech: PublicTechnician) => void;
  onBook: (tech: PublicTechnician) => void;
}

export const TechnicianAvatar: React.FC<{
  name: string;
  imageUrl?: string | null;
  sizeClass?: string;
}> = ({ name, imageUrl, sizeClass = 'w-16 h-16' }) => {
  const [imgFailed, setImgFailed] = useState(false);
  const resolvedSrc = resolveTechnicianPhotoUrl(imageUrl);

  const initials = name
    .replace(/\(Demo\)/gi, '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');

  if (resolvedSrc && !imgFailed) {
    return (
      <img
        src={resolvedSrc}
        alt={`${name} profile photograph`}
        referrerPolicy="no-referrer"
        onError={() => setImgFailed(true)}
        className={`${sizeClass} rounded-2xl object-cover border border-slate-200 shrink-0`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-2xl bg-[#071120] text-white font-display font-bold flex items-center justify-center shrink-0 border border-slate-800 select-none`}
      aria-label={`${name} avatar`}
    >
      <span>{initials || 'TC'}</span>
    </div>
  );
};

export const TechnicianCard: React.FC<TechnicianCardProps> = ({
  technician,
  isSaved = false,
  onToggleSave,
  onViewProfile,
  onBook,
}) => {
  const serviceModeLabel =
    technician.serviceMode === 'shop'
      ? 'Shop Visit Only'
      : technician.serviceMode === 'home_service'
      ? 'Doorstep / Home Service'
      : 'Shop & Doorstep Service';

  const specialtyLabel =
    technician.deviceSpecialization === 'mobile'
      ? 'Mobile Phones'
      : technician.deviceSpecialization === 'laptop'
      ? 'Laptops & Desktops'
      : 'Mobile & Laptop Repair';

  return (
    <article className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md p-6 flex flex-col justify-between transition-all">
      <div>
        {/* Header Row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-4 min-w-0">
            <TechnicianAvatar
              name={technician.fullName}
              imageUrl={technician.profileImage}
            />
            <div className="min-w-0">
              <h3 className="text-base font-bold text-[#071120] truncate">
                {technician.fullName}
              </h3>

              {/* Clean unboxed inline metadata */}
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600">
                {technician.verificationStatus === 'approved' && (
                  <span className="inline-flex items-center gap-1 font-semibold text-[#16A34A]">
                    <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                    <span>Verified</span>
                  </span>
                )}
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums font-medium text-slate-800">
                  {technician.experienceYears} yrs exp
                </span>
                {technician.distanceKm !== null && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums font-semibold text-[#16A34A]">
                      {technician.distanceKm} km away
                    </span>
                  </>
                )}
              </div>

              <div className="mt-1 text-xs text-slate-500">
                <span>{specialtyLabel}</span>
                <span className="mx-1.5" aria-hidden="true">
                  ·
                </span>
                <span>
                  {technician.isAvailable ? 'Currently Available' : 'Currently Busy'}
                </span>
              </div>
            </div>
          </div>

          {onToggleSave && (
            <button
              type="button"
              onClick={() => onToggleSave(technician.id)}
              aria-label={isSaved ? 'Remove from saved technicians' : 'Save technician'}
              className={`p-2 rounded-xl border transition-colors cursor-pointer shrink-0 ${
                isSaved
                  ? 'border-emerald-200 bg-emerald-50 text-[#16A34A]'
                  : 'border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Bookmark className="w-4 h-4" fill={isSaved ? 'currentColor' : 'none'} />
            </button>
          )}
        </div>

        {/* Details Section */}
        <div className="mt-4 pt-4 border-t border-slate-100 space-y-2 text-xs text-slate-600">
          <p className="text-slate-700 line-clamp-2 leading-relaxed">
            {technician.professionalDescription || technician.skills}
          </p>

          <div>
            <span className="font-semibold text-slate-800">Service Area: </span>
            <span>
              {technician.serviceArea}, {technician.city} (up to{' '}
              <span className="font-mono tabular-nums">{technician.serviceRadiusKm} km</span>)
            </span>
          </div>

          <div>
            <span className="font-semibold text-slate-800">Mode: </span>
            <span>
              {serviceModeLabel}
              {technician.hasShop && technician.shopName ? ` · ${technician.shopName}` : ''}
            </span>
          </div>

          <div>
            <span className="font-semibold text-slate-800">Hours: </span>
            <span className="font-mono tabular-nums">{technician.workingHoursSummary}</span>
          </div>

          {technician.supportedBrands.length > 0 && (
            <div className="truncate">
              <span className="font-semibold text-slate-800">Brands: </span>
              <span>{technician.supportedBrands.slice(0, 6).join(' · ')}</span>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-5 pt-4 border-t border-slate-100 flex items-center gap-3">
        <button
          type="button"
          onClick={() => onViewProfile(technician)}
          className="flex-1 py-2.5 px-3 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          View Profile
        </button>
        <button
          type="button"
          onClick={() => onBook(technician)}
          className="flex-1 py-2.5 px-3 text-xs font-semibold text-white bg-[#16A34A] hover:bg-[#15803D] rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          Book Technician
        </button>
      </div>
    </article>
  );
};
