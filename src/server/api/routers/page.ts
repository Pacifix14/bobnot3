import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

export const pageRouter = createTRPCRouter({
  // Get page data with caching - optimized to only fetch needed fields
  getPage: protectedProcedure
    .input(z.object({ pageId: z.string() }))
    .query(async ({ ctx, input }) => {
      const page = await ctx.db.page.findUnique({
        where: { id: input.pageId },
        select: {
          id: true,
          title: true,
          coverImage: true,
          bannerImage: true,
          content: true,
          workspace: {
            select: {
              id: true,
              name: true,
              ownerId: true,
            }
          },
          collaborators: {
            select: {
              id: true,
            }
          },
          folder: {
            select: {
              id: true,
              name: true,
            }
          }
        }
      });

      if (!page) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Page not found" });
      }

      // Check access permissions
      const isOwner = page.workspace.ownerId === ctx.session.user.id;
      const isCollaborator = page.collaborators.some(c => c.id === ctx.session.user.id);

      if (!isOwner && !isCollaborator) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      return page;
    }),

  addCollaborator: protectedProcedure
    .input(z.object({ pageId: z.string(), email: z.string().email() }))
    .mutation(async ({ ctx, input }) => {
      const page = await ctx.db.page.findUnique({
        where: { id: input.pageId },
        include: { workspace: true, collaborators: true }
      });

      if (!page) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Page not found" });
      }

      if (page.workspace.ownerId !== ctx.session.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only the owner can add collaborators" });
      }

      const userToAdd = await ctx.db.user.findUnique({
        where: { email: input.email }
      });

      if (!userToAdd) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User with this email not found" });
      }

      if (userToAdd.id === page.workspace.ownerId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Owner is already a collaborator" });
      }

      if (page.collaborators.some(c => c.id === userToAdd.id)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "User is already a collaborator" });
      }

      return ctx.db.page.update({
        where: { id: input.pageId },
        data: {
          collaborators: {
            connect: { id: userToAdd.id }
          }
        }
      });
    }),

  removeCollaborator: protectedProcedure
    .input(z.object({ pageId: z.string(), userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const page = await ctx.db.page.findUnique({
        where: { id: input.pageId },
        include: { workspace: true }
      });

      if (!page) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Page not found" });
      }

      // Only owner can remove others. Users can remove themselves.
      const isOwner = page.workspace.ownerId === ctx.session.user.id;
      const isSelf = input.userId === ctx.session.user.id;

      if (!isOwner && !isSelf) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only the owner can remove collaborators" });
      }

      return ctx.db.page.update({
        where: { id: input.pageId },
        data: {
          collaborators: {
            disconnect: { id: input.userId }
          }
        }
      });
    }),

  getCollaborators: protectedProcedure
    .input(z.object({ pageId: z.string() }))
    .query(async ({ ctx, input }) => {
      const page = await ctx.db.page.findUnique({
        where: { id: input.pageId },
        include: { collaborators: true, workspace: true }
      });

      if (!page) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      // Check access: Owner or Collaborator
      const isOwner = page.workspace.ownerId === ctx.session.user.id;
      const isCollaborator = page.collaborators.some(u => u.id === ctx.session.user.id);

      if (!isOwner && !isCollaborator) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      return page.collaborators;
    }),

  // Update page title
  updateTitle: protectedProcedure
    .input(z.object({ pageId: z.string(), title: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const page = await ctx.db.page.findUnique({
        where: { id: input.pageId },
        include: { workspace: true, collaborators: true }
      });

      if (!page) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Page not found" });
      }

      // Check access permissions
      const isOwner = page.workspace.ownerId === ctx.session.user.id;
      const isCollaborator = page.collaborators.some(c => c.id === ctx.session.user.id);

      if (!isOwner && !isCollaborator) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      return ctx.db.page.update({
        where: { id: input.pageId },
        data: { title: input.title }
      });
    }),

  // Update page cover image
  updateCoverImage: protectedProcedure
    .input(z.object({ pageId: z.string(), coverImage: z.string().nullable() }))
    .mutation(async ({ ctx, input }) => {
      const page = await ctx.db.page.findUnique({
        where: { id: input.pageId },
        include: { workspace: true, collaborators: true }
      });

      if (!page) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Page not found" });
      }

      // Check access permissions
      const isOwner = page.workspace.ownerId === ctx.session.user.id;
      const isCollaborator = page.collaborators.some(c => c.id === ctx.session.user.id);

      if (!isOwner && !isCollaborator) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      return ctx.db.page.update({
        where: { id: input.pageId },
        data: { coverImage: input.coverImage }
      });
    }),

  // Update page banner image
  updateBannerImage: protectedProcedure
    .input(z.object({ pageId: z.string(), bannerImage: z.string().nullable() }))
    .mutation(async ({ ctx, input }) => {
      const page = await ctx.db.page.findUnique({
        where: { id: input.pageId },
        include: { workspace: true, collaborators: true }
      });

      if (!page) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Page not found" });
      }

      // Check access permissions
      const isOwner = page.workspace.ownerId === ctx.session.user.id;
      const isCollaborator = page.collaborators.some(c => c.id === ctx.session.user.id);

      if (!isOwner && !isCollaborator) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }

      return ctx.db.page.update({
        where: { id: input.pageId },
        data: { bannerImage: input.bannerImage }
      });
    }),
});

