/**
 * Publish snapshots — freeze the handover package when the owner publishes.
 * Share routes serve the current snapshot so later edits do not rewrite a
 * brief already sent to a designer. Re-publish creates version N+1.
 *
 * @see docs/08-handover-spec.md
 */
import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { publish_snapshots } from "@/lib/db/schema";
import type { PublishSnapshotPayload, SnapshotPackageAsset } from "@/lib/db/types";
import { compileBrief, buildMarkdown, buildHtml } from "@/lib/brief";
import { getSelectedAsset, listAssets } from "@/lib/design";
import { finalDeliverableIssue, FINAL_DESIGN_KINDS } from "@/lib/design-deliverable";
import { getProject, type Project } from "@/lib/queries";
import { buildBrandPack } from "@/lib/brand-pack";
import { serializeBriefGroups, groupsFromSnapshot } from "@/lib/publish-snapshot-pure";

export type PublishSnapshotRow = typeof publish_snapshots.$inferSelect;

export { serializeBriefGroups, groupsFromSnapshot } from "@/lib/publish-snapshot-pure";

function capturePackageAssets(projectId: string): {
  ready: boolean;
  assets: SnapshotPackageAsset[];
} {
  const assets = listAssets(projectId);
  const issue = finalDeliverableIssue(assets);
  if (issue) return { ready: false, assets: [] };

  const frozen: SnapshotPackageAsset[] = [];
  for (const kind of FINAL_DESIGN_KINDS) {
    const a = getSelectedAsset(projectId, kind);
    if (!a?.html?.trim()) continue;
    frozen.push({
      kind,
      id: a.id,
      name: a.name,
      variant: a.variant,
      html: a.html,
    });
  }
  return {
    ready: frozen.length === FINAL_DESIGN_KINDS.length,
    assets: frozen,
  };
}

function captureImplementPack(
  projectId: string
): PublishSnapshotPayload["package"]["implementPack"] {
  try {
    const pack = buildBrandPack(projectId);
    return {
      downloadName: pack.downloadName,
      files: pack.files.map((f) => ({ path: f.path, content: f.content })),
    };
  } catch {
    return null;
  }
}

/** Build an immutable payload from the live project (strategy + design package). */
export function buildPublishSnapshotPayload(
  project: Project,
  version: number
): PublishSnapshotPayload {
  const compiled = compileBrief(project);
  const groups = serializeBriefGroups(compiled);
  const markdown = buildMarkdown(project, compiled);
  const pkg = capturePackageAssets(project.id);
  const implementPack = pkg.ready ? captureImplementPack(project.id) : null;

  return {
    schemaVersion: 1,
    version,
    publishedAt: new Date().toISOString(),
    project: {
      id: project.id,
      name: project.name,
      client_name: project.client_name,
    },
    brief: { groups, markdown },
    package: {
      ready: pkg.ready,
      assets: pkg.assets,
      implementPack,
    },
  };
}

function nextVersion(projectId: string): number {
  const latest = db
    .select()
    .from(publish_snapshots)
    .where(eq(publish_snapshots.project_id, projectId))
    .orderBy(desc(publish_snapshots.version))
    .get();
  return (latest?.version ?? 0) + 1;
}

/**
 * Freeze the current brief + package as the current publish snapshot.
 * Call after share_token is set. Marks prior versions non-current.
 */
export function createPublishSnapshot(projectId: string, shareToken: string): PublishSnapshotRow {
  const project = getProject(projectId);
  if (!project) throw new Error("Project not found");

  const version = nextVersion(projectId);
  const payload = buildPublishSnapshotPayload(project, version);

  db.update(publish_snapshots)
    .set({ is_current: false })
    .where(eq(publish_snapshots.project_id, projectId))
    .run();

  const id = nanoid();
  db.insert(publish_snapshots)
    .values({
      id,
      project_id: projectId,
      share_token: shareToken,
      version,
      is_current: true,
      payload,
    })
    .run();

  return db.select().from(publish_snapshots).where(eq(publish_snapshots.id, id)).get()!;
}

export function getCurrentSnapshotByToken(token: string): PublishSnapshotRow | undefined {
  return db
    .select()
    .from(publish_snapshots)
    .where(and(eq(publish_snapshots.share_token, token), eq(publish_snapshots.is_current, true)))
    .get();
}

export function getCurrentSnapshotForProject(projectId: string): PublishSnapshotRow | undefined {
  return db
    .select()
    .from(publish_snapshots)
    .where(
      and(eq(publish_snapshots.project_id, projectId), eq(publish_snapshots.is_current, true))
    )
    .get();
}

export function listSnapshotsForProject(projectId: string): PublishSnapshotRow[] {
  return db
    .select()
    .from(publish_snapshots)
    .where(eq(publish_snapshots.project_id, projectId))
    .orderBy(desc(publish_snapshots.version))
    .all();
}

/** Clear current flags on unpublish (history retained for local audit). */
export function clearCurrentSnapshots(projectId: string): void {
  db.update(publish_snapshots)
    .set({ is_current: false })
    .where(eq(publish_snapshots.project_id, projectId))
    .run();
}

export function snapshotProjectStub(payload: PublishSnapshotPayload): Project {
  return {
    id: payload.project.id,
    name: payload.project.name,
    client_name: payload.project.client_name,
    status: "active",
    viability: "pass",
    viability_override_note: null,
    greenfield: false,
    personal: false,
    current_phase: "finished",
    share_token: null,
    published_at: new Date(payload.publishedAt),
    created_at: new Date(payload.publishedAt),
    updated_at: new Date(payload.publishedAt),
  } as Project;
}

export function buildMarkdownFromSnapshot(payload: PublishSnapshotPayload): string {
  return payload.brief.markdown;
}

export function buildHtmlFromSnapshot(payload: PublishSnapshotPayload): string {
  const project = snapshotProjectStub(payload);
  const compiled = groupsFromSnapshot(payload.brief.groups);
  return buildHtml(project, compiled);
}

export function getSnapshotPackageAsset(
  payload: PublishSnapshotPayload,
  kind: SnapshotPackageAsset["kind"]
): SnapshotPackageAsset | undefined {
  return payload.package.assets.find((a) => a.kind === kind);
}
