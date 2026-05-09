import * as chrono from "chrono-node";
import { prisma } from "../db/prisma.js";
import { WorkingMemory, updateSession } from "./session.js";

interface ActionInstruction {
  operation: string;
  type: string;
  title?: string | null;
  resolvedIds?: string[];
  scheduledFor?: string | null;
  query?: string | null;
  mutations?: Record<string, any> | null;
}

export interface ActionResults {
  updatedWorkingMemory?: WorkingMemory;
  queryData?: any;
}

/**
 * Universal Action Engine — executes all actions from the cognitive extraction.
 * Replaces hundreds of lines of hardcoded if/else in the old intent.ts.
 */
export async function executeActions(
  userId: string,
  userPhone: string,
  messageId: string,
  actions: ActionInstruction[],
  workingMemory: WorkingMemory,
): Promise<ActionResults> {
  let queryData: any = null;
  const wm = { ...workingMemory };

  for (const action of actions) {
    switch (action.operation) {
      case "create":
        await handleCreate(userId, userPhone, messageId, action, wm);
        break;
      case "complete":
        await handleComplete(userId, action, wm);
        break;
      case "delete":
        await handleDelete(userId, action, wm);
        break;
      case "update":
        await handleUpdate(userId, action, wm);
        break;
      case "reopen":
        await handleReopen(userId, action, wm);
        break;
      case "query":
        queryData = await handleQuery(userId, action, wm);
        break;
    }
  }

  return { updatedWorkingMemory: wm, queryData };
}

async function handleCreate(userId: string, userPhone: string, messageId: string, action: ActionInstruction, wm: WorkingMemory) {
  const actionTitle = action.title || "Untitled";
  const actionType = action.type;
  let scheduleStr = "";

  if (action.type === "reminder" && action.scheduledFor) {
    const parsedDate = chrono.parseDate(action.scheduledFor) || new Date(action.scheduledFor);
    scheduleStr = ` scheduled for ${parsedDate.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })}`;
    await prisma.action.create({
      data: {
        userId,
        userPhone,
        type: "reminder",
        title: actionTitle,
        status: "pending",
        sourceMessageId: messageId,
        scheduledFor: parsedDate,
        payload: action.mutations || {},
      },
    });
    console.log(`⏰ [Action] Created reminder: "${actionTitle}" for ${parsedDate.toISOString()}`);
  } else {
    const created = await prisma.action.create({
      data: {
        userId,
        userPhone,
        type: actionType,
        title: actionTitle,
        status: "pending",
        sourceMessageId: messageId,
        payload: action.mutations || {},
      },
    });
    console.log(`✅ [Action] Created ${actionType}: "${created.title}"`);

    if (!wm.lastActionList) wm.lastActionList = [];
    wm.lastActionList.unshift({ id: created.id, title: created.title, type: created.type, status: "pending" });
  }

  // Auto-record action creation into semantic Memory
  await storeMemories(userId, messageId, [{
    category: "daily_routine",
    content: `Created ${actionType}: "${actionTitle}"${scheduleStr}.`,
    importance: 0.3
  }]);
}

async function handleComplete(userId: string, action: ActionInstruction, wm: WorkingMemory) {
  const ids = action.resolvedIds || [];
  if (ids.length === 0) return;

  const completedList = await prisma.action.findMany({
    where: { id: { in: ids }, userId },
    select: { type: true, title: true }
  });

  await prisma.action.updateMany({
    where: { id: { in: ids }, userId },
    data: { status: "completed", completedAt: new Date() },
  });
  console.log(`✅ [Action] Completed ${ids.length} action(s)`);

  if (wm.lastActionList) {
    wm.lastActionList = wm.lastActionList.filter((a) => !ids.includes(a.id));
  }

  // Auto-record action completion into semantic Memory
  const memoriesToStore = completedList.map(a => ({
    category: "daily_routine",
    content: `Completed ${a.type}: "${a.title}".`,
    importance: 0.3
  }));
  if (memoriesToStore.length > 0) {
    await storeMemories(userId, "", memoriesToStore);
  }
}

async function handleDelete(userId: string, action: ActionInstruction, wm: WorkingMemory) {
  const ids = action.resolvedIds || [];
  if (ids.length === 0) return;

  await prisma.action.deleteMany({ where: { id: { in: ids }, userId } });
  console.log(`🗑️ [Action] Deleted ${ids.length} action(s)`);

  if (wm.lastActionList) {
    wm.lastActionList = wm.lastActionList.filter((a) => !ids.includes(a.id));
  }
}

async function handleUpdate(userId: string, action: ActionInstruction, wm: WorkingMemory) {
  const ids = action.resolvedIds || [];
  if (ids.length === 0) return;

  const updateData: any = {};
  if (action.title) updateData.title = action.title;
  if (action.mutations) {
    for (const [key, value] of Object.entries(action.mutations)) {
      if (["title", "status"].includes(key)) updateData[key] = value;
    }
  }
  if (action.scheduledFor) {
    updateData.scheduledFor = chrono.parseDate(action.scheduledFor) || new Date(action.scheduledFor);
  }

  if (Object.keys(updateData).length > 0) {
    await prisma.action.updateMany({ where: { id: { in: ids }, userId }, data: updateData });
    console.log(`✏️ [Action] Updated ${ids.length} action(s)`);

    if (wm.lastActionList && updateData.title) {
      for (const item of wm.lastActionList) {
        if (ids.includes(item.id)) item.title = updateData.title;
      }
    }
  }
}

