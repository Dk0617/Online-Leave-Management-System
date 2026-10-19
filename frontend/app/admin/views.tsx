"use client";

import { useState } from "react";
import { ClipboardList, Construction, GraduationCap, Landmark, Medal, Star, Swords } from "lucide-react";
import { Card, StatTile, Button, Badge, SearchInput, SortableTh } from "@/src/components/ui";
import { LeaveListDrilldownModal } from "@/src/components/leaveStats";
import { LeaveDetailModal } from "@/src/components/leave";
import { useSearchFilter, useSort, sortRows } from "@/src/hooks/useTableControls";
import { useAdminPortal, StaffRole as StaffRoleKey } from "@/src/hooks/useAdminPortal";
import { EventCalendarView } from "@/src/components/eventCalendar";
import { isApproved, isRejected, isToday } from "@/src/api";
import { ROLE_LABELS, RefName, StaffAccount, StudentType, LeaveRequest, LEAVE_TYPE_LABELS, LecturerAccount } from "@/src/types";
import styles from "./admin.module.css";

const PASSWORD_POLICY_MESSAGE =
  "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.";
function isValidPassword(password: string): boolean {
  return (
    password.length >= 8 &&
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}

function Breakdown({
  label,
  value,
  total,
  color,
  onClick,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
  onClick?: () => void;
}) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  const content = (
    <>
      <div className="w-24 shrink-0 text-xs text-[var(--muted)]">{label}</div>
      <div className="h-2.5 flex-1 overflow-hidden rounded-md bg-[var(--card2)]">
        <div className="h-full rounded-md" style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className="w-8 shrink-0 text-right text-xs font-bold text-[var(--white)]">{value}</div>
    </>
  );
  if (!onClick) {
    return <div className="flex items-center gap-3">{content}</div>;
  }
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-3 text-left">
      {content}
    </button>
  );
}

