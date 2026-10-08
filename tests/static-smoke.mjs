import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { SECTIONS } from "../content/sections.js";
import { REFERENCES } from "../content/references.js";
import { createExperiment, describe } from "../js/models/index.js";
const read = (p) => readFile(new URL("../" + p, import.meta.url), "utf8");
const index = await read("lab.html"),
  app = await read("js/lab.js"),
  audio = await read("js/audio.js");
assert.match(index, /js\/lab\.js/);
assert.doesNotMatch(
  index,
  /d3js.org|js\/main.js|network-engine-guarded|js\/mobile-layout.js/,
);
assert.match(index, /essay.html/);
assert.match(app, /methods.html/);
assert.match(app, /https:\/\/github.com\/mariomarcolongo\/emergent-humanity/);
assert.match(audio, /__EMERGENT_AUDIO_DEBUG__/);
assert.doesNotMatch(audio, /startAudioOnInteract|audioBtn\.click/);
assert.equal(SECTIONS.length, 17);
assert.equal(new Set(SECTIONS.map((s) => s.id)).size, 17);
const ids = SECTIONS.flatMap((s) => s.controls.map((c) => c.id));
assert.equal(new Set(ids).size, ids.length);
for (const s of SECTIONS) {
  assert.ok(s.evidence?.Limits);
  assert.ok(s.method?.formula);
  for (const id of s.method.sources) assert.ok(REFERENCES[id]);
  const model = createExperiment(s.id);
  assert.ok(describe(model.snapshot()));
  for (const control of s.controls) {
    model.act(
      control.id,
      control.type === "slider"
        ? control.max
        : control.type === "switch"
          ? !control.value
          : undefined,
    );
    assert.ok(describe(model.snapshot()));
  }
  for (let i = 0; i < 4; i++) model.step();
  assert.ok(describe(model.snapshot()));
  model.reset();
  assert.deepEqual(model.snapshot(), createExperiment(s.id).snapshot());
}
for (const path of [
  "content/essay.md",
  "content/model-notes.md",
  "methods.html",
  "essay.html",
]) {
  const text = await read(path);
  assert.doesNotMatch(text, /[\x00-\x08\x0b\x0c\x0e-\x1f]/);
  for (const s of SECTIONS)
    assert.ok(text.includes(s.title), `${path} missing ${s.title}`);
}
console.log(
  `Static checks passed: ${SECTIONS.length} chapters, ${ids.length} controls, models and generated editions.`,
);

const main=await read("index.html");
assert.match(main,/js\/app\.js/);
assert.match(main,/css\/restoration.css/);
assert.equal(SECTIONS.find(s=>s.id==="emergent-organism").title,"A Node Goes Dark");
assert.equal(SECTIONS.find(s=>s.id==="alignment").title,"Moving Together");
assert.equal(SECTIONS.find(s=>s.id==="entropy").title,"Against Noise");
