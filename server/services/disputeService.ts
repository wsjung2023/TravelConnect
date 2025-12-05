import { db } from '../db';
import {
  disputeCases,
  disputeEvidence,
  disputeActivities,
  escrowTransactions,
  escrowAccounts,
  contracts,
  users,
  type DisputeCase,
  type DisputeEvidence,
  type DisputeActivity,
  type InsertDisputeCase,
  type InsertDisputeEvidence,
} from '@shared/schema';
import { eq, and, or, desc, sql, inArray, isNull, lte } from 'drizzle-orm';

export type DisputeType =
  | 'service_not_provided'
  | 'service_quality'
  | 'unauthorized_charge'
  | 'cancellation_refund'
  | 'host_no_show'
  | 'traveler_no_show'
  | 'other';

export type DisputeStatus =
  | 'open'
  | 'under_review'
  | 'evidence_requested'
  | 'awaiting_response'
  | 'mediation'
  | 'escalated'
  | 'resolved_favor_initiator'
  | 'resolved_favor_respondent'
  | 'resolved_partial'
  | 'withdrawn'
  | 'closed';

export type DisputePriority = 'low' | 'normal' | 'high' | 'urgent';

export type ResolutionType =
  | 'full_refund'
  | 'partial_refund'
  | 'no_refund'
  | 'credit_issued'
  | 'service_redo'
  | 'mutual_agreement';

const VALID_STATUS_TRANSITIONS: Record<DisputeStatus, DisputeStatus[]> = {
  open: ['under_review', 'evidence_requested', 'withdrawn', 'closed'],
  under_review: ['evidence_requested', 'awaiting_response', 'mediation', 'escalated', 'resolved_favor_initiator', 'resolved_favor_respondent', 'resolved_partial', 'closed'],
  evidence_requested: ['under_review', 'awaiting_response', 'withdrawn', 'closed'],
  awaiting_response: ['under_review', 'mediation', 'escalated', 'resolved_favor_initiator', 'resolved_favor_respondent', 'resolved_partial', 'closed'],
  mediation: ['resolved_favor_initiator', 'resolved_favor_respondent', 'resolved_partial', 'escalated', 'closed'],
  escalated: ['resolved_favor_initiator', 'resolved_favor_respondent', 'resolved_partial', 'closed'],
  resolved_favor_initiator: ['closed'],
  resolved_favor_respondent: ['closed'],
  resolved_partial: ['closed'],
  withdrawn: ['closed'],
  closed: [],
};

const SLA_HOURS: Record<DisputePriority, number> = {
  low: 72,
  normal: 48,
  high: 24,
  urgent: 4,
};

async function generateCaseNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `DIS-${year}-`;
  
  const lastCase = await db.select()
    .from(disputeCases)
    .where(sql`${disputeCases.caseNumber} LIKE ${prefix + '%'}`)
    .orderBy(desc(disputeCases.id))
    .limit(1);
  
  let nextNumber = 1;
  if (lastCase.length > 0 && lastCase[0]) {
    const lastNumber = parseInt(lastCase[0].caseNumber.replace(prefix, ''), 10);
    nextNumber = lastNumber + 1;
  }
  
  return `${prefix}${nextNumber.toString().padStart(5, '0')}`;
}

function calculateSlaDeadline(priority: DisputePriority): Date {
  const hours = SLA_HOURS[priority];
  const deadline = new Date();
  deadline.setHours(deadline.getHours() + hours);
  return deadline;
}

export async function createDispute(
  data: InsertDisputeCase & { disputedAmount?: string },
  actorId: string
): Promise<{ dispute: DisputeCase; error?: string }> {
  try {
    const caseNumber = await generateCaseNumber();
    const priority = (data.priority as DisputePriority) || 'normal';
    const slaDeadline = calculateSlaDeadline(priority);

    if (data.contractId) {
      const existingDispute = await db.select()
        .from(disputeCases)
        .where(
          and(
            eq(disputeCases.contractId, data.contractId),
            inArray(disputeCases.status, ['open', 'under_review', 'evidence_requested', 'awaiting_response', 'mediation', 'escalated'])
          )
        )
        .limit(1);
      
      if (existingDispute.length > 0 && existingDispute[0]) {
        return { dispute: existingDispute[0], error: 'Active dispute already exists for this contract' };
      }
    }

    const [newDispute] = await db.insert(disputeCases).values({
      ...data,
      caseNumber,
      slaDeadline,
      status: 'open',
    }).returning();

    if (!newDispute) {
      throw new Error('Failed to create dispute');
    }

    await logActivity(newDispute.id, actorId, 'created', 'Dispute case created');

    if (data.escrowTransactionId) {
      await db.update(escrowTransactions)
        .set({ 
          status: 'disputed',
          updatedAt: new Date(),
        })
        .where(eq(escrowTransactions.id, data.escrowTransactionId));
    }

    return { dispute: newDispute };
  } catch (error) {
    console.error('[DisputeService] Failed to create dispute:', error);
    throw error;
  }
}

