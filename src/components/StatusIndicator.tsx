import React from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Wrench,
  XCircle,
} from 'lucide-react';
import type { BookingStatus } from '../types/marketplace';

export const BookingStatusText: React.FC<{ status: BookingStatus }> = ({ status }) => {
  switch (status) {
    case 'Pending':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700">
          <Clock className="w-3.5 h-3.5 shrink-0" />
          <span>Pending Technician Response</span>
        </span>
      );
    case 'Accepted':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          <span>Accepted & Scheduled</span>
        </span>
      );
    case 'In Progress':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
          <Wrench className="w-3.5 h-3.5 shrink-0" />
          <span>Repair In Progress</span>
        </span>
      );
    case 'Completed':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          <span>Repair Completed</span>
        </span>
      );
    case 'Rejected':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700">
          <XCircle className="w-3.5 h-3.5 shrink-0" />
          <span>Declined by Technician</span>
        </span>
      );
    case 'Cancelled':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>Cancelled</span>
        </span>
      );
  }
};

export const VerificationStatusText: React.FC<{ status: string }> = ({ status }) => {
  if (status === 'approved') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
        <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
        <span>Admin Approved</span>
      </span>
    );
  }
  if (status === 'rejected') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700">
        <XCircle className="w-3.5 h-3.5 shrink-0" />
        <span>Verification Rejected</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700">
      <Clock className="w-3.5 h-3.5 shrink-0" />
      <span>Pending Admin Approval</span>
    </span>
  );
};
