import { useMutation, useQueryClient, type QueryKey } from "@tanstack/react-query";

/**
 * Mutation that refreshes the given query keys on success. Errors are already shown to
 * the user by SharedService's alert, so screens don't need to render them.
 */
export function useApiMutation<TVars, TResult = unknown>(
  fn: (vars: TVars) => Promise<TResult>,
  opts: { invalidate?: QueryKey[]; onSuccess?: (result: TResult, vars: TVars) => void } = {},
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: async (result, vars) => {
      await Promise.all((opts.invalidate ?? []).map((queryKey) => qc.invalidateQueries({ queryKey })));
      opts.onSuccess?.(result, vars);
    },
  });
}