export async function getDisputeById(
  disputeId: number
): Promise<DisputeCase | null> {
  const result = await db.select()
    .from(disputeCases)
    .where(eq(disputeCases.id, disputeId))
    .limit(1);
  
  return result[0] || null;
}

export async function getDisputeByCaseNumber(
  caseNumber: string
): Promise<DisputeCase | null> {
  const result = await db.select()
    .from(disputeCases)
    .where(eq(disputeCases.caseNumber, caseNumber))
    .limit(1);
  
  return result[0] || null;
}

export async function getUserDisputes(
  userId: string,
  options?: {
    status?: DisputeStatus;
    limit?: number;
    offset?: number;
  }
): Promise<{ disputes: DisputeCase[]; total: number }> {
  const conditions = [
    or(
      eq(disputeCases.complainantId, userId),
      eq(disputeCases.respondentId, userId)
    ),
  ];

  if (options?.status) {
    conditions.push(eq(disputeCases.status, options.status));
  }

  const countResult = await db.select({ count: sql<number>`count(*)` })
    .from(disputeCases)
    .where(and(...conditions));

  const disputes = await db.select()
    .from(disputeCases)
    .where(and(...conditions))
    .orderBy(desc(disputeCases.createdAt))
    .limit(options?.limit || 20)
    .offset(options?.offset || 0);

  return { disputes, total: Number(countResult[0]?.count || 0) };
}

