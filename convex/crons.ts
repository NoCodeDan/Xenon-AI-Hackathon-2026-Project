import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Weekly rolling regrade (every Monday at 2am)
crons.weekly("rolling regrade", { dayOfWeek: "monday", hourUTC: 9, minuteUTC: 0 }, internal.grading.rollingRegrade);

// Daily library snapshot (every day at 1am)
crons.daily("daily snapshot", { hourUTC: 8, minuteUTC: 0 }, internal.snapshots.generateSnapshot);

// Monthly topic health check (1st of month)
crons.monthly("monthly topic check", { day: 1, hourUTC: 10, minuteUTC: 0 }, internal.topicHealth.batchCheckTopics);

// Weekly market intel refresh (Wednesday at 10am UTC)
crons.weekly("weekly market intel", { dayOfWeek: "wednesday", hourUTC: 10, minuteUTC: 0 }, internal.marketIntelFetch.refreshAllMarketIntel);

export default crons;
