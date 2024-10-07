import { query, mutation, QueryCtx } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},  
  handler: async (ctx) => {
    // Grab the most recent messages.
    const messages = await ctx.db.query("messages").order("desc").take(100);
    return messages;
  },
});

export const create = mutation({
  args: {
    id: v.string(),
    author: v.string(),
    body: v.string(),
  },
  handler: async (ctx, args) => {    
    const existing = await get(ctx, args.id);
    if (existing) {
      throw new Error(`Message ${args.id} already exists.`);
    }
    await ctx.db.insert("messages", args);
  }
})

export const update = mutation({
  args: { id: v.string(), body: v.optional(v.string()), author: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const existing = await get(ctx, args.id);
    if (!existing) {
      throw new Error(`Message ${args.id} does not exist.`);
    }
    if (args.body !== undefined) {
      existing.body = args.body;
    }
    if (args.author !== undefined) {  
      existing.author = args.author;
    }
    await ctx.db.replace(existing._id, existing);    
  },
});

export const remove = mutation({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const existing = await get(ctx, args.id);
    if (!existing) {
      throw new Error(`Message ${args.id} does not exist.`);
    }
    await ctx.db.delete(existing._id);
  }
})

async function get(ctx: QueryCtx, id: string) {
  return await ctx.db.query("messages").withIndex("id", q => q.eq("id", id)).unique();
}
