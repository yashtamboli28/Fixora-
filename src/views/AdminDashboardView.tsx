import React, { useCallback, useEffect, useState } from 'react';
import {
  ClipboardList,
  LogOut,
  ShieldAlert,
  ShieldCheck,
  Users,
  Wrench,
  X,
} from 'lucide-react';
import { apiRequest } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import {
  BookingStatusText,
  VerificationStatusText,
} from '../components/StatusIndicator';
import type { AppView } from '../components/Navbar';

interface AdminDashboardViewProps {
  onNavigate: (view: AppView) => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  onNavigate,
}) => {
  const { profile, logout } = useAuth();

  const [activeTab, setActiveTab] = useState<
    'overview' | 'technicians' | 'customers' | 'bookings'
  >('overview');
  const [techStatusFilter, setTechStatusFilter] = useState<
    'all' | 'pending' | 'approved' | 'rejected'
  >('all');
  const [bookingStatusFilter, setBookingStatusFilter] = useState<string>('all');

  const [data, setData] = useState<{
    metrics: {
      totalCustomers: number;
      totalTechnicians: number;
      pendingTechnicians: number;
      approvedTechnicians: number;
      rejectedTechnicians: number;
      totalBookings: number;
      activeBookings: number;
      completedBookings: number;
    };
    customers: any[];
    technicians: any[];
    bookings: any[];
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [inspectTech, setInspectTech] = useState<any | null>(null);

  const loadAdminOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest<any>('/api/admin/overview');
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Forbidden or unable to load admin records.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAdminOverview();
  }, [loadAdminOverview]);

  if (!profile || profile.role !== 'admin') {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="bg-white rounded-xl border border-slate-200 p-8 space-y-4">
          <ShieldAlert className="w-10 h-10 text-red-600 mx-auto" />
          <h1 className="text-xl font-bold text-slate-900">
            Administrator Access Required
          </h1>
          <p className="text-sm text-slate-600">
            Only authorized administrator accounts can access platform verification and management records.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('landing')}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg cursor-pointer"
          >
            Return to Homepage
          </button>
        </div>
      </div>
    );
  }

  const handleVerifyTechnician = async (
    techId: string,
    status: 'approved' | 'rejected'
  ) => {
    setNotice(null);
    try {
      await apiRequest(`/api/admin/technicians/${techId}/verification`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      setInspectTech(null);
      await loadAdminOverview();
      setNotice(`Technician verification updated to "${status}".`);
    } catch (err: any) {
      setError(err.message || 'Verification action failed.');
    }
  };

  const handleToggleActive = async (techId: string, isActive: boolean) => {
    setNotice(null);
    try {
      await apiRequest(`/api/admin/technicians/${techId}/active`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive }),
      });
      await loadAdminOverview();
      setNotice(
        `Technician account has been ${isActive ? 'activated' : 'deactivated'}.`
      );
    } catch (err: any) {
      setError(err.message || 'Could not update active status.');
    }
  };

  const filteredTechs = (data?.technicians || []).filter((t) =>
    techStatusFilter === 'all' ? true : t.verificationStatus === techStatusFilter
  );

  const filteredBookings = (data?.bookings || []).filter((b) =>
    bookingStatusFilter === 'all' ? true : b.bookingStatus === bookingStatusFilter
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Sidebar */}
        <aside className="w-full lg:w-64 shrink-0 bg-white rounded-xl border border-slate-200 p-4 space-y-1">
          <div className="px-3 py-3 border-b border-slate-100 mb-2">
            <div className="text-xs font-semibold text-emerald-700">
              Protected Admin Console
            </div>
            <div className="text-sm font-bold text-slate-900 truncate mt-0.5">
              {profile.fullName}
            </div>
          </div>

          {[
            { id: 'overview', label: 'Platform Overview', icon: ShieldCheck },
            {
              id: 'technicians',
              label: `Technicians (${data?.metrics.totalTechnicians ?? 0})`,
              icon: Wrench,
            },
            {
              id: 'customers',
              label: `Customers (${data?.metrics.totalCustomers ?? 0})`,
              icon: Users,
            },
            {
              id: 'bookings',
              label: `Bookings (${data?.metrics.totalBookings ?? 0})`,
              icon: ClipboardList,
            },
          ].map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id as any)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  active
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}

          <div className="pt-2 mt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={async () => {
                await logout();
                onNavigate('landing');
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold text-red-700 hover:bg-red-50 cursor-pointer"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span>Logout</span>
            </button>
          </div>
        </aside>

        {/* Main Workspace */}
        <div className="flex-1 w-full min-w-0 space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800">
              {error}
            </div>
          )}
          {notice && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between">
              <span>{notice}</span>
              <button
                type="button"
                onClick={() => setNotice(null)}
                className="font-semibold underline cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {loading || !data ? (
            <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-xs text-slate-500">
              Loading platform metrics and database records...
            </div>
          ) : (
            <>
              {/* OVERVIEW TAB */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <div className="bg-white rounded-xl border border-slate-200 p-6 flex items-center justify-between">
                    <div>
                      <h1 className="text-2xl font-bold text-slate-900">
                        Marketplace Administration Overview
                      </h1>
                      <p className="text-xs text-slate-600 mt-1">
                        Review pending technician applications, monitor customer registrations, and oversee bookings.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={loadAdminOverview}
                      className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                    >
                      Refresh Data
                    </button>
                  </div>

                  {/* 8 Metric Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                      {
                        label: 'Registered Customers',
                        value: data.metrics.totalCustomers,
                      },
                      {
                        label: 'Total Technicians',
                        value: data.metrics.totalTechnicians,
                      },
                      {
                        label: 'Pending Approvals',
                        value: data.metrics.pendingTechnicians,
                        highlight: 'text-amber-700',
                      },
                      {
                        label: 'Approved Technicians',
                        value: data.metrics.approvedTechnicians,
                        highlight: 'text-emerald-700',
                      },
                      {
                        label: 'Rejected Applications',
                        value: data.metrics.rejectedTechnicians,
                      },
                      {
                        label: 'Total Bookings',
                        value: data.metrics.totalBookings,
                      },
                      {
                        label: 'Active Bookings',
                        value: data.metrics.activeBookings,
                      },
                      {
                        label: 'Completed Bookings',
                        value: data.metrics.completedBookings,
                        highlight: 'text-emerald-700',
                      },
                    ].map((stat) => (
                      <div
                        key={stat.label}
                        className="bg-white rounded-xl border border-slate-200 p-4"
                      >
                        <div className="text-xs text-slate-500">{stat.label}</div>
                        <div
                          className={`mt-1 text-2xl font-bold font-mono tabular-nums ${
                            stat.highlight || 'text-slate-900'
                          }`}
                        >
                          {stat.value}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pending Technician Approvals Quick Queue */}
                  <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-base font-bold text-slate-900">
                        Pending Technician Approvals (
                        {
                          data.technicians.filter(
                            (t) => t.verificationStatus === 'pending'
                          ).length
                        }
                        )
                      </h2>
                      <button
                        type="button"
                        onClick={() => {
                          setTechStatusFilter('pending');
                          setActiveTab('technicians');
                        }}
                        className="text-xs font-semibold text-emerald-700 hover:underline cursor-pointer"
                      >
                        Manage All Technicians →
                      </button>
                    </div>

                    {data.technicians.filter(
                      (t) => t.verificationStatus === 'pending'
                    ).length === 0 ? (
                      <p className="text-xs text-slate-500 py-4">
                        All submitted technician applications have been reviewed.
                      </p>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {data.technicians
                          .filter((t) => t.verificationStatus === 'pending')
                          .map((tech) => (
                            <div
                              key={tech.id}
                              className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                            >
                              <div>
                                <div className="text-sm font-bold text-slate-900">
                                  {tech.fullName}
                                </div>
                                <div className="text-xs text-slate-600 mt-0.5">
                                  {tech.city}, {tech.state} · {tech.experienceYears} yrs exp ·{' '}
                                  {tech.skills}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => setInspectTech(tech)}
                                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                                >
                                  Inspect Details
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleVerifyTechnician(tech.id, 'rejected')
                                  }
                                  className="px-3 py-1.5 text-xs font-semibold text-red-700 border border-red-200 hover:bg-red-50 rounded-lg cursor-pointer"
                                >
                                  Reject
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleVerifyTechnician(tech.id, 'approved')
                                  }
                                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg cursor-pointer"
                                >
                                  Approve
                                </button>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TECHNICIANS MANAGEMENT TAB */}
              {activeTab === 'technicians' && (
                <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <h1 className="text-xl font-bold text-slate-900">
                      Technician Applications & Management
                    </h1>
                    <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                      {(['all', 'pending', 'approved', 'rejected'] as const).map(
                        (st) => (
                          <button
                            key={st}
                            type="button"
                            onClick={() => setTechStatusFilter(st)}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-md capitalize cursor-pointer ${
                              techStatusFilter === st
                                ? 'bg-white text-slate-900 shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                            }`}
                          >
                            {st}
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500">
                          <th className="py-3 pr-4 font-semibold">Technician</th>
                          <th className="py-3 px-4 font-semibold">City & Radius</th>
                          <th className="py-3 px-4 font-semibold">Exp</th>
                          <th className="py-3 px-4 font-semibold">Verification</th>
                          <th className="py-3 px-4 font-semibold">Status</th>
                          <th className="py-3 pl-4 font-semibold text-right">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredTechs.map((t) => (
                          <tr key={t.id} className="hover:bg-slate-50/70">
                            <td className="py-3 pr-4">
                              <div className="font-bold text-slate-900">
                                {t.fullName}
                              </div>
                              <div className="text-slate-500 font-mono">
                                {t.phone || t.email || '—'}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-slate-700">
                              {t.city} ({t.serviceRadiusKm} km)
                            </td>
                            <td className="py-3 px-4 font-mono tabular-nums">
                              {t.experienceYears} yrs
                            </td>
                            <td className="py-3 px-4">
                              <VerificationStatusText
                                status={t.verificationStatus}
                              />
                            </td>
                            <td className="py-3 px-4">
                              {t.isActive ? (
                                <span className="font-semibold text-emerald-700">
                                  Active
                                </span>
                              ) : (
                                <span className="font-semibold text-slate-400">
                                  Deactivated
                                </span>
                              )}
                            </td>
                            <td className="py-3 pl-4 text-right space-x-2 whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => setInspectTech(t)}
                                className="px-2.5 py-1 font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer"
                              >
                                View
                              </button>
                              {t.verificationStatus !== 'approved' && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleVerifyTechnician(t.id, 'approved')
                                  }
                                  className="px-2.5 py-1 font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-md cursor-pointer"
                                >
                                  Approve
                                </button>
                              )}
                              {t.verificationStatus !== 'rejected' && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleVerifyTechnician(t.id, 'rejected')
                                  }
                                  className="px-2.5 py-1 font-semibold text-red-700 border border-red-200 hover:bg-red-50 rounded-md cursor-pointer"
                                >
                                  Reject
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() =>
                                  handleToggleActive(t.id, !t.isActive)
                                }
                                className="px-2.5 py-1 font-semibold text-slate-700 border border-slate-300 rounded-md cursor-pointer"
                              >
                                {t.isActive ? 'Deactivate' : 'Activate'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* CUSTOMERS MANAGEMENT TAB */}
              {activeTab === 'customers' && (
                <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
                  <h1 className="text-xl font-bold text-slate-900">
                    Registered Customer Accounts
                  </h1>
                  {data.customers.length === 0 ? (
                    <p className="text-xs text-slate-500 py-6">
                      No customer accounts registered yet.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-500">
                            <th className="py-3 pr-4 font-semibold">Name</th>
                            <th className="py-3 px-4 font-semibold">Contact</th>
                            <th className="py-3 px-4 font-semibold">Location</th>
                            <th className="py-3 px-4 font-semibold text-right">
                              Bookings
                            </th>
                            <th className="py-3 pl-4 font-semibold text-right">
                              Joined
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {data.customers.map((c) => (
                            <tr key={c.id}>
                              <td className="py-3 pr-4 font-bold text-slate-900">
                                {c.fullName}
                              </td>
                              <td className="py-3 px-4 font-mono text-slate-600">
                                {c.phone || c.email || '—'}
                              </td>
                              <td className="py-3 px-4 text-slate-700">
                                {c.locality ? `${c.locality}, ` : ''}
                                {c.city}
                              </td>
                              <td className="py-3 px-4 text-right font-mono tabular-nums">
                                {c.bookingsCount}
                              </td>
                              <td className="py-3 pl-4 text-right font-mono tabular-nums text-slate-500">
                                {new Date(c.createdAt).toLocaleDateString('en-IN')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* BOOKINGS MANAGEMENT TAB */}
              {activeTab === 'bookings' && (
                <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <h1 className="text-xl font-bold text-slate-900">
                      Platform Bookings Management
                    </h1>
                    <select
                      value={bookingStatusFilter}
                      onChange={(e) => setBookingStatusFilter(e.target.value)}
                      className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                    >
                      <option value="all">All Statuses</option>
                      <option value="Pending">Pending</option>
                      <option value="Accepted">Accepted</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                      <option value="Rejected">Rejected</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>

                  {filteredBookings.length === 0 ? (
                    <p className="text-xs text-slate-500 py-6">
                      No bookings match this filter.
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-500">
                            <th className="py-3 pr-4 font-semibold">ID & Slot</th>
                            <th className="py-3 px-4 font-semibold">Customer</th>
                            <th className="py-3 px-4 font-semibold">Technician</th>
                            <th className="py-3 px-4 font-semibold">
                              Device & Issue
                            </th>
                            <th className="py-3 pl-4 font-semibold">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredBookings.map((b) => (
                            <tr key={b.id}>
                              <td className="py-3 pr-4 font-mono tabular-nums">
                                <div className="font-semibold text-slate-900">
                                  #{b.id.slice(0, 8).toUpperCase()}
                                </div>
                                <div className="text-slate-500">
                                  {b.preferredDate}
                                </div>
                              </td>
                              <td className="py-3 px-4 text-slate-800 font-medium">
                                {b.customerName}
                              </td>
                              <td className="py-3 px-4 text-slate-800">
                                {b.technicianName} ({b.technicianCity})
                              </td>
                              <td className="py-3 px-4 text-slate-700">
                                {b.deviceBrand} · {b.repairProblem}
                              </td>
                              <td className="py-3 pl-4">
                                <BookingStatusText status={b.bookingStatus} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Inspect Technician Registration Modal */}
      {inspectTech && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-xl max-w-xl w-full p-6 border border-slate-200 shadow-lg max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-start justify-between pb-3 border-b border-slate-200">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {inspectTech.fullName}
                </h2>
                <p className="text-xs text-slate-500 font-mono">
                  {inspectTech.phone || 'No phone'} · {inspectTech.email || 'No email'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectTech(null)}
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-700">
              <div>
                <span className="font-semibold text-slate-900">
                  Private Base Address:{' '}
                </span>
                {inspectTech.fullAddress || '—'}
              </div>
              <div>
                <span className="font-semibold text-slate-900">
                  Service Coverage:{' '}
                </span>
                {inspectTech.serviceArea}, {inspectTech.city}, {inspectTech.state} -{' '}
                {inspectTech.pincode} ({inspectTech.serviceRadiusKm} km radius)
              </div>
              <div>
                <span className="font-semibold text-slate-900">
                  Shop Information:{' '}
                </span>
                {inspectTech.hasShop
                  ? `${inspectTech.shopName} — ${inspectTech.shopAddress}`
                  : `Independent (${inspectTech.serviceMode})`}
              </div>
              <div>
                <span className="font-semibold text-slate-900">
                  Experience & Bio:{' '}
                </span>
                {inspectTech.experienceYears} years —{' '}
                {inspectTech.professionalDescription}
              </div>
              <div>
                <span className="font-semibold text-slate-900">Skills: </span>
                {inspectTech.skills}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setInspectTech(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => handleVerifyTechnician(inspectTech.id, 'rejected')}
                className="px-4 py-2 text-xs font-semibold text-red-700 border border-red-200 hover:bg-red-50 rounded-lg cursor-pointer"
              >
                Reject Application
              </button>
              <button
                type="button"
                onClick={() => handleVerifyTechnician(inspectTech.id, 'approved')}
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg cursor-pointer"
              >
                Approve Technician
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
