import Hod from "../models/HOD.js";
import Student from "../models/Student.js";
import Lecturer from "../models/Lecturer.js";

// The system's departments — the ONE list every department picker in the
// app uses (students, HODs, Acting HOD profiles, reports), served to the
// frontend by GET /admin/departments and enforced on every create/edit.
// Spell each exactly as it should appear everywhere.
export const DEPARTMENTS = [];

// Until DEPARTMENTS is filled in, fall back to the department names already
// used in the database so existing records keep working.
export async function listDepartments() {
  if (DEPARTMENTS.length) return [...DEPARTMENTS];
  const [hodDepts, studentDepts, lecturerDepts] = await Promise.all([
    Hod.distinct("department"),
    Student.distinct("department"),
    Lecturer.distinct("department"),
  ]);
  return [...new Set([...hodDepts, ...studentDepts, ...lecturerDepts].filter(Boolean).map((d) => d.trim()))].sort();
}

export async function isKnownDepartment(department) {
  return !!department && (await listDepartments()).includes(String(department).trim());
}
