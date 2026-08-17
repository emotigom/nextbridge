import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const workflowPath = new URL("../.github/workflows/dependabot-automerge.yml", import.meta.url);

describe("Dependabot deployment chain", () => {
  it("merges and dispatches Pages through repository-qualified API paths", async () => {
    const workflow = await readFile(workflowPath, "utf8");

    expect(workflow).toContain('"repos/$REPOSITORY/pulls/$PR_NUMBER/merge"');
    expect(workflow).toContain('"repos/$REPOSITORY/actions/workflows/pages.yml/dispatches"');
    expect(workflow).toContain("-f merge_method=squash");
    expect(workflow).toContain('-f sha="$HEAD_SHA"');
    expect(workflow).toContain("-f ref=main");
    expect(workflow).not.toContain("gh pr merge");
    expect(workflow).not.toContain("gh workflow run");
  });

  it("retains the permissions required to merge and dispatch", async () => {
    const workflow = await readFile(workflowPath, "utf8");

    expect(workflow).toMatch(/permissions:\s+actions: write/);
    expect(workflow).toMatch(/permissions:[\s\S]*contents: write/);
    expect(workflow).toMatch(/permissions:[\s\S]*pull-requests: write/);
  });
});
