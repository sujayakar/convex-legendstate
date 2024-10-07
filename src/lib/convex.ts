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
import { Value } from "convex/values";

interface SyncedConvexProps<
  Client extends ConvexClient | ConvexReactClient,
  QueryArgs extends Record<string, Value>,
  Query extends FunctionReference<"query", "public", QueryArgs, TRemote[]>,
  TOption extends CrudAsOption = "object",
  TRemote extends { id: string } = Query["_returnType"][number],
> extends SyncedCrudPropsMany<TRemote, TRemote, TOption>,
    Omit<
      SyncedCrudPropsBase<TRemote, TRemote>,
      "retry" | "create" | "update" | "delete" | "fieldCreatedAt" | "fieldId"
    > {
  convex: Client;
  query: Query;
  queryArgs?: QueryArgs;
  create?: FunctionReference<"mutation", "public", NoInfer<Partial<TRemote>>>;
  update?: FunctionReference<"mutation", "public", NoInfer<Partial<TRemote>>>;
  delete?: FunctionReference<"mutation", "public", NoInfer<Partial<TRemote>>>;
}

export function syncedConvex<
  Client extends ConvexClient | ConvexReactClient,
  QueryArgs extends Record<string, Value>,
  Query extends FunctionReference<"query", "public", QueryArgs, TRemote[]>,
  TOption extends CrudAsOption = "object",
  TRemote extends { id: string } = Query["_returnType"][number],
>(
  props: SyncedConvexProps<Client, QueryArgs, Query, TOption, TRemote>,
): SyncedCrudReturnType<TRemote, TOption> {
  const {
    convex,
    query,
    queryArgs,
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
  
  const list = async (params: SyncedGetParams<TRemote>) => {
    const results = await convex.query(query, queryArgs as any);
    console.log("list", results);
    return results;
  };
  const subscribe = (params: SyncedSubscribeParams<TRemote[]>) => {
    console.log("subscribing");
    if ((convex as ConvexReactClient).watchQuery) {      
      const convexReactClient = convex as ConvexReactClient;
      const watch = convexReactClient.watchQuery(query, queryArgs as any);
      const unsubscribe = watch.onUpdate(() => {
        const value = watch.localQueryResult() as any;
        console.log('subscription', value)
        params.update({ value });
      });
      return unsubscribe;
    } else {
      const unsubscribe = (convex as ConvexClient)?.onUpdate(query, queryArgs as any, (result) => {
          params.update({
            value: result,
          });
        });
      return unsubscribe;
    }
  };
  
  const createMutation =
    (mutator: FunctionReference<"mutation">) => async (value: TRemote) => {
      console.log("create", value);
      await convex.mutation(mutator, value);      
    };
  const updateMutation = 
    (mutator: FunctionReference<"mutation">) => async (value: Partial<TRemote>) => {        
      console.log("update", value);
      const { _id, _creationTime, ...rest } = value as any;
      await convex.mutation(mutator, rest);
    };    
  const deleteMutation = 
    (mutator: FunctionReference<"mutation">) => async (value: Partial<TRemote>) => {
      const { id } = value;
      console.log("delete", value);
      await convex.mutation(mutator, { id });
    }

  const create = createParam ? createMutation(createParam) : undefined;
  const update = updateParam ? updateMutation(updateParam) : undefined;
  const deleteFn = deleteParam ? deleteMutation(deleteParam) : undefined;

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
