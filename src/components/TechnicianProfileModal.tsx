import React from 'react';
import { ShieldCheck, Star, X } from 'lucide-react';
import type { PublicTechnician } from '../types/marketplace';
import { TechnicianAvatar } from './TechnicianCard';

interface TechnicianProfileModalProps {
  technician: PublicTechnician | null;
  onClose: () => void;
  onBook: (tech: PublicTechnician) => void;
}

export const TechnicianProfileModal: React.FC<TechnicianProfileModalProps> = ({
  technician,
  onClose,
  onBook,
}) => {
  if (!technician) return null;

  const serviceModeLabel =
    technician.serviceMode === 'shop'
      ? 'Physical Repair Shop Visit'
      : technician.serviceMode === 'home_service'
      ? 'Doorstep / Customer-Visit Service'
      : 'Both Shop Visit & Doorstep Service';

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-xl max-w-2xl w-full p-6 border border-slate-200 shadow-lg my-8 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4 pb-5 border-b border-slate-200">
          <div className="flex items-start gap-4">
            <TechnicianAvatar
              name={technician.fullName}
              imageUrl={technician.profileImage}
              sizeClass="w-16 h-16 text-lg"
            />
            <div>
              <h2 className="text-xl font-bold text-slate-900">{technician.fullName}</h2>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600">
                {technician.verificationStatus === 'approved' && (
                  <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Admin Approved Technician</span>
                  </span>
                )}
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums font-semibold text-slate-800">
                  {technician.experienceYears} years experience
                </span>
                {technician.distanceKm !== null && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums font-semibold text-emerald-700">
                      Approx. {technician.distanceKm} km from you
                    </span>
                  </>
                )}
              </div>
              {technician.isDemo && (
                <p className="mt-1 text-xs text-amber-800">
                  Sample Demo Profile — Fictional record created for marketplace demonstration.
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close profile dialog"
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-5 space-y-6 text-sm text-slate-700">
          <div>
            <h3 className="text-xs font-semibold text-slate-500 mb-1.5">
              Professional Summary
            </h3>
            <p className="leading-relaxed">
              {technician.professionalDescription ||
                'Independent local repair technician serving nearby customers.'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
            <div>
              <h4 className="text-xs font-semibold text-slate-500 mb-1">
                Service Availability Mode
              </h4>
              <p className="font-medium text-slate-900">{serviceModeLabel}</p>
              {technician.hasShop && technician.shopName && (
                <p className="text-xs text-slate-600 mt-0.5">
                  Workshop: {technician.shopName} ({technician.shopLocation || technician.city})
                </p>
              )}
            </div>

            <div>
              <h4 className="text-xs font-semibold text-slate-500 mb-1">
                Localities Covered & Radius
              </h4>
              <p className="font-medium text-slate-900">
                {technician.serviceArea} · {technician.city}, {technician.state} ({technician.pincode})
              </p>
              <p className="text-xs text-slate-600 mt-0.5 font-mono tabular-nums">
                Service radius: up to {technician.serviceRadiusKm} km
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 space-y-3">
            <div>
              <h4 className="text-xs font-semibold text-slate-500 mb-1">
                Specializations & Skills
              </h4>
              <p className="text-slate-900">{technician.skills || 'General hardware & diagnostics'}</p>
            </div>

            {technician.services.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-slate-500">
                  Repair Categories & Supported Brands
                </h4>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
                  {technician.services.map((srv) => (
                    <div key={srv.id} className="p-3 text-xs space-y-1">
                      <div className="font-semibold text-slate-900">{srv.deviceType}</div>
                      <div className="text-slate-600">
                        <span className="font-medium text-slate-700">Issues handled: </span>
                        {srv.repairCategory}
                      </div>
                      <div className="text-slate-600">
                        <span className="font-medium text-slate-700">Supported brands: </span>
                        {srv.supportedBrands}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100">
            <h4 className="text-xs font-semibold text-slate-500 mb-2">
              Weekly Working Hours
              {technician.breakTime ? ` (Break: ${technician.breakTime})` : ''}
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              {technician.availability.map((slot) => (
                <div
                  key={slot.id}
                  className="p-2 rounded-lg border border-slate-200 bg-slate-50/60"
                >
                  <div className="font-semibold text-slate-800">{slot.dayOfWeek}</div>
                  <div className="font-mono tabular-nums text-slate-600 mt-0.5">
                    {slot.isAvailable ? `${slot.startTime} – ${slot.endTime}` : 'Closed'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {technician.reviews && technician.reviews.length > 0 && (
            <div className="pt-4 border-t border-slate-100">
              <h4 className="text-xs font-semibold text-slate-500 mb-2">
                Verified Completed Repair Feedback
              </h4>
              <div className="space-y-2">
                {technician.reviews.map((rev) => (
                  <div key={rev.id} className="p-3 rounded-lg border border-slate-200 text-xs">
                    <div className="flex items-center gap-2 text-slate-700 font-medium">
                      <span className="inline-flex items-center gap-1 text-amber-600">
                        <Star className="w-3.5 h-3.5 fill-current" />
                        <span className="font-mono tabular-nums">{rev.rating}/5</span>
                      </span>
                      <span>·</span>
                      <span>
                        {rev.deviceBrand} ({rev.repairProblem})
                      </span>
                    </div>
                    <p className="mt-1 text-slate-600">{rev.review}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-xs text-slate-500 pt-2 border-t border-slate-100">
            Privacy Note: Personal contact numbers and private residential addresses are protected and never displayed publicly.
          </p>
        </div>

        <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onBook(technician);
            }}
            className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg cursor-pointer"
          >
            Book This Technician
          </button>
        </div>
      </div>
    </div>
  );
};
