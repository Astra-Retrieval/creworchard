import * as actions from "@/app/app/actions";
import type { WorkspaceApi } from "@/lib/workspace-types";

/**
 * The workspace's server actions, bound to one project, ready to hand to the
 * browser components. Each action re-checks access on the server.
 */
export function workspaceApi(orgId: string, projectId: string): WorkspaceApi {
  return {
    createSubsystem: actions.createSubsystem.bind(null, orgId, projectId),
    createIntegration: actions.createIntegration.bind(null, orgId, projectId),
    setSubsystemMember: actions.setSubsystemMember.bind(null, orgId, projectId),
    createDocument: actions.createDocument.bind(null, orgId, projectId),
    getDocument: actions.getDocument.bind(null, orgId, projectId),
    saveDocument: actions.saveDocument.bind(null, orgId, projectId),
    setPin: actions.setPin.bind(null, orgId, projectId),
    listBom: actions.listBom.bind(null, orgId, projectId),
    addBomItem: actions.addBomItem.bind(null, orgId, projectId),
    deleteBomItem: actions.deleteBomItem.bind(null, orgId, projectId),
  };
}
