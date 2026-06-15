"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const GALLERY_ITEMS = {
  posters: [
    { id: 1, title: "Brand Launch Poster", aspect: "aspect-[3/4]" },
    { id: 2, title: "Seasonal Sale Creative", aspect: "aspect-square" },
    { id: 3, title: "Event Announcement", aspect: "aspect-[3/4]" },
    { id: 4, title: "Product Spotlight", aspect: "aspect-square" },
    { id: 5, title: "Testimonial Card", aspect: "aspect-[3/4]" },
    { id: 6, title: "Behind The Scenes", aspect: "aspect-square" },
  ],
  creatives: [
    { id: 7, title: "Carousel — Brand Story", aspect: "aspect-square" },
    { id: 8, title: "Infographic — Tips", aspect: "aspect-[4/5]" },
    { id: 9, title: "Quote Card", aspect: "aspect-square" },
    { id: 10, title: "Announcement Banner", aspect: "aspect-[16/9]" },
    { id: 11, title: "Product Carousel", aspect: "aspect-square" },
    { id: 12, title: "Stat Graphic", aspect: "aspect-[4/5]" },
  ],
  reels: [
    { id: 13, title: "Product Reveal Reel", aspect: "aspect-[9/16]" },
    { id: 14, title: "Customer Testimonial", aspect: "aspect-[9/16]" },
    { id: 15, title: "Behind The Scenes", aspect: "aspect-[9/16]" },
    { id: 16, title: "Trend Participation", aspect: "aspect-[9/16]" },
    { id: 17, title: "Tutorial Snippet", aspect: "aspect-[9/16]" },
    { id: 18, title: "Day In The Life", aspect: "aspect-[9/16]" },
  ],
};

function GalleryGrid({ items }: { items: typeof GALLERY_ITEMS.posters }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-3">
      {items.map((item) => (
        <div
          key={item.id}
          className={`group relative overflow-hidden rounded-xl bg-brand-light transition-all duration-300 hover:shadow-lg ${item.aspect}`}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-medium text-brand/50">
              {item.title}
            </span>
          </div>
          <div className="absolute inset-0 bg-brand-dark/0 transition-all duration-300 group-hover:bg-brand-dark/10" />
        </div>
      ))}
    </div>
  );
}

export function GalleryTabs() {
  return (
    <div className="mt-10">
      <Tabs defaultValue="posters" className="w-full">
        <TabsList className="mx-auto mb-8">
          <TabsTrigger value="posters">Posters</TabsTrigger>
          <TabsTrigger value="creatives">Creatives</TabsTrigger>
          <TabsTrigger value="reels">Reels</TabsTrigger>
        </TabsList>

        <TabsContent value="posters">
          <GalleryGrid items={GALLERY_ITEMS.posters} />
        </TabsContent>
        <TabsContent value="creatives">
          <GalleryGrid items={GALLERY_ITEMS.creatives} />
        </TabsContent>
        <TabsContent value="reels">
          <GalleryGrid items={GALLERY_ITEMS.reels} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
