"use client";

import { useState } from "react";
import { Card } from "@/src/components/ui/Card";
import { Button } from "@/src/components/ui/Button";
import { Badge } from "@/src/components/ui/Badge";
import { useAdminPortal } from "@/src/hooks/useAdminPortal";
import { RefName, StudentType } from "@/src/types";
import styles from "../admin.module.css";

function refLabel(ref: string | RefName | undefined): string {
  if (!ref) return "";
  return typeof ref === "string" ? ref : ref.name;
}

export function Students({ portal }: { portal: ReturnType<typeof useAdminPortal> }) {
  const { students, intakes, troops, hods, squadrans, addStudent, removeStudent } = portal;

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

  function toggleTroop(id: string) {
    setTroopIds((prev) => {
      if (prev.includes(id)) return prev.filter((t) => t !== id);
      if (prev.length >= 2) return prev;
      return [...prev, id];
    });
  }

  function resetForm() {
    setIndexNumber("");
    setFirstName("");
    setLastName("");
    setDepartment("");
    setEmail("");
    setMobile("");
    setPassword("");
    setTroopIds([]);
  }

  async function handleCreate() {
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
    try {
      await addStudent({
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
      });
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create student");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this student account?")) return;
    await removeStudent(id);
  }

  return (
    <div>
      <Card className="mb-5 p-5">
        <h2 className="mb-4 text-sm font-bold text-white">➕ Create Student Account</h2>

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
            <input value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="e.g. IT" className={styles.input} />
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
          <label className={styles.label}>Password (defaults to Department name — override if needed)</label>
          <div className="flex gap-2">
            <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className={styles.input} />
          </div>
        </div>

        {error && <p className="mb-3 text-xs text-[#f87171]">{error}</p>}
        <Button variant="primary" onClick={handleCreate}>
          Create Student
        </Button>
      </Card>

      <Card className="p-5">
        <h2 className="mb-4 text-sm font-bold text-white">All Students</h2>
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
                    <td>
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
