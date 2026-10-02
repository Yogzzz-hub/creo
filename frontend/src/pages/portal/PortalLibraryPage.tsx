import { useState } from "react";
import { Search, Download, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../lib/auth-context";
import { useOnboardingGate } from "../../lib/useOnboardingGate";
import { fetchPortalDeliverables } from "../../lib/deliverables-api";
import { SubscriptionLockedState } from "../../components/portal/SubscriptionLockedState";

export function PortalLibraryPage() {
  const { user } = useAuth();
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [downloading, setDownloading] = useState<string | null>(null);

  const gate = useOnboardingGate();

  const { data: response, isLoading } = useQuery({
    queryKey: ["portal-library", user?.id],
    queryFn: () => fetchPortalDeliverables(user?.id || "", undefined, 100),
    enabled: !!user?.id && gate.isComplete,
  });

  const rawItems = response?.items || [];
  
  // Transform real items into library format
  const realAssets = rawItems.map((item: any) => ({
    id: item.id,
    status: item.status === "pending_approval" ? "Needs you" : item.status === "approved" ? "Approved" : item.status === "in_production" ? "Scheduled" : "Published",
    type: (item.type || (item.file_type?.includes("video") ? "reel" : "post")).toUpperCase(),
    title: item.title || `${item.type || "Asset"} Draft`,
    image: item.thumbnail_url || item.file_url || "",
    fileUrl: item.file_url
  }));

  const assets = realAssets;

  const counts = {
    total: assets.length,
    reels: assets.filter(a => a.type === "REEL").length,
    carousels: assets.filter(a => a.type === "CAROUSEL").length,
    posts: assets.filter(a => a.type === "POST").length,
    stories: assets.filter(a => a.type === "STORY").length,
  };

  const filteredAssets = assets.filter(a => {
    const matchesFilter = filter === "All" || filter.toUpperCase().startsWith(a.type);
    const matchesSearch = a.title.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  if (!gate.isComplete) {
    return (
      <div className="flex items-center justify-center py-6 sm:py-10">
        <SubscriptionLockedState
          title="Asset Library Locked"
          description="Your finished master renders and brand assets library will activate once your onboarding setup is completed."
        />
      </div>
    );
  }

  const handleDownload = (id: string, url?: string) => {
    setDownloading(id);
    setTimeout(() => {
      if (url) {
        const a = document.createElement("a");
        a.href = url;
        a.download = true.toString();
        a.click();
      }
      setDownloading(null);
    }, 1000);
  };

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="w-8 h-8 text-nebula-glow animate-spin" />
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8 pb-12 overflow-x-hidden">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold tracking-[0.15em] text-nebula-mist uppercase mb-1">
            EVERYTHING WE HAVE MADE FOR YOU
          </p>
          <h1 className="text-3xl font-semibold text-white">Library</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-nebula-mist" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search posts, captions..."
              className="w-full sm:w-[280px] pl-10 pr-4 py-2.5 bg-nebula-surface border border-nebula-steel rounded-xl text-sm text-white placeholder:text-nebula-mist focus:outline-none focus:border-nebula-glow focus:ring-1 focus:ring-nebula-glow transition-all"
            />
          </div>
          <button 
            onClick={() => handleDownload("all")}
            className="flex items-center gap-2 px-4 py-2.5 bg-nebula-surface border border-nebula-steel hover:bg-white/[0.04] transition-colors rounded-xl text-sm font-medium text-white shrink-0"
          >
            {downloading === "all" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Download all
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 bg-nebula-surface border border-nebula-steel rounded-2xl divide-y sm:divide-y-0 sm:divide-x divide-white/[0.05]">
        <div className="p-5 sm:p-6">
          <p className="text-xs text-nebula-mist font-medium mb-1.5">Delivered since joining</p>
          <p className="text-3xl font-semibold text-white mb-1">{counts.total}</p>
          <p className="text-xs text-nebula-mist">assets, all yours to keep</p>
        </div>
        <div className="p-5 sm:p-6">
          <p className="text-xs text-nebula-mist font-medium mb-1.5">Published</p>
          <p className="text-3xl font-semibold text-white mb-1">{assets.filter(a => a.status === "Published").length}</p>
          <p className="text-xs text-nebula-mist">to your socials</p>
        </div>
        <div className="p-5 sm:p-6">
          <p className="text-xs text-nebula-mist font-medium mb-1.5">First-round approvals</p>
          <p className="text-3xl font-semibold text-white mb-1">94%</p>
          <p className="text-xs text-nebula-mist">across all batches</p>
        </div>
        <div className="p-5 sm:p-6">
          <p className="text-xs text-nebula-mist font-medium mb-1.5">Brand files</p>
          <p className="text-3xl font-semibold text-white mb-1">12</p>
          <p className="text-xs text-nebula-mist">logos, fonts, photos</p>
        </div>
      </div>

      {/* Filters & Notice */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-nebula-steel pb-4">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: "All", label: `All ${counts.total}` },
            { id: "Reels", label: `Reels ${counts.reels}` },
            { id: "Carousels", label: `Carousels ${counts.carousels}` },
            { id: "Posts", label: `Posts ${counts.posts}` },
            { id: "Stories", label: `Stories ${counts.stories}` }
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition-colors ${
                filter === f.id
                  ? "bg-white/[0.08] text-white"
                  : "text-nebula-mist hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-nebula-mist">
          Every file comes in full resolution with captions and hashtags.
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 min-h-[400px]">
        {filteredAssets.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center text-nebula-mist py-20 border border-dashed border-white/[0.1] rounded-2xl">
            <Search className="w-8 h-8 mb-4 opacity-50" />
            <p className="text-sm font-medium text-white/80">{search ? "No assets match your search" : "No deliverables in your library yet"}</p>
            <p className="text-xs text-nebula-mist mt-1">{search ? "Try searching for a different keyword" : "Completed content produced by your pod will appear here."}</p>
          </div>
        ) : (
          filteredAssets.map((asset, i) => {
            let badgeClass = "bg-nebula-steel text-slate-50"; // default / Scheduled
            if (asset.status === "Needs you") badgeClass = "bg-nebula-sand/15 text-nebula-sand";
            else if (asset.status === "Approved") badgeClass = "bg-nebula-glow/90 text-white";
            else if (asset.status === "Published") badgeClass = "bg-nebula-glow/15 text-nebula-periwinkle";

            return (
              <div 
                key={asset.id} 
                className="group bg-nebula-surface border border-nebula-steel rounded-2xl overflow-hidden hover:border-white/[0.1] transition-all animate-in fade-in zoom-in-95 duration-500 fill-mode-both"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                {/* Image Box */}
                <div className="relative aspect-square overflow-hidden bg-nebula-navy flex items-center justify-center">
                  {asset.image ? (
                    <img
                      src={asset.image}
                      alt={asset.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="text-center p-4">
                      <span className="text-xs font-bold text-nebula-mist tracking-wider uppercase">{asset.type}</span>
                    </div>
                  )}
                  <div className="absolute top-3 left-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium backdrop-blur-md ${badgeClass}`}>
                      {asset.status}
                    </span>
                  </div>
                </div>
                
                {/* Content Box */}
                <div className="p-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold tracking-wider text-nebula-mist uppercase mb-1">
                      {asset.type}
                    </p>
                    <p className="text-sm font-semibold text-white truncate">
                      {asset.title}
                    </p>
                  </div>
                  <button 
                    onClick={() => handleDownload(asset.id, (asset as any).fileUrl)}
                    className="w-8 h-8 rounded-full bg-white/[0.05] flex items-center justify-center text-nebula-mist hover:text-white hover:bg-white/[0.1] transition-colors shrink-0"
                  >
                    {downloading === asset.id ? <Loader2 className="w-3.5 h-3.5 animate-spin text-white" /> : <Download className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
