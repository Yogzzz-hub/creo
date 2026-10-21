import { useState } from "react";
import {
  CheckCircle2,
  Users,
  Building2,
  HardDrive,
  RefreshCw,
  Edit3,
  X,
  Save,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { request } from "../../lib/http";
import { CreoInlineLoader } from "../../components/ui/CreoLoader";

interface PlatformPlanItem {
  id: string;
  name: string;
  tagline: string;
  price: number;
  billing: string;
  active_subscribers: number;
  popular?: boolean;
  features: string[];
  quotas: {
    max_clients: number;
    team_seats: number;
    storage_gb: number;
    white_label: boolean;
    api_access: boolean;
  };
}

function fmt(n: number) {
  if (n === 0) return "Custom";
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n}`;
}

export function PlatformPlansPage() {
  const queryClient = useQueryClient();
  const [editingPlan, setEditingPlan] = useState<PlatformPlanItem | null>(null);

  const { data: plans = [], isLoading, refetch } = useQuery<PlatformPlanItem[]>({
    queryKey: ["platform-plans"],
    queryFn: () => request<PlatformPlanItem[]>("/api/v1/platform/plans"),
  });

  const updateMutation = useMutation({
    mutationFn: (vars: { planId: string; data: Partial<PlatformPlanItem> & { quotas?: Partial<PlatformPlanItem["quotas"]> } }) =>
      request<{ status: string; plan: PlatformPlanItem }>(`/api/v1/platform/plans/${vars.planId}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: vars.data.name,
          tagline: vars.data.tagline,
          price: vars.data.price,
          billing: vars.data.billing,
          max_clients: vars.data.quotas?.max_clients,
          team_seats: vars.data.quotas?.team_seats,
          storage_gb: vars.data.quotas?.storage_gb,
          features: vars.data.features,
        }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["platform-plans"] });
      setEditingPlan(null);
    },
  });

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
        <div>
          <h1 className="text-2xl font-black text-hi">Creo SaaS Plans Catalog</h1>
          <p className="text-xs text-app-mist">
            SaaS subscription packages sold to digital marketing agencies · Live subscriber counts and editable tiers
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void refetch()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-app-surface border border-app-line hover:border-app-accent/40 text-xs font-bold text-app-mist hover:text-hi transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="p-12 text-center bg-app-surface border border-app-line rounded-2xl">
          <CreoInlineLoader label="Loading SaaS plans catalog from database..." />
        </div>
      )}

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        {plans.map((p) => {
          return (
            <div
              key={p.id}
              className="bg-app-surface border border-app-line hover:border-app-accent/40 rounded-2xl p-5 flex flex-col justify-between relative transition-all group"
            >
              <div>
                <div className="flex items-center justify-between mt-1">
                  <h3 className="text-lg font-black text-hi">{p.name}</h3>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-app-base border border-app-line text-app-accent">
                    Catalog Tier
                  </span>
                </div>
                <p className="text-xs text-app-mist mt-1.5 leading-relaxed">{p.tagline}</p>

                {/* Price */}
                <div className="mt-4 pb-4 border-b border-app-line">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl sm:text-3xl font-black text-hi">{fmt(p.price)}</span>
                    <span className="text-xs text-app-mist">/{p.billing}</span>
                  </div>
                  <p className="text-[11px] text-app-mist mt-0.5">
                    Standard agency SaaS tier rate
                  </p>
                </div>

                {/* Quotas */}
                <div className="grid grid-cols-3 gap-2 my-4 text-center">
                  <div className="p-2 rounded-xl bg-app-base border border-app-line">
                    <Building2 className="w-3.5 h-3.5 text-app-accent mx-auto mb-1" />
                    <p className="text-[10px] text-app-mist">Clients</p>
                    <p className="text-xs font-black text-hi">{p.quotas.max_clients === -1 ? "∞" : p.quotas.max_clients}</p>
                  </div>
                  <div className="p-2 rounded-xl bg-app-base border border-app-line">
                    <Users className="w-3.5 h-3.5 text-app-accent mx-auto mb-1" />
                    <p className="text-[10px] text-app-mist">Seats</p>
                    <p className="text-xs font-black text-hi">{p.quotas.team_seats === -1 ? "∞" : p.quotas.team_seats}</p>
                  </div>
                  <div className="p-2 rounded-xl bg-app-base border border-app-line">
                    <HardDrive className="w-3.5 h-3.5 text-app-accent mx-auto mb-1" />
                    <p className="text-[10px] text-app-mist">Storage</p>
                    <p className="text-xs font-black text-hi">{p.quotas.storage_gb}GB</p>
                  </div>
                </div>

                {/* Feature List */}
                <div className="space-y-2 mt-4">
                  <span className="text-[10px] font-black uppercase tracking-wider text-app-mist">Included Features</span>
                  {p.features.map((f) => (
                    <div key={f} className="flex items-start gap-2 text-xs text-app-accent-soft">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-app-line space-y-2">
                <button
                  type="button"
                  onClick={() => setEditingPlan(p)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-app-base hover:bg-gradient-to-r hover:from-[#7FA0D6] hover:to-[#4F70A6] hover:text-black border border-app-line hover:border-transparent text-xs font-black text-hi transition-all cursor-pointer shadow-sm"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Edit Tier Configuration
                </button>
                <div className="text-center">
                  <span className="text-[10px] text-app-mist">
                    Click to adjust pricing, quotas & features
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Plan Modal */}
      {editingPlan && (
        <EditPlanModal
          plan={editingPlan}
          isPending={updateMutation.isPending}
          onClose={() => setEditingPlan(null)}
          onSave={(updatedData) =>
            updateMutation.mutate({ planId: editingPlan.id, data: updatedData })
          }
        />
      )}
    </div>
  );
}

interface EditPlanModalProps {
  plan: PlatformPlanItem;
  isPending: boolean;
  onClose: () => void;
  onSave: (data: Partial<PlatformPlanItem> & { quotas: PlatformPlanItem["quotas"] }) => void;
}

function EditPlanModal({ plan, isPending, onClose, onSave }: EditPlanModalProps) {
  const [name, setName] = useState(plan.name);
  const [tagline, setTagline] = useState(plan.tagline);
  const [price, setPrice] = useState(plan.price);
  const [billing, setBilling] = useState(plan.billing);
  const [maxClients, setMaxClients] = useState(plan.quotas.max_clients);
  const [teamSeats, setTeamSeats] = useState(plan.quotas.team_seats);
  const [storageGb, setStorageGb] = useState(plan.quotas.storage_gb);
  const [featuresText, setFeaturesText] = useState(plan.features.join("\n"));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const features = featuresText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    onSave({
      name,
      tagline,
      price: Number(price),
      billing,
      features,
      quotas: {
        ...plan.quotas,
        max_clients: Number(maxClients),
        team_seats: Number(teamSeats),
        storage_gb: Number(storageGb),
      },
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-app-surface border border-app-line rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between p-5 border-b border-app-line">
          <div>
            <h2 className="text-lg font-black text-hi">Edit SaaS Plan ({plan.id.toUpperCase()})</h2>
            <p className="text-xs text-app-mist">Update pricing, quotas, and included features in the catalog</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-app-mist hover:text-hi hover:bg-app-base transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-app-mist mb-1">Plan Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl bg-app-base border border-app-line text-sm text-hi focus:outline-none focus:border-app-accent"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-app-mist mb-1">Price (₹ INR)</label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                required
                min={0}
                className="w-full px-3 py-2 rounded-xl bg-app-base border border-app-line text-sm text-hi focus:outline-none focus:border-app-accent"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-app-mist mb-1">Billing Interval</label>
              <select
                value={billing}
                onChange={(e) => setBilling(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-app-base border border-app-line text-sm text-hi focus:outline-none focus:border-app-accent"
              >
                <option value="monthly">Monthly</option>
                <option value="annual">Annual</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-app-mist mb-1">Storage Quota (GB)</label>
              <input
                type="number"
                value={storageGb}
                onChange={(e) => setStorageGb(Number(e.target.value))}
                required
                min={1}
                className="w-full px-3 py-2 rounded-xl bg-app-base border border-app-line text-sm text-hi focus:outline-none focus:border-app-accent"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-app-mist mb-1">Max Clients (-1 for ∞)</label>
              <input
                type="number"
                value={maxClients}
                onChange={(e) => setMaxClients(Number(e.target.value))}
                required
                className="w-full px-3 py-2 rounded-xl bg-app-base border border-app-line text-sm text-hi focus:outline-none focus:border-app-accent"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-app-mist mb-1">Team Seats (-1 for ∞)</label>
              <input
                type="number"
                value={teamSeats}
                onChange={(e) => setTeamSeats(Number(e.target.value))}
                required
                className="w-full px-3 py-2 rounded-xl bg-app-base border border-app-line text-sm text-hi focus:outline-none focus:border-app-accent"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-app-mist mb-1">Tagline</label>
            <input
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-app-base border border-app-line text-sm text-hi focus:outline-none focus:border-app-accent"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-app-mist mb-1">
              Included Features (one per line)
            </label>
            <textarea
              rows={4}
              value={featuresText}
              onChange={(e) => setFeaturesText(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-app-base border border-app-line text-xs font-mono text-hi focus:outline-none focus:border-app-accent leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-app-line">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-app-base hover:bg-app-line text-xs font-bold text-app-mist hover:text-hi transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-app-accent hover:bg-[#688EC9] text-xs font-black text-black transition-all cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isPending ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
