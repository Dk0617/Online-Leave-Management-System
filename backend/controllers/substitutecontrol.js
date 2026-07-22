import Substitute from "../models/Substitute.js";
import Hod from "../models/HOD.js";
import { writeAudit } from "../utils/audit.js";

// Admin-only management of HOD substitute cover (e.g. the HOD is on leave
// and someone else needs to be able to approve/reject their students'
// leaves for a few days). See leavecontrol.js hodScopeFilter for how an
// active substitution actually widens what the substitute HOD can see.

export const listSubstitutes = async (req, res) => {
  const subs = await Substitute.find()
    .populate("hodId", "name department")
    .populate("substituteHodId", "name department")
    .sort({ fromDate: -1 });
  res.json(subs);
};

export const createSubstitute = async (req, res) => {
  const { hodId, substituteHodId, fromDate, toDate, reason } = req.body;
  if (!hodId || !substituteHodId || !fromDate || !toDate) {
    return res.status(400).json({
      message: "The covered HOD, the substitute HOD, and both dates are required",
    });
  }
  if (hodId === substituteHodId) {
    return res.status(400).json({ message: "The substitute must be a different HOD" });
  }
  if (toDate < fromDate) {
    return res.status(400).json({ message: "End date can't be before start date" });
  }

  const [covered, substitute] = await Promise.all([Hod.findById(hodId), Hod.findById(substituteHodId)]);
  if (!covered || !substitute) {
    return res.status(404).json({ message: "One of the selected HODs no longer exists" });
  }

  const sub = await Substitute.create({ hodId, substituteHodId, fromDate, toDate, reason });
  await writeAudit(
    "ADMIN",
    req.user.name,
    "substitute_assigned",
    `${substitute.name} covers ${covered.name} from ${fromDate} to ${toDate}`
  );
  res.status(201).json(sub);
};

export const deleteSubstitute = async (req, res) => {
  const sub = await Substitute.findByIdAndDelete(req.params.id);
  if (!sub) return res.status(404).json({ message: "Substitute assignment not found" });
  res.json({ message: "Deleted" });
};
