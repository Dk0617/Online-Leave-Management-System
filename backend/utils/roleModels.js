import Admin from "../model/Admin/Admin.js";
import Student from "../model/Student/Student.js";
import Hod from "../model/Hod/HOD.js";
import Troop from "../model/Troop/Troop.js";
import Squadran from "../model/Squadran/Squadran.js";
import Sdd from "../model/SDD/Sdd.js";
import Gate from "../model/Gate/Gate.js";

// Every role that can log in, and the Mongoose model that owns its accounts.
export const ROLE_MODELS = {
  ADMIN: Admin,
  STUDENT: Student,
  HOD: Hod,
  TROOP: Troop,
  SQUADRAN: Squadran,
  SDD: Sdd,
  GATE: Gate,
};