export function Dashboard({ portal }: { portal: ReturnType<typeof useAdminPortal> }) {
  const { students, hods, troops, squadrans, sdds, gates, leaves, intakes, error, refresh } = portal;

  const approvedCount = leaves.filter(isApproved).length;
  const rejectedCount = leaves.filter(isRejected).length;
  const pendingCount = leaves.length - approvedCount - rejectedCount;

  const dayScholarCount = students.filter((s) => s.studentType === "DAY_SCHOLAR").length;
  const cadetCount = students.filter((s) => s.studentType === "CADET").length;

  const recentStudents = students.slice(-5).reverse();

  return (
    <div>
      {error && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.08)] px-4 py-2.5 text-xs text-[var(--err)]">
          <span>Couldn&apos;t load admin data: {error}</span>
          <button onClick={() => refresh()} className="whitespace-nowrap font-bold underline">
            Retry
          </button>
        </div>
      )}
      <div className={styles.welcomeBanner}>
        <div>
          <h2 className="text-lg font-bold text-[var(--white)]">Welcome back 👋</h2>
          <p className="text-xs text-[var(--muted)]">
            Here&apos;s what&apos;s happening across OLMS today.
          </p>
        </div>
        <div className="rounded-lg border border-[rgba(224,123,32,0.25)] bg-[rgba(224,123,32,0.1)] px-3.5 py-1.5 font-mono text-xs text-[var(--orange2)]">
          {new Date().toLocaleDateString(undefined, {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </div>
      </div>

      <div className={styles.statRow}>
        <StatTile label="Students" value={students.length} />
        <StatTile label="HODs" value={hods.length} />
        <StatTile label="Troop Cdrs" value={troops.length} />
        <StatTile label="Squadron Cdrs" value={squadrans.length} />
        <StatTile label="Senior Deputy Deans" value={sdds.length} />
        <StatTile label="Gate Staff" value={gates.length} />
        <StatTile label="Leave Records" value={leaves.length} />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-4 text-sm font-bold text-[var(--white)]">📈 Leave Status Breakdown</h2>
          {leaves.length === 0 ? (
            <p className="text-xs text-[var(--muted)]">No leave records yet.</p>
          ) : (
            <div className="space-y-2.5">
              <Breakdown label="Pending" value={pendingCount} total={leaves.length} color="#f59332" />
              <Breakdown label="Approved" value={approvedCount} total={leaves.length} color="#22c55e" />
              <Breakdown label="Rejected" value={rejectedCount} total={leaves.length} color="#ef4444" />
            </div>
          )}
        </Card>
        <Card className="p-5">
          <h2 className="mb-4 text-sm font-bold text-[var(--white)]">🎓 Students by Type</h2>
          {students.length === 0 ? (
            <p className="text-xs text-[var(--muted)]">No students yet.</p>
          ) : (
            <div className="space-y-2.5">
              <Breakdown label="Day Scholars" value={dayScholarCount} total={students.length} color="#2563b0" />
              <Breakdown label="Officer Cadets" value={cadetCount} total={students.length} color="#7c3aed" />
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-3 text-sm font-bold text-[var(--white)]">🗓️ Intake Overview</h2>
          {intakes.length === 0 ? (
            <p className="text-xs text-[var(--muted)]">No intakes yet — add one in the Intakes section.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {intakes.map((i) => {
                const count = students.filter((s) => s.intake === i.code).length;
                return (
                  <li
                    key={i.id}
                    className="flex justify-between border-b border-[rgba(255,255,255,0.04)] pb-2 last:border-none"
                  >
                    <span className="text-[var(--white)]">Intake {i.code}</span>
                    <span className="text-xs uppercase text-[var(--muted)]">
                      {count} student{count === 1 ? "" : "s"}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
        <Card className="p-5">
          <h2 className="mb-3 text-sm font-bold text-[var(--white)]">🕓 Recently Added Students</h2>
          {recentStudents.length === 0 ? (
            <p className="text-xs text-[var(--muted)]">No students yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {recentStudents.map((s) => (
                <li
                  key={s.id}
                  className="flex justify-between border-b border-[rgba(255,255,255,0.04)] pb-2 last:border-none"
                >
                  <span className="text-[var(--white)]">
                    {s.firstName} {s.lastName}
                  </span>
                  <span className="text-xs uppercase text-[var(--muted)]">{s.indexNumber}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

export function Intakes({ portal }: { portal: ReturnType<typeof useAdminPortal> }) {
  const { intakes, students, troops, addIntake, removeIntake } = portal;
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleAdd() {
    if (!code.trim()) {
      setError("Enter an intake number or code.");
      return;
    }
    setError(null);
    try {
      await addIntake(code.trim());
      setCode("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add intake");
    }
  }

  async function handleDelete(intakeCode: string) {
    if (!confirm(`Delete Intake ${intakeCode}? This will not remove students already assigned to it.`)) return;
    try {
      await removeIntake(intakeCode);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete intake");
    }
  }

  return (
    <div>
      <Card className="mb-5 p-5">
        <h2 className="mb-4 text-sm font-bold text-[var(--white)]">Create Intake</h2>
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label className={styles.label}>Intake Number / Code</label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder="e.g. 42"
              className={styles.input}
            />
          </div>
          <Button variant="primary" onClick={handleAdd}>
            Create Intake
          </Button>
        </div>
        {error && <p className="mt-2 text-xs text-[var(--err)]">{error}</p>}
      </Card>

      <Card className="p-5">
        <h2 className="mb-4 text-sm font-bold text-[var(--white)]">All Intakes</h2>
        <div className="overflow-x-auto">
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Intake</th>
                <th>Students</th>
                <th>Troop Officers Assigned</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {intakes.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-[var(--muted)]">
                    No intakes yet. Add one above.
                  </td>
                </tr>
              ) : (
                intakes.map((i) => {
                  const count = students.filter((s) => s.intake === i.code).length;
                  const officers = troops.filter((t) => (t.intakes ?? []).includes(i.code));
                  return (
                    <tr key={i.id}>
                      <td>
                        <span className="rounded bg-[rgba(37,99,176,0.15)] px-2 py-0.5 text-[10px] font-bold text-[var(--light)]">
                          Intake {i.code}
                        </span>
                      </td>
                      <td>{count}</td>
                      <td>
                        {officers.length ? (
                          officers.map((o) => o.name).join(", ")
                        ) : (
                          <span className="text-[var(--muted)]">None assigned</span>
                        )}
                      </td>
                      <td>
                        <Button variant="danger" className="!px-2.5 !py-1 !text-[11px]" onClick={() => handleDelete(i.code)}>
                          Delete
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function refLabel(ref: string | RefName | undefined): string {
  if (!ref) return "";
  return typeof ref === "string" ? ref : ref.name;
}

function refId(ref: string | RefName | undefined): string {
  if (!ref) return "";
  return typeof ref === "string" ? ref : ref.id;
}

export function Students({ portal }: { portal: ReturnType<typeof useAdminPortal> }) {
  const { students, intakes, troops, hods, squadrans, addStudent, editStudent, removeStudent } = portal;

  const [editingId, setEditingId] = useState<string | null>(null);
  const [indexNumber, setIndexNumber] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [department, setDepartment] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [intake, setIntake] = useState("");
  const [studentType, setStudentType] = useState<StudentType>("DAY_SCHOLAR");
  const [sqnId, setSqnId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const departmentOptions = portal.departments;

  // HOD and Troop Commander(s) are never picked directly — each Day
  // Scholar's HOD is already fully determined by their Department (every
  // HOD account owns exactly one department), and each student's Troop
  // Commander(s) are already fully determined by their Intake (Troop
  // accounts are assigned specific intakes). Re-picking either one
  // manually would just be re-entering the same fact a second time and
  // risking it disagreeing with the first, so both are derived here
  // instead.
  const derivedHod = department ? hods.find((h) => h.department === department) : undefined;
  const derivedTroops = intake ? troops.filter((t) => (t.intakes ?? []).includes(intake)) : [];

  function resetForm() {
    setEditingId(null);
    setIndexNumber("");
    setFirstName("");
    setLastName("");
    setDepartment("");
    setEmail("");
    setMobile("");
    setIntake("");
    setStudentType("DAY_SCHOLAR");
    setSqnId("");
    setPassword("");
  }

  function startEdit(id: string) {
    const s = students.find((x) => x.id === id);
    if (!s) return;
    setEditingId(id);
    setIndexNumber(s.indexNumber);
    setFirstName(s.firstName);
    setLastName(s.lastName);
    setDepartment(s.department ?? "");
    setEmail(s.email ?? "");
    setMobile(s.mobile ?? "");
    setIntake(s.intake ?? "");
    setStudentType(s.studentType);
    setSqnId(refId(s.sqnId));
    setPassword("");
  }

  async function handleSubmit() {
    if (!editingId) {
      if (
        !indexNumber.trim() ||
        !firstName.trim() ||
        !lastName.trim() ||
        !department ||
        !email.trim() ||
        !mobile.trim() ||
        !intake ||
        !password.trim()
      ) {
        setError("All fields are required to create a student account.");
        return;
      }
    } else if (!indexNumber.trim() || !firstName.trim() || !lastName.trim()) {
      setError("Index number, first and last name are required.");
      return;
    }
    if (!intake) {
      setError("Select an Intake.");
      return;
    }
    if (!derivedTroops.length) {
      setError(`No Troop Commander is assigned to Intake ${intake} yet — assign one under Troop Commanders first.`);
      return;
    }
    if (studentType === "DAY_SCHOLAR") {
      if (!department) {
        setError("Select a Department for this Day Scholar.");
        return;
      }
      if (!derivedHod) {
        setError(`No HOD is assigned to department "${department}" yet — add one under HOD accounts first.`);
        return;
      }
    }
    if (studentType === "CADET" && !sqnId) {
      setError("Select a Squadron Commander for this Officer Cadet.");
      return;
    }
    if (mobile.trim() && !/^\d{10}$/.test(mobile.trim())) {
      setError("Mobile number must be exactly 10 digits, numbers only.");
      return;
    }
    if (password.trim() && !isValidPassword(password.trim())) {
      setError(PASSWORD_POLICY_MESSAGE);
      return;
    }
    setError(null);
    const input = {
      indexNumber: indexNumber.trim(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      department: department.trim() || undefined,
      email: email.trim() || undefined,
      mobile: mobile.trim() || undefined,
      studentType,
      intake,
      troopIds: derivedTroops.map((t) => t.id),
      hodId: studentType === "DAY_SCHOLAR" ? derivedHod?.id : undefined,
      sqnId: studentType === "CADET" ? sqnId : undefined,
      password: password.trim() || undefined,
    };
    try {
      if (editingId) {
        await editStudent(editingId, input);
      } else {
        await addStudent(input);
      }
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save student");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this student account?")) return;
    try {
      await removeStudent(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete student");
    }
  }

  return (
    <div>
      <Card className="mb-5 p-5">
        <h2 className="mb-4 text-sm font-bold text-[var(--white)]">
          {editingId ? "✏️ Edit Student Account" : "Create Student Account"}
        </h2>

        <div className={`${styles.formGrid3} mb-3.5`}>
          <div>
            <label className={styles.label}>
              Index Number (used as Username)<span className="ml-0.5 text-[var(--err)]">*</span>
              {editingId && <span className="ml-1 text-[var(--muted)]">(cannot be changed)</span>}
            </label>
            <input
              value={indexNumber}
              onChange={(e) => setIndexNumber(e.target.value)}
              placeholder="e.g. SC/2024/045"
              disabled={!!editingId}
              className={styles.input}
              style={editingId ? { opacity: 0.6, cursor: "not-allowed" } : undefined}
            />
          </div>
          <div>
            <label className={styles.label}>
              First Name<span className="ml-0.5 text-[var(--err)]">*</span>
            </label>
            <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className={styles.input} />
          </div>
          <div>
            <label className={styles.label}>
              Last Name<span className="ml-0.5 text-[var(--err)]">*</span>
            </label>
            <input value={lastName} onChange={(e) => setLastName(e.target.value)} className={styles.input} />
          </div>
        </div>

        <div className={`${styles.formGrid3} mb-3.5`}>
          <div>
            <label className={styles.label}>
              Department / Section<span className="ml-0.5 text-[var(--err)]">*</span>
              {editingId && <span className="ml-1 text-[var(--muted)]">(cannot be changed)</span>}
            </label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              disabled={!!editingId}
              className={styles.input}
              style={editingId ? { opacity: 0.6, cursor: "not-allowed" } : undefined}
            >
              <option value="">Select department…</option>
              {departmentOptions.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={styles.label}>
              Email<span className="ml-0.5 text-[var(--err)]">*</span>
            </label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@kdu.ac.lk" className={styles.input} />
          </div>
          <div>
            <label className={styles.label}>
              Mobile<span className="ml-0.5 text-[var(--err)]">*</span>
            </label>
            <input
              value={mobile}
              onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
              placeholder="07XXXXXXXX"
              inputMode="numeric"
              maxLength={10}
              className={styles.input}
            />
          </div>
        </div>

        <div className={`${styles.formGrid3} mb-3.5`}>
          <div>
            <label className={styles.label}>
              Intake<span className="ml-0.5 text-[var(--err)]">*</span>
              {editingId && <span className="ml-1 text-[var(--muted)]">(cannot be changed)</span>}
            </label>
            <select
              value={intake}
              onChange={(e) => setIntake(e.target.value)}
              disabled={!!editingId}
              className={styles.input}
              style={editingId ? { opacity: 0.6, cursor: "not-allowed" } : undefined}
            >
              <option value="">{intakes.length ? "Select intake…" : "No intakes — add one first"}</option>
              {intakes.map((i) => (
                <option key={i.id} value={i.code}>
                  Intake {i.code}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={styles.label}>
              Student Type
              {editingId && <span className="ml-1 text-[var(--muted)]">(cannot be changed)</span>}
            </label>
            <select
              value={studentType}
              onChange={(e) => setStudentType(e.target.value as StudentType)}
              disabled={!!editingId}
              className={styles.input}
              style={editingId ? { opacity: 0.6, cursor: "not-allowed" } : undefined}
            >
              <option value="DAY_SCHOLAR">Day Scholar</option>
              <option value="CADET">Officer Cadet</option>
            </select>
          </div>
          {studentType === "DAY_SCHOLAR" ? (
            <div>
              <label className={styles.label}>HOD (auto-assigned from Department)</label>
              <div className={styles.input} style={{ display: "flex", alignItems: "center", opacity: 0.85 }}>
                {derivedHod ? (
                  `${derivedHod.department} (${derivedHod.name})`
                ) : department ? (
                  <span className="text-[var(--err)]">No HOD found for &quot;{department}&quot;</span>
                ) : (
                  <span className="text-[var(--muted)]">Select a department first</span>
                )}
              </div>
            </div>
          ) : (
            <div>
              <label className={styles.label}>Squadron (Officer Cadet)</label>
              <select value={sqnId} onChange={(e) => setSqnId(e.target.value)} className={styles.input}>
                <option value="">Select Squadron Commander…</option>
                {squadrans.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="mb-3.5">
          <label className={styles.label}>Troop Commander(s) (auto-assigned from Intake)</label>
          <div className={styles.input} style={{ display: "flex", alignItems: "center", minHeight: "2.5rem", opacity: 0.85 }}>
            {derivedTroops.length ? (
              derivedTroops.map((t) => t.name).join(", ")
            ) : intake ? (
              <span className="text-[var(--err)]">No Troop Commander assigned to Intake {intake}</span>
            ) : (
              <span className="text-[var(--muted)]">Select an intake first</span>
            )}
          </div>
        </div>

        <div className="mb-4">
          <label className={styles.label}>
            Password {editingId ? "(leave blank to keep current)" : <span className="text-[var(--err)]">*</span>}
          </label>
          <div className="flex gap-2">
            <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className={styles.input} />
          </div>
          <p className="mt-1.5 text-[11px] text-[var(--muted)]">
            Min 8 characters, with an uppercase letter, a lowercase letter, a number, and a special character.
          </p>
        </div>

        {error && <p className="mb-3 text-xs text-[var(--err)]">{error}</p>}
        <div className="flex gap-2">
          <Button variant="primary" onClick={handleSubmit}>
            {editingId ? "Update Student" : "Create Student"}
          </Button>
          {editingId && (
            <Button variant="secondary" onClick={resetForm}>
              Cancel Edit
            </Button>
          )}
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-4 text-sm font-bold text-[var(--white)]">All Students</h2>
        <div className="overflow-x-auto">
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Index No.</th>
                <th>Name</th>
                <th>Type</th>
                <th>Intake</th>
                <th>Dept</th>
                <th>Troop</th>
                <th>HOD/Sqn</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-[var(--muted)]">
                    No students yet.
                  </td>
                </tr>
              ) : (
                students.map((s) => (
                  <tr key={s.id}>
                    <td>{s.indexNumber}</td>
                    <td>
                      {s.firstName} {s.lastName}
                    </td>
                    <td>
                      <Badge tone={s.studentType === "CADET" ? "purple" : "blue"}>
                        {s.studentType === "CADET" ? "Officer Cadet" : "Day Scholar"}
                      </Badge>
                    </td>
                    <td>{s.intake ? `Intake ${s.intake}` : ""}</td>
                    <td>{s.department}</td>
                    <td>{s.troopIds.map(refLabel).filter(Boolean).join(", ")}</td>
                    <td>{refLabel(s.studentType === "CADET" ? s.sqnId : s.hodId)}</td>
                    <td className="space-x-1.5 whitespace-nowrap">
                      <Button variant="secondary" className="!px-2.5 !py-1 !text-[11px]" onClick={() => startEdit(s.id)}>
                        Edit
                      </Button>
                      <Button variant="danger" className="!px-2.5 !py-1 !text-[11px]" onClick={() => handleDelete(s.id)}>
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

export function StaffRole({
  portal,
  role,
  title,
  extraLabel,
  extraPlaceholder,
}: {
  portal: ReturnType<typeof useAdminPortal>;
  role: StaffRoleKey;
  title: string;
  extraLabel?: string;
  extraPlaceholder?: string;
}) {
  const list: StaffAccount[] =
    role === "HOD" ? portal.hods : role === "SQUADRAN" ? portal.squadrans : role === "SDD" ? portal.sdds : portal.gates;

  const [editingId, setEditingId] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [extra, setExtra] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setEditingId(null);
    setUsername("");
    setName("");
    setExtra("");
    setEmail("");
    setPassword("");
  }

  function startEdit(id: string) {
    const u = list.find((x) => x.id === id);
    if (!u) return;
    setEditingId(id);
    setUsername(u.username);
    setName(u.name);
    setExtra(u.department || u.title || u.post || "");
    setEmail(u.email || "");
    setPassword("");
  }

  async function handleSubmit() {
    if (!editingId) {
      if (!username.trim() || !name.trim() || (extraLabel && !extra.trim()) || !email.trim() || !password.trim()) {
        setError("All fields are required to create an account.");
        return;
      }
    } else if (!username.trim() || !name.trim() || (extraLabel && !extra.trim())) {
      setError("Please fill in all fields.");
      return;
    }
    if (password.trim() && !isValidPassword(password.trim())) {
      setError(PASSWORD_POLICY_MESSAGE);
      return;
    }
    setError(null);
    try {
      if (editingId) {
        await portal.editStaff(role, editingId, {
          username: username.trim(),
          name: name.trim(),
          extra: extra.trim() || undefined,
          email: email.trim() || undefined,
          password: password.trim() || undefined,
        });
      } else {
        await portal.addStaff(role, {
          username: username.trim(),
          name: name.trim(),
          extra: extra.trim() || undefined,
          email: email.trim() || undefined,
          password: password.trim() || undefined,
        });
      }
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save account");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this account?")) return;
    try {
      await portal.removeStaff(role, id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete account");
    }
  }

  return (
    <div>
      <Card className="mb-5 p-5">
        <h2 className="mb-4 text-sm font-bold text-[var(--white)]">
          {editingId ? `✏️ Edit ${title}` : `Create ${title} Account`}
        </h2>
        <div className={`${extraLabel ? styles.formGrid3 : styles.formGrid2} mb-4`}>
          <div>
            <label className={styles.label}>
              Username<span className="ml-0.5 text-[var(--err)]">*</span>
            </label>
            <input value={username} onChange={(e) => setUsername(e.target.value)} className={styles.input} />
          </div>
          <div>
            <label className={styles.label}>
              Full Name<span className="ml-0.5 text-[var(--err)]">*</span>
            </label>
            <input value={name} onChange={(e) => setName(e.target.value)} className={styles.input} />
          </div>
          {extraLabel && (
            <div>
              <label className={styles.label}>
                {extraLabel}
                <span className="ml-0.5 text-[var(--err)]">*</span>
              </label>
              {role === "HOD" ? (
                <select value={extra} onChange={(e) => setExtra(e.target.value)} className={styles.input}>
                  <option value="">Select department…</option>
                  {Array.from(new Set([...portal.departments, ...(extra ? [extra] : [])]))
                    .sort()
                    .map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                </select>
              ) : (
                <input
                  value={extra}
                  onChange={(e) => setExtra(e.target.value)}
                  placeholder={extraPlaceholder}
                  className={styles.input}
                />
              )}
            </div>
          )}
        </div>
        <div className="mb-4">
          <label className={styles.label}>
            Email (enables login by email code)<span className="ml-0.5 text-[var(--err)]">*</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            className={styles.input}
          />
        </div>
        <div className="mb-4">
          <label className={styles.label}>
            Password {editingId ? "(leave blank to keep current)" : <span className="text-[var(--err)]">*</span>}
          </label>
          <input value={password} onChange={(e) => setPassword(e.target.value)} className={styles.input} />
          <p className="mt-1.5 text-[11px] text-[var(--muted)]">
            Min 8 characters, with an uppercase letter, a lowercase letter, a number, and a special character.
          </p>
        </div>
        {error && <p className="mb-3 text-xs text-[var(--err)]">{error}</p>}
        <div className="flex gap-2">
          <Button variant="primary" onClick={handleSubmit}>
            {editingId ? `Update ${title}` : `Create ${title}`}
          </Button>
          {editingId && (
            <Button variant="secondary" onClick={resetForm}>
              Cancel Edit
            </Button>
          )}
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-4 text-sm font-bold text-[var(--white)]">All {title}s</h2>
        <div className="overflow-x-auto">
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Username</th>
                <th>Name</th>
                {extraLabel && <th>{extraLabel}</th>}
                <th>Email</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td colSpan={extraLabel ? 5 : 4} className="py-6 text-center text-[var(--muted)]">
                    No accounts yet.
                  </td>
                </tr>
              ) : (
                list.map((u) => (
                  <tr key={u.id}>
                    <td>{u.username}</td>
                    <td>{u.name}</td>
                    {extraLabel && <td>{u.department || u.title || u.post || ""}</td>}
                    <td className="text-xs text-[var(--muted)]">{u.email || "—"}</td>
                    <td className="space-x-1.5 whitespace-nowrap">
                      <Button variant="secondary" className="!px-2.5 !py-1 !text-[11px]" onClick={() => startEdit(u.id)}>
                        Edit
                      </Button>
                      <Button variant="danger" className="!px-2.5 !py-1 !text-[11px]" onClick={() => handleDelete(u.id)}>
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

export function Troop({ portal }: { portal: ReturnType<typeof useAdminPortal> }) {
  const { troops, intakes, addTroop, editTroop, removeTroop } = portal;

  const [editingId, setEditingId] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedIntakes, setSelectedIntakes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  function toggleIntake(code: string) {
    setSelectedIntakes((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]));
  }

  function resetForm() {
    setEditingId(null);
    setUsername("");
    setName("");
    setEmail("");
    setPassword("");
    setSelectedIntakes([]);
  }

  function startEdit(id: string) {
    const t = troops.find((x) => x.id === id);
    if (!t) return;
    setEditingId(id);
    setUsername(t.username);
    setName(t.name);
    setEmail(t.email || "");
    setPassword("");
    setSelectedIntakes(t.intakes ?? []);
  }

  async function handleSubmit() {
    if (!editingId) {
      if (!username.trim() || !name.trim() || !email.trim() || !password.trim()) {
        setError("All fields are required to create an account.");
        return;
      }
    } else if (!username.trim() || !name.trim()) {
      setError("Please fill in username and name.");
      return;
    }
    if (!selectedIntakes.length) {
      setError("Assign at least one intake to this troop officer.");
      return;
    }
    if (password.trim() && !isValidPassword(password.trim())) {
      setError(PASSWORD_POLICY_MESSAGE);
      return;
    }
    setError(null);
    try {
      if (editingId) {
        await editTroop(editingId, {
          username: username.trim(),
          name: name.trim(),
          intakes: selectedIntakes,
          email: email.trim() || undefined,
          password: password.trim() || undefined,
        });
      } else {
        await addTroop({
          username: username.trim(),
          name: name.trim(),
          intakes: selectedIntakes,
          email: email.trim() || undefined,
          password: password.trim() || undefined,
        });
      }
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save troop commander");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this account?")) return;
    try {
      await removeTroop(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete troop commander");
    }
  }

  return (
    <div>
      <Card className="mb-5 p-5">
        <h2 className="mb-4 text-sm font-bold text-[var(--white)]">
          {editingId ? "✏️ Edit Troop Commander" : "Create Troop Commander Account"}
        </h2>
        <div className={`${styles.formGrid3} mb-3.5`}>
          <div>
            <label className={styles.label}>
              Username<span className="ml-0.5 text-[var(--err)]">*</span>
            </label>
            <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="e.g. troop4" className={styles.input} />
          </div>
          <div>
            <label className={styles.label}>
              Full Name<span className="ml-0.5 text-[var(--err)]">*</span>
            </label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Lt. Cmdr. Full Name" className={styles.input} />
          </div>
          <div>
            <label className={styles.label}>
              Password {editingId ? "(leave blank to keep current)" : <span className="text-[var(--err)]">*</span>}
            </label>
            <input value={password} onChange={(e) => setPassword(e.target.value)} className={styles.input} />
            <p className="mt-1.5 text-[11px] text-[var(--muted)]">
              Min 8 characters, with an uppercase letter, a lowercase letter, a number, and a special character.
            </p>
          </div>
        </div>
        <div className="mb-3.5">
          <label className={styles.label}>
            Email (enables login by email code)<span className="ml-0.5 text-[var(--err)]">*</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            className={styles.input}
          />
        </div>
        <div className="mb-4">
          <label className={styles.label}>Assigned Intake(s)</label>
          <div className={styles.chkGroup}>
            {intakes.length === 0 ? (
              <span className="text-xs text-[var(--muted)]">No intakes exist yet — add one under the Intakes section first.</span>
            ) : (
              intakes.map((i) => (
                <label key={i.id} className={styles.chkPill}>
                  <input type="checkbox" checked={selectedIntakes.includes(i.code)} onChange={() => toggleIntake(i.code)} />
                  Intake {i.code}
                </label>
              ))
            )}
          </div>
        </div>
        {error && <p className="mb-3 text-xs text-[var(--err)]">{error}</p>}
        <div className="flex gap-2">
          <Button variant="primary" onClick={handleSubmit}>
            {editingId ? "Update Troop Commander" : "Create Troop Commander"}
          </Button>
          {editingId && (
            <Button variant="secondary" onClick={resetForm}>
              Cancel Edit
            </Button>
          )}
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-4 text-sm font-bold text-[var(--white)]">All Troop Commanders</h2>
        <div className="overflow-x-auto">
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Username</th>
                <th>Name</th>
                <th>Assigned Intakes</th>
                <th>Email</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {troops.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-[var(--muted)]">
                    No accounts yet.
                  </td>
                </tr>
              ) : (
                troops.map((t) => (
                  <tr key={t.id}>
                    <td>{t.username}</td>
                    <td>{t.name}</td>
                    <td>
                      {(t.intakes ?? []).length ? (
                        t.intakes!.map((c) => (
                          <span
                            key={c}
                            className="mr-1 inline-block rounded bg-[rgba(37,99,176,0.15)] px-2 py-0.5 text-[10px] font-bold text-[var(--light)]"
                          >
                            Intake {c}
                          </span>
                        ))
                      ) : (
                        <span className="text-[var(--muted)]">None</span>
                      )}
                    </td>
                    <td className="text-xs text-[var(--muted)]">{t.email || "—"}</td>
                    <td className="space-x-1.5">
                      <Button variant="secondary" className="!px-2.5 !py-1 !text-[11px]" onClick={() => startEdit(t.id)}>
                        Edit
                      </Button>
                      <Button variant="danger" className="!px-2.5 !py-1 !text-[11px]" onClick={() => handleDelete(t.id)}>
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

export function PasswordChanges({ portal }: { portal: ReturnType<typeof useAdminPortal> }) {
  const { notifications, markNotificationRead } = portal;

  return (
    <Card className="p-5">
      <h2 className="mb-2 text-sm font-bold text-[var(--white)]">🔑 Password Change Notifications</h2>
      <p className="mb-4 text-xs text-[var(--muted)]">
        Automatic log of password changes made by users across all portals.
      </p>
      <div className="overflow-x-auto">
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Date/Time</th>
              <th>Role</th>
              <th>Username</th>
              <th>Name</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {notifications.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-6 text-center text-[var(--muted)]">
                  No password changes yet.
                </td>
              </tr>
            ) : (
              notifications.map((n) => (
                <tr key={n.id}>
                  <td>{new Date(n.time).toLocaleString()}</td>
                  <td>{ROLE_LABELS[n.role] ?? n.role}</td>
                  <td>{n.username}</td>
                  <td>{n.name || "—"}</td>
                  <td>
                    {n.read ? (
                      <span className="text-[var(--muted)]">Read</span>
                    ) : (
                      <Badge tone="amber">New</Badge>
                    )}
                  </td>
                  <td>
                    {!n.read && (
                      <Button
                        variant="secondary"
                        className="!px-2.5 !py-1 !text-[11px]"
                        onClick={() => markNotificationRead(n.id).catch(() => {})}
                      >
                        Mark read
                      </Button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

const ROLE_OPTIONS = ["", "STUDENT", "HOD", "TROOP", "SQUADRAN", "SDD", "GATE", "ADMIN"] as const;

export function AuditLog({ portal }: { portal: ReturnType<typeof useAdminPortal> }) {
  const { audit, clearAuditLog } = portal;
  const [roleFilter, setRoleFilter] = useState("");
  const [error, setError] = useState<string | null>(null);

  const filtered = roleFilter ? audit.filter((a) => a.role === roleFilter) : audit;

  async function handleClear() {
    if (!confirm("Clear the entire audit log? This cannot be undone.")) return;
    try {
      await clearAuditLog();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clear audit log");
    }
  }

  return (
    <Card className="p-5">
      <h2 className="mb-2 text-sm font-bold text-[var(--white)]">🛡️ System Audit Log</h2>
      <p className="mb-4 text-xs text-[var(--muted)]">
        Every login, leave submission, approval, rejection, and password change across all portals — most recent first.
      </p>
      <div className="mb-3 flex flex-wrap gap-2">
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className={styles.input} style={{ width: "auto" }}>
          <option value="">All roles</option>
          {ROLE_OPTIONS.filter(Boolean).map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r as keyof typeof ROLE_LABELS] ?? r}
            </option>
          ))}
        </select>
        <Button variant="secondary" onClick={handleClear}>
          Clear Log
        </Button>
      </div>
      {error && <p className="mb-3 text-xs text-[var(--err)]">{error}</p>}
      <div className="overflow-x-auto">
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Date/Time</th>
              <th>Role</th>
              <th>Username</th>
              <th>Action</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-6 text-center text-[var(--muted)]">
                  No audit events recorded yet.
                </td>
              </tr>
            ) : (
              filtered.slice(0, 500).map((a) => (
                <tr key={a.id}>
                  <td>{new Date(a.time).toLocaleString()}</td>
                  <td>{ROLE_LABELS[a.role as keyof typeof ROLE_LABELS] ?? a.role}</td>
                  <td>{a.user}</td>
                  <td>
                    {a.action}
                    {a.action === "leave_submitted" && (a.details || "").includes("EMERGENCY") && (
                      <span className="ml-1 font-bold text-[var(--err)]">🚨</span>
                    )}
                  </td>
                  <td className="text-[var(--muted)]">{a.details}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}


// ==================================================================
// HOD Cover — each department has exactly one shared "covering" login
// used by all of its lecturers to stand in when the HOD is unavailable.
// Admin creates that one account per department and maintains a named
// roster inside it (Senior/Junior tier + rank); admin marks WHO is
// unavailable (the HOD, or a specific named roster member) on WHICH days,
// and the system works out on its own which named lecturer is currently
// active — nobody picks a specific substitute by hand. See
// leavecontrol.js resolveActiveMemberForDepartment for the resolution
// logic.
// ==================================================================

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

const TIER_LABELS: Record<"SENIOR" | "JUNIOR", string> = { SENIOR: "Senior Lecturer", JUNIOR: "Junior Lecturer" };

function LecturerRosterModal({
  lecturer,
  onAddMember,
  onEditMember,
  onRemoveMember,
  onClose,
}: {
  lecturer: LecturerAccount;
  onAddMember: (input: { name: string; tier: "SENIOR" | "JUNIOR"; rank: number }) => Promise<void>;
  onEditMember: (memberId: string, input: { name: string; tier: "SENIOR" | "JUNIOR"; rank: number }) => Promise<void>;
  onRemoveMember: (memberId: string) => Promise<void>;
  onClose: () => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [tier, setTier] = useState<"SENIOR" | "JUNIOR">("SENIOR");
  const [rank, setRank] = useState("1");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function resetForm() {
    setEditingId(null);
    setName("");
    setTier("SENIOR");
    setRank("1");
  }

  function startEdit(m: LecturerAccount["members"][number]) {
    setEditingId(m.id);
    setName(m.name);
    setTier(m.tier);
    setRank(String(m.rank));
  }

  async function handleSubmit() {
    if (!name.trim() || !rank.trim() || Number.isNaN(Number(rank)) || Number(rank) < 1) {
      setError("Name and a positive rank are required.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const input = { name: name.trim(), tier, rank: Number(rank) };
      if (editingId) await onEditMember(editingId, input);
      else await onAddMember(input);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove(memberId: string) {
    if (!confirm("Remove this lecturer from the roster?")) return;
    try {
      await onRemoveMember(memberId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove");
    }
  }

  const sorted = [...lecturer.members].sort((a, b) =>
    a.tier === b.tier ? a.rank - b.rank : a.tier === "SENIOR" ? -1 : 1
  );

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[rgba(5,13,31,0.85)] backdrop-blur-sm">
      <div className="max-h-[85vh] w-[90%] max-w-[560px] overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--card)]">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-5">
          <div>
            <h3 className="text-[15px] font-bold text-[var(--white)]">{lecturer.department} Roster</h3>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Login: {lecturer.username} — shared by every lecturer below.
            </p>
          </div>
          <button onClick={onClose} className="text-xl leading-none text-[var(--muted)] hover:text-[var(--white)]">
            ✕
          </button>
        </div>
        <div className="px-6 py-4">
          <div className="mb-4 overflow-x-auto rounded-xl border border-[var(--border)]">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wide text-[var(--muted)]">
                  <th className="px-3 py-2">Order</th>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Tier</th>
                  <th className="px-3 py-2">Rank</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sorted.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-[var(--muted)]">
                      No lecturers on this roster yet.
                    </td>
                  </tr>
                ) : (
                  sorted.map((m, i) => (
                    <tr key={m.id} className="border-t border-[rgba(255,255,255,0.05)]">
                      <td className="px-3 py-2 text-[var(--white)]">{i + 1}</td>
                      <td className="px-3 py-2 text-[var(--white)]">{m.name}</td>
                      <td className="px-3 py-2">
                        <Badge tone={m.tier === "SENIOR" ? "blue" : "gray"}>{TIER_LABELS[m.tier]}</Badge>
                      </td>
                      <td className="px-3 py-2 text-[var(--white)]">{m.rank}</td>
                      <td className="space-x-1.5 whitespace-nowrap px-3 py-2">
                        <Button variant="secondary" className="!px-2.5 !py-1 !text-[11px]" onClick={() => startEdit(m)}>
                          Edit
                        </Button>
                        <Button variant="danger" className="!px-2.5 !py-1 !text-[11px]" onClick={() => handleRemove(m.id)}>
                          Remove
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--card2)] p-4">
            <h4 className="mb-3 text-xs font-bold uppercase tracking-wide text-[var(--muted)]">
              {editingId ? "Edit Lecturer" : "Add Lecturer to Roster"}
            </h4>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className={styles.label}>Name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} className={styles.input} placeholder="Full name" />
              </div>
              <div>
                <label className={styles.label}>Tier</label>
                <select value={tier} onChange={(e) => setTier(e.target.value as "SENIOR" | "JUNIOR")} className={styles.input}>
                  <option value="SENIOR">Senior Lecturer</option>
                  <option value="JUNIOR">Junior Lecturer</option>
                </select>
              </div>
              <div>
                <label className={styles.label}>Rank</label>
                <input
                  type="number"
                  min={1}
                  value={rank}
                  onChange={(e) => setRank(e.target.value)}
                  className={styles.input}
                  placeholder="1 = highest"
                />
              </div>
            </div>
            {error && <p className="mt-2 text-xs text-[var(--err)]">{error}</p>}
            <div className="mt-3 flex gap-2">
              <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
                {submitting ? "Saving…" : editingId ? "Save Changes" : "Add"}
              </Button>
              {editingId && (
                <Button variant="ghost" onClick={resetForm}>
                  Cancel
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Admin assigns Acting HOD for a department on a date (or date range): one
// or more of that department's roster lecturers, or all of them. Making the
// assignment is itself how Admin records that the HOD isn't available that
// day; every assigned lecturer works through the department's one shared
// Acting HOD profile.
function ActingHodCard({ portal }: { portal: ReturnType<typeof useAdminPortal> }) {
  const { lecturers, actingAssignments, assignActingHod, removeActingHod } = portal;
  const [lecturerId, setLecturerId] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [date, setDate] = useState(todayStr());
  const [toDate, setToDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const account = lecturers.find((l) => l.id === lecturerId);
  const members = account
    ? [...account.members].sort((a, b) => (a.tier === b.tier ? a.rank - b.rank : a.tier === "SENIOR" ? -1 : 1))
    : [];
  const allSelected = members.length > 0 && selected.length === members.length;

  function toggle(id: string) {
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }

  async function handleAssign() {
    if (!lecturerId || !selected.length || !date) {
      setError("Select a department, at least one lecturer and a date.");
      return;
    }
    setError(null);
    setSaved(null);
    try {
      await assignActingHod({ lecturerId, memberIds: allSelected ? "ALL" : selected, date, toDate: toDate || undefined });
      setSaved(`Acting HOD assigned for ${account?.department} on ${date}${toDate && toDate !== date ? ` to ${toDate}` : ""}.`);
      setToDate("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to assign");
    }
  }

  async function handleRemove(id: string) {
    if (!confirm("Remove this Acting HOD assignment? That day's approvals go back to the HOD.")) return;
    try {
      await removeActingHod(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove");
    }
  }

  const today = todayStr();
  const upcoming = actingAssignments.filter((a) => a.date >= today).sort((a, b) => a.date.localeCompare(b.date));

  return (
    <Card className="mb-5 p-5">
      <h2 className="mb-1 text-sm font-bold text-[var(--white)]">🧑‍🏫 Assign Acting HOD</h2>
      <p className="mb-4 text-xs text-[var(--muted)]">
        Use this on days a department&apos;s HOD isn&apos;t available. The lecturers you pick approve that
        department&apos;s leaves for those dates, all through the department&apos;s one Acting HOD profile.
      </p>
      <div className={`${styles.formGrid3} mb-3.5`}>
        <div>
          <label className={styles.label}>Department</label>
          <select
            value={lecturerId}
            onChange={(e) => {
              setLecturerId(e.target.value);
              setSelected([]);
            }}
            className={styles.input}
          >
            <option value="">Select department…</option>
            {lecturers.map((l) => (
              <option key={l.id} value={l.id}>
                {l.department}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={styles.label}>Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={styles.input} />
        </div>
        <div>
          <label className={styles.label}>Until (optional, for several days)</label>
          <input type="date" value={toDate} min={date} onChange={(e) => setToDate(e.target.value)} className={styles.input} />
        </div>
      </div>

      {account && (
        <div className="mb-3.5 rounded-xl border border-[var(--border)] bg-[var(--card2)] p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className={styles.label}>Lecturers ({selected.length} selected)</span>
            {members.length > 0 && (
              <button
                type="button"
                className="text-xs font-bold text-[var(--white)] underline"
                onClick={() => setSelected(allSelected ? [] : members.map((m) => m.id))}
              >
                {allSelected ? "Clear all" : "Select all lecturers"}
              </button>
            )}
          </div>
          {members.length === 0 ? (
            <p className="text-xs text-[var(--muted)]">
              This department&apos;s roster is empty. Add its lecturers with Manage Roster below first.
            </p>
          ) : (
            <div className="grid gap-1.5 sm:grid-cols-2">
              {members.map((m) => (
                <label key={m.id} className="flex cursor-pointer items-center gap-2 text-sm text-[var(--white)]">
                  <input type="checkbox" checked={selected.includes(m.id)} onChange={() => toggle(m.id)} />
                  {m.name}
                  <Badge tone={m.tier === "SENIOR" ? "blue" : "gray"}>{TIER_LABELS[m.tier]}</Badge>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      <Button variant="primary" onClick={handleAssign}>
        Assign Acting HOD
      </Button>
      {error && <p className="mt-2 text-xs text-[var(--err)]">{error}</p>}
      {saved && <p className="mt-2 text-xs text-[var(--white)]">✅ {saved}</p>}

      <div className="mt-5 overflow-x-auto">
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Department</th>
              <th>Acting HOD lecturers</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {upcoming.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-6 text-center text-[var(--muted)]">
                  No upcoming Acting HOD assignments. Every HOD is handling their own approvals.
                </td>
              </tr>
            ) : (
              upcoming.map((a) => (
                <tr key={a.id}>
                  <td className="whitespace-nowrap">{a.date}</td>
                  <td>{a.department}</td>
                  <td>
                    {a.members.map((m) => (
                      <div key={m.memberId}>
                        {m.name} <span className="text-xs text-[var(--muted)]">({TIER_LABELS[m.tier]})</span>
                      </div>
                    ))}
                  </td>
                  <td>
                    <Button variant="danger" className="!px-2.5 !py-1 !text-[11px]" onClick={() => handleRemove(a.id)}>
                      Remove
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export function HodCover({ portal }: { portal: ReturnType<typeof useAdminPortal> }) {
  const {
    hods,
    lecturers,
    addLecturer,
    editLecturer,
    removeLecturer,
    addLecturerMember,
    editLecturerMember,
    removeLecturerMember,
  } = portal;

  // ── Department covering accounts ─────────────────────────────────
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [acctDepartment, setAcctDepartment] = useState("");
  const [acctUsername, setAcctUsername] = useState("");
  const [acctName, setAcctName] = useState("");
  const [acctPassword, setAcctPassword] = useState("");
  const [acctError, setAcctError] = useState<string | null>(null);
  const [rosterFor, setRosterFor] = useState<string | null>(null);

  function resetAccountForm() {
    setEditingAccountId(null);
    setAcctDepartment("");
    setAcctUsername("");
    setAcctName("");
    setAcctPassword("");
  }

  function startEditAccount(id: string) {
    const l = lecturers.find((x) => x.id === id);
    if (!l) return;
    setEditingAccountId(id);
    setAcctDepartment(l.department);
    setAcctUsername(l.username);
    setAcctName(l.name);
    setAcctPassword("");
  }

  async function handleSaveAccount() {
    if (!editingAccountId) {
      if (!acctDepartment.trim() || !acctUsername.trim() || !acctName.trim() || !acctPassword.trim()) {
        setAcctError("All fields are required to create an account.");
        return;
      }
    } else if (!acctUsername.trim() || !acctName.trim()) {
      setAcctError("Please fill in username and name.");
      return;
    }
    if (acctPassword.trim() && !isValidPassword(acctPassword.trim())) {
      setAcctError(PASSWORD_POLICY_MESSAGE);
      return;
    }
    setAcctError(null);
    try {
      if (editingAccountId) {
        await editLecturer(editingAccountId, {
          username: acctUsername.trim(),
          name: acctName.trim(),
          department: acctDepartment.trim() || undefined,
          password: acctPassword.trim() || undefined,
        });
      } else {
        await addLecturer({
          department: acctDepartment.trim(),
          username: acctUsername.trim(),
          name: acctName.trim(),
          password: acctPassword.trim(),
        });
      }
      resetAccountForm();
    } catch (err) {
      setAcctError(err instanceof Error ? err.message : "Failed to save account");
    }
  }

  async function handleDeleteAccount(id: string) {
    if (!confirm("Delete this department's covering account? Its whole roster and unavailability history go with it.")) {
      return;
    }
    try {
      await removeLecturer(id);
    } catch (err) {
      setAcctError(err instanceof Error ? err.message : "Failed to delete account");
    }
  }

  const rosterLecturer = lecturers.find((l) => l.id === rosterFor) || null;
  const existingDepartments = new Set(lecturers.map((l) => l.department));

  return (
    <div>
      <div className={styles.infoBanner}>
        <strong>Acting HOD:</strong> Each department has ONE Acting HOD profile (one login), shared by that
        department&apos;s lecturers. Create the profile and add the department&apos;s Senior/Junior lecturers to its
        roster below. On a day the HOD isn&apos;t available, assign one, several or all of those lecturers as Acting
        HOD for that date. That department&apos;s leave approvals then go to the Acting HOD profile for that day.
      </div>

      <ActingHodCard portal={portal} />

      <Card className="mb-5 p-5">
        <h2 className="mb-4 text-sm font-bold text-[var(--white)]">
          {editingAccountId ? "✏️ Edit Department Acting HOD Account" : "➕ Create Department Acting HOD Account"}
        </h2>
        <div className={`${styles.formGrid3} mb-3.5`}>
          <div>
            <label className={styles.label}>
              Department<span className="ml-0.5 text-[var(--err)]">*</span>
            </label>
            <select
              value={acctDepartment}
              onChange={(e) => setAcctDepartment(e.target.value)}
              className={styles.input}
              disabled={!!editingAccountId}
            >
              <option value="">Select department…</option>
              {portal.departments.map((d) => (
                  <option key={d} value={d} disabled={existingDepartments.has(d)}>
                    {d}
                    {existingDepartments.has(d) ? " (already has an account)" : ""}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className={styles.label}>
              Username<span className="ml-0.5 text-[var(--err)]">*</span>
            </label>
            <input value={acctUsername} onChange={(e) => setAcctUsername(e.target.value)} className={styles.input} placeholder="e.g. cover-it" />
          </div>
          <div>
            <label className={styles.label}>
              Account Label<span className="ml-0.5 text-[var(--err)]">*</span>
            </label>
            <input
              value={acctName}
              onChange={(e) => setAcctName(e.target.value)}
              className={styles.input}
              placeholder="e.g. IT Dept Covering Lecturers"
            />
          </div>
        </div>
        <div className={`${styles.formGrid3} mb-3.5`}>
          <div>
            <label className={styles.label}>
              Password {editingAccountId ? "(leave blank to keep current)" : <span className="text-[var(--err)]">*</span>}
            </label>
            <input value={acctPassword} onChange={(e) => setAcctPassword(e.target.value)} className={styles.input} />
            <p className="mt-1.5 text-[11px] text-[var(--muted)]">
              This is the ONE shared password every lecturer in this department uses to log in and cover for
              the HOD.
            </p>
          </div>
          <div />
        </div>
        <div className="flex gap-2">
          <Button variant="primary" onClick={handleSaveAccount}>
            {editingAccountId ? "Save Changes" : "Create Account"}
          </Button>
          {editingAccountId && (
            <Button variant="secondary" onClick={resetAccountForm}>
              Cancel
            </Button>
          )}
        </div>
        {acctError && <p className="mt-2 text-xs text-[var(--err)]">{acctError}</p>}
      </Card>

      <Card className="mb-5 p-5">
        <h2 className="mb-4 text-sm font-bold text-[var(--white)]">Department Acting HOD Accounts</h2>
        <div className="overflow-x-auto">
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Department</th>
                <th>Login</th>
                <th>Roster</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {lecturers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-[var(--muted)]">
                    No covering accounts yet.
                  </td>
                </tr>
              ) : (
                lecturers.map((l) => (
                  <tr key={l.id}>
                    <td>{l.department}</td>
                    <td>
                      {l.username}
                      <div className="text-xs text-[var(--muted)]">{l.name}</div>
                    </td>
                    <td className="text-[var(--muted)]">
                      {l.members.length} lecturer{l.members.length === 1 ? "" : "s"}
                    </td>
                    <td className="space-x-1.5 whitespace-nowrap">
                      <Button variant="secondary" className="!px-2.5 !py-1 !text-[11px]" onClick={() => setRosterFor(l.id)}>
                        Manage Roster
                      </Button>
                      <Button variant="secondary" className="!px-2.5 !py-1 !text-[11px]" onClick={() => startEditAccount(l.id)}>
                        Edit
                      </Button>
                      <Button variant="danger" className="!px-2.5 !py-1 !text-[11px]" onClick={() => handleDeleteAccount(l.id)}>
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {rosterLecturer && (
        <LecturerRosterModal
          lecturer={rosterLecturer}
          onAddMember={(input) => addLecturerMember(rosterLecturer.id, input)}
          onEditMember={(memberId, input) => editLecturerMember(rosterLecturer.id, memberId, input)}
          onRemoveMember={(memberId) => removeLecturerMember(rosterLecturer.id, memberId)}
          onClose={() => setRosterFor(null)}
        />
      )}
    </div>
  );
}

// ==================================================================
// Photo Requests — a student only gets one self-service photo set (see
// backend/models/Student.js photoLocked); anything after that needs a
// decision here before it actually replaces their photo.
// ==================================================================

export function PhotoRequests({ portal }: { portal: ReturnType<typeof useAdminPortal> }) {
  const { photoRequests, approvePhotoRequest, rejectPhotoRequest } = portal;
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pending = photoRequests.filter((r) => r.status === "PENDING");
  const decided = photoRequests.filter((r) => r.status !== "PENDING");

  async function handleApprove(id: string) {
    setBusyId(id);
    setError(null);
    try {
      await approvePhotoRequest(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve request");
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(id: string) {
    const reason = prompt("Reason for rejecting this photo change (optional):") ?? "";
    setBusyId(id);
    setError(null);
    try {
      await rejectPhotoRequest(id, reason.trim() || undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject request");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className={styles.infoBanner}>
        <strong>Photo Requests:</strong> A student can only set their own profile photo once — any change
        after that needs your approval here, so a lost/stolen ID photo can&apos;t be swapped out
        unilaterally by whoever&apos;s currently logged in.
      </div>

      {error && <p className="mb-3 text-xs text-[var(--err)]">{error}</p>}

      <h2 className="mb-3 text-sm font-bold text-[var(--white)]">Pending ({pending.length})</h2>
      {pending.length === 0 ? (
        <Card className="mb-6 p-5 text-center text-sm text-[var(--muted)]">No pending photo requests.</Card>
      ) : (
        <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          {pending.map((r) => (
            <Card key={r.id} className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-[var(--white)]">{r.studentName}</div>
                  <div className="text-xs text-[var(--muted)]">{r.studentIndexNumber}</div>
                </div>
                <span className="text-[10px] text-[var(--muted)]">
                  {new Date(r.createdAt).toLocaleString()}
                </span>
              </div>
              <div className="mb-3 flex items-center justify-center gap-4">
                <div className="text-center">
                  <div className="mb-1 text-[10px] uppercase text-[var(--muted)]">Current</div>
                  <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-[var(--border)] bg-[var(--card2)]">
                    {r.currentPhoto ? (
                      <img src={r.currentPhoto} alt="Current" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-[9px] text-[var(--muted)]">No Photo</span>
                    )}
                  </div>
                </div>
                <span className="text-lg text-[var(--muted)]">→</span>
                <div className="text-center">
                  <div className="mb-1 text-[10px] uppercase text-[var(--sky)]">Requested</div>
                  <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-[var(--sky)] bg-[var(--card2)]">
                    <img src={r.requestedPhoto} alt="Requested" className="h-full w-full object-cover" />
                  </div>
                </div>
              </div>
              {r.reason && (
                <p className="mb-3 text-xs text-[var(--muted)]">
                  <strong className="text-[var(--white)]">Reason:</strong> {r.reason}
                </p>
              )}
              <div className="flex gap-2">
                <Button
                  variant="success"
                  className="!text-xs"
                  disabled={busyId === r.id}
                  onClick={() => handleApprove(r.id)}
                >
                  {busyId === r.id ? "Working…" : "✅ Approve"}
                </Button>
                <Button
                  variant="danger"
                  className="!text-xs"
                  disabled={busyId === r.id}
                  onClick={() => handleReject(r.id)}
                >
                  ❌ Reject
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <h2 className="mb-3 text-sm font-bold text-[var(--white)]">Decided</h2>
      <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--card)]">
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Student</th>
              <th>Requested</th>
              <th>Status</th>
              <th>Decided By</th>
              <th>Date</th>
              <th>Reason</th>
            </tr>
          </thead>
          <tbody>
            {decided.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-[var(--muted)]">
                  No decided requests yet.
                </td>
              </tr>
            ) : (
              decided.map((r) => (
                <tr key={r.id}>
                  <td>
                    {r.studentName}
                    <div className="text-xs text-[var(--muted)]">{r.studentIndexNumber}</div>
                  </td>
                  <td>
                    <img src={r.requestedPhoto} alt="Requested" className="h-10 w-10 rounded-full object-cover" />
                  </td>
                  <td>
                    <Badge tone={r.status === "APPROVED" ? "green" : "red"}>{r.status}</Badge>
                  </td>
                  <td className="text-[var(--muted)]">{r.decidedBy || "—"}</td>
                  <td className="text-[var(--muted)]">{r.decidedAt || "—"}</td>
                  <td className="max-w-[200px] text-[var(--muted)]">{r.decisionReason || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ==================================================================
// Event Calendar — this admin's own department's Workshop days. Each of
// the department admins manages only their own department here; students
// in that department get blocked from ordinary leave during a marked
// window (see backend/controllers/studentcontrol.js applyLeave). The
// department's HOD/Lecturer portal shows the same calendar read-only (see
// app/hod/views.tsx EventCalendar) and keeps the bulk reject-overlapping
// action there, since that's a leave decision, not a calendar edit.
// ==================================================================

export function Calendar({ portal }: { portal: ReturnType<typeof useAdminPortal> }) {
  const { events, addEvent, removeEvent } = portal;
  return (
    <EventCalendarView
      events={events}
      editable
      onAdd={addEvent}
      onRemove={removeEvent}
      infoBanner={
        <>
          <strong>Event Calendar:</strong> Sri Lanka&apos;s Poya days and national holidays (niwadu dawasa)
          are shown here automatically — nothing for you to add or maintain. Mark a mandatory{" "}
          <strong>Workshop</strong> day for your department, with its actual start and end time — students
          in your department can&apos;t apply for ordinary leave during that window, but are free to once
          it ends, even on the same day. Your department&apos;s HOD can see this calendar and review any
          pending leave requests that overlap a workshop.
        </>
      }
    />
  );
}

// ==================================================================
// Reports — an audit-ready view of leave activity over a date range, for
// when a higher authority asks "who was away, from which department, and
// when." Built entirely from portal.leaves (already loaded for the
// Dashboard's own stats) filtered to the selected window — no separate
// backend endpoint needed, so this can never drift from what the Dashboard
// itself shows for the same records.
// ==================================================================

const REPORT_STATUS_COLORS = { Approved: "#22c55e", Pending: "#f59332", Rejected: "#ef4444" } as const;

// Fixed order, never cycled per the department actually present — a
// department keeps the same color across the donut/bars/CSV even as the
// date range changes which ones show up. Avoids the reserved status hues
// above (green/amber/red) so a department bar is never mistaken for a
// status.
const REPORT_DEPT_COLORS = ["#2563b0", "#7c3aed", "#0891b2", "#db2777", "#4338ca", "#78716c", "#ca8a04", "#059669"];

function reportStatus(l: LeaveRequest): "Approved" | "Rejected" | "Pending" {
  if (isApproved(l)) return "Approved";
  if (isRejected(l)) return "Rejected";
  return "Pending";
}

// Two leave-date ranges overlap the requested window — same inclusive
// overlap test used server-side for event/workshop blocking — rather than
// only counting leaves that started inside it, so a leave that was already
// underway when the window opens (or still running when it closes) isn't
// silently dropped from the audit.
function overlapsWindow(l: LeaveRequest, from: string, to: string): boolean {
  return l.startDate <= to && l.endDate >= from;
}

function StatusDonut({ approved, rejected, pending }: { approved: number; rejected: number; pending: number }) {
  const total = approved + rejected + pending;
  const segments: { label: keyof typeof REPORT_STATUS_COLORS; value: number }[] = [
    { label: "Approved", value: approved },
    { label: "Pending", value: pending },
    { label: "Rejected", value: rejected },
  ];
  const r = 42;
  const circumference = 2 * Math.PI * r;
  const gap = total ? 3 : 0;
  let offset = 0;

  return (
    <div className="flex flex-wrap items-center gap-6">
      <svg width="120" height="120" viewBox="0 0 120 120" className="-rotate-90 shrink-0">
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--card2)" strokeWidth="16" />
        {total > 0 &&
          segments.map((s) => {
            if (s.value === 0) return null;
            const len = (s.value / total) * circumference;
            const dash = Math.max(len - gap, 0);
            const el = (
              <circle
                key={s.label}
                cx="60"
                cy="60"
                r={r}
                fill="none"
                stroke={REPORT_STATUS_COLORS[s.label]}
                strokeWidth="16"
                strokeLinecap="round"
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset}
              />
            );
            offset += len;
            return el;
          })}
      </svg>
      <div className="space-y-1.5">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center gap-2 text-xs">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: REPORT_STATUS_COLORS[s.label] }} />
            <span className="w-16 text-[var(--white)]">{s.label}</span>
            <span className="text-[var(--muted)]">
              {s.value} ({total ? Math.round((s.value / total) * 100) : 0}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Leave.department is a snapshot taken at application time (see
// studentcontrol.js applyLeave), not a live lookup — an older leave can
// carry a shorter department string a student's record used before it was
// standardized to "Department of X" (current Student.department always
// uses the full form). Normalizing to the short form for grouping/display
// here keeps one department's leaves from splitting into two report rows
// just because some predate that standardization.
function normalizeDept(department: string | undefined): string {
  return (department || "—").replace(/^Department of\s+/i, "").trim();
}

function csvEscape(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

// A "2026-08-16 09:00"-shaped string opened in Excel gets auto-detected as
// a date/time and reformatted to a wider display format than the column's
// default width — showing as "########" until the column is manually
// widened, not because the data is missing. A leading apostrophe is
// Excel's own signal (honored on CSVs it opens, not just manual entry) to
// keep a cell as literal text instead, so the value is always immediately
// readable on open.
function csvDateTime(value: string): string {
  return `'${value}`;
}

// Date inputs render in the browser's own locale (e.g. 05/09/2026 can mean
// 9 May or 5 September), so the report spells the chosen range out in words.
function longDate(value: string): string {
  if (!value) return "—";
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function downloadCsv(filename: string, header: string[], rows: string[][]) {
  // BOM so Excel reads UTF-8 names correctly; CRLF rows for Excel on Windows.
  const csv = "﻿" + [header, ...rows].map((row) => row.map((v) => csvEscape(v ?? "")).join(",")).join("\r\n");
  downloadBlob(filename, new Blob([csv], { type: "text/csv;charset=utf-8" }));
}

// ── Excel (.xlsx) export ─────────────────────────────────────────────
// A CSV can't carry column widths or alignment, so the audit report also
// exports a real .xlsx: every column sized to its longest value, every cell
// left-aligned, bold frozen header row with filters, and all values stored
// as plain text (dates stay exactly as shown, no Excel reformatting). Built
// by hand (a minimal uncompressed zip of the SpreadsheetML parts) so no
// extra dependency is needed.
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function zipStore(files: { name: string; data: string }[]): Uint8Array {
  const enc = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const f of files) {
    const name = enc.encode(f.name);
    const data = enc.encode(f.data);
    const crc = crc32(data);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, data.length, true);
    local.setUint32(22, data.length, true);
    local.setUint16(26, name.length, true);
    chunks.push(new Uint8Array(local.buffer), name, data);
    const cd = new DataView(new ArrayBuffer(46));
    cd.setUint32(0, 0x02014b50, true);
    cd.setUint16(4, 20, true);
    cd.setUint16(6, 20, true);
    cd.setUint32(16, crc, true);
    cd.setUint32(20, data.length, true);
    cd.setUint32(24, data.length, true);
    cd.setUint16(28, name.length, true);
    cd.setUint32(42, offset, true);
    central.push(new Uint8Array(cd.buffer), name);
    offset += 30 + name.length + data.length;
  }
  const cdSize = central.reduce((s, c) => s + c.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, files.length, true);
  end.setUint16(10, files.length, true);
  end.setUint32(12, cdSize, true);
  end.setUint32(16, offset, true);
  const parts = [...chunks, ...central, new Uint8Array(end.buffer)];
  const out = new Uint8Array(parts.reduce((s, p) => s + p.length, 0));
  let pos = 0;
  for (const p of parts) {
    out.set(p, pos);
    pos += p.length;
  }
  return out;
}

function xmlEscape(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function columnLetter(index: number): string {
  let s = "";
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}

export function buildXlsx(sheetName: string, header: string[], rows: string[][]): Uint8Array {
  const all = [header, ...rows];
  const widths = header.map((_, c) => Math.min(60, Math.max(...all.map((r) => String(r[c] ?? "").length)) + 3));
  const lastCell = `${columnLetter(header.length - 1)}${all.length}`;
  const sheetRows = all
    .map((r, ri) => {
      const cells = r
        .map((v, ci) => {
          const ref = `${columnLetter(ci)}${ri + 1}`;
          return `<c r="${ref}" t="inlineStr" s="${ri === 0 ? 2 : 1}"><is><t xml:space="preserve">${xmlEscape(String(v ?? ""))}</t></is></c>`;
        })
        .join("");
      return `<row r="${ri + 1}">${cells}</row>`;
    })
    .join("");
  const sheet =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    `<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>` +
    `<cols>${widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join("")}</cols>` +
    `<sheetData>${sheetRows}</sheetData>` +
    `<autoFilter ref="A1:${lastCell}"/>` +
    `</worksheet>`;
  const styles =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    `<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>` +
    `<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>` +
    `<fill><patternFill patternType="solid"><fgColor rgb="FFDCE6F1"/><bgColor indexed="64"/></patternFill></fill></fills>` +
    `<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>` +
    `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
    `<cellXfs count="3">` +
    `<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>` +
    `<xf numFmtId="49" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>` +
    `<xf numFmtId="49" fontId="1" fillId="2" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>` +
    `</cellXfs>` +
    `<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>` +
    `</styleSheet>`;
  const safeSheet = xmlEscape(sheetName.replace(/[\\/?*[\]:]/g, " ").slice(0, 31));
  return zipStore([
    {
      name: "[Content_Types].xml",
      data:
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
        `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
        `<Default Extension="xml" ContentType="application/xml"/>` +
        `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
        `<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>` +
        `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>` +
        `</Types>`,
    },
    {
      name: "_rels/.rels",
      data:
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
        `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>` +
        `</Relationships>`,
    },
    {
      name: "xl/workbook.xml",
      data:
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
        `<sheets><sheet name="${safeSheet}" sheetId="1" r:id="rId1"/></sheets>` +
        `<definedNames><definedName name="_xlnm._FilterDatabase" localSheetId="0" hidden="1">'${safeSheet}'!$A$1:$${columnLetter(header.length - 1)}$${all.length}</definedName></definedNames>` +
        `</workbook>`,
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      data:
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
        `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>` +
        `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
        `</Relationships>`,
    },
    { name: "xl/worksheets/sheet1.xml", data: sheet },
    { name: "xl/styles.xml", data: styles },
  ]);
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  // Windows rejects some characters in file names (e.g. "/" from a date).
  a.download = filename.replace(/[\\/:*?"<>|]/g, "-");
  a.style.display = "none";
  // The link must be in the page for some browsers, and the blob URL must
  // stay alive until the download has started — revoking it right after
  // click() is what made the browser report "can't download".
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    a.remove();
    URL.revokeObjectURL(url);
  }, 1000);
}

export function Reports({ portal }: { portal: ReturnType<typeof useAdminPortal> }) {
  const { leaves, students, hods, error, refresh } = portal;
  const today = new Date().toISOString().split("T")[0];

  // Departments come only from the system's own HOD accounts (one HOD per
  // department). A leave is counted under its student's CURRENT department
  // (falling back to the department saved on the leave if the student record
  // is gone); anything that doesn't match a real department is reported
  // separately instead of appearing as a department of its own.
  const realDepartments = portal.departments;
  const studentDept = new Map(students.map((s) => [s.id, s.department]));
  function leaveDepartment(l: LeaveRequest): string | null {
    const dept = studentDept.get(l.studentId) ?? l.department;
    const key = normalizeDept(dept).toLowerCase();
    return realDepartments.find((d) => normalizeDept(d).toLowerCase() === key) ?? null;
  }
  const NO_DEPT = "Not in a current department";
  const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const [from, setFrom] = useState(monthAgo);
  const [to, setTo] = useState(today);
  const [drilldown, setDrilldown] = useState<{ title: string; leaves: LeaveRequest[] } | null>(null);

  const inRange = from && to && from <= to ? leaves.filter((l) => overlapsWindow(l, from, to)) : [];
  const approved = inRange.filter(isApproved);
  const rejected = inRange.filter(isRejected);
  const pending = inRange.filter((l) => !isApproved(l) && !isRejected(l));
  const approvalRate = inRange.length ? Math.round((approved.length / inRange.length) * 100) : 0;

  const byDept = realDepartments
    .map((d, i) => ({
      department: d,
      color: REPORT_DEPT_COLORS[i % REPORT_DEPT_COLORS.length],
      rows: inRange.filter((l) => leaveDepartment(l) === d),
    }))
    .sort((a, b) => b.rows.length - a.rows.length);
  const unmatched = inRange.filter((l) => !leaveDepartment(l));

  const types = Array.from(new Set(inRange.map((l) => l.type)));
  const byType = types
    .map((t) => ({ type: t, rows: inRange.filter((l) => l.type === t) }))
    .sort((a, b) => b.rows.length - a.rows.length);

  const exportHeader = ["Student", "Index Number", "Intake", "Department", "Leave Type", "From", "To", "Applied", "Status"];
  function exportRows(dateCell: (v: string) => string) {
    return inRange
      .slice()
      .sort((a, b) => a.startDate.localeCompare(b.startDate))
      .map((l) => [
        l.studentName,
        l.indexNumber,
        l.intake || "—",
        leaveDepartment(l) ?? NO_DEPT,
        LEAVE_TYPE_LABELS[l.type],
        dateCell(`${l.startDate} ${l.startTime}`),
        dateCell(`${l.endDate} ${l.endTime}`),
        l.appliedDate,
        reportStatus(l),
      ]);
  }

  function exportCsv() {
    downloadCsv(`leave-audit-${from}_to_${to}.csv`, exportHeader, exportRows(csvDateTime));
  }

  function exportExcel() {
    const bytes = buildXlsx(`Leaves ${from} to ${to}`, exportHeader, exportRows((v) => v));
    downloadBlob(
      `leave-audit-${from}_to_${to}.xlsx`,
      new Blob([bytes as BlobPart], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
    );
  }

  return (
    <div>
      <div className={styles.welcomeBanner}>
        <div>
          <h2 className="text-lg font-bold text-[var(--white)]">📊 Leave Audit Report</h2>
          <p className="text-xs text-[var(--muted)]">
            Pick a date range to see every leave active during it, broken down by department and status — for
            audits, inspections, or reporting up the chain.
          </p>
        </div>
      </div>

      <Card className="mb-6 p-5 print:hidden">
        <div className={styles.formGrid3}>
          <div>
            <label className={styles.label}>From</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={styles.input} />
          </div>
          <div>
            <label className={styles.label}>To</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={styles.input} />
          </div>
          <div className="flex items-end gap-2">
            <Button type="button" variant="secondary" onClick={() => window.print()} disabled={!inRange.length}>
              🖨️ Print
            </Button>
            <Button type="button" variant="primary" onClick={exportExcel} disabled={!inRange.length}>
              ⬇️ Export Excel
            </Button>
            <Button type="button" variant="secondary" onClick={exportCsv} disabled={!inRange.length}>
              CSV
            </Button>
          </div>
        </div>
        {from && to && from <= to && (
          <p className="mt-3 text-xs text-[var(--muted)]">
            Showing leaves from <strong className="text-[var(--white)]">{longDate(from)}</strong> to{" "}
            <strong className="text-[var(--white)]">{longDate(to)}</strong>.
          </p>
        )}
        {from && to && from > to && <p className="mt-3 text-xs text-[var(--err)]">&quot;From&quot; must be on or before &quot;To&quot;.</p>}
      </Card>

      {error && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-[rgba(239,68,68,0.3)] bg-[rgba(239,68,68,0.08)] px-4 py-2.5 text-xs text-[var(--err)]">
          <span>Couldn&apos;t load leave records: {error}</span>
          <button onClick={() => refresh()} className="whitespace-nowrap font-bold underline">
            Retry
          </button>
        </div>
      )}

      {inRange.length === 0 ? (
        <Card className="p-5">
          <p className="text-xs text-[var(--muted)]">
            No leave records overlap {longDate(from)} to {longDate(to)}.
            {leaves.length > 0 &&
              (() => {
                const starts = leaves.map((l) => l.startDate).filter(Boolean).sort();
                const ends = leaves.map((l) => l.endDate).filter(Boolean).sort();
                return ` Leaves on record run from ${longDate(starts[0])} to ${longDate(ends[ends.length - 1])}.`;
              })()}
          </p>
        </Card>
      ) : (
        <>
          <div className={styles.statRow}>
            <StatTile label="Leaves in Range" value={inRange.length} icon={<ClipboardList size={20} />} />
            <StatTile label="Approved" value={approved.length} icon={<ClipboardList size={20} />} />
            <StatTile label="Rejected" value={rejected.length} icon={<ClipboardList size={20} />} />
            <StatTile label="Pending" value={pending.length} icon={<ClipboardList size={20} />} />
            <StatTile label="Approval Rate" value={`${approvalRate}%`} icon={<ClipboardList size={20} />} />
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card className="p-5">
              <h2 className="mb-4 text-sm font-bold text-[var(--white)]">Status Breakdown</h2>
              <StatusDonut approved={approved.length} rejected={rejected.length} pending={pending.length} />
            </Card>
            <Card className="p-5">
              <h2 className="mb-4 text-sm font-bold text-[var(--white)]">By Department</h2>
              <div className="space-y-2.5">
                {byDept.map((d) => (
                  <Breakdown
                    key={d.department}
                    label={d.department}
                    value={d.rows.length}
                    total={inRange.length}
                    color={d.color}
                    onClick={() => setDrilldown({ title: `${d.department} (${from} – ${to})`, leaves: d.rows })}
                  />
                ))}
                {unmatched.length > 0 && (
                  <Breakdown
                    label={NO_DEPT}
                    value={unmatched.length}
                    total={inRange.length}
                    color="#94a3b8"
                    onClick={() => setDrilldown({ title: `${NO_DEPT} (${from} – ${to})`, leaves: unmatched })}
                  />
                )}
              </div>
              {unmatched.length > 0 && (
                <p className="mt-3 text-[11px] text-[var(--muted)]">
                  {unmatched.length} leave{unmatched.length === 1 ? "" : "s"} belong to students whose department doesn&apos;t
                  match any of your departments (for example a deleted or test student). Click the row to see them.
                </p>
              )}
            </Card>
          </div>

          <Card className="mb-6 p-5">
            <h2 className="mb-4 text-sm font-bold text-[var(--white)]">By Leave Type</h2>
            <div className="space-y-2.5">
              {byType.map((t) => (
                <Breakdown
                  key={t.type}
                  label={LEAVE_TYPE_LABELS[t.type]}
                  value={t.rows.length}
                  total={inRange.length}
                  color="#2563b0"
                  onClick={() => setDrilldown({ title: `${LEAVE_TYPE_LABELS[t.type]} (${from} – ${to})`, leaves: t.rows })}
                />
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="mb-4 text-sm font-bold text-[var(--white)]">Every Leave in Range</h2>
            <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Intake</th>
                    <th>Department</th>
                    <th>Type</th>
                    <th>From</th>
                    <th>To</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {inRange
                    .slice()
                    .sort((a, b) => a.startDate.localeCompare(b.startDate))
                    .map((l) => (
                      <tr key={l.id}>
                        <td>
                          {l.studentName}
                          <div className="text-xs text-[var(--muted)]">{l.indexNumber}</div>
                        </td>
                        <td>{l.intake || "—"}</td>
                        <td>{leaveDepartment(l) ?? NO_DEPT}</td>
                        <td className="whitespace-nowrap">{LEAVE_TYPE_LABELS[l.type]}</td>
                        <td className="whitespace-nowrap">{l.startDate}</td>
                        <td className="whitespace-nowrap">{l.endDate}</td>
                        <td>
                          <Badge tone={reportStatus(l) === "Approved" ? "green" : reportStatus(l) === "Rejected" ? "red" : "amber"}>
                            {reportStatus(l)}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {drilldown && (
        <LeaveListDrilldownModal title={drilldown.title} leaves={drilldown.leaves} onClose={() => setDrilldown(null)} />
      )}
    </div>
  );
}
