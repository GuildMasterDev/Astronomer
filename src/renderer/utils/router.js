export class Router {
  constructor() {
    this.routes = new Map();
    this.currentRoute = null;
  }

  addRoute(name, handler) {
    this.routes.set(name, handler);
  }

  async navigate(routeName) {
    if (!this.routes.has(routeName)) {
      console.error(`Route ${routeName} not found`);
      return;
    }

    this.currentRoute = routeName;
    const handler = this.routes.get(routeName);
    await handler();
  }

  getCurrentRoute() {
    return this.currentRoute;
  }
}