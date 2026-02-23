/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as chat from "../chat.js";
import type * as chatActions from "../chatActions.js";
import type * as chatAgent from "../chatAgent.js";
import type * as content from "../content.js";
import type * as contentEdges from "../contentEdges.js";
import type * as crons from "../crons.js";
import type * as fixTopicAssignments from "../fixTopicAssignments.js";
import type * as grades from "../grades.js";
import type * as grading from "../grading.js";
import type * as importMasterList from "../importMasterList.js";
import type * as importTreehouseMutations from "../importTreehouseMutations.js";
import type * as lib_scoring from "../lib/scoring.js";
import type * as processContent from "../processContent.js";
import type * as prompts_chat from "../prompts/chat.js";
import type * as prompts_grading from "../prompts/grading.js";
import type * as requests from "../requests.js";
import type * as seedData from "../seedData.js";
import type * as snapshots from "../snapshots.js";
import type * as topicHealth from "../topicHealth.js";
import type * as topicSnapshots from "../topicSnapshots.js";
import type * as topics from "../topics.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  chat: typeof chat;
  chatActions: typeof chatActions;
  chatAgent: typeof chatAgent;
  content: typeof content;
  contentEdges: typeof contentEdges;
  crons: typeof crons;
  fixTopicAssignments: typeof fixTopicAssignments;
  grades: typeof grades;
  grading: typeof grading;
  importMasterList: typeof importMasterList;
  importTreehouseMutations: typeof importTreehouseMutations;
  "lib/scoring": typeof lib_scoring;
  processContent: typeof processContent;
  "prompts/chat": typeof prompts_chat;
  "prompts/grading": typeof prompts_grading;
  requests: typeof requests;
  seedData: typeof seedData;
  snapshots: typeof snapshots;
  topicHealth: typeof topicHealth;
  topicSnapshots: typeof topicSnapshots;
  topics: typeof topics;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
