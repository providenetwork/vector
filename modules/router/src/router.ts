import { BaseLogger } from "pino";
import { IServerNodeService } from "@connext/vector-utils";

import { setupListeners } from "./listener";
import { IRouterStore } from "./services/store";

export interface IRouter {
  startup(): Promise<void>;
}

export class Router implements IRouter {
  constructor(
    private readonly node: IServerNodeService,
    private readonly store: IRouterStore,
    private readonly logger: BaseLogger,
  ) {}

  static async connect(node: IServerNodeService, store: IRouterStore, logger: BaseLogger): Promise<Router> {
    const router = new Router(node, store, logger);
    await router.startup();
    logger.info("Vector Router connected 🚀");
    return router;
  }

  async startup(): Promise<void> {
    await setupListeners(this.node, this.store, this.logger);
  }
}
