"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface SalesClient {
  user_id: string;
  full_name: string;
  business_name: string | null;
  plan_name: string | null;
  account_status: string;
  created_at: string;
}

interface CustomPricingForm {
  client_id: string;
  proposed_monthly_price: number;
  posters_quota: number;
  reels_quota: number;
  stories_quota: number;
  notes: string;
}

const STATUS_LABELS: Record<string, string> = {
  pending_verification: "Pending Verification",
  pending_payment: "Pending Payment",
  active: "Active",
  lapsed: "Lapsed",
  suspended: "Suspended",
  deleted: "Deleted",
};

export default function SalesDashboardPage() {
  const [clients, setClients] = useState<SalesClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string>("");

  const [form, setForm] = useState<CustomPricingForm>({
    client_id: "",
    proposed_monthly_price: 0,
    posters_quota: 6,
    reels_quota: 4,
    stories_quota: 3,
    notes: "",
  });

  const fetchClients = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/sales/clients`,
        { headers }
      );

      if (res.ok) {
        const data = await res.json();
        setClients(data);
      }
    } catch {
      console.error("Failed to fetch clients");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const openPricingSheet = (clientId: string) => {
    setSelectedClientId(clientId);
    setForm((prev) => ({ ...prev, client_id: clientId }));
    setSheetOpen(true);
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/sales/custom-pricing`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            client_id: form.client_id,
            proposed_monthly_price: form.proposed_monthly_price,
            posters_quota: form.posters_quota,
            reels_quota: form.reels_quota,
            stories_quota: form.stories_quota,
            notes: form.notes || undefined,
          }),
        }
      );

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.detail || "Failed to submit pricing request");
      }

      setSuccess("Custom pricing request submitted for admin approval");
      setSheetOpen(false);
      setForm({
        client_id: "",
        proposed_monthly_price: 0,
        posters_quota: 6,
        reels_quota: 4,
        stories_quota: 3,
        notes: "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const grouped = clients.reduce<Record<string, SalesClient[]>>((acc, client) => {
    const key = client.account_status;
    if (!acc[key]) acc[key] = [];
    acc[key].push(client);
    return acc;
  }, {});

  const statusOrder = [
    "pending_verification",
    "pending_payment",
    "active",
    "lapsed",
    "suspended",
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-brand-dark)]">
            Sales Dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Client pipeline and custom pricing management.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">
            {clients.length} total client{clients.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-gray-200 rounded w-1/3" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-full" />
                  <div className="h-3 bg-gray-200 rounded w-2/3" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : clients.length === 0 ? (
        <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-gray-300">
          <p className="text-sm text-gray-500">No clients found.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {statusOrder.map((status) => {
            const groupClients = grouped[status] || [];
            if (groupClients.length === 0) return null;

            return (
              <div key={status}>
                <div className="flex items-center gap-2 mb-3">
                  <h2 className="text-lg font-semibold text-[var(--color-brand-dark)]">
                    {STATUS_LABELS[status] || status}
                  </h2>
                  <Badge variant="secondary" className="text-xs">
                    {groupClients.length}
                  </Badge>
                </div>
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="px-4 py-3 text-left font-medium text-gray-500">
                          Client
                        </th>
                        <th className="px-4 py-3 text-left font-medium text-gray-500">
                          Business
                        </th>
                        <th className="px-4 py-3 text-left font-medium text-gray-500">
                          Plan
                        </th>
                        <th className="px-4 py-3 text-left font-medium text-gray-500">
                          Joined
                        </th>
                        <th className="px-4 py-3 text-right font-medium text-gray-500">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {groupClients.map((client) => (
                        <tr key={client.user_id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <span className="font-medium text-[var(--color-brand-dark)]">
                              {client.full_name}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {client.business_name || "—"}
                          </td>
                          <td className="px-4 py-3">
                            {client.plan_name ? (
                              <Badge variant="outline" className="text-xs">
                                {client.plan_name}
                              </Badge>
                            ) : (
                              <span className="text-gray-400 text-xs">None</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-xs">
                            {new Date(client.created_at).toLocaleDateString(
                              "en-US",
                              { month: "short", day: "numeric", year: "numeric" }
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openPricingSheet(client.user_id)}
                              className="text-xs"
                            >
                              Custom Pricing
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>Request Custom Pricing</SheetTitle>
            <SheetDescription>
              Submit a custom pricing request for admin approval.
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="space-y-4 px-4 pb-4">
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-700">
                {success}
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Monthly Price (₹)
              </label>
              <input
                type="number"
                value={form.proposed_monthly_price || ""}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    proposed_monthly_price: parseFloat(e.target.value) || 0,
                  }))
                }
                required
                min={0}
                step={100}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)] focus:border-transparent"
                placeholder="e.g., 15000"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Posters
                </label>
                <input
                  type="number"
                  value={form.posters_quota}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      posters_quota: parseInt(e.target.value) || 0,
                    }))
                  }
                  required
                  min={0}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)] focus:border-transparent"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Reels
                </label>
                <input
                  type="number"
                  value={form.reels_quota}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      reels_quota: parseInt(e.target.value) || 0,
                    }))
                  }
                  required
                  min={0}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)] focus:border-transparent"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Stories
                </label>
                <input
                  type="number"
                  value={form.stories_quota}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      stories_quota: parseInt(e.target.value) || 0,
                    }))
                  }
                  required
                  min={0}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)] focus:border-transparent"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Notes (optional)
              </label>
              <textarea
                value={form.notes}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, notes: e.target.value }))
                }
                rows={3}
                placeholder="Any additional notes for the admin..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)] focus:border-transparent resize-none"
              />
            </div>
            <Button
              type="submit"
              disabled={submitting || !form.proposed_monthly_price}
              className="w-full bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand)]/90"
            >
              {submitting ? "Submitting..." : "Submit Request"}
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
