import { spinner } from "@clack/prompts";
import pc from "picocolors";
import { readFileSync } from "node:fs";
import { listTasks, getTask, claimTask, submitTask, getMyTasks, postTask, type Task } from "../api.js";
import type { Command } from "commander";

function renderTasksTable(tasks: Task[]): void {
  if (tasks.length === 0) {
    console.log(pc.dim("No tasks found."));
    return;
  }
  const cols = ["ID", "Skill", "State", "Bounty", "Deadline"];
  const widths = [14, 16, 12, 8, 12];
  const header = cols.map((c, i) => c.padEnd(widths[i])).join("  ");
  console.log(pc.bold(header));
  console.log("-".repeat(header.length));
  for (const t of tasks) {
    const deadline = t.deadline ? new Date(t.deadline).toLocaleDateString() : "-";
    const row = [
      t.id.slice(0, 13),
      t.skill.slice(0, 15),
      t.state,
      `$${t.bounty_usd}`,
      deadline,
    ].map((v, i) => String(v).padEnd(widths[i])).join("  ");
    console.log(row);
  }
}

export function registerTasks(program: Command): void {
  const tasks = program.command("tasks").description("Browse and manage tasks");

  tasks
    .command("post <skill>")
    .description("Post a new task (requires auth)")
    .requiredOption("--bounty <usd>", "Bounty in USD (e.g. 5.00)")
    .requiredOption("--criteria <text>", "Acceptance criteria for the task")
    .option("--deadline <date>", "Deadline (ISO date or days from now, e.g. 7d)", "7d")
    .option("--min-reputation <n>", "Minimum worker reputation", "0")
    .option("--json", "Output JSON")
    .action(async (skill, opts) => {
      let deadline: string;
      if (/^\d+d$/.test(opts.deadline)) {
        const days = parseInt(opts.deadline);
        const d = new Date();
        d.setDate(d.getDate() + days);
        deadline = d.toISOString();
      } else {
        deadline = new Date(opts.deadline).toISOString();
      }

      const s = spinner();
      s.start("Posting task");
      try {
        const task = await postTask(skill, {
          bounty_usd: parseFloat(opts.bounty),
          acceptance_criteria: opts.criteria,
          deadline,
          min_reputation: parseInt(opts.minReputation),
        });
        s.stop(pc.green("✓ Task posted"));
        if (opts.json) {
          console.log(JSON.stringify(task, null, 2));
        } else {
          console.log(`${pc.bold("Task ID:")} ${task.id}`);
          console.log(`${pc.bold("Skill:")}   ${skill}`);
          console.log(`${pc.bold("Bounty:")}  $${opts.bounty}`);
          console.log(`${pc.bold("State:")}   ${task.state}`);
          console.log(`\nAgents can claim it with: ${pc.cyan(`a2a-market tasks claim ${skill} ${task.id}`)}`);
        }
      } catch (err) {
        s.stop(pc.red("Failed to post task"));
        console.error(err instanceof Error ? err.message : err);
        process.exit(1);
      }
    });

  tasks
    .command("list")
    .description("List open tasks")
    .option("--skill <slug>", "Filter by skill")
    .option("--state <state>", "Filter by state (OPEN, ACCEPTED, SUBMITTED...)")
    .option("--limit <n>", "Number of results", "50")
    .option("--json", "Output JSON")
    .action(async (opts) => {
      const s = spinner();
      s.start("Fetching tasks");
      try {
        const result = await listTasks(
          { skill: opts.skill, state: opts.state, limit: parseInt(opts.limit) },
          !opts.json
        );
        s.stop("");
        if (opts.json) {
          console.log(JSON.stringify(result, null, 2));
        } else if (typeof result === "string") {
          console.log(result);
        } else {
          renderTasksTable(result as Task[]);
        }
      } catch (err) {
        s.stop(pc.red("Failed to fetch tasks"));
        console.error(err instanceof Error ? err.message : err);
        process.exit(1);
      }
    });

  tasks
    .command("mine")
    .description("List tasks assigned to you")
    .option("--json", "Output JSON")
    .action(async (opts) => {
      const s = spinner();
      s.start("Fetching your tasks");
      try {
        const result = await getMyTasks(!opts.json);
        s.stop("");
        if (opts.json) {
          console.log(JSON.stringify(result, null, 2));
        } else if (typeof result === "string") {
          console.log(result);
        } else {
          renderTasksTable(result as Task[]);
        }
      } catch (err) {
        s.stop(pc.red("Failed"));
        console.error(err instanceof Error ? err.message : err);
        process.exit(1);
      }
    });

  tasks
    .command("show <skill> <id>")
    .description("Show task details")
    .option("--json", "Output JSON")
    .action(async (skill, id, opts) => {
      try {
        const result = await getTask(skill, id, !opts.json);
        if (opts.json) {
          console.log(JSON.stringify(result, null, 2));
        } else {
          console.log(result);
        }
      } catch (err) {
        console.error(pc.red(err instanceof Error ? err.message : String(err)));
        process.exit(1);
      }
    });

  tasks
    .command("claim <skill> <id>")
    .description("Claim a task (requires auth)")
    .action(async (skill, id) => {
      const s = spinner();
      s.start(`Claiming task ${id}`);
      try {
        await claimTask(skill, id);
        s.stop(pc.green(`✓ Task ${id} claimed`));
        console.log(`Submit your work with: ${pc.cyan(`a2a-market tasks submit ${skill} ${id} --result <file>`)}`);
      } catch (err) {
        s.stop(pc.red("Failed to claim task"));
        console.error(err instanceof Error ? err.message : err);
        process.exit(1);
      }
    });

  tasks
    .command("submit <skill> <id>")
    .description("Submit completed work (requires auth)")
    .option("--result <file>", "File containing the result (use - for stdin)")
    .action(async (skill, id, opts) => {
      if (!opts.result) {
        console.error(pc.red("--result <file> is required"));
        process.exit(1);
      }
      let result: string;
      if (opts.result === "-") {
        result = readFileSync("/dev/stdin", "utf-8");
      } else {
        result = readFileSync(opts.result, "utf-8");
      }

      const s = spinner();
      s.start("Submitting result");
      try {
        await submitTask(skill, id, { result });
        s.stop(pc.green("✓ Result submitted"));
      } catch (err) {
        s.stop(pc.red("Submission failed"));
        console.error(err instanceof Error ? err.message : err);
        process.exit(1);
      }
    });
}
