"use client";

import { Message } from "@/Chat/Message";
import { MessageList } from "@/Chat/MessageList";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { syncedConvex } from "@/lib/convex";
import { observable } from "@legendapp/state";
import { observer, useObservable } from "@legendapp/state/react";
import { configureSynced } from "@legendapp/state/sync";
import { ObservablePersistLocalStorage } from "@legendapp/state/persist-plugins/local-storage";
import { ConvexClient } from "convex/browser";
import { FormEvent, useState } from "react";
import { api } from "../../convex/_generated/api";
import { v4 as uuidv4 } from "uuid";
import { useConvex } from "convex/react";

const generateId = () => uuidv4();

const sync = configureSynced(syncedConvex, {
  persist: {
    plugin: ObservablePersistLocalStorage,
    retrySync: true,
  },
  onError: (error) => {
    console.error("Sync error", error);
  },
});

// Observable in JS
const convex = new ConvexClient(import.meta.env.VITE_CONVEX_URL as string);
const obs$ = observable(() =>
  sync({
    convex,
    query: api.messages.list,
    create: api.messages.send,
    persist: {
      name: "convexLS1",
    },
  }),
);

export const Chat = observer(function Chat({ viewer }: { viewer: string }) {
  const [newMessageText, setNewMessageText] = useState("");
  const convexClient = useConvex();
  const obs2$ = useObservable(() =>
    sync({
      convex: convexClient,
      query: api.messages.list,
      queryArgs: {}, // Optional
      create: api.messages.send,
      update: api.messages.send,
      persist: {
        name: "convexLS2",
      },
    }),
  );

  const messages = Object.values(obs$.get() || {});
  const messages2 = Object.values(obs2$.get() || {});

  console.log("messages", messages2, messages);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNewMessageText("");
    const id = generateId();
    obs$[id].assign({ id, body: newMessageText, author: viewer });
  };

  return (
    <>
      <MessageList messages={messages}>
        {messages?.map((message) => (
          <Message key={message._id} author={message.author} viewer={viewer}>
            {message.body}
          </Message>
        ))}
      </MessageList>
      <div className="border-t">
        <form onSubmit={handleSubmit} className="container flex gap-2 py-4">
          <Input
            value={newMessageText}
            onChange={(event) => setNewMessageText(event.target.value)}
            placeholder="Write a message…"
          />
          <Button type="submit" disabled={newMessageText === ""}>
            Send
          </Button>
        </form>
      </div>
    </>
  );
});
