# **App Name**: SchedulaPro

## Core Features:

- Calendar View: Display interventions and scheduled maintenance in a day/week/month calendar view with drag and drop rescheduling.
- Intervention Management: Create, read, update, and delete interventions with details like title, client, equipment, description, priority, SLA, status, assigned operator, time spent, materials used, photos, and client signature.
- Recurring Maintenance Scheduling: Schedule recurring maintenance tasks with period frequency definition and automatic calculation of the next due date after completion.
- Role-Based Access Control (RBAC): Implement strict RBAC with Admin, Operator, and Client roles, ensuring users only access data and functionalities relevant to their role. Admins will be the only users able to modify Operator and Client users.
- Notifications: Provide in-app and email notifications for new assignments, upcoming deadlines (T-7, T-3, T-1), and SLA risks.
- Search and Filtering: Enable search and filtering of interventions and maintenance tasks by client, equipment, status, priority, operator, and date range.
- Dashboard Tool: A generative AI-powered tool helps populate a KPI dashboard displaying open vs. closed interventions, SLA adherence percentage, overdue maintenance tasks, and operator workload. This is a read-only tool. The app will use an LLM to decide which KPIs are most useful based on the overall status of interventions and maitenance, if it should feature one more prominently than others.

## Style Guidelines:

- Primary color: Light moderate blue (#64B5F6), reflecting reliability and efficiency.
- Background color: Very light blue (#E3F2FD) to ensure a clean and calming user interface.
- Accent color: Soft orange (#FFB74D) to draw attention to important actions and notifications.
- Headline font: 'Space Grotesk' sans-serif for a modern, technical, clean, but accessible appearance
- Body font: 'Inter' sans-serif, used for clarity and readability.
- Use clear, easily recognizable icons to represent different intervention types, statuses, and priorities.
- Mobile-first responsive design that adapts seamlessly to different screen sizes.