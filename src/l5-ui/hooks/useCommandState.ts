import { useSyncExternalStore } from 'react';
import {
  type AppSessionState,
  type CommandId,
  type CommandPayloads,
  commandEngine,
} from '../../l3-commands/commandRegistry.ts';

export function useCommandState(): AppSessionState {
  return useSyncExternalStore(
    commandEngine.subscribe,
    commandEngine.getState,
    commandEngine.getState,
  );
}

export function executeCommand<K extends CommandId>(
  id: K,
  payload: CommandPayloads[K],
): AppSessionState {
  return commandEngine.execute(id, payload);
}
