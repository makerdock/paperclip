import { Router } from "express";
import type { Db } from "@paperclipai/db";
import {
  createDocumentSchema,
  updateDocumentSchema,
  linkDocumentGoalSchema,
  linkDocumentIssueSchema,
} from "@paperclipai/shared";
import { validate } from "../middleware/validate.js";
import { documentService, logActivity } from "../services/index.js";
import { assertCompanyAccess, getActorInfo } from "./authz.js";

export function documentRoutes(db: Db) {
  const router = Router();
  const svc = documentService(db);

  // List documents for a company
  router.get("/companies/:companyId/documents", async (req, res) => {
    const companyId = req.params.companyId as string;
    assertCompanyAccess(req, companyId);
    const filters: { projectId?: string; goalId?: string; issueId?: string } = {};
    if (req.query.projectId) filters.projectId = req.query.projectId as string;
    if (req.query.goalId) filters.goalId = req.query.goalId as string;
    if (req.query.issueId) filters.issueId = req.query.issueId as string;
    const result = await svc.list(companyId, filters);
    res.json(result);
  });

  // Create document
  router.post(
    "/companies/:companyId/documents",
    validate(createDocumentSchema),
    async (req, res) => {
      const companyId = req.params.companyId as string;
      assertCompanyAccess(req, companyId);
      const actor = getActorInfo(req);
      const doc = await svc.create(companyId, {
        ...req.body,
        createdByAgentId: actor.agentId ?? null,
        createdByUserId: actor.actorType === "user" ? actor.actorId : null,
      });
      await logActivity(db, {
        companyId,
        actorType: actor.actorType,
        actorId: actor.actorId,
        agentId: actor.agentId,
        action: "document.created",
        entityType: "document",
        entityId: doc.id,
        details: { title: doc.title },
      });
      res.status(201).json(doc);
    },
  );

  // Get document with links
  router.get("/documents/:id", async (req, res) => {
    const id = req.params.id as string;
    const doc = await svc.getById(id);
    if (!doc) {
      res.status(404).json({ error: "Document not found" });
      return;
    }
    assertCompanyAccess(req, doc.companyId);
    res.json(doc);
  });

  // Update document
  router.patch("/documents/:id", validate(updateDocumentSchema), async (req, res) => {
    const id = req.params.id as string;
    const existing = await svc.getById(id);
    if (!existing) {
      res.status(404).json({ error: "Document not found" });
      return;
    }
    assertCompanyAccess(req, existing.companyId);
    const doc = await svc.update(id, req.body);
    if (!doc) {
      res.status(404).json({ error: "Document not found" });
      return;
    }
    const actor = getActorInfo(req);
    await logActivity(db, {
      companyId: doc.companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      action: "document.updated",
      entityType: "document",
      entityId: doc.id,
      details: req.body,
    });
    res.json(doc);
  });

  // Delete document
  router.delete("/documents/:id", async (req, res) => {
    const id = req.params.id as string;
    const existing = await svc.getById(id);
    if (!existing) {
      res.status(404).json({ error: "Document not found" });
      return;
    }
    assertCompanyAccess(req, existing.companyId);
    const doc = await svc.remove(id);
    if (!doc) {
      res.status(404).json({ error: "Document not found" });
      return;
    }
    const actor = getActorInfo(req);
    await logActivity(db, {
      companyId: doc.companyId,
      actorType: actor.actorType,
      actorId: actor.actorId,
      agentId: actor.agentId,
      action: "document.deleted",
      entityType: "document",
      entityId: doc.id,
    });
    res.json(doc);
  });

  // Link goal
  router.post(
    "/documents/:id/goals",
    validate(linkDocumentGoalSchema),
    async (req, res) => {
      const id = req.params.id as string;
      const existing = await svc.getById(id);
      if (!existing) {
        res.status(404).json({ error: "Document not found" });
        return;
      }
      assertCompanyAccess(req, existing.companyId);
      const link = await svc.linkGoal(id, req.body.goalId);
      res.status(201).json(link);
    },
  );

  // Unlink goal
  router.delete("/documents/:id/goals/:goalId", async (req, res) => {
    const id = req.params.id as string;
    const goalId = req.params.goalId as string;
    const existing = await svc.getById(id);
    if (!existing) {
      res.status(404).json({ error: "Document not found" });
      return;
    }
    assertCompanyAccess(req, existing.companyId);
    const link = await svc.unlinkGoal(id, goalId);
    if (!link) {
      res.status(404).json({ error: "Link not found" });
      return;
    }
    res.json(link);
  });

  // Link issue
  router.post(
    "/documents/:id/issues",
    validate(linkDocumentIssueSchema),
    async (req, res) => {
      const id = req.params.id as string;
      const existing = await svc.getById(id);
      if (!existing) {
        res.status(404).json({ error: "Document not found" });
        return;
      }
      assertCompanyAccess(req, existing.companyId);
      const link = await svc.linkIssue(id, req.body.issueId);
      res.status(201).json(link);
    },
  );

  // Unlink issue
  router.delete("/documents/:id/issues/:issueId", async (req, res) => {
    const id = req.params.id as string;
    const issueId = req.params.issueId as string;
    const existing = await svc.getById(id);
    if (!existing) {
      res.status(404).json({ error: "Document not found" });
      return;
    }
    assertCompanyAccess(req, existing.companyId);
    const link = await svc.unlinkIssue(id, issueId);
    if (!link) {
      res.status(404).json({ error: "Link not found" });
      return;
    }
    res.json(link);
  });

  return router;
}
