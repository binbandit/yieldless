export type Injectable<Deps, Args extends unknown[], Return> = (
  deps: Deps,
  ...args: Args
) => Return;

/**
 * Binds dependencies to a function at the application edge and returns the
 * executable version.
 */
export function inject<Deps, Args extends unknown[], Return>(
  core: Injectable<Deps, Args, Return>,
  deps: Deps,
): (...args: Args) => Return {
  return (...args: Args): Return => core(deps, ...args);
}
