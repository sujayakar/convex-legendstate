import {
  SyncedSubscribeParams,
  type SyncedGetParams,
} from "@legendapp/state/sync";
import {
  CrudAsOption,
  SyncedCrudPropsBase,
  SyncedCrudPropsMany,
  SyncedCrudReturnType,
  syncedCrud,
} from "@legendapp/state/sync-plugins/crud";

import { ConvexClient } from "convex/browser";
import { ConvexReactClient } from "convex/react";
import type { FunctionArgs, FunctionReference } from "convex/server";

interface SyncedConvexProps<
  Client extends ConvexClient | ConvexReactClient,
  Query extends FunctionReference<"query", "public", any, TRemote[]>,
  TOption extends CrudAsOption = "object",
  TRemote extends { id: string } = Query["_returnType"][number],
> extends SyncedCrudPropsMany<TRemote, TRemote, TOption>,
    Omit<
      SyncedCrudPropsBase<TRemote, TRemote>,
      "retry" | "create" | "update" | "delete" | "fieldCreatedAt" | "fieldId"
    > {
  convex: Client;
  query: Query;
  queryArgs?: FunctionArgs<Query>;
  create?: FunctionReference<"mutation", "public", NoInfer<Partial<TRemote>>>;
  update?: FunctionReference<"mutation", "public", NoInfer<Partial<TRemote>>>;
  delete?: FunctionReference<"mutation", "public", NoInfer<Partial<TRemote>>>;
}

export function syncedConvex<
  Client extends ConvexClient | ConvexReactClient,
  Query extends FunctionReference<"query", "public", any, TRemote[]>,
  TOption extends CrudAsOption = "object",
  TRemote extends { id: string } = Query["_returnType"][number],
>(
  props: SyncedConvexProps<Client, Query, TOption, TRemote>,
): SyncedCrudReturnType<TRemote, TOption> {
  const {
    convex,
    query,
    queryArgs = {},
    create: createParam,
    update: updateParam,
    delete: deleteParam,
    // changesSince,
    generateId,
    mode,
    ...rest
  } = props;

  // If using last-sync mode then put it into soft delete mode
  //   const fieldUpdatedAt =
  //     fieldUpdatedAtParam ||
  //     (changesSince === "last-sync" ? "updated_at" : undefined);
  //   const fieldDeleted =
  //     fieldDeletedParam || (changesSince === "last-sync" ? "deleted" : undefined);

  const subscribe = (params: SyncedSubscribeParams<TRemote[]>) => {
    if ((convex as ConvexReactClient).watchQuery) {
      const convexReactClient = convex as ConvexReactClient;
      const watch = convexReactClient.watchQuery(query, {});
      watch.onUpdate(() => {
        const value = watch.localQueryResult() as any;
        params.update({ value });
      });
    } else {
      (convex as ConvexClient)?.onUpdate(query, queryArgs, (result) => {
        params.update({
          value: result,
        });
      });
    }
  };

  const list = async (params: SyncedGetParams<TRemote>) => {
    const results = await convex.query(query, {});
    console.log("list", results);
    return results;
  };

  const createMutation =
    (mutator: FunctionReference<"mutation">) => async (value: TRemote) => {
      const results = await convex.mutation(mutator, value);
      console.log("mutation", results);
      return results;
    };

  const create = createParam ? createMutation(createParam) : undefined;
  const update = updateParam ? createMutation(updateParam) : undefined;
  const deleteFn = deleteParam ? createMutation(deleteParam) : undefined;

  return syncedCrud({
    ...rest,
    mode: mode || "merge",
    list,
    create,
    update,
    delete: deleteFn,
    fieldCreatedAt: "_creationTime",
    // fieldUpdatedAt,
    // fieldDeleted,
    updatePartial: false,
    fieldId: "id",
    subscribe,
    generateId,
  });
}
