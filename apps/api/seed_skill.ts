import { prisma } from "./src/core/db/prisma.js";

async function main() {
  const skills = [
    {
      key: "executive_assistant",
      name: "Executive Personal Assistant",
      shortDescription: "Persistent AI-powered operational assistant for managing tasks, reminders, memory, follow-ups, scheduling, and productivity workflows.",
      description: "Acts as the user's operational brain by continuously managing tasks, reminders, contextual memory, follow-ups, scheduling, and workflow continuity. The skill maintains long-term conversational and operational context, helping business owners and teams organize work, remember important information, track commitments, coordinate activities, and retrieve historical decisions naturally across conversations.",
      category: "operations",
      capabilities: [
        { "key": "task_management", "name": "Task Management" },
        { "key": "smart_reminders", "name": "Smart Reminders" },
        { "key": "contextual_memory", "name": "Contextual Memory" },
        { "key": "follow_up_tracking", "name": "Follow-Up Tracking" },
        { "key": "daily_briefings", "name": "Daily Briefings" },
        { "key": "priority_management", "name": "Priority Management" },
        { "key": "scheduling", "name": "Scheduling Assistance" },
        { "key": "context_retrieval", "name": "Context Retrieval" },
        { "key": "operational_continuity", "name": "Operational Continuity" },
        { "key": "proactive_assistance", "name": "Proactive Assistance" }
      ],
      supportedEntities: [
        "task",
        "reminder",
        "memory",
        "follow_up",
        "meeting",
        "contact",
        "organization",
        "project",
        "note"
      ],
      memoryCategories: [
        "TASK",
        "REMINDER",
        "PREFERENCE",
        "DECISION",
        "GOAL",
        "FOLLOW_UP",
        "CONTACT_NOTE",
        "PROJECT_CONTEXT",
        "BUSINESS_CONTEXT",
        "MEETING_NOTE"
      ],
      examplePrompts: [
        "Remind me tomorrow to call Bilal.",
        "What pending tasks do I have?",
        "Remember that Bilal prefers evening meetings.",
        "Show overdue follow-ups.",
        "Move Friday meeting to Monday.",
        "What did we discuss about pricing last month?",
        "Give me today’s operational summary."
      ],
      sharedMemoryAccess: true,
      crossSkillCompatible: true,
      institutionalMemoryEnabled: false,
      historicalReasoningEnabled: false,
      calendarAwarenessEnabled: true,
      conflictDetectionEnabled: false,
      relationshipAwareScheduling: false,
      relationshipTimelineEnabled: false,
      historicalInteractionTracking: false,
      organizationalContinuityEnabled: true,
      workforceAwarenessEnabled: false,
      hiringWorkflowEnabled: false,
      isEnabled: true,
      version: "1.0",
      metadata: {}
    },
    {
      key: "business_knowledge_manager",
      name: "Business Knowledge Manager",
      shortDescription: "Persistent institutional memory system that stores, organizes, and retrieves strategic, operational, and organizational business knowledge.",
      description: "Acts as the organization's long-term cognitive memory by continuously storing and retrieving business decisions, operational learnings, strategic discussions, workflows, policies, ideas, market insights, and historical reasoning.",
      category: "knowledge_management",
      capabilities: [
        { "key": "strategic_memory", "name": "Strategic Memory" },
        { "key": "decision_tracking", "name": "Decision Tracking" },
        { "key": "operational_knowledge", "name": "Operational Knowledge" },
        { "key": "business_insights", "name": "Business Insights" },
        { "key": "historical_context_retrieval", "name": "Historical Context Retrieval" },
        { "key": "organizational_memory", "name": "Organizational Memory" },
        { "key": "policy_and_process_memory", "name": "Policy & Process Memory" },
        { "key": "project_knowledge_tracking", "name": "Project Knowledge Tracking" },
        { "key": "idea_and_innovation_memory", "name": "Idea & Innovation Memory" }
      ],
      supportedEntities: [
        "decision",
        "business_strategy",
        "workflow",
        "policy",
        "process",
        "project",
        "organization",
        "meeting",
        "idea",
        "market_insight"
      ],
      memoryCategories: [
        "DECISION",
        "BUSINESS_STRATEGY",
        "OPERATIONAL_WORKFLOW",
        "PROJECT_CONTEXT",
        "MEETING_NOTE",
        "MARKET_INSIGHT",
        "BUSINESS_INSIGHT",
        "PROCESS",
        "POLICY",
        "LESSON_LEARNED",
        "IDEA",
        "GOAL"
      ],
      examplePrompts: [
        "Remember that we are targeting Kashmir pharmacies first.",
        "What pricing strategy did we discuss last month?",
        "Why did we decide against Firebase migration?",
        "Store this supplier negotiation insight.",
        "What lessons did we learn from the pilot launch?"
      ],
      sharedMemoryAccess: true,
      crossSkillCompatible: true,
      institutionalMemoryEnabled: true,
      historicalReasoningEnabled: true,
      calendarAwarenessEnabled: false,
      conflictDetectionEnabled: false,
      relationshipAwareScheduling: false,
      relationshipTimelineEnabled: false,
      historicalInteractionTracking: true,
      organizationalContinuityEnabled: true,
      workforceAwarenessEnabled: false,
      hiringWorkflowEnabled: false,
      isEnabled: true,
      version: "1.0",
      metadata: {}
    },
    {
      key: "crm_relationship_memory",
      name: "CRM & Relationship Memory",
      shortDescription: "Persistent relationship intelligence system for managing customers, vendors, suppliers, partners, and communication history.",
      description: "Acts as the organization's relationship intelligence layer by continuously storing and retrieving customer preferences, vendor behavior, communication history, negotiation context, follow-ups, interaction patterns, and relationship insights.",
      category: "relationship_management",
      capabilities: [
        { "key": "contact_memory", "name": "Contact Memory" },
        { "key": "communication_history", "name": "Communication History" },
        { "key": "relationship_preferences", "name": "Relationship Preferences" },
        { "key": "follow_up_management", "name": "Follow-Up Management" },
        { "key": "sales_and_negotiation_memory", "name": "Sales & Negotiation Memory" },
        { "key": "vendor_behavior_tracking", "name": "Vendor Behavior Tracking" },
        { "key": "customer_intelligence", "name": "Customer Intelligence" },
        { "key": "relationship_timeline", "name": "Relationship Timeline" }
      ],
      supportedEntities: [
        "contact",
        "customer",
        "vendor",
        "supplier",
        "partner",
        "lead",
        "organization",
        "meeting",
        "interaction",
        "follow_up"
      ],
      memoryCategories: [
        "CONTACT_NOTE",
        "CUSTOMER_PREFERENCE",
        "SUPPLIER_BEHAVIOR",
        "COMMUNICATION_HISTORY",
        "FOLLOW_UP",
        "NEGOTIATION_NOTE",
        "PAYMENT_BEHAVIOR",
        "MEETING_NOTE",
        "RELATIONSHIP_INSIGHT"
      ],
      examplePrompts: [
        "Remember that Bilal prefers evening meetings.",
        "What do we know about Arif?",
        "Did supplier respond to our pricing discussion?",
        "Show communication history with Bilal.",
        "Supplier delays payments frequently."
      ],
      sharedMemoryAccess: true,
      crossSkillCompatible: true,
      institutionalMemoryEnabled: false,
      historicalReasoningEnabled: false,
      calendarAwarenessEnabled: false,
      conflictDetectionEnabled: false,
      relationshipAwareScheduling: true,
      relationshipTimelineEnabled: true,
      historicalInteractionTracking: true,
      organizationalContinuityEnabled: true,
      workforceAwarenessEnabled: false,
      hiringWorkflowEnabled: false,
      isEnabled: true,
      version: "1.0",
      metadata: {}
    },
    {
      key: "appointment_scheduling",
      name: "Appointment & Scheduling Manager",
      shortDescription: "Intelligent scheduling and coordination system for appointments, meetings, calendar management, and operational time planning.",
      description: "Acts as the organization's time coordination layer by managing appointments, meetings, availability, rescheduling, reminders, calendar continuity, and scheduling workflows.",
      category: "scheduling",
      capabilities: [
        { "key": "appointment_booking", "name": "Appointment Booking" },
        { "key": "calendar_management", "name": "Calendar Management" },
        { "key": "rescheduling_and_cancellations", "name": "Rescheduling & Cancellations" },
        { "key": "availability_coordination", "name": "Availability Coordination" },
        { "key": "meeting_reminders", "name": "Meeting Reminders" },
        { "key": "time_conflict_detection", "name": "Time Conflict Detection" },
        { "key": "relationship_aware_scheduling", "name": "Relationship-Aware Scheduling" },
        { "key": "follow_up_scheduling", "name": "Follow-Up Scheduling" }
      ],
      supportedEntities: [
        "appointment",
        "meeting",
        "calendar_event",
        "time_slot",
        "contact",
        "organization",
        "employee",
        "follow_up"
      ],
      memoryCategories: [
        "MEETING_NOTE",
        "SCHEDULE_PREFERENCE",
        "FOLLOW_UP",
        "APPOINTMENT_CONTEXT",
        "TIME_CONSTRAINT",
        "AVAILABILITY_PATTERN",
        "CALENDAR_EVENT"
      ],
      examplePrompts: [
        "Book Bilal tomorrow at 5 PM.",
        "Move Friday appointment to Monday.",
        "What meetings do I have tomorrow?",
        "Cancel my 4 PM meeting.",
        "Find a free slot for client onboarding."
      ],
      sharedMemoryAccess: true,
      crossSkillCompatible: true,
      institutionalMemoryEnabled: false,
      historicalReasoningEnabled: false,
      calendarAwarenessEnabled: true,
      conflictDetectionEnabled: true,
      relationshipAwareScheduling: true,
      relationshipTimelineEnabled: false,
      historicalInteractionTracking: false,
      organizationalContinuityEnabled: true,
      workforceAwarenessEnabled: false,
      hiringWorkflowEnabled: false,
      isEnabled: true,
      version: "1.0",
      metadata: {}
    },
    {
      key: "hr_team_coordination",
      name: "HR & Team Coordination",
      shortDescription: "Lightweight organizational coordination system for managing employees, attendance, hiring, leave tracking, team notes, and workforce continuity.",
      description: "Acts as the organization's people coordination layer by managing employee records, leave tracking, attendance reminders, hiring workflows, team notes, follow-ups, operational responsibilities, and workforce continuity.",
      category: "human_resources",
      capabilities: [
        { "key": "employee_memory", "name": "Employee Memory" },
        { "key": "leave_management", "name": "Leave Management" },
        { "key": "attendance_coordination", "name": "Attendance Coordination" },
        { "key": "hiring_and_interview_tracking", "name": "Hiring & Interview Tracking" },
        { "key": "employee_follow_ups", "name": "Employee Follow-Ups" },
        { "key": "team_notes_and_feedback", "name": "Team Notes & Feedback" },
        { "key": "role_and_responsibility_tracking", "name": "Role & Responsibility Tracking" },
        { "key": "shift_and_workforce_coordination", "name": "Shift & Workforce Coordination" }
      ],
      supportedEntities: [
        "employee",
        "candidate",
        "interview",
        "leave_request",
        "attendance_record",
        "shift",
        "team",
        "department"
      ],
      memoryCategories: [
        "EMPLOYEE_NOTE",
        "INTERVIEW_NOTE",
        "LEAVE_RECORD",
        "ATTENDANCE_CONTEXT",
        "PERFORMANCE_FEEDBACK",
        "ROLE_ASSIGNMENT",
        "TEAM_CONTEXT",
        "FOLLOW_UP",
        "HIRING_CONTEXT"
      ],
      examplePrompts: [
        "Arif is on leave tomorrow.",
        "Remind me to interview Bilal on Monday.",
        "What HR tasks are pending?",
        "Show attendance issues this week.",
        "Remember that Faisal handles supplier coordination."
      ],
      sharedMemoryAccess: true,
      crossSkillCompatible: true,
      institutionalMemoryEnabled: false,
      historicalReasoningEnabled: false,
      calendarAwarenessEnabled: false,
      conflictDetectionEnabled: false,
      relationshipAwareScheduling: false,
      relationshipTimelineEnabled: false,
      historicalInteractionTracking: true,
      organizationalContinuityEnabled: true,
      workforceAwarenessEnabled: true,
      hiringWorkflowEnabled: true,
      isEnabled: true,
      version: "1.0",
      metadata: {}
    }
  ];

  console.log(`Starting to seed ${skills.length} skills into the database...`);

  for (const skillData of skills) {
    console.log(`Upserting skill: "${skillData.key}"...`);
    const skill = await prisma.skill.upsert({
      where: { key: skillData.key },
      update: {
        name: skillData.name,
        shortDescription: skillData.shortDescription,
        description: skillData.description,
        category: skillData.category,
        capabilities: skillData.capabilities as any,
        supportedEntities: skillData.supportedEntities as any,
        memoryCategories: skillData.memoryCategories as any,
        examplePrompts: skillData.examplePrompts as any,
        sharedMemoryAccess: skillData.sharedMemoryAccess,
        crossSkillCompatible: skillData.crossSkillCompatible,
        institutionalMemoryEnabled: skillData.institutionalMemoryEnabled,
        historicalReasoningEnabled: skillData.historicalReasoningEnabled,
        calendarAwarenessEnabled: skillData.calendarAwarenessEnabled,
        conflictDetectionEnabled: skillData.conflictDetectionEnabled,
        relationshipAwareScheduling: skillData.relationshipAwareScheduling,
        relationshipTimelineEnabled: skillData.relationshipTimelineEnabled,
        historicalInteractionTracking: skillData.historicalInteractionTracking,
        organizationalContinuityEnabled: skillData.organizationalContinuityEnabled,
        workforceAwarenessEnabled: skillData.workforceAwarenessEnabled,
        hiringWorkflowEnabled: skillData.hiringWorkflowEnabled,
        isEnabled: skillData.isEnabled,
        version: skillData.version,
        metadata: skillData.metadata as any,
      },
      create: {
        key: skillData.key,
        name: skillData.name,
        shortDescription: skillData.shortDescription,
        description: skillData.description,
        category: skillData.category,
        capabilities: skillData.capabilities as any,
        supportedEntities: skillData.supportedEntities as any,
        memoryCategories: skillData.memoryCategories as any,
        examplePrompts: skillData.examplePrompts as any,
        sharedMemoryAccess: skillData.sharedMemoryAccess,
        crossSkillCompatible: skillData.crossSkillCompatible,
        institutionalMemoryEnabled: skillData.institutionalMemoryEnabled,
        historicalReasoningEnabled: skillData.historicalReasoningEnabled,
        calendarAwarenessEnabled: skillData.calendarAwarenessEnabled,
        conflictDetectionEnabled: skillData.conflictDetectionEnabled,
        relationshipAwareScheduling: skillData.relationshipAwareScheduling,
        relationshipTimelineEnabled: skillData.relationshipTimelineEnabled,
        historicalInteractionTracking: skillData.historicalInteractionTracking,
        organizationalContinuityEnabled: skillData.organizationalContinuityEnabled,
        workforceAwarenessEnabled: skillData.workforceAwarenessEnabled,
        hiringWorkflowEnabled: skillData.hiringWorkflowEnabled,
        isEnabled: skillData.isEnabled,
        version: skillData.version,
        metadata: skillData.metadata as any,
      }
    });
    console.log(`✅ Skill "${skill.key}" successfully upserted.`);
  }

  console.log("🎉 All skills seeded successfully!");
}

main()
  .catch((e) => {
    console.error("Error seeding skills:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
