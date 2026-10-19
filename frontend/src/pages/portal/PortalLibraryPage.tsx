import { useState } from "react";
import { Search, Download, Loader2, Film } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../lib/auth-context";
import { useOnboardingGate } from "../../lib/useOnboardingGate";
import { downloadApprovedZip, fetchPortalDeliverables } from "../../lib/deliverables-api";
import { SubscriptionLockedState } from "../../components/portal/SubscriptionLockedState";

const LIBRARY_STATUSES = new Set(["approved", "scheduled", "publishing", "published", "publish_failed"]);
const TYPE_KEYS: Record<string, string> = {
  reel: "REEL",
  static_post: "POST",
  carousel: "CAROUSEL",
  story: "STORY",
};

export function PortalLibraryPage() {
  const { user } = useAuth();
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const gate = useOnboardingGate();

  const { data: response, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["portal-library", user?.id],
    queryFn: () => fetchPortalDeliverables(user?.id || "", undefined, 100),
    enabled: !!user?.id && gate.isComplete,
    retry: false,
  });

  // Only approved work belongs in the library (App Flow 5.1 step 15).
  const assets = (response?.items || [])
    .filter((item) => LIBRARY_STATUSES.has(item.status))
    .map((item) => ({
      id: item.id,
      status: item.status === "published" ? "Published" : item.status === "scheduled" ? "Scheduled" : "Approved",
      type: TYPE_KEYS[item.deliverable_type] || "POST",
      typeLabel: item.type_label,
      title: item.title,
      previewUrl: item.file_url,
      isVideo: item.is_video,
      downloadUrl: item.download_url,
      firstRound: (item.revisions_used || 0) === 0,
    }));

  const counts = {
    total: assets.length,
    reels: assets.filter(a => a.type === "REEL").length,
    carousels: assets.filter(a => a.type === "CAROUSEL").length,
    posts: assets.filter(a => a.type === "POST").length,
    stories: assets.filter(a => a.type === "STORY").length,
  };
  const firstRoundPct = assets.length ? Math.round((assets.filter(a => a.firstRound).length / assets.length) * 100) : null;

  const filteredAssets = assets.filter(a => {
    const matchesFilter = filter === "All" || filter.toUpperCase().startsWith(a.type);
    const matchesSearch = a.title.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  if (gate.error) return <div role="alert" className="p-6">Could not load your workspace. <button className="underline" onClick={() => void gate.refetch()}>Retry</button></div>;
  if (!gate.isReady) return <div role="status" className="p-6 animate-pulse">Loading your library…</div>;
  if (!gate.isComplete) {
    return (
      <div className="w-full">
        <SubscriptionLockedState
          title="Asset Library Locked"
          description="Complete setup to access your finished assets."
        />
      </div>
    );
  }

  const handleDownload = async (id: string, url?: string | null) => {
    setDownloadError(null);
    setDownloading(id);
    try {
      if (id === "all") {
        await downloadApprovedZip();
      } else if (url) {
        // Signed with an attachment disposition, so the browser saves the file.
        const a = document.createElement("a");
        a.href = url;
        a.rel = "noopener";
        document.body.appendChild(a);
        a.click();
        a.remove();
      } else {
        setDownloadError("This file's download link is unavailable. Refresh the page and try again.");
      }
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : "Download failed. Please try again.");
    } finally {
      setDownloading(null);
    }
  };

  if (isError) {
    return (
      <div role="alert" className="p-6 text-hi">
        {error.message || "Could not load your library."}{" "}
        <button className="underline" onClick={() => void refetch()}>Retry</button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="w-8 h-8 text-app-accent animate-spin" />
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8 pb-12 overflow-x-hidden">
      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-3">
        <div className="relative w-full sm:w-auto">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-app-mist" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search posts, captions..."
            className="w-full sm:w-[280px] pl-10 pr-4 py-2.5 bg-app-surface border border-app-line rounded-xl text-sm text-hi placeholder:text-app-mist focus:outline-none focus:border-app-accent focus:ring-1 focus:ring-app-accent transition-all"
          />
        </div>
        <button
          onClick={() => handleDownload("all")}
          disabled={assets.length === 0 || downloading === "all"}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-app-surface border border-app-line hover:bg-hi/[0.04] transition-colors rounded-xl text-sm font-medium text-hi shrink-0 disabled:opacity-50 cursor-pointer"
        >
          {downloading === "all" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          Download all
        </button>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 bg-app-surface border border-app-line rounded-2xl divide-y sm:divide-y-0 sm:divide-x divide-hi/[0.05]">
        <div className="p-5 sm:p-6">
          <p className="text-xs text-app-mist font-medium mb-1.5">Delivered since joining</p>
          <p className="text-3xl font-semibold text-hi mb-1">{counts.total}</p>
          <p className="text-xs text-app-mist">assets, all yours to keep</p>
        </div>
        <div className="p-5 sm:p-6">
          <p className="text-xs text-app-mist font-medium mb-1.5">Published</p>
          <p className="text-3xl font-semibold text-hi mb-1">{assets.filter(a => a.status === "Published").length}</p>
          <p className="text-xs text-app-mist">to your socials</p>
        </div>
        <div className="p-5 sm:p-6">
          <p className="text-xs text-app-mist font-medium mb-1.5">First-round approvals</p>
          <p className="text-3xl font-semibold text-hi mb-1">{firstRoundPct === null ? "—" : `${firstRoundPct}%`}</p>
          <p className="text-xs text-app-mist">approved without a revision</p>
        </div>
        <div className="p-5 sm:p-6">
          <p className="text-xs text-app-mist font-medium mb-1.5">Videos</p>
          <p className="text-3xl font-semibold text-hi mb-1">{assets.filter(a => a.isVideo).length}</p>
          <p className="text-xs text-app-mist">reels and video stories</p>
        </div>
      </div>

      {downloadError && (
        <div role="alert" className="text-sm text-app-warm bg-app-warm/10 border border-app-warm/30 rounded-xl px-4 py-3">
          {downloadError}
        </div>
      )}

      {/* Filters & Notice */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-app-line pb-4">
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
                  ? "bg-hi/[0.08] text-hi"
                  : "text-app-mist hover:text-hi hover:bg-hi/[0.04]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-app-mist">
          Every file comes in full resolution with captions and hashtags.
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 min-h-[400px]">
        {filteredAssets.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center text-app-mist py-20 border border-dashed border-hi/[0.1] rounded-2xl">
            <Search className="w-8 h-8 mb-4 opacity-50" />
            <p className="text-sm font-medium text-hi/80">{search ? "No assets match your search" : "No deliverables in your library yet"}</p>
            <p className="text-xs text-app-mist mt-1">{search ? "Try searching for a different keyword" : "Completed content produced by your pod will appear here."}</p>
          </div>
        ) : (
          filteredAssets.map((asset, i) => {
            let badgeClass = "bg-app-line text-app-ink"; // default / Scheduled
            if (asset.status === "Needs you") badgeClass = "bg-app-warm/15 text-app-warm";
            else if (asset.status === "Approved") badgeClass = "bg-app-accent/90 text-hi";
            else if (asset.status === "Published") badgeClass = "bg-app-accent/15 text-app-accent-soft";

            return (
              <div 
                key={asset.id} 
                className="group bg-app-surface border border-app-line rounded-2xl overflow-hidden hover:border-hi/[0.1] transition-all animate-in fade-in zoom-in-95 duration-500 fill-mode-both"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                {/* Image Box */}
                <div className="relative aspect-square overflow-hidden bg-app-base flex items-center justify-center">
                  {asset.previewUrl && asset.isVideo ? (
                    <video
                      src={`${asset.previewUrl}#t=0.5`}
                      muted
                      playsInline
                      preload="metadata"
                      className="w-full h-full object-cover"
                    />
                  ) : asset.previewUrl ? (
                    <img
                      src={asset.previewUrl}
                      alt={asset.title}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : asset.isVideo ? (
                    <Film className="w-6 h-6 text-app-mist" />
                  ) : (
                    <div className="text-center p-4">
                      <span className="text-xs font-bold text-app-mist tracking-wider uppercase">{asset.type}</span>
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
                    <p className="text-[11px] font-bold tracking-wider text-app-mist uppercase mb-1">
                      {asset.typeLabel}
                    </p>
                    <p className="text-sm font-semibold text-hi truncate">
                      {asset.title}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDownload(asset.id, asset.downloadUrl)}
                    aria-label={`Download ${asset.title}`}
                    className="w-8 h-8 rounded-full bg-hi/[0.05] flex items-center justify-center text-app-mist hover:text-hi hover:bg-hi/[0.1] transition-colors shrink-0"
                  >
                    {downloading === asset.id ? <Loader2 className="w-3.5 h-3.5 animate-spin text-hi" /> : <Download className="w-3.5 h-3.5" />}
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
