"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ImageIcon } from "lucide-react";

function GalleryEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 py-16">
      <ImageIcon className="size-12 text-gray-300" />
      <p className="mt-4 text-sm font-medium text-gray-400">
        Portfolio coming soon
      </p>
      <p className="mt-1 text-xs text-gray-300">
        Real work samples will be displayed here.
      </p>
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
          <GalleryEmptyState />
        </TabsContent>
        <TabsContent value="creatives">
          <GalleryEmptyState />
        </TabsContent>
        <TabsContent value="reels">
          <GalleryEmptyState />
        </TabsContent>
      </Tabs>
    </div>
  );
}
