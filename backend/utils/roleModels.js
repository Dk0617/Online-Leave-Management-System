import Admin from "../models/Admin.js";
import Student from "../models/Student.js";
import Hod from "../models/HOD.js";
import Troop from "../models/Troop.js";
import Squadran from "../models/Squadran.js";
import Sdd from "../models/Sdd.js";
import Gate from "../models/Gate.js";
import Lecturer from "../models/Lecturer.js";

// Every role that can log in, and the Mongoose model that owns its accounts.
export const ROLE_MODELS = {
  ADMIN: Admin,
  STUDENT: Student,
  HOD: Hod,
  TROOP: Troop,
  SQUADRAN: Squadran,
  SDD: Sdd,
  GATE: Gate,
  LECTURER: Lecturer,
};
