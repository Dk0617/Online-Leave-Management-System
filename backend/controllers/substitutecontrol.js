import HodUnavailability from "../models/HodUnavailability.js";
import LecturerUnavailability from "../models/LecturerUnavailability.js";
import Hod from "../models/HOD.js";
import Lecturer from "../models/Lecturer.js";
import { writeAudit } from "../utils/audit.js";

// Admin-only management of the two inputs that feed the HOD seniority-chain
// cover: which HODs are unavailable on which days, and which Lecturers are
// unavailable on which days. See leavecontrol.js resolveActiveCoverer for
// how these combine with the fixed Lecturer seniority order to decide who
// actually gets HOD-level access on a given day.

export const listHodUnavailability = async (req, res) => {
  const rows = await HodUnavailability.find().populate("hodId", "name department").sort({ fromDate: -1 });
  res.json(rows);
};

export const createHodUnavailability = async (req, res) => {
  const { hodId, fromDate, toDate, reason } = req.body;
  if (!hodId || !fromDate || !toDate) {
    return res.status(400).json({ message: "HOD and both dates are required" });
  }
  if (toDate < fromDate) {
    return res.status(400).json({ message: "End date can't be before start date" });
  }
  const hod = await Hod.findById(hodId);
  if (!hod) return res.status(404).json({ message: "HOD not found" });

  const row = await HodUnavailability.create({ hodId, fromDate, toDate, reason });
  await writeAudit("ADMIN", req.user.name, "hod_unavailability_added", `${hod.name} from ${fromDate} to ${toDate}`);
  res.status(201).json(row);
};

export const deleteHodUnavailability = async (req, res) => {
  const row = await HodUnavailability.findByIdAndDelete(req.params.id);
  if (!row) return res.status(404).json({ message: "Not found" });
  res.json({ message: "Deleted" });
};

export const listLecturerUnavailability = async (req, res) => {
  const rows = await LecturerUnavailability.find().populate("lecturerId", "name tier rank").sort({ fromDate: -1 });
  res.json(rows);
};

export const createLecturerUnavailability = async (req, res) => {
  const { lecturerId, fromDate, toDate, reason } = req.body;
  if (!lecturerId || !fromDate || !toDate) {
    return res.status(400).json({ message: "Lecturer and both dates are required" });
  }
  if (toDate < fromDate) {
    return res.status(400).json({ message: "End date can't be before start date" });
  }
  const lecturer = await Lecturer.findById(lecturerId);
  if (!lecturer) return res.status(404).json({ message: "Lecturer not found" });

  const row = await LecturerUnavailability.create({ lecturerId, fromDate, toDate, reason });
  await writeAudit(
    "ADMIN",
    req.user.name,
    "lecturer_unavailability_added",
    `${lecturer.name} from ${fromDate} to ${toDate}`
  );
  res.status(201).json(row);
};

export const deleteLecturerUnavailability = async (req, res) => {
  const row = await LecturerUnavailability.findByIdAndDelete(req.params.id);
  if (!row) return res.status(404).json({ message: "Not found" });
  res.json({ message: "Deleted" });
};
