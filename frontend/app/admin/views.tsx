"use client";

import { useState } from "react";
import { Card, StatTile, Button, Badge } from "@/src/components/ui";
import { useAdminPortal, StaffRole as StaffRoleKey } from "@/src/hooks/useAdminPortal";
import { isApproved, isRejected } from "@/src/api";
import { ROLE_LABELS, RefName, StaffAccount, StudentType } from "@/src/types";
import styles from "./admin.module.css";

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
  const { students, hods, troops, squadrans, sdds, gates, leaves, intakes } = portal;

  const approvedCount = leaves.filter(isApproved).length;
  const rejectedCount = leaves.filter(isRejected).length;
  const pendingCount = leaves.length - approvedCount - rejectedCount;

  const dayScholarCount = students.filter((s) => s.studentType === "DAY_SCHOLAR").length;
  const cadetCount = students.filter((s) => s.studentType === "CADET").length;

  const recentStudents = students.slice(-5).reverse();

  return (
    <div>
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
              <Breakdown label="Cadets" value={cadetCount} total={students.length} color="#7c3aed" />
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
    await removeIntake(intakeCode);
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
  const [hodId, setHodId] = useState("");
  const [sqnId, setSqnId] = useState("");
  const [troopIds, setTroopIds] = useState<string[]>([]);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const departmentOptions = Array.from(
    new Set(hods.map((h) => h.department).filter((d): d is string => !!d))
  ).sort();

  function toggleTroop(id: string) {
    setTroopIds((prev) => {
      if (prev.includes(id)) return prev.filter((t) => t !== id);
      if (prev.length >= 2) return prev;
      return [...prev, id];
    });
  }

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
    setHodId("");
    setSqnId("");
    setPassword("");
    setTroopIds([]);
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
    setHodId(refId(s.hodId));
    setSqnId(refId(s.sqnId));
    setTroopIds(s.troopIds.map(refId).filter(Boolean));
    setPassword("");
  }

  async function handleSubmit() {
    if (!indexNumber.trim() || !firstName.trim() || !lastName.trim()) {
      setError("Index number, first and last name are required.");
      return;
    }
    if (!troopIds.length) {
      setError("Assign at least one Troop Commander (up to 2).");
      return;
    }
    if (studentType === "DAY_SCHOLAR" && !hodId) {
      setError("Select an HOD for this Day Scholar.");
      return;
    }
    if (studentType === "CADET" && !sqnId) {
      setError("Select a Squadron Commander for this Cadet.");
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
      troopIds,
      hodId: studentType === "DAY_SCHOLAR" ? hodId : undefined,
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
    await removeStudent(id);
  }

  return (
    <div>
      <Card className="mb-5 p-5">
        <h2 className="mb-4 text-sm font-bold text-[var(--white)]">
          {editingId ? "✏️ Edit Student Account" : "➕ Create Student Account"}
        </h2>

        <div className={`${styles.formGrid3} mb-3.5`}>
          <div>
            <label className={styles.label}>Index Number (used as Username)</label>
            <input value={indexNumber} onChange={(e) => setIndexNumber(e.target.value)} placeholder="e.g. SC/2024/045" className={styles.input} />
          </div>
          <div>
            <label className={styles.label}>First Name</label>
            <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className={styles.input} />
          </div>
          <div>
            <label className={styles.label}>Last Name</label>
            <input value={lastName} onChange={(e) => setLastName(e.target.value)} className={styles.input} />
          </div>
        </div>

        <div className={`${styles.formGrid3} mb-3.5`}>
          <div>
            <label className={styles.label}>Department / Section</label>
            <select value={department} onChange={(e) => setDepartment(e.target.value)} className={styles.input}>
              <option value="">{departmentOptions.length ? "Select department…" : "No departments — add an HOD first"}</option>
              {departmentOptions.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={styles.label}>Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@kdu.ac.lk" className={styles.input} />
          </div>
          <div>
            <label className={styles.label}>Mobile</label>
            <input value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="07XXXXXXXX" className={styles.input} />
          </div>
        </div>

        <div className={`${styles.formGrid3} mb-3.5`}>
          <div>
            <label className={styles.label}>Intake</label>
            <select value={intake} onChange={(e) => setIntake(e.target.value)} className={styles.input}>
              <option value="">{intakes.length ? "Select intake…" : "No intakes — add one first"}</option>
              {intakes.map((i) => (
                <option key={i.id} value={i.code}>
                  Intake {i.code}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={styles.label}>Student Type</label>
            <select
              value={studentType}
              onChange={(e) => setStudentType(e.target.value as StudentType)}
              className={styles.input}
            >
              <option value="DAY_SCHOLAR">Day Scholar</option>
              <option value="CADET">Cadet</option>
            </select>
          </div>
          {studentType === "DAY_SCHOLAR" ? (
            <div>
              <label className={styles.label}>HOD (Day Scholar)</label>
              <select value={hodId} onChange={(e) => setHodId(e.target.value)} className={styles.input}>
                <option value="">Select HOD…</option>
                {hods.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.department} ({h.name})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className={styles.label}>Squadron (Cadet)</label>
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
          <label className={styles.label}>
            Troop Commander(s) — choose 1 or 2
          </label>
          <div className={styles.chkGroup}>
            {troops.length === 0 ? (
              <span className="text-xs text-[var(--muted)]">No Troop Commanders exist yet — create one first.</span>
            ) : (
              troops.map((t) => (
                <label key={t.id} className={styles.chkPill}>
                  <input type="checkbox" checked={troopIds.includes(t.id)} onChange={() => toggleTroop(t.id)} />
                  {t.name}
                </label>
              ))
            )}
          </div>
        </div>

        <div className="mb-4">
          <label className={styles.label}>
            Password {editingId ? "(leave blank to keep current)" : "(defaults to Department name — override if needed)"}
          </label>
          <div className="flex gap-2">
            <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className={styles.input} />
          </div>
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
                        {s.studentType === "CADET" ? "Cadet" : "Day Scholar"}
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
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setEditingId(null);
    setUsername("");
    setName("");
    setExtra("");
    setPassword("");
  }

  function startEdit(id: string) {
    const u = list.find((x) => x.id === id);
    if (!u) return;
    setEditingId(id);
    setUsername(u.username);
    setName(u.name);
    setExtra(u.department || u.title || u.post || "");
    setPassword("");
  }

  async function handleSubmit() {
    if (!username.trim() || !name.trim() || (extraLabel && !extra.trim())) {
      setError("Please fill in all fields.");
      return;
    }
    setError(null);
    try {
      if (editingId) {
        await portal.editStaff(role, editingId, {
          username: username.trim(),
          name: name.trim(),
          extra: extra.trim() || undefined,
          password: password.trim() || undefined,
        });
      } else {
        await portal.addStaff(role, {
          username: username.trim(),
          name: name.trim(),
          extra: extra.trim() || undefined,
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
    await portal.removeStaff(role, id);
  }

  return (
    <div>
      <Card className="mb-5 p-5">
        <h2 className="mb-4 text-sm font-bold text-[var(--white)]">
          {editingId ? `✏️ Edit ${title}` : `➕ Create ${title} Account`}
        </h2>
        <div className={`${extraLabel ? styles.formGrid3 : styles.formGrid2} mb-4`}>
          <div>
            <label className={styles.label}>Username</label>
            <input value={username} onChange={(e) => setUsername(e.target.value)} className={styles.input} />
          </div>
          <div>
            <label className={styles.label}>Full Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className={styles.input} />
          </div>
          {extraLabel && (
            <div>
              <label className={styles.label}>{extraLabel}</label>
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
          <label className={styles.label}>Password {editingId ? "(leave blank to keep current)" : "(leave blank to auto-generate)"}</label>
          <input value={password} onChange={(e) => setPassword(e.target.value)} className={styles.input} />
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
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td colSpan={extraLabel ? 4 : 3} className="py-6 text-center text-[var(--muted)]">
                    No accounts yet.
                  </td>
                </tr>
              ) : (
                list.map((u) => (
                  <tr key={u.id}>
                    <td>{u.username}</td>
                    <td>{u.name}</td>
                    {extraLabel && <td>{u.department || u.title || u.post || ""}</td>}
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
    setPassword("");
    setSelectedIntakes([]);
  }

  function startEdit(id: string) {
    const t = troops.find((x) => x.id === id);
    if (!t) return;
    setEditingId(id);
    setUsername(t.username);
    setName(t.name);
    setPassword("");
    setSelectedIntakes(t.intakes ?? []);
  }

  async function handleSubmit() {
    if (!username.trim() || !name.trim()) {
      setError("Please fill in username and name.");
      return;
    }
    if (!selectedIntakes.length) {
      setError("Assign at least one intake to this troop officer.");
      return;
    }
    setError(null);
    try {
      if (editingId) {
        await editTroop(editingId, {
          username: username.trim(),
          name: name.trim(),
          intakes: selectedIntakes,
          password: password.trim() || undefined,
        });
      } else {
        await addTroop({
          username: username.trim(),
          name: name.trim(),
          intakes: selectedIntakes,
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
    await removeTroop(id);
  }

  return (
    <div>
      <Card className="mb-5 p-5">
        <h2 className="mb-4 text-sm font-bold text-[var(--white)]">
          {editingId ? "✏️ Edit Troop Commander" : "➕ Create Troop Commander Account"}
        </h2>
        <div className={`${styles.formGrid3} mb-3.5`}>
          <div>
            <label className={styles.label}>Username</label>
            <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="e.g. troop4" className={styles.input} />
          </div>
          <div>
            <label className={styles.label}>Full Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Lt. Cmdr. Full Name" className={styles.input} />
          </div>
          <div>
            <label className={styles.label}>Password {editingId && "(leave blank to keep current)"}</label>
            <input value={password} onChange={(e) => setPassword(e.target.value)} className={styles.input} />
          </div>
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
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {troops.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-[var(--muted)]">
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
                        onClick={() => markNotificationRead(n.id)}
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

  const filtered = roleFilter ? audit.filter((a) => a.role === roleFilter) : audit;

  async function handleClear() {
    if (!confirm("Clear the entire audit log? This cannot be undone.")) return;
    await clearAuditLog();
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
