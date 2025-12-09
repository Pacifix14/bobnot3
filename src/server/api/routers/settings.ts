import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

export const settingsRouter = createTRPCRouter({
  // Get user settings
  getSettings: protectedProcedure.query(async ({ ctx }) => {
    const settings = await ctx.db.userSettings.findUnique({
      where: { userId: ctx.session.user.id },
    });

    // Return default settings if not found
    if (!settings) {
      return {
        sidebarVersion: "v1",
        backgroundImage: null,
      };
    }

    return {
      sidebarVersion: settings.sidebarVersion,
      backgroundImage: settings.backgroundImage,
    };
  }),

  // Update sidebar version
  updateSidebarVersion: protectedProcedure
    .input(z.object({ version: z.enum(["v1", "v2"]) }))
    .mutation(async ({ ctx, input }) => {
      const settings = await ctx.db.userSettings.upsert({
        where: { userId: ctx.session.user.id },
        update: {
          sidebarVersion: input.version,
        },
        create: {
          userId: ctx.session.user.id,
          sidebarVersion: input.version,
        },
      });

      return settings;
    }),

  // Update background image
  updateBackgroundImage: protectedProcedure
    .input(
      z.object({
        backgroundImage: z.string().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const settings = await ctx.db.userSettings.upsert({
        where: { userId: ctx.session.user.id },
        update: {
          backgroundImage: input.backgroundImage,
        },
        create: {
          userId: ctx.session.user.id,
          backgroundImage: input.backgroundImage,
        },
      });

      return settings;
    }),
});
