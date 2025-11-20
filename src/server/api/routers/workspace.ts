import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

export const workspaceRouter = createTRPCRouter({
    createPage: protectedProcedure
        .input(z.object({ workspaceId: z.string(), folderId: z.string().optional() }))
        .mutation(async ({ ctx, input }) => {
            return ctx.db.page.create({
                data: {
                    title: "Untitled",
                    workspaceId: input.workspaceId,
                    folderId: input.folderId,
                },
            });
        }),

    createFolder: protectedProcedure
        .input(z.object({ workspaceId: z.string(), parentId: z.string().optional(), name: z.string() }))
        .mutation(async ({ ctx, input }) => {
            return ctx.db.folder.create({
                data: {
                    name: input.name,
                    workspaceId: input.workspaceId,
                    parentId: input.parentId,
                },
            });
        }),
});
