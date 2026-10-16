import fs from "node:fs/promises";

const configPath = process.env.PROJECT_OPS_CONFIG || ".github/project-ops.json";
const eventPath = process.env.GITHUB_EVENT_PATH;
const eventName = process.env.GITHUB_EVENT_NAME || "workflow_dispatch";
const dryRun = process.argv.includes("--dry-run");

if (!eventPath) throw new Error("GITHUB_EVENT_PATH is required");

const [config, event] = await Promise.all([
  fs.readFile(configPath, "utf8").then(JSON.parse),
  fs.readFile(eventPath, "utf8").then(JSON.parse),
]);

const action = event.action || "requested";
const eventKey = `${eventName}.${action}`;
const repository = event.repository?.full_name || process.env.GITHUB_REPOSITORY || "unknown repository";
const actor = event.sender?.login || event.actor?.login || process.env.GITHUB_ACTOR || "automation";
const subject = event.issue || event.pull_request || event.workflow_run || event.deployment_status || {};
const title = subject.title || subject.name || `${eventName} ${action}`;
const url = subject.html_url || event.repository?.html_url || `https://github.com/${repository}`;
const summary = `[${repository}] ${eventKey}: ${title}`;

// Never include issue bodies, comments, commits, environment values, or event dumps.
const request = async (name, endpoint, options) => {
  if (dryRun) {
    console.log(`[dry-run] ${name}: ${summary} (${url})`);
    return;
  }
  const response = await fetch(endpoint, options);
  if (!response.ok) {
    const responseText = (await response.text()).slice(0, 300);
    throw new Error(`${name} returned ${response.status}: ${responseText}`);
  }
  console.log(`${name}: delivered ${eventKey}`);
};

const tasks = [];

if (config.slack?.enabled && process.env.SLACK_WEBHOOK_URL) {
  tasks.push(request("Slack", process.env.SLACK_WEBHOOK_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      text: summary,
      blocks: [
        { type: "section", text: { type: "mrkdwn", text: `*${config.persona}* · ${eventKey}\n<${url}|${title}>` } },
        { type: "context", elements: [{ type: "mrkdwn", text: `${repository} · by ${actor}` }] },
      ],
    }),
  }));
}

if (config.linear?.enabled && config.linear.createOn?.includes(eventKey) && process.env.LINEAR_API_KEY && process.env.LINEAR_TEAM_ID) {
  tasks.push(request("Linear", "https://api.linear.app/graphql", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: process.env.LINEAR_API_KEY },
    body: JSON.stringify({
      query: "mutation CreateIssue($input: IssueCreateInput!) { issueCreate(input: $input) { success issue { url } } }",
      variables: { input: { teamId: process.env.LINEAR_TEAM_ID, title: `[${repository}] ${title}`, description: `Source: ${url}` } },
    }),
  }));
}

if (config.notion?.enabled && config.notion.createOn?.includes(eventKey) && process.env.NOTION_TOKEN && process.env.NOTION_DATABASE_ID) {
  tasks.push(request("Notion", "https://api.notion.com/v1/pages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.NOTION_TOKEN}`,
      "notion-version": "2022-06-28",
    },
    body: JSON.stringify({
      parent: { database_id: process.env.NOTION_DATABASE_ID },
      properties: {
        Name: { title: [{ text: { content: `[${repository}] ${title}` } }] },
      },
      children: [{ object: "block", type: "paragraph", paragraph: { rich_text: [{ type: "text", text: { content: "GitHub source", link: { url } } }] } }],
    }),
  }));
}

if (!tasks.length) console.log(`Mission Control: no configured adapter for ${eventKey}`);
await Promise.all(tasks);
