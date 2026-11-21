export const MAX_ACTIONS = 96;
export const OPCODES = { card: '1', jacket: '2', equity: '3', rally: '4', discard: '5', end: '6' };

export function rankedNoirInput({ gameId, expected, actions }, player, stanceId) {
  if (!Array.isArray(actions) || actions.length === 0 || actions.length > MAX_ACTIONS) {
    throw new Error('The run must contain between 1 and 96 actions.');
  }
  return {
    seed: BigInt(gameId).toString(), player: BigInt(player).toString(),
    stance_id: String(stanceId), final_score: String(expected.cash),
    actions: Array.from({ length: MAX_ACTIONS }, (_, index) => {
      const action = actions[index];
      if (!action) return { op: '0', arg: '0' };
      const [name, arg] = action;
      if (!Object.hasOwn(OPCODES, name)) throw new Error('Unknown ranked action: ' + name);
      return { op: OPCODES[name], arg: String(arg ?? 0) };
    }),
  };
}
