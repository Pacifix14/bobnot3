"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/trpc/react";
import { Loader2, UserPlus, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/components/toast-provider";

/**
 * Maps TRPC errors to user-friendly messages
 */
function getErrorMessage(error: unknown): string {
    // Handle TRPC errors
    if (error && typeof error === 'object' && 'data' in error) {
        const trpcError = error as {
            data?: {
                zodError?: {
                    fieldErrors?: Record<string, string[]>;
                    formErrors?: string[];
                };
                code?: string;
            };
            message?: string;
            code?: string;
        };

        // Check for Zod validation errors (invalid email format)
        if (trpcError.data?.zodError) {
            const zodError = trpcError.data.zodError;
            // Check for email field errors
            if (zodError.fieldErrors?.email) {
                return "Please enter a valid email address";
            }
            // Check for form errors
            if (zodError.formErrors && zodError.formErrors.length > 0) {
                const firstError = zodError.formErrors[0];
                return firstError ?? "Please enter a valid email address";
            }
        }

        // Map TRPC error codes to user-friendly messages
        const code = trpcError.data?.code ?? trpcError.code;
        const message = trpcError.message;

        switch (code) {
            case "BAD_REQUEST":
                // Check for specific error messages
                if (message?.includes("already a collaborator")) {
                    return "This user is already a collaborator on this page";
                }
                if (message?.includes("Owner is already")) {
                    return "The workspace owner is already a collaborator";
                }
                return message ?? "Invalid request. Please try again.";
            
            case "NOT_FOUND":
                if (message?.includes("User with this email")) {
                    return "No account found with this email address. The user must sign up first.";
                }
                if (message?.includes("Page not found")) {
                    return "Page not found. It may have been deleted.";
                }
                return message ?? "Resource not found.";
            
            case "FORBIDDEN":
                if (message?.includes("Only the owner can")) {
                    return "Only the workspace owner can manage collaborators";
                }
                return message ?? "You don't have permission to perform this action.";
            
            case "UNAUTHORIZED":
                return "Please sign in to continue.";
            
            default:
                // If there's a user-friendly message, use it
                if (message && !message.includes("TRPCError") && !message.includes("ZodError")) {
                    return message;
                }
                return "An unexpected error occurred. Please try again.";
        }
    }

    // Handle network errors
    if (error instanceof Error) {
        if (error.message.includes("fetch") || error.message.includes("network")) {
            return "Network error. Please check your connection and try again.";
        }
        // If it's a plain Error with a user-friendly message, use it
        if (!error.message.includes("TRPCError") && !error.message.includes("ZodError")) {
            return error.message;
        }
    }

    // Fallback for unknown errors
    return "An unexpected error occurred. Please try again.";
}

/**
 * Validates email format on the client side
 */
function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
}

export function ShareDialog({ pageId }: { pageId: string }) {
    const [email, setEmail] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const [emailError, setEmailError] = useState<string | null>(null);
    const utils = api.useUtils();
    const { showToast } = useToast();

    const { data: collaborators, isLoading: isLoadingCollaborators } = api.page.getCollaborators.useQuery(
        { pageId },
        { enabled: isOpen }
    );

    const addCollaborator = api.page.addCollaborator.useMutation({
        onSuccess: () => {
            setEmail("");
            setEmailError(null);
            showToast("Collaborator added successfully", "success");
            void utils.page.getCollaborators.invalidate({ pageId });
        },
        onError: (error) => {
            const errorMessage = getErrorMessage(error);
            showToast(errorMessage, "error");
            setEmailError(errorMessage);
        }
    });

    const removeCollaborator = api.page.removeCollaborator.useMutation({
        onSuccess: () => {
            showToast("Collaborator removed successfully", "success");
            void utils.page.getCollaborators.invalidate({ pageId });
        },
        onError: (error) => {
            const errorMessage = getErrorMessage(error);
            showToast(errorMessage, "error");
        }
    });

    const handleInvite = () => {
        // Clear previous errors
        setEmailError(null);

        // Client-side validation
        const trimmedEmail = email.trim();
        
        if (!trimmedEmail) {
            const errorMsg = "Please enter an email address";
            setEmailError(errorMsg);
            showToast(errorMsg, "error");
            return;
        }

        if (!isValidEmail(trimmedEmail)) {
            const errorMsg = "Please enter a valid email address";
            setEmailError(errorMsg);
            showToast(errorMsg, "error");
            return;
        }

        // If validation passes, make the API call
        addCollaborator.mutate({ pageId, email: trimmedEmail });
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                    <UserPlus className="h-6 w-6" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Share Page</DialogTitle>
                    <DialogDescription>
                        Invite others to collaborate on this page.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-2">
                    <div className="flex items-start space-x-2">
                        <div className="flex-1">
                            <Input
                                placeholder="Email address"
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value);
                                    // Clear error when user starts typing
                                    if (emailError) {
                                        setEmailError(null);
                                    }
                                }}
                                onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
                                className={emailError ? "border-destructive" : ""}
                            />
                        </div>
                        <Button 
                            onClick={handleInvite} 
                            disabled={addCollaborator.isPending || !email.trim()}
                            className="shrink-0"
                        >
                            {addCollaborator.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Invite"}
                        </Button>
                    </div>
                    {emailError && (
                        <p className="text-sm text-destructive min-h-[1.25rem]">{emailError}</p>
                    )}
                    {!emailError && <div className="min-h-[1.25rem]" />}
                </div>
                <div className="mt-4">
                    <h4 className="text-sm font-medium mb-2">Collaborators</h4>
                    <div className="h-[200px] w-full rounded-md border p-4 overflow-y-auto">
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

