import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { TextEncoder } from "node:util";
import vm from "node:vm";

async function loadAdminExports() {
  const repoRoot = process.cwd();
  const source = await readFile(path.join(repoRoot, "assets/admin.js"), "utf8");
  const sandbox = {
    window: {
      TibiaTime: {},
    },
    document: {
      addEventListener() {},
      getElementById() {
        return null;
      },
    },
    sessionStorage: {
      getItem() {
        return null;
      },
      setItem() {},
      removeItem() {},
    },
    fetch: async () => {
      throw new Error("fetch should not run while loading admin editor tests");
    },
    console,
    TextEncoder,
    setTimeout,
    clearTimeout,
  };

  vm.runInNewContext(source, sandbox, { filename: "assets/admin.js" });
  return sandbox.window.TibiaAdmin;
}

function toPlainJson(value) {
  return JSON.parse(JSON.stringify(value));
}

test("buildDirectCommitSubject chooses file-scoped commit titles", async () => {
  const admin = await loadAdminExports();

  assert.equal(
    admin.buildDirectCommitSubject([
      { path: "data/manual-schedules.json" },
    ]),
    "chore(admin): update manual schedules"
  );
  assert.equal(
    admin.buildDirectCommitSubject([
      { path: "data/market/items/tracked_items.json" },
    ]),
    "chore(admin): update tracked market items"
  );
  assert.equal(
    admin.buildDirectCommitSubject([
      { path: "data/manual-schedules.json" },
      { path: "data/market/items/tracked_items.json" },
    ]),
    "chore(admin): update maintainer source data"
  );
});

test("buildDirectCommitMessage records summary, changed files, and maintainer notes", async () => {
  const admin = await loadAdminExports();
  const message = admin.buildDirectCommitMessage({
    summary: "Corrected late-night warzone times.",
    files: [
      { path: "data/manual-schedules.json", summary: "93 worlds" },
      {
        path: "data/market/items/tracked_items.json",
        summary: "8 enabled items",
      },
    ],
    scheduleNotes: ["Antica execution 2 (13:20): corrected from screenshot"],
    trackedItemNotes: ["Silver Token (enabled): promoted back into tracked set"],
  });

  assert.match(message, /^chore\(admin\): update maintainer source data\n\n/);
  assert.match(message, /Corrected late-night warzone times\./);
  assert.match(message, /Changed files:\n- data\/manual-schedules\.json \(93 worlds\)/);
  assert.match(message, /Schedule notes:\n- Antica execution 2 \(13:20\): corrected from screenshot/);
  assert.match(message, /Tracked item notes:\n- Silver Token \(enabled\): promoted back into tracked set/);
});

test("commitFilesToBaseBranch creates one atomic main commit and updates the ref", async () => {
  const admin = await loadAdminExports();
  const calls = [];

  async function request(path, options = {}) {
    calls.push({ path, options });

    switch (path) {
      case "/repos/nesleykent/tibia-warzones-schedule/git/ref/heads/main":
        return { object: { sha: "headsha" } };
      case "/repos/nesleykent/tibia-warzones-schedule/git/commits/headsha":
        return { tree: { sha: "basetreesha" } };
      case "/repos/nesleykent/tibia-warzones-schedule/git/trees":
        return { sha: "newtreesha" };
      case "/repos/nesleykent/tibia-warzones-schedule/git/commits":
        return { sha: "newcommitsha" };
      case "/repos/nesleykent/tibia-warzones-schedule/git/refs/heads/main":
        return { ref: "refs/heads/main" };
      default:
        throw new Error(`Unexpected request path: ${path}`);
    }
  }

  const files = [
    {
      path: "data/manual-schedules.json",
      content: "{\n}\n",
      summary: "93 worlds",
    },
  ];
  const result = await admin.commitFilesToBaseBranch(
    "token",
    files,
    "commit message body",
    request
  );

  assert.equal(result.sha, "newcommitsha");
  assert.equal(
    result.url,
    "https://github.com/nesleykent/tibia-warzones-schedule/commit/newcommitsha"
  );
  assert.deepEqual(calls.map((call) => call.path), [
    "/repos/nesleykent/tibia-warzones-schedule/git/ref/heads/main",
    "/repos/nesleykent/tibia-warzones-schedule/git/commits/headsha",
    "/repos/nesleykent/tibia-warzones-schedule/git/trees",
    "/repos/nesleykent/tibia-warzones-schedule/git/commits",
    "/repos/nesleykent/tibia-warzones-schedule/git/refs/heads/main",
  ]);
  assert.deepEqual(toPlainJson(calls[2].options.body), {
    base_tree: "basetreesha",
    tree: [
      {
        path: "data/manual-schedules.json",
        mode: "100644",
        type: "blob",
        content: "{\n}\n",
      },
    ],
  });
  assert.deepEqual(toPlainJson(calls[3].options.body), {
    message: "commit message body",
    tree: "newtreesha",
    parents: ["headsha"],
  });
  assert.deepEqual(toPlainJson(calls[4].options.body), {
    sha: "newcommitsha",
    force: false,
  });
});

test("getTriggeredWorkflowNames maps source files to downstream automation", async () => {
  const admin = await loadAdminExports();

  assert.deepEqual(
    toPlainJson(admin.getTriggeredWorkflowNames([
      { path: "data/manual-schedules.json" },
    ])),
    ["Deploy Pages"]
  );
  assert.deepEqual(
    toPlainJson(admin.getTriggeredWorkflowNames([
      { path: "data/market/items/tracked_items.json" },
    ])),
    ["Update Market", "Deploy Pages"]
  );
  assert.deepEqual(
    toPlainJson(admin.getTriggeredWorkflowNames([
      { path: "data/manual-schedules.json" },
      { path: "data/market/items/tracked_items.json" },
    ])),
    ["Update Market", "Deploy Pages"]
  );
});
