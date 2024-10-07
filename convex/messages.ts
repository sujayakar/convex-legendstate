import { query, mutation, QueryCtx } from "./_generated/server";
import { ConvexError, v } from "convex/values";

export const list = query({
  args: {},
  returns: v.array(
    v.object({
      localId: v.string(),
      createdAt: v.number(),
      author: v.string(),
      body: v.string(),
    }),
  ),
  handler: async (ctx) => {
    // Grab the most recent messages.
    const messages = await ctx.db.query("messages").order("desc").take(100);
    return messages.map((m) => {
      // Strip out system provided fields since the client can't generate them.
      const { _id, _creationTime, ...rest } = m;
      return rest;
    });
  },
});

export const create = mutation({
  args: {
    localId: v.string(),
    createdAt: v.number(),
    body: v.string(),
    author: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await get(ctx, args.localId);
    if (existing) {
      throw new Error(`Document ${args.localId} already exists.`);
    }
    const id = await ctx.db.insert("messages", args);
    const { _id, _creationTime, ...rest } = (await ctx.db.get(id))!;
    return rest;
  },
});

export const update = mutation({
  args: {
    localId: v.string(),
    createdAt: v.optional(v.number()),
    body: v.optional(v.string()),
    author: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await get(ctx, args.localId);
    if (!existing) {
      throw new Error(`Document ${args.localId} does not exist.`);
    }
    if (args.createdAt) {
      existing.createdAt = args.createdAt;
    }
    if (args.body) {
      existing.body = args.body;
    }
    if (args.author) {
      existing.author = args.author;
    }
    await ctx.db.replace(existing._id, existing);
    const { _id, _creationTime, ...rest } = existing;
    return rest;
  },
});

export const remove = mutation({
  args: { localId: v.string() },
  handler: async (ctx, args) => {
    const existing = await get(ctx, args.localId);
    if (!existing) {
      throw new Error(`Document ${args.localId} does not exist.`);
    }
    await ctx.db.delete(existing._id);
    const { _id, _creationTime, ...rest } = existing;
    return rest;
  },
});

async function get(ctx: QueryCtx, localId: string) {
  return await ctx.db
    .query("messages")
    .withIndex("byLocalId", (q) => q.eq("localId", localId))
    .unique();
}
