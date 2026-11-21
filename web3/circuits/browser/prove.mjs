import { Noir } from '@noir-lang/noir_js';
import { Barretenberg, BackendType, UltraHonkBackend } from '@aztec-foundation/bb.js';

const hex = bytes => '0x' + Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
const word = value => '0x' + BigInt(value).toString(16).padStart(64, '0');
const noOp = { op: '0', arg: '0' };

export function createProgressiveProver(session, planArtifact, segmentArtifact, progress = () => {}) {
  if (!globalThis.crossOriginIsolated) {
    throw new Error('请从启用跨源隔离的 localhost 或 HTTPS 页面打开证明工具。');
  }
  const actionsPerSegment = segmentArtifact.abi.parameters.find(({ name }) => name === 'actions').type.length;
  const segmentLimit = planArtifact.abi.parameters.find(({ name }) => name === 'boundary_salts').type.length;
  const maxActions = actionsPerSegment * segmentLimit;
  const boundarySalts = Array.from({ length: segmentLimit }, () => hex(crypto.getRandomValues(new Uint8Array(31))));
  const planner = new Noir(planArtifact);
  const circuit = new Noir(segmentArtifact);
  const actions = [];
  const bundle = { segments: [], commitments: [] };
  let resultScore;
  let terminalActionCount;
  let tail = Promise.resolve();
  let failure;

  progress('正在后台准备证明参数…', 0);
  const prover = Barretenberg.new({
    backend: BackendType.WasmWorker,
    threads: Math.max(1, Math.min(3, (navigator.hardwareConcurrency || 2) - 1)),
    srsSize: 2 ** 19,
  }).then(api => ({ api, backend: new UltraHonkBackend(segmentArtifact.bytecode, api) }));
  // Prewarming starts before a segment exists. Propagate errors when a segment uses it.
  void prover.catch(() => {});

  function queuePlan() {
    const actionCount = actions.length;
    const padded = Array.from({ length: maxActions }, (_, index) => actions[index] ?? noOp);
    tail = tail.then(async () => {
      if (failure || resultScore !== undefined) return;
      const { returnValue: [length, hints, victory, cash] } = await planner.execute({
        ...session, action_count: String(actionCount), actions: padded, boundary_salts: boundarySalts,
      });
      for (let index = bundle.segments.length; index < Number(length); index++) {
        const hint = hints[index];
        const final = victory && index + 1 === Number(length);
        const finalScore = final ? String(BigInt(cash)) : '0';
        const { backend } = await prover;
        progress(`正在后台生成第 ${index + 1} 段证明…`, index);
        const { witness } = await circuit.execute({
          ...session, ...hint, final_score: finalScore,
          segment_index: String(index), is_final: final,
          previous_salt: boundarySalts[index - 1] ?? '0',
          next_salt: final ? '0' : boundarySalts[index],
          actions: padded.slice(index * actionsPerSegment, (index + 1) * actionsPerSegment),
        });
        const proof = await backend.generateProof(witness, { verifierTarget: 'evm' });
        const expected = [
          session.seed, session.player, session.stance_id, finalScore,
          index, hint.previous_commitment, hint.next_commitment, final ? 1 : 0,
        ].map(word);
        if (proof.publicInputs.length !== expected.length ||
            proof.publicInputs.some((value, position) => word(value) !== expected[position])) {
          throw new Error('证明的公开输入与牌局不一致。');
        }
        bundle.segments.push({ proof: hex(proof.proof), publicInputs: expected });
        if (final) {
          resultScore = Number(BigInt(cash));
          terminalActionCount = actionCount;
        } else {
          bundle.commitments.push(word(hint.next_commitment));
        }
        progress(`已生成 ${bundle.segments.length} 段证明`, bundle.segments.length);
      }
    }).catch(error => {
      failure = error;
      progress(`证明失败：${error.message}`, bundle.segments.length);
    });
  }

  return {
    append(action) {
      if (actions.length >= maxActions) throw new Error('牌序超过电路支持的 96 步。');
      actions.push(action);
      if (actions.length % actionsPerSegment === 0) queuePlan();
    },
    async finish(score) {
      queuePlan();
      await tail;
      if (failure) throw failure;
      if (resultScore === undefined) throw new Error('牌序未完成通关。');
      if (actions.length !== terminalActionCount) throw new Error('牌局结束后还有操作。');
      if (resultScore !== Number(score)) throw new Error('终局分数与证明不一致。');
      return bundle;
    },
    async destroy() {
      await tail;
      const instance = await prover.catch(() => null);
      await instance?.api.destroy();
    },
  };
}

export async function proveRankedRun(input, planArtifact, segmentArtifact, progress) {
  const { seed, player, stance_id, final_score, actions } = input;
  if (!Array.isArray(actions) || actions.length !== 96) throw new Error('请输入填充至 96 步的 Noir 牌序。');
  const run = createProgressiveProver({ seed, player, stance_id }, planArtifact, segmentArtifact, progress);
  try {
    const used = actions.findIndex(action => BigInt(action.op) === 0n);
    const count = used < 0 ? actions.length : used;
    if (actions.slice(count).some(action => BigInt(action.op) !== 0n)) throw new Error('牌序填充后还有操作。');
    for (let index = 0; index < count; index++) run.append(actions[index]);
    return await run.finish(final_score);
  } finally {
    await run.destroy();
  }
}
