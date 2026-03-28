import { z } from "zod";

const optStr = z.string().trim().optional().nullable();
const optNum = z.number().optional().nullable();

export const TaskCreateSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  notes: optStr,
  status: optStr,
  priority: optStr,
  due_date: optStr,
  related_property_id: optNum,
  related_contact_id: optNum,
  task_type: optStr,
});

export const TaskUpdateSchema = TaskCreateSchema.partial();

export type TaskCreate = z.infer<typeof TaskCreateSchema>;
export type TaskUpdate = z.infer<typeof TaskUpdateSchema>;
