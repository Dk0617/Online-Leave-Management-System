import Movement from "../models/Movement.js";
import Student from "../models/Student.js";
import Troop from "../models/Troop.js";

// Movement documents don't carry intake/department/sqnId (see
// models/Movement.js) — scoped views join through Student by indexNumber to
// find which movements belong to which approver's own students, and attach
// department for display in the exit-count drill-downs.
async function scopedMovements(studentFilter) {
  const students = await Student.find(studentFilter).select("indexNumber department");
  const indexNumbers = students.map((s) => s.indexNumber);
  if (!indexNumbers.length) return [];
  const byIndex = new Map(students.map((s) => [s.indexNumber, s.department]));
  const movements = await Movement.find({ indexNumber: { $in: indexNumbers } })
    .sort({ createdAt: -1 })
    .limit(1000)
    .lean();
  return movements.map((m) => ({ ...m, department: byIndex.get(m.indexNumber) }));
}

// Troop Commander — every movement for students in their assigned intakes
// (both Day Scholar and Cadet, same scope as their leave-approval queue).
export const troopMovements = async (req, res) => {
  const troop = await Troop.findById(req.user.id);
  res.json(await scopedMovements({ intake: { $in: troop?.intakes || [] } }));
};

// Squadron Commander — Officer Cadets under this squadron only (never Day
// Scholars), matching their leave-approval scope (sqnId: req.user.id).
export const squadranMovements = async (req, res) => {
  res.json(await scopedMovements({ studentType: "CADET", sqnId: req.user.id }));
};
