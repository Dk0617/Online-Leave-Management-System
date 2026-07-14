"use client";

import { useState } from "react";
import { Card, StatTile, Button, Badge } from "@/src/components/ui";
import { useAdminPortal, StaffRole as StaffRoleKey } from "@/src/hooks/useAdminPortal";
import { isApproved, isRejected } from "@/src/api";
import { ROLE_LABELS, RefName, StaffAccount, StudentType } from "@/src/types";
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
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="w-24 shrink-0 text-xs text-[var(--muted)]">{label}</div>
      <div className="h-2.5 flex-1 overflow-hidden rounded-md bg-[var(--card2)]">
        <div className="h-full rounded-md" style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className="w-8 shrink-0 text-right text-xs font-bold text-[var(--white)]">{value}</div>
    </div>
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
        <h2 className="mb-4 text-sm font-bold text-[var(--white)]">➕ Add Intake</h2>
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
            Add Intake
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

  const departmentOptions = Array.from(
    new Set(hods.map((h) => h.department).filter((d): d is string => !!d))
  ).sort();

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
              <option value="">{departmentOptions.length ? "Select department…" : "No departments — add an HOD first"}</option>
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
              <input
                value={extra}
                onChange={(e) => setExtra(e.target.value)}
                placeholder={extraPlaceholder}
                className={styles.input}
              />
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
