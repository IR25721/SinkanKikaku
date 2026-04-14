/**
 * Hash-based SPA router.
 * Routes are defined as { path: string, render: (container: HTMLElement) => void, cleanup?: () => void }
 */

/** @type {Array<{path: string, render: Function, cleanup?: Function}>} */
let routes = [];
let currentCleanup = null;

/**
 * Register routes for the SPA.
 * @param {Array<{path: string, render: Function, cleanup?: Function}>} routeDefinitions
 */
export function registerRoutes(routeDefinitions) {
  routes = routeDefinitions;
}

/**
 * Navigate to a given hash path.
 * @param {string} path
 */
export function navigate(path) {
  window.location.hash = path;
}

/**
 * Get the current hash path, defaulting to '/'.
 * @returns {string}
 */
export function getCurrentPath() {
  return window.location.hash.slice(1) || '/';
}

/**
 * Start the router — listen for hash changes and render the initial route.
 * @param {HTMLElement} container
 */
export function startRouter(container) {
  function handleRoute() {
    const path = getCurrentPath();

    // Cleanup previous route
    if (currentCleanup) {
      currentCleanup();
      currentCleanup = null;
    }

    // Find matching route
    const route = routes.find((r) => r.path === path);

    if (route) {
      container.innerHTML = '';
      route.render(container);
      if (route.cleanup) {
        currentCleanup = route.cleanup;
      }
    } else {
      // 404 — redirect to home
      navigate('/');
    }

    // Scroll to top
    window.scrollTo(0, 0);
  }

  window.addEventListener('hashchange', handleRoute);
  handleRoute();
}
