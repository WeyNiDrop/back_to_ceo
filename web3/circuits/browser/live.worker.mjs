import { createProgressiveProver } from './prove.mjs';

let active;
async function load(name) {
  const response = await fetch(name);
  if (!response.ok) throw new Error(`无法读取 ${name} (${response.status})`);
  return response.json();
}

self.addEventListener('message', ({ data }) => {
  if (data.type === 'start') {
    active = Promise.all([load('ranked_plan.json'), load('ranked_segment.json')]).then(([plan, segment]) =>
      createProgressiveProver(data.session, plan, segment, (text, completed) =>
        self.postMessage({ type: 'progress', text, completed })));
    void active.catch(error => self.postMessage({ type: 'error', text: error.message }));
    return;
  }
  if (!active) return;
  void active.then(async run => {
    if (data.type === 'action') run.append(data.action);
    if (data.type === 'finish') {
      try {
        self.postMessage({ type: 'result', proof: await run.finish(data.cash) });
      } finally {
        await run.destroy();
      }
    }
  }).catch(error => self.postMessage({ type: 'error', text: error.message }));
});
