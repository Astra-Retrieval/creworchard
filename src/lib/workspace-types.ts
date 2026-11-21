/**
 * The shapes passed between the server and the project workspace in the
 * browser. Types only, so both sides can import it.
 */
import type { LineStyle } from "./canvas-layout.ts";
import type { ProjectRole, SubsystemColor } from "./project-rules.ts";

export type { LineStyle };

/** What every workspace action returns: success (with any data), or a message to show. */
export type Result<T = unknown> = ({ ok: true } & T) | { ok: false; message: string };

/** Someone on the project's team. */
export interface Person {
  user_id: string;
  full_name: string | null;
  email: string;
  role: ProjectRole;
}

export interface SubsystemNode {
  id: string;
  name: string;
  note: string | null;
  color: SubsystemColor;
  x: number;
  y: number;
  member_ids: string[];
}

export interface IntegrationNode {
  id: string;
  name: string;
  subsystem_ids: string[];
  member_ids: string[];
}

/** A document without its text, for lists. */
export interface DocSummary {
  id: string;
  title: string;
  subsystem_id: string | null;
  integration_id: string | null;
  updated_at: string;
}
export interface DocFull extends DocSummary {
  body: string;
}

export interface BomItem {
  id: string;
  subsystem_id: string;
  part_number: string;
  description: string;
  quantity: number;
  unit_cost: number;
}

export interface Pin {
  subsystem_id: string;
  document_id: string;
}

/** Which drive a document belongs to. Neither id means the project-wide drive. */
export interface DocScope {
  subsystemId?: string | null;
  integrationId?: string | null;
}

/** What the signed-in person may do in this project. */
export interface Abilities {
  manageTeam: boolean;
  createStructure: boolean;
  editContent: boolean;
}

/**
 * Every server action the workspace calls, already bound to one project.
 * Built in the project pages and passed down to the browser components.
 */
export interface WorkspaceApi {
  createSubsystem(input: { name: string; note: string; memberIds: string[] }): Promise<Result>;
  createIntegration(input: { name: string; subsystemIds: string[]; memberIds: string[] }): Promise<Result>;
  setSubsystemMember(input: { subsystemId: string; userId: string; assigned: boolean }): Promise<Result>;
  createDocument(input: { title: string } & DocScope): Promise<Result<{ id: string }>>;
  getDocument(id: string): Promise<Result<{ document: DocFull }>>;
  saveDocument(input: { id: string; title: string; body: string }): Promise<Result<{ updated_at: string }>>;
  setPin(input: { subsystemId: string; documentId: string; pinned: boolean }): Promise<Result>;
  listBom(subsystemId: string): Promise<Result<{ items: BomItem[] }>>;
  addBomItem(input: { subsystemId: string; partNumber: string; description: string; quantity: number; unitCost: number }): Promise<Result<{ item: BomItem }>>;
  deleteBomItem(id: string): Promise<Result>;
}