async function handleReopen(userId: string, action: ActionInstruction, wm: WorkingMemory) {
  const ids = action.resolvedIds || [];
  if (ids.length === 0) return;

  const reopened = await prisma.action.updateMany({
    where: { id: { in: ids }, userId },
    data: { status: "pending", completedAt: null },
  });
  console.log(`🔄 [Action] Reopened ${reopened.count} action(s)`);

  // Fetch reopened actions to add back to working memory
  const actions = await prisma.action.findMany({ where: { id: { in: ids } }, select: { id: true, title: true, type: true, status: true } });
  if (!wm.lastActionList) wm.lastActionList = [];
  for (const a of actions) {
    if (!wm.lastActionList.some((e) => e.id === a.id)) {
      wm.lastActionList.unshift({ id: a.id, title: a.title, type: a.type, status: a.status });
    }
  }
}

async function handleQuery(userId: string, action: ActionInstruction, wm: WorkingMemory): Promise<any> {
  if (action.type === "task") {
    const tasks = await prisma.action.findMany({
      where: { userId, type: "task", status: "pending" },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    wm.lastActionList = tasks.map((t) => ({ id: t.id, title: t.title, type: t.type, status: t.status }));
    wm.activeTopic = "tasks";
    return { type: "task_list", items: tasks.map((t, i) => ({ index: i + 1, title: t.title, status: t.status, createdAt: t.createdAt })) };
  }

  if (action.type === "reminder") {
    const reminders = await prisma.action.findMany({
      where: { userId, type: "reminder", status: "pending" },
      orderBy: { scheduledFor: "asc" },
      take: 20,
    });
    return { type: "reminder_list", items: reminders.map((r, i) => ({ index: i + 1, title: r.title, scheduledFor: r.scheduledFor })) };
  }

  // Generic memory/search query — return raw data for response generator
  const memories = await prisma.memory.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  return { type: "memory_search", query: action.query || action.title, items: memories.map((m) => ({ category: m.category, content: m.content })) };
}

/**
 * Store extracted memories into the universal Memory table with embeddings.
 * Resolves entityName → entityId to link memories to entities.
 */
export async function storeMemories(userId: string, messageId: string, memories: { category: string; content: string; entityName?: string | null; entityType?: string | null; importance?: number }[]) {
  for (const mem of memories) {
    // Resolve entityName to entityId
    let entityId: string | undefined;
    if (mem.entityName) {
      const entity = await prisma.entity.findFirst({
        where: { 
          userId, 
          name: { equals: mem.entityName, mode: "insensitive" },
          ...(mem.entityType ? { type: { equals: mem.entityType, mode: "insensitive" } } : {})
        },
        select: { id: true },
      });
      if (entity) entityId = entity.id;
    }

    const created = await prisma.memory.create({
      data: {
        userId,
        entityId,
        category: mem.category,
        content: mem.content,
        sourceMessageId: messageId || undefined,
        importanceScore: mem.importance || 0.5,
        metadata: mem.entityName ? { entityName: mem.entityName } : undefined,
      },
    });
    console.log(`🧠 [Memory] Stored: "${mem.content.substring(0, 50)}..." (${mem.category})${entityId ? ` → Entity: ${mem.entityName}` : ""}`);

    // Generate and store embedding asynchronously
    import("../embeddings.js")
      .then(({ getEmbedding }) =>
        getEmbedding(mem.content).then((vector) => {
          const vectorStr = `[${vector.join(",")}]`;
          return prisma.$executeRawUnsafe(`UPDATE "Memory" SET embedding = $1::vector WHERE id = $2`, vectorStr, created.id);
        }),
      )
      .catch(() => {});
  }
}

/**
 * Upsert extracted entities into the universal Entity table.
 */
export async function upsertEntities(userId: string, entities: { type: string; name: string; metadata?: any }[]) {
  for (const ent of entities) {
    const existing = await prisma.entity.findFirst({
      where: { userId, type: ent.type, name: { equals: ent.name, mode: "insensitive" } },
    });

    if (existing) {
      await prisma.entity.update({
        where: { id: existing.id },
        data: { metadata: { ...(existing.metadata as any), ...ent.metadata } },
      });
      console.log(`🔄 [Entity] Updated: ${ent.type}/${ent.name}`);
    } else {
      const created = await prisma.entity.create({
        data: { userId, type: ent.type, name: ent.name, metadata: ent.metadata || {} },
      });
      console.log(`✨ [Entity] Created: ${ent.type}/${ent.name}`);

      // Generate embedding for entity
      import("../embeddings.js")
        .then(({ getEmbedding }) =>
          getEmbedding(`${ent.type}: ${ent.name}`).then((vector) => {
            const vectorStr = `[${vector.join(",")}]`;
            return prisma.$executeRawUnsafe(`UPDATE "Entity" SET embedding = $1::vector WHERE id = $2`, vectorStr, created.id);
          }),
        )
        .catch(() => {});
    }
  }
}
