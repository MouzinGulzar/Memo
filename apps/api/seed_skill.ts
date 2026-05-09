import { prisma } from "./src/core/db/prisma.js";

async function main() {
  const skills = [
    {
      key: "executive_assistant",
      name: "Business & Operations Assistant",
      shortDescription: "Persistent AI-powered operational brain for business owners and teams to manage tasks, reminders, contextual memory, business decisions, client deals, follow-ups, and operational continuity.",
      description: "Acts as the user's operational co-pilot by continuously managing business tasks, reminders, contextual memory, client commitments, follow-ups, and scheduling continuity. It is designed specifically for small-and-medium enterprise (SME) owners, helping organize daily operations, remember crucial client preferences, track commitments, log executive business decisions, coordinate team responsibilities, and retrieve historical context naturally across conversations.",
      category: "operations",
      capabilities: [
        { "key": "task_management", "name": "Business Task Management" },
        { "key": "smart_reminders", "name": "Smart Reminders & Follow-Ups" },
        { "key": "contextual_memory", "name": "Business Contextual Memory" },
        { "key": "deal_tracking", "name": "Client & Deal Tracking" },
        { "key": "business_decision_tracking", "name": "Business Decision Tracking" },
        { "key": "daily_briefings", "name": "Daily Executive Briefings" },
        { "key": "priority_management", "name": "Operational Priority Management" },
        { "key": "scheduling", "name": "Client Scheduling Assistance" },
        { "key": "context_retrieval", "name": "Operational Context Retrieval" },
        { "key": "operational_continuity", "name": "Business Workflow Continuity" }
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
        "deal",
        "client",
        "invoice",
        "lead",
        "note"
      ],
      supportedActions: [
        "create_task",
        "create_reminder",
        "query_tasks",
        "complete_task",
        "delete_task",
        "reopen_task",
        "update_reminder"
      ],
      supportedIntents: [
        "task_management",
        "reminders",
        "productivity_workflow",
        "working_memory_query"
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
        "MEETING_NOTE",
        "BUSINESS_STRATEGY",
        "BUSINESS_DECISION",
        "CLIENT_DEAL",
        "OPERATIONAL_INSIGHT"
      ],
      examplePrompts: [
        "Remind me tomorrow to call Bilal regarding the Mediflux deal.",
        "What pending business tasks do I have?",
        "Remember that Bilal prefers evening meetings for software onboarding.",
        "Show overdue client follow-ups.",
        "Move Friday Mediflux demo to Monday.",
        "What did we discuss about our pricing strategy last month?",
        "Give me today's operational and business summary.",
        "Remind me tomorrow at 4 PM to check the Mediflux invoice status.",
        "Mark the first task as completed.",
        "Remember that Faisal is responsible for supplier coordination.",
        "We decided to offer a 10% discount on subscriptions for Kashmir clients."
      ],
      executionRules: [
        "Always prioritize business operational tasks and track client commitments with extreme diligence.",
        "For reminders, if a specific time is not explicitly mentioned, default the scheduling to 9:00 AM on the specified target date.",
        "Categorize client habits, preferences, likes, dislikes, and conversational guidelines under the PREFERENCE category.",
        "When the user logs a business decision or operational strategy, automatically extract and classify it under the BUSINESS_DECISION or BUSINESS_STRATEGY category.",
        "Resolve any task or client action indices relative to the active lastActionList in the working memory.",
        "Always synthesize a clean, premium, and natural assistant response indicating action execution or query results transition."
      ],
      triggers: [
        "user says 'remind me'",
        "user asks 'what do I have pending'",
        "user says 'remember that'",
        "user says 'we decided'"
      ],
      sharedMemoryAccess: true,
      crossSkillCompatible: true,
      institutionalMemoryEnabled: true,
      historicalReasoningEnabled: true,
      calendarAwarenessEnabled: true,
      conflictDetectionEnabled: true,
      relationshipAwareScheduling: true,
      relationshipTimelineEnabled: true,
      historicalInteractionTracking: true,
      organizationalContinuityEnabled: true,
      workforceAwarenessEnabled: true,
      hiringWorkflowEnabled: false,
      autonomousExecutionEnabled: false,
      proactiveCapabilitiesEnabled: true,
      semanticSearchEnabled: true,
      reasoningEnabled: true,
      orchestrationEnabled: true,
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
      supportedActions: [
        "store_decision",
        "store_strategy",
        "query_knowledge",
        "retrieve_lessons",
        "add_policy",
        "add_process"
      ],
      supportedIntents: [
        "institutional_memory",
        "strategic_planning",
        "operational_learning",
        "knowledge_query"
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
        "What lessons did we learn from the pilot launch?",
        "Mediflux is our primary pharmacy management system.",
        "We decided against migrating to Firebase because of local hosting requirements.",
        "Remember that our pricing strategy is to offer a 10% discount to chronic patients."
      ],
      executionRules: [
        "Always extract business decisions under the DECISION category and include a 'rationale' or context field inside the metadata.",
        "When the user shares long-term strategic plans or targets, classify them under the BUSINESS_STRATEGY category.",
        "Store operational instructions, system setups, and workflows under the PROCESS category.",
        "Store official company guidelines, regulations, and operational restrictions under the POLICY category.",
        "For system architecture or product designs, always link to the corresponding 'system' or 'product' entity."
      ],
      triggers: [
        "user explains a business decision",
        "user says 'pricing strategy is'",
        "user asks 'why did we'"
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
      autonomousExecutionEnabled: false,
      proactiveCapabilitiesEnabled: false,
      semanticSearchEnabled: true,
      reasoningEnabled: true,
      orchestrationEnabled: true,
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
      supportedActions: [
        "add_contact",
        "track_interaction",
        "query_relationships",
        "store_preferences",
        "log_negotiation"
      ],
      supportedIntents: [
        "relationship_intelligence",
        "contact_management",
        "negotiation_history",
        "customer_query"
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
        "Supplier delays payments frequently.",
        "Remember that Mudasir is our lead developer.",
        "Mudasir prefers communicating via WhatsApp in the evening.",
        "The Mediflux supplier always delivers on Tuesdays."
      ],
      executionRules: [
        "Always link customer preferences, behaviors, and roles to the corresponding 'person' or 'contact' entity name.",
        "Store supplier payment patterns and delivery reliability under the SUPPLIER_BEHAVIOR category with descriptive metadata.",
        "Classify contact communication notes as CONTACT_NOTE and log negotiation terms under NEGOTIATION_NOTE.",
        "Verify if the contact or person has an existing record using case-insensitive search before linking memories."
      ],
      triggers: [
        "user mentions a client or supplier name",
        "user says ' Bilal prefers'",
        "user asks 'what do we know about'"
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
      autonomousExecutionEnabled: false,
      proactiveCapabilitiesEnabled: true,
      semanticSearchEnabled: true,
      reasoningEnabled: true,
      orchestrationEnabled: true,
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
      supportedActions: [
        "book_appointment",
        "reschedule_appointment",
        "cancel_appointment",
        "query_calendar",
        "detect_conflict"
      ],
      supportedIntents: [
        "calendar_booking",
        "appointment_coordination",
        "meeting_reschedule",
        "calendar_query"
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
        "Find a free slot for client onboarding.",
        "Book an appointment with Mudasir tomorrow at 5 PM.",
        "Reschedule the Friday meeting to Monday at 10 AM.",
        "Do I have any meetings scheduled for tomorrow?"
      ],
      executionRules: [
        "Only allow booking appointments during default business hours (9:00 AM to 6:00 PM IST). Raise clarification if outside.",
        "Scan active pendingActions to identify and alert the user to any time conflicts or overlapping scheduling.",
        "When an appointment is cancelled, change its status to 'cancelled' rather than fully deleting to maintain schedule audit records.",
        "Store preferred scheduling times or restricted slots under the SCHEDULE_PREFERENCE category."
      ],
      triggers: [
        "user says 'book a meeting'",
        "user says 'move Friday meeting'",
        "user asks 'am I free'"
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
      autonomousExecutionEnabled: true,
      proactiveCapabilitiesEnabled: true,
      semanticSearchEnabled: true,
      reasoningEnabled: true,
      orchestrationEnabled: true,
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
      supportedActions: [
        "add_employee",
        "request_leave",
        "log_attendance",
        "schedule_interview",
        "update_role",
        "record_feedback"
      ],
      supportedIntents: [
        "employee_records",
        "leave_coordination",
        "candidate_workflow",
        "attendance_monitoring"
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
        "Remember that Faisal handles supplier coordination.",
        "Mudasir is on leave tomorrow.",
        "Schedule an interview with Bilal on Monday at 11 AM.",
        "Arif is responsible for Mediflux Health OS deployment."
      ],
      executionRules: [
        "Classify employee vacation, sick time, and leaves under LEAVE_RECORD with explicit start/end metadata fields.",
        "Store hiring candidate evaluations, interview timings, and resumes under the INTERVIEW_NOTE category.",
        "Log employee responsibility changes, ownership updates, and role descriptions under ROLE_ASSIGNMENT.",
        "If employee attendance issues or missing shifts are reported, automatically suggest generating a follow-up task."
      ],
      triggers: [
        "user says 'is on leave'",
        "user says ' interview Faisal'",
        "user asks 'who is responsible for'"
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
      autonomousExecutionEnabled: false,
      proactiveCapabilitiesEnabled: true,
      semanticSearchEnabled: true,
      reasoningEnabled: true,
      orchestrationEnabled: true,
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
        supportedActions: skillData.supportedActions as any,
        supportedIntents: skillData.supportedIntents as any,
        memoryCategories: skillData.memoryCategories as any,
        examplePrompts: skillData.examplePrompts as any,
        executionRules: skillData.executionRules as any,
        triggers: skillData.triggers as any,
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
        autonomousExecutionEnabled: skillData.autonomousExecutionEnabled,
        proactiveCapabilitiesEnabled: skillData.proactiveCapabilitiesEnabled,
        semanticSearchEnabled: skillData.semanticSearchEnabled,
        reasoningEnabled: skillData.reasoningEnabled,
        orchestrationEnabled: skillData.orchestrationEnabled,
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
        supportedActions: skillData.supportedActions as any,
        supportedIntents: skillData.supportedIntents as any,
        memoryCategories: skillData.memoryCategories as any,
        examplePrompts: skillData.examplePrompts as any,
        executionRules: skillData.executionRules as any,
        triggers: skillData.triggers as any,
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
        autonomousExecutionEnabled: skillData.autonomousExecutionEnabled,
        proactiveCapabilitiesEnabled: skillData.proactiveCapabilitiesEnabled,
        semanticSearchEnabled: skillData.semanticSearchEnabled,
        reasoningEnabled: skillData.reasoningEnabled,
        orchestrationEnabled: skillData.orchestrationEnabled,
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
