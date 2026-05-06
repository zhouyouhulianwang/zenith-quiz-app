import { createRouter, publicQuery } from "./middleware";
import { authRouter } from "./auth-router";
import { simpleAuthRouter } from "./simple-auth-router";
import { bankRouter } from "./bank-router";
import { recordRouter } from "./record-router";
import { settingsRouter } from "./settings-router";

export const appRouter = createRouter({
  health: publicQuery.query(() => "ok"),
  auth: authRouter,
  simpleAuth: simpleAuthRouter,
  bank: bankRouter,
  record: recordRouter,
  settings: settingsRouter,
});

export type AppRouter = typeof appRouter;
