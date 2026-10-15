/* Run every layer even if an earlier suite fails; preserve a failing exit code. */
const { spawnSync } = require("node:child_process");
const { existsSync } = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const coverage = process.argv.includes("--coverage");
const npmCli = process.env.npm_execpath;
const windows = process.platform === "win32";
const localPython = path.join(
  root,
  "backend-py",
  "venv",
  windows ? "Scripts/python.exe" : "bin/python",
);
const python =
  process.env.CURATUS_TEST_PYTHON ||
  (existsSync(localPython) ? localPython : windows ? "python" : "python3");
const results = [];

function run(label, command, args, cwd) {
  process.stdout.write(`\n${label}\n`);
  const result = spawnSync(command, args, {
    cwd,
    stdio: "inherit",
    env: { ...process.env, CI: "true" },
  });
  if (result.error) process.stderr.write(`${result.error.message}\n`);
  results.push({ label, passed: !result.error && result.status === 0 });
}

function npm(label, args, directory) {
  // npm supplies its JS entry point, avoiding Windows .cmd shell quoting.
  if (npmCli)
    run(label, process.execPath, [npmCli, ...args], path.join(root, directory));
  else
    run(label, windows ? "npm.cmd" : "npm", args, path.join(root, directory));
}

npm(
  "Node backend tests",
  ["run", coverage ? "test:coverage" : "test"],
  "backend",
);
run(
  "React frontend tests",
  process.execPath,
  [
    path.join(
      root,
      "frontend",
      "node_modules",
      "react-scripts",
      "bin",
      "react-scripts.js",
    ),
    "test",
    "--watchAll=false",
    "--runInBand",
    ...(coverage ? ["--coverage"] : []),
  ],
  path.join(root, "frontend"),
);
run(
  "Python service tests",
  python,
  coverage
    ? [
        "-m",
        "coverage",
        "run",
        "--branch",
        "--source=main,helpers",
        "-m",
        "unittest",
        "discover",
        "-s",
        "tests",
        "-v",
      ]
    : ["-m", "unittest", "discover", "-s", "tests", "-v"],
  path.join(root, "backend-py"),
);
if (coverage)
  run(
    "Python coverage report",
    python,
    ["-m", "coverage", "report", "-m"],
    path.join(root, "backend-py"),
  );
if (process.argv.includes("--build"))
  npm("React production build", ["run", "build"], "frontend");
process.stdout.write("\nVerification results\n");
for (const result of results)
  process.stdout.write(`${result.passed ? "PASS" : "FAIL"} ${result.label}\n`);
process.exitCode = results.some((result) => !result.passed) ? 1 : 0;
