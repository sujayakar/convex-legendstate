import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    // Grab the most recent messages.
    const messages = await ctx.db.query("messages").order("desc").take(100);
    return messages;
  },
});

export const send = mutation({
  args: { id: v.string(), body: v.string(), author: v.string() },
  handler: async (ctx, { id, body, author }) => {
    // Send a new message.
    await ctx.db.insert("messages", { id, body, author });
  },
});

// export const update = mutation({
//   args: { id: v.string(), body: v.string(), author: v.string() },
//   handler: async (ctx, { id, body, author }) => {
//     // Update message
//     // TODO: How to do this with custom id field?
//     await ctx.db.patch(id, { body, author})
//   },
// });