export async function getAdminDisputes(
  options?: {
    status?: DisputeStatus;
    priority?: DisputePriority;
    assignedToMe?: string;
    unassigned?: boolean;
    limit?: number;
    offset?: number;
  }
): Promise<{ disputes: DisputeCase[]; total: number }> {
  const conditions = [];

  if (options?.status) {
    conditions.push(eq(disputeCases.status, options.status));
  }
  if (options?.priority) {
    conditions.push(eq(disputeCases.priority, options.priority));
  }
  if (options?.assignedToMe) {
    conditions.push(eq(disputeCases.assignedAdminId, options.assignedToMe));
  }
  if (options?.unassigned) {
    conditions.push(isNull(disputeCases.assignedAdminId));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const countResult = await db.select({ count: sql<number>`count(*)` })
    .from(disputeCases)
    .where(whereClause);

  const disputes = await db.select()
    .from(disputeCases)
    .where(whereClause)
    .orderBy(
      sql`CASE WHEN ${disputeCases.priority} = 'urgent' THEN 1 
              WHEN ${disputeCases.priority} = 'high' THEN 2 
              WHEN ${disputeCases.priority} = 'normal' THEN 3 
              ELSE 4 END`,
      desc(disputeCases.createdAt)
    )
    .limit(options?.limit || 50)
    .offset(options?.offset || 0);

  return { disputes, total: Number(countResult[0]?.count || 0) };
}

export async function updateDisputeStatus(
  disputeId: number,
  newStatus: DisputeStatus,
  actorId: string,
  comment?: string
): Promise<{ success: boolean; error?: string }> {
  const dispute = await getDisputeById(disputeId);
  if (!dispute) {
    return { success: false, error: 'Dispute not found' };
  }

  const currentStatus = dispute.status as DisputeStatus;
  const allowedTransitions = VALID_STATUS_TRANSITIONS[currentStatus];

  if (!allowedTransitions.includes(newStatus)) {
    return {
      success: false,
      error: `Cannot transition from ${currentStatus} to ${newStatus}`,
    };
  }

  const updateData: Record<string, unknown> = {
    status: newStatus,
    updatedAt: new Date(),
  };

  if (newStatus === 'resolved_favor_initiator' || newStatus === 'resolved_favor_respondent' || newStatus === 'resolved_partial') {
    updateData.resolvedAt = new Date();
  }
  if (newStatus === 'closed') {
    updateData.closedAt = new Date();
  }

  await db.update(disputeCases)
    .set(updateData)
    .where(eq(disputeCases.id, disputeId));

  await logActivity(
    disputeId,
    actorId,
    'status_changed',
    comment || `Status changed from ${currentStatus} to ${newStatus}`,
    currentStatus,
    newStatus
  );

  return { success: true };
}

export async function assignDispute(
  disputeId: number,
  adminId: string,
  actorId: string
): Promise<{ success: boolean; error?: string }> {
  const dispute = await getDisputeById(disputeId);
  if (!dispute) {
    return { success: false, error: 'Dispute not found' };
  }

  const admin = await db.select()
    .from(users)
    .where(and(eq(users.id, adminId), eq(users.role, 'admin')))
    .limit(1);

  if (admin.length === 0) {
    return { success: false, error: 'Admin user not found' };
  }

  await db.update(disputeCases)
    .set({
      assignedAdminId: adminId,
      assignedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(disputeCases.id, disputeId));

  await logActivity(
    disputeId,
    actorId,
    'assigned',
    `Dispute assigned to admin`,
    dispute.assignedAdminId ?? undefined,
    adminId
  );

  return { success: true };
}

export async function resolveDispute(
  disputeId: number,
  resolution: {
    resolutionType: ResolutionType;
    resolutionSummary: string;
    refundAmount?: string;
    favoredParty: 'initiator' | 'respondent' | 'partial';
  },
  actorId: string
): Promise<{ success: boolean; error?: string }> {
  const dispute = await getDisputeById(disputeId);
  if (!dispute) {
    return { success: false, error: 'Dispute not found' };
  }

  let newStatus: DisputeStatus;
  switch (resolution.favoredParty) {
    case 'initiator':
      newStatus = 'resolved_favor_initiator';
      break;
    case 'respondent':
      newStatus = 'resolved_favor_respondent';
      break;
    case 'partial':
      newStatus = 'resolved_partial';
      break;
  }

  await db.update(disputeCases)
    .set({
      status: newStatus,
      resolutionType: resolution.resolutionType,
      resolutionSummary: resolution.resolutionSummary,
      refundAmount: resolution.refundAmount,
      resolvedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(disputeCases.id, disputeId));

  await logActivity(
    disputeId,
    actorId,
    'resolved',
    `Dispute resolved: ${resolution.resolutionType} - ${resolution.resolutionSummary}`,
    dispute.status ?? undefined,
    newStatus
  );

  if (resolution.resolutionType === 'full_refund' || resolution.resolutionType === 'partial_refund') {
    if (dispute.escrowTransactionId) {
      await db.update(escrowTransactions)
        .set({
          status: 'refunded',
          refundedAmount: resolution.refundAmount || dispute.disputedAmount,
          updatedAt: new Date(),
        })
        .where(eq(escrowTransactions.id, dispute.escrowTransactionId));

      if (dispute.contractId) {
        const contractResult = await db.select()
          .from(contracts)
          .where(eq(contracts.id, dispute.contractId))
          .limit(1);

        if (contractResult[0]) {
          const refundAmt = parseFloat(resolution.refundAmount || dispute.disputedAmount || '0');
          await db.update(escrowAccounts)
            .set({
              pendingBalance: sql`${escrowAccounts.pendingBalance} - ${refundAmt}`,
              updatedAt: new Date(),
            })
            .where(eq(escrowAccounts.userId, contractResult[0].guideId));
        }
      }
    }
  }

  return { success: true };
}

export async function withdrawDispute(
  disputeId: number,
  userId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const dispute = await getDisputeById(disputeId);
  if (!dispute) {
    return { success: false, error: 'Dispute not found' };
  }

  if (dispute.complainantId !== userId) {
    return { success: false, error: 'Only the initiator can withdraw the dispute' };
  }

  const result = await updateDisputeStatus(disputeId, 'withdrawn', userId, reason || 'Dispute withdrawn by initiator');

  if (result.success && dispute.escrowTransactionId) {
    await db.update(escrowTransactions)
      .set({
        status: 'funded',
        updatedAt: new Date(),
      })
      .where(eq(escrowTransactions.id, dispute.escrowTransactionId));
  }

  return result;
}

export async function submitEvidence(
  disputeId: number,
  evidence: InsertDisputeEvidence,
  actorId: string
): Promise<{ evidence: DisputeEvidence; error?: string }> {
  const dispute = await getDisputeById(disputeId);
  if (!dispute) {
    throw new Error('Dispute not found');
  }

  if (actorId !== dispute.complainantId && actorId !== dispute.respondentId) {
    throw new Error('Only dispute parties can submit evidence');
  }

  const closedStatuses: DisputeStatus[] = ['resolved_favor_initiator', 'resolved_favor_respondent', 'resolved_partial', 'withdrawn', 'closed'];
  if (closedStatuses.includes(dispute.status as DisputeStatus)) {
    throw new Error('Cannot submit evidence for a closed dispute');
  }

  const result = await db.insert(disputeEvidence).values({
    ...evidence,
    disputeId,
    submittedBy: actorId,
  }).returning();

  if (!result[0]) {
    throw new Error('Failed to submit evidence');
  }

  await logActivity(
    disputeId,
    actorId,
    'evidence_submitted',
    `Evidence submitted: ${evidence.title}`
  );

  if (actorId === dispute.respondentId && !dispute.respondedAt) {
    await db.update(disputeCases)
      .set({
        respondedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(disputeCases.id, disputeId));
  }

  return { evidence: result[0] };
}

export async function getDisputeEvidence(
  disputeId: number
): Promise<DisputeEvidence[]> {
  return db.select()
    .from(disputeEvidence)
    .where(eq(disputeEvidence.disputeId, disputeId))
    .orderBy(desc(disputeEvidence.createdAt));
}

export async function getDisputeActivities(
  disputeId: number
): Promise<DisputeActivity[]> {
  return db.select()
    .from(disputeActivities)
    .where(eq(disputeActivities.disputeId, disputeId))
    .orderBy(desc(disputeActivities.createdAt));
}

async function logActivity(
  disputeId: number,
  actorId: string,
  activityType: string,
  description: string,
  previousValue?: string,
  newValue?: string
): Promise<void> {
  await db.insert(disputeActivities).values({
    disputeId,
    actorId,
    activityType,
    description,
    previousValue,
    newValue,
  });
}

export async function checkSlaBreaches(): Promise<{ breachedCount: number }> {
  const now = new Date();
  
  const result = await db.update(disputeCases)
    .set({
      slaBreached: true,
      priority: 'urgent',
      updatedAt: now,
    })
    .where(
      and(
        eq(disputeCases.slaBreached, false),
        lte(disputeCases.slaDeadline, now),
        inArray(disputeCases.status, ['open', 'under_review', 'evidence_requested', 'awaiting_response'])
      )
    )
    .returning();

  return { breachedCount: result.length };
}

export async function escalateDispute(
  disputeId: number,
  actorId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const dispute = await getDisputeById(disputeId);
  if (!dispute) {
    return { success: false, error: 'Dispute not found' };
  }

  const escalatableStatuses: DisputeStatus[] = ['under_review', 'awaiting_response', 'mediation'];
  if (!escalatableStatuses.includes(dispute.status as DisputeStatus)) {
    return { success: false, error: 'Cannot escalate dispute in current status' };
  }

  await db.update(disputeCases)
    .set({
      status: 'escalated',
      priority: 'urgent',
      updatedAt: new Date(),
    })
    .where(eq(disputeCases.id, disputeId));

  await logActivity(
    disputeId,
    actorId,
    'escalated',
    `Dispute escalated: ${reason}`,
    dispute.status ?? undefined,
    'escalated'
  );

  return { success: true };
}

export async function getDisputeStats(): Promise<{
  total: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  slaBreached: number;
  averageResolutionHours: number;
}> {
  const totalResult = await db.select({ total: sql<number>`count(*)` })
    .from(disputeCases);

  const statusCounts = await db.select({
    status: disputeCases.status,
    count: sql<number>`count(*)`,
  })
    .from(disputeCases)
    .groupBy(disputeCases.status);

  const priorityCounts = await db.select({
    priority: disputeCases.priority,
    count: sql<number>`count(*)`,
  })
    .from(disputeCases)
    .groupBy(disputeCases.priority);

  const slaBreachedResult = await db.select({
    slaBreached: sql<number>`count(*)`,
  })
    .from(disputeCases)
    .where(eq(disputeCases.slaBreached, true));

  const avgResult = await db.select({
    avgHours: sql<number>`AVG(EXTRACT(EPOCH FROM (${disputeCases.resolvedAt} - ${disputeCases.createdAt})) / 3600)`,
  })
    .from(disputeCases)
    .where(sql`${disputeCases.resolvedAt} IS NOT NULL`);

  return {
    total: Number(totalResult[0]?.total || 0),
    byStatus: Object.fromEntries(statusCounts.map(s => [s.status, Number(s.count)])),
    byPriority: Object.fromEntries(priorityCounts.map(p => [p.priority, Number(p.count)])),
    slaBreached: Number(slaBreachedResult[0]?.slaBreached || 0),
    averageResolutionHours: avgResult[0]?.avgHours || 0,
  };
}

export async function addComment(
  disputeId: number,
  actorId: string,
  comment: string
): Promise<{ success: boolean }> {
  await logActivity(disputeId, actorId, 'comment_added', comment);
  return { success: true };
}
