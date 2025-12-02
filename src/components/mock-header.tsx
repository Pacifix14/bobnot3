import { Button } from "@/components/ui/button";
import { Share, MoreHorizontal, Play } from "lucide-react";

export function MockHeader() {
  return (
    <div className="flex flex-col md:flex-row gap-8 items-end p-8 max-w-5xl mx-auto bg-background/50 backdrop-blur-sm rounded-xl border border-border/50">
      {/* Cover Image Placeholder - Square aspect ratio like album art */}
      <div className="w-full md:w-60 md:h-60 aspect-square bg-muted rounded-lg shadow-2xl flex items-center justify-center text-muted-foreground shrink-0 overflow-hidden relative group cursor-pointer border-2 border-dashed border-transparent hover:border-primary/50 transition-all">
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-60" />
        <span className="font-medium z-10 text-white drop-shadow-md">Upload Cover</span>
      </div>

      {/* Content */}
      <div className="flex flex-col gap-2 flex-1 min-w-0 pb-2">
        {/* Meta Label */}
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Public Page
        </p>

        {/* Title */}
        <h1 className="text-5xl md:text-7xl font-black tracking-tight text-foreground font-sans mb-4">
          Arctic copium
        </h1>
        
        {/* Description/User Info */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <div className="w-6 h-6 rounded-full bg-primary/20" />
          <span className="font-semibold text-foreground">Soryu</span>
          <span>•</span>
          <span>1 save</span>
          <span>•</span>
          <span>40 songs, 2 hr 22 min</span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-4">
           <Button size="icon" className="rounded-full w-14 h-14 bg-green-500 hover:bg-green-400 text-black shadow-lg hover:scale-105 transition-all">
             <Play className="w-6 h-6 fill-current ml-1" />
           </Button>
           
           <Button variant="ghost" size="icon" className="rounded-full w-10 h-10 text-muted-foreground hover:text-foreground">
             <Share className="w-5 h-5" />
           </Button>
           
           <Button variant="ghost" size="icon" className="rounded-full w-10 h-10 text-muted-foreground hover:text-foreground">
             <MoreHorizontal className="w-6 h-6" />
           </Button>
        </div>
      </div>
    </div>
  )
}
