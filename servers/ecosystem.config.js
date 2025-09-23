require("dotenv").config();
const { execSync } = require("child_process");

const interpreter = execSync("which bun").toString().trim();

module.exports = {
  apps: [
    {
      interpreter,
      name: "api",
      exec_mode: "fork",
      increment_var: "PORT",
      script: "api/src/index.js",
      instances: navigator.hardwareConcurrency + 1,
      env: {
        PORT: 9001,
      },
    },
    {
      interpreter,
      instances: 2,
      exec_mode: "fork",
      name: "worker.jobs",
      script: "worker/src/jobs/index.ts",
    },
    {
      interpreter,
      instances: 1,
      exec_mode: "fork",
      name: "worker.tasks",
      script: "worker/src/tasks/index.ts",
    },
  ],
};
