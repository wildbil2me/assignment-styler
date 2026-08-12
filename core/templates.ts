import type { Block, SurfaceKey } from "./model.ts";

/**
 * Fifteen post templates, five per surface, plus the Macbeth starter document.
 *
 * Copied verbatim from app/page.tsx — the punctuation matters. Curly
 * apostrophes, en dashes in scene ranges, em dashes in "Term — definition", and
 * the middle dot in "Vocabulary quiz · Thursday" all appear in exported HTML, so
 * the differential tests compare these byte for byte.
 */

export const templateGroups: Record<SurfaceKey, string[]> = {
  assignment: [
    "Standard Assignment",
    "Reading Assignment",
    "Written Response",
    "Essay",
    "Project",
  ],
  topic: [
    "Unit Introduction",
    "Lesson Page",
    "Reading Guide",
    "Study Guide",
    "Resource Collection",
  ],
  bulletin: [
    "Daily Update",
    "Weekly Overview",
    "Upcoming Assessments",
    "Important Announcement",
    "Deadlines and Reminders",
  ],
};

export const templates: Record<string, Block[]> = {
  "Standard Assignment": [
    { id: 201, type: "hero", label: "ASSIGNMENT", title: "ASSIGNMENT TITLE", body: "Add a concise purpose or summary" },
    { id: 202, type: "homework", title: "What to do", body: "Describe the assignment clearly" },
    { id: 203, type: "steps", title: "Directions", body: "Complete the first step\nComplete the next step\nReview and submit your work" },
    { id: 204, type: "checklist", title: "What to submit", body: "List the required deliverables" },
    { id: 205, type: "deadline", title: "Due", body: "Add the due date and time" },
  ],
  "Reading Assignment": [
    { id: 211, type: "hero", label: "READING ASSIGNMENT", title: "ASSIGNED READING", body: "Add the text or unit" },
    { id: 212, type: "reading", title: "Read", body: "Add the title, chapter, scenes, or pages" },
    { id: 213, type: "focus", title: "As you read", body: "Add questions, annotations, or ideas to track" },
    { id: 214, type: "checklist", title: "Come prepared with", body: "Add notes, responses, or materials students need" },
    { id: 215, type: "deadline", title: "Complete by", body: "Add the due date" },
  ],
  "Written Response": [
    { id: 221, type: "hero", label: "WRITTEN RESPONSE", title: "RESPONSE TITLE", body: "Add the topic or text" },
    { id: 222, type: "focus", title: "Prompt", body: "Write the complete response question" },
    { id: 223, type: "targets", title: "A strong response will", body: "Answer the prompt directly\nUse specific evidence\nExplain the reasoning" },
    { id: 224, type: "checklist", title: "Requirements", body: "Add length, format, and submission requirements" },
    { id: 225, type: "deadline", title: "Due", body: "Add the due date and time" },
  ],
  Essay: [
    { id: 231, type: "hero", label: "ESSAY", title: "ESSAY ASSIGNMENT", body: "Add the essay topic" },
    { id: 232, type: "focus", title: "Prompt", body: "Write the complete essay prompt" },
    { id: 233, type: "targets", title: "Goals", body: "Develop a clear thesis\nUse relevant evidence\nOrganize ideas purposefully" },
    { id: 234, type: "checklist", title: "Requirements", body: "Add length, sources, format, and citation expectations" },
    { id: 235, type: "steps", title: "Process", body: "Plan\nDraft\nRevise\nSubmit" },
    { id: 236, type: "deadline", title: "Due", body: "Add the due date and time" },
  ],
  Project: [
    { id: 241, type: "hero", label: "PROJECT", title: "PROJECT TITLE", body: "Add the project’s purpose" },
    { id: 242, type: "targets", title: "Project goal", body: "Describe the intended outcome" },
    { id: 243, type: "steps", title: "Process", body: "Plan\nCreate\nRevise\nSubmit" },
    { id: 244, type: "checklist", title: "Deliverables", body: "List everything students must turn in" },
    { id: 245, type: "resource", title: "Resources", body: "Add helpful links, files, or examples" },
    { id: 246, type: "deadline", title: "Final deadline", body: "Add the due date and time" },
  ],
  "Unit Introduction": [
    { id: 301, type: "hero", label: "UNIT", title: "UNIT TITLE", body: "Add the unit’s central idea" },
    { id: 302, type: "intro", title: "", body: "Introduce what students will study and why it matters." },
    { id: 303, type: "targets", width: "half", title: "Learning goals", body: "Add the unit’s essential knowledge and skills" },
    { id: 304, type: "focus", width: "half", title: "Essential questions", body: "Add the questions that will guide the unit" },
    { id: 305, type: "vocabulary", title: "Key vocabulary", body: "Term — definition" },
    { id: 306, type: "resource", title: "Unit resources", body: "Add important links, files, or media" },
  ],
  "Lesson Page": [
    { id: 311, type: "hero", label: "LESSON", title: "LESSON TITLE", body: "Add the lesson focus" },
    { id: 312, type: "targets", title: "Today’s goals", body: "Add the lesson objectives" },
    { id: 313, type: "intro", title: "", body: "Explain the central concept or provide lesson context." },
    { id: 314, type: "steps", title: "Learning sequence", body: "Explore\nPractice\nApply\nReflect" },
    { id: 315, type: "focus", title: "Check your understanding", body: "Add a question or short reflection" },
    { id: 316, type: "resource", title: "Resources", body: "Add lesson materials or links" },
  ],
  "Reading Guide": [
    { id: 321, type: "hero", label: "READING GUIDE", title: "TEXT OR CHAPTER", body: "Add the reading context" },
    { id: 322, type: "intro", title: "", body: "Explain what students should understand before reading." },
    { id: 323, type: "vocabulary", width: "half", title: "Key terms", body: "Term — definition" },
    { id: 324, type: "focus", width: "half", title: "Questions to consider", body: "Add guiding questions" },
    { id: 325, type: "reading", title: "Reading sections", body: "Add chapters, pages, scenes, or passages" },
    { id: 326, type: "note", title: "Annotation guidance", body: "Explain what students should notice or mark" },
  ],
  "Study Guide": [
    { id: 331, type: "hero", label: "STUDY GUIDE", title: "ASSESSMENT OR UNIT", body: "Organize your review" },
    { id: 332, type: "targets", title: "You should be able to", body: "Add the knowledge and skills students need" },
    { id: 333, type: "vocabulary", width: "half", title: "Key vocabulary", body: "Term — definition" },
    { id: 334, type: "focus", width: "half", title: "Practice questions", body: "Add representative questions" },
    { id: 335, type: "checklist", title: "Review checklist", body: "Review notes\nPractice key skills\nIdentify remaining questions" },
    // The reason `details` was promoted to a block type: an answer key students
    // open only after they have tried the questions themselves.
    { id: 336, type: "details", title: "Answers — open after you try", body: "Add the worked answers or explanations" },
    { id: 337, type: "resource", title: "Review resources", body: "Add helpful materials or links" },
  ],
  "Resource Collection": [
    { id: 341, type: "hero", label: "RESOURCES", title: "RESOURCE COLLECTION", body: "Add the topic or purpose" },
    { id: 342, type: "intro", title: "", body: "Explain how students should use this collection." },
    { id: 343, type: "resource", title: "Start here", body: "Add the primary resource link" },
    { id: 344, type: "resource", width: "half", title: "Read", body: "Add articles, documents, or books" },
    { id: 345, type: "resource", width: "half", title: "Watch or listen", body: "Add videos, podcasts, or media" },
    { id: 346, type: "note", title: "Using these resources", body: "Add any directions, priorities, or access notes" },
  ],
  "Daily Update": [
    { id: 401, type: "hero", label: "DAILY UPDATE", title: "TODAY IN CLASS", body: "Add the date or lesson focus" },
    { id: 402, type: "note", title: "What we did", body: "Summarize today’s learning" },
    { id: 403, type: "homework", width: "half", title: "Tonight", body: "Add required work" },
    { id: 404, type: "announcement", width: "half", title: "Remember", body: "Add a timely class reminder" },
    { id: 405, type: "deadline", title: "Coming up", body: "Add the next important date" },
  ],
  "Weekly Overview": [
    { id: 411, type: "hero", label: "THIS WEEK", title: "WEEKLY OVERVIEW", body: "Add the week or unit focus" },
    { id: 412, type: "targets", title: "This week’s goals", body: "Add the main learning goals" },
    { id: 413, type: "steps", title: "The week ahead", body: "Monday — Add plan\nWednesday — Add plan\nFriday — Add plan" },
    { id: 414, type: "homework", width: "half", title: "Assignments", body: "Summarize required work" },
    { id: 415, type: "deadline", width: "half", title: "Important dates", body: "Add quizzes, submissions, or events" },
    { id: 416, type: "announcement", title: "Class notes", body: "Add reminders or changes" },
  ],
  "Upcoming Assessments": [
    { id: 421, type: "hero", label: "ASSESSMENTS", title: "WHAT’S COMING UP", body: "Plan your preparation" },
    { id: 422, type: "quiz", width: "half", title: "Upcoming quiz", body: "Add topic, format, and date" },
    { id: 423, type: "exam", width: "half", title: "Upcoming exam", body: "Add topic, format, and date" },
    { id: 424, type: "checklist", title: "How to prepare", body: "Review class materials\nPractice key skills\nBring questions" },
    { id: 425, type: "resource", title: "Study resources", body: "Add review materials or links" },
  ],
  "Important Announcement": [
    { id: 431, type: "hero", label: "IMPORTANT", title: "CLASS ANNOUNCEMENT", body: "Add a concise summary" },
    { id: 432, type: "announcement", title: "What you need to know", body: "Write the complete announcement" },
    { id: 433, type: "steps", title: "What to do", body: "Add any actions students should take" },
    { id: 434, type: "deadline", title: "Important date", body: "Add a date if applicable" },
  ],
  "Deadlines and Reminders": [
    { id: 441, type: "hero", label: "PLAN AHEAD", title: "DEADLINES & REMINDERS", body: "Keep track of what’s coming" },
    { id: 442, type: "deadline", title: "Next deadline", body: "Add the item, date, and time" },
    { id: 443, type: "deadline", title: "Later this week", body: "Add another important date" },
    { id: 444, type: "announcement", title: "Reminder", body: "Add a class reminder" },
    { id: 445, type: "note", title: "Please note", body: "Add helpful secondary information" },
  ],
};

export const starter: Block[] = [
  { id: 1, type: "hero", label: "UNIT UPDATE", title: "MACBETH · ACT II", body: "After the murder" },
  { id: 2, type: "intro", title: "", body: "Tonight we move into the consequences of Duncan’s murder." },
  { id: 3, type: "reading", width: "half", title: "For Tuesday", body: "Read Act II, Scenes 1–2 and annotate references to sleep and blood." },
  { id: 4, type: "focus", width: "half", title: "As you read", body: "What changes in Macbeth’s behavior?\nHow does Shakespeare connect guilt to sleep?" },
  { id: 5, type: "homework", title: "Come prepared", body: "Bring one discussion question to class." },
  { id: 6, type: "deadline", title: "Coming up", body: "Vocabulary quiz · Thursday" },
];

export const templateNames = Object.keys(templates);
