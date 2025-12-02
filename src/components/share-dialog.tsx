"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/trpc/react";
import { Loader2, Share2, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function ShareDialog({ pageId }: { pageId: string }) {
    const [email, setEmail] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const utils = api.useUtils();

    const { data: collaborators, isLoading: isLoadingCollaborators } = api.page.getCollaborators.useQuery(
        { pageId },
        { enabled: isOpen }
    );

    const addCollaborator = api.page.addCollaborator.useMutation({
        onSuccess: () => {
            setEmail("");
            void utils.page.getCollaborators.invalidate({ pageId });
        },
        onError: (error) => {
            alert(error.message);
        }
    });

    const removeCollaborator = api.page.removeCollaborator.useMutation({
        onSuccess: () => {
            void utils.page.getCollaborators.invalidate({ pageId });
        },
        onError: (error) => {
            alert(error.message);
        }
    });

    const handleInvite = () => {
        if (!email) return;
        addCollaborator.mutate({ pageId, email });
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <Share2 className="h-4 w-4" />
                    Share
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Share Page</DialogTitle>
                    <DialogDescription>
                        Invite others to collaborate on this page.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 md:space-x-2">
                    <div className="grid flex-1 gap-2">
                        <Input
                            placeholder="Email address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
                        />
                    </div>
                    <Button onClick={handleInvite} disabled={addCollaborator.isPending || !email} className="w-full md:w-auto">
                        {addCollaborator.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Invite"}
                    </Button>
                </div>
                <div className="mt-4">
                    <h4 className="text-sm font-medium mb-2">Collaborators</h4>
                    <div className="h-[200px] w-full rounded-md border p-3 md:p-4 overflow-y-auto">
                        {isLoadingCollaborators ? (
                            <div className="flex justify-center py-4">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : collaborators?.length === 0 ? (
                            <div className="text-center py-4 text-sm text-muted-foreground">
                                No collaborators yet.
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {collaborators?.map((user) => (
                                    <div key={user.id} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Avatar className="h-8 w-8">
                                                <AvatarImage src={user.image ?? undefined} />
                                                <AvatarFallback>{user.name?.[0] ?? "U"}</AvatarFallback>
                                            </Avatar>
                                            <div className="grid gap-0.5">
                                                <span className="text-sm font-medium">{user.name ?? "User"}</span>
                                                <span className="text-xs text-muted-foreground">{user.email}</span>
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-destructive hover:text-destructive/90"
                                            onClick={() => removeCollaborator.mutate({ pageId, userId: user.id })}
                                            disabled={removeCollaborator.isPending}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

