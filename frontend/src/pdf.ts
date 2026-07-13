// Official leave-pass PDF, ported from student.html's jsPDF layout.
import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import { LeaveRequest } from "@/src/types";

const NAVY: [number, number, number] = [13, 27, 94];
const ORANGE: [number, number, number] = [224, 123, 32];
const MUTED: [number, number, number] = [100, 116, 139];
const DARK: [number, number, number] = [30, 41, 59];
const LIGHT: [number, number, number] = [245, 247, 250];
const BORDER: [number, number, number] = [226, 232, 240];

interface PillColor {
  bg: [number, number, number];
  text: [number, number, number];
  border: [number, number, number];
}

function pillColor(status: string): PillColor {
  if (status === "Approved") return { bg: [220, 252, 231], text: [21, 128, 61], border: [34, 197, 94] };
  if (status === "Rejected") return { bg: [254, 226, 226], text: [185, 28, 28], border: [239, 68, 68] };
  return { bg: [254, 243, 199], text: [161, 98, 7], border: [245, 158, 11] };
}

function loadImageAsDataURL(src: string): Promise<string | null> {
  return new Promise((resolve) => {
    let done = false;
    const finish = (v: string | null) => {
      if (done) return;
      done = true;
      resolve(v);
    };
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0);
        finish(canvas.toDataURL("image/png"));
      } catch {
        finish(null);
      }
    };
    img.onerror = () => finish(null);
    img.src = src;
    setTimeout(() => finish(null), 2000);
  });
}

export interface PassVerification {
  exit?: { by: string; at: string } | null;
  entry?: { by: string; at: string } | null;
}

function checkBadge(doc: jsPDF, cx: number, cy: number, r: number) {
  doc.setFillColor(34, 197, 94);
  doc.circle(cx, cy, r, "F");
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.6);
  doc.line(cx - r * 0.5, cy, cx - r * 0.1, cy + r * 0.4);
  doc.line(cx - r * 0.1, cy + r * 0.4, cx + r * 0.55, cy - r * 0.35);
}

export async function downloadLeavePassPdf(
  leave: LeaveRequest,
  photoData?: string | null,
  verification?: PassVerification
) {
  const isCadet = leave.studentType === "CADET";
  // Run independently — previously sequential, so a slow/failed logo load
  // (up to a 2s fallback timeout) delayed the QR code from even starting.
  const [crestData, qrData] = await Promise.all([
    loadImageAsDataURL("/KDU-LOGO-ORIGINAL-5x4-inch-copy.png"),
    leave.verifyCode
      ? QRCode.toDataURL(leave.verifyCode, { margin: 0, width: 200 }).catch(() => null)
      : Promise.resolve(null),
  ]);

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = 210;
  const pageH = 297;

  doc.setDrawColor(...NAVY);
  doc.setLineWidth(1);
  doc.rect(6, 6, pageW - 12, pageH - 12);
  doc.setDrawColor(...ORANGE);
  doc.setLineWidth(0.4);
  doc.rect(8, 8, pageW - 16, pageH - 16);

  doc.setFillColor(...NAVY);
  doc.rect(6, 6, pageW - 12, 40, "F");
  doc.setFillColor(...ORANGE);
  doc.rect(6, 46, pageW - 12, 1.6, "F");

  if (crestData) {
    try {
      doc.addImage(crestData, "PNG", 13, 10, 24, 24);
    } catch {
      /* ignore */
    }
  } else {
    doc.setFillColor(255, 255, 255);
    doc.circle(25, 22, 12, "F");
    doc.setTextColor(...NAVY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("KDU", 25, 24, { align: "center" });
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12.5);
  doc.text("GENERAL SIR JOHN KOTELAWALA DEFENCE UNIVERSITY", 43, 16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.text("SOUTHERN CAMPUS", 43, 22);
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.2);
  doc.line(43, 25, 163, 25);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(245, 196, 90);
  doc.text(`${leave.type.toUpperCase()}  /  OFFICIAL PASS`, 43, 34);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(210, 220, 245);
  doc.text("Online Leave Management System (OLMS)", 43, 40);

  const boxX = 170,
    boxY = 9,
    boxW = 28,
    boxH = 34;
  doc.setFillColor(255, 255, 255);
  doc.rect(boxX, boxY, boxW, boxH, "F");
  doc.setDrawColor(...ORANGE);
  doc.setLineWidth(0.6);
  doc.rect(boxX, boxY, boxW, boxH);
  if (photoData) {
    try {
      doc.addImage(photoData, "JPEG", boxX + 1.2, boxY + 1.2, boxW - 2.4, boxW - 2.4);
    } catch {
      /* ignore */
    }
  } else {
    doc.setFillColor(...LIGHT);
    doc.rect(boxX + 1.2, boxY + 1.2, boxW - 2.4, boxW - 2.4, "F");
    doc.setTextColor(...MUTED);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.text("NO PHOTO", boxX + boxW / 2, boxY + (boxW - 2.4) / 2 + 2, { align: "center" });
  }
  doc.setTextColor(...MUTED);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6);
  doc.text("STUDENT PHOTO", boxX + boxW / 2, boxY + boxH - 2, { align: "center" });

  doc.setFillColor(...LIGHT);
  doc.rect(6, 49.6, pageW - 12, 9, "F");
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.2);
  doc.rect(6, 49.6, pageW - 12, 9);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...NAVY);
  doc.text(`REF: LV-${leave.id}`, 10, 55.3);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(`Issued: ${new Date().toLocaleString()}`, 200, 55.3, { align: "right" });
  if (leave.priority === "emergency") {
    const pw = 32;
    doc.setFillColor(254, 226, 226);
    doc.setDrawColor(239, 68, 68);
    doc.setLineWidth(0.3);
    doc.roundedRect(105 - pw / 2, 51.1, pw, 6, 1.2, 1.2, "FD");
    doc.setTextColor(185, 28, 28);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text("EMERGENCY LEAVE", 105, 55.1, { align: "center" });
  }

  if (leave.verifyCode) {
    const vY = 60.2;
    const boxH = qrData ? 20 : 9.5;
    doc.setFillColor(255, 247, 230);
    doc.setDrawColor(...ORANGE);
    doc.setLineWidth(0.5);
    doc.roundedRect(6, vY, pageW - 12, boxH, 1.5, 1.5, "FD");

    if (qrData) {
      try {
        doc.addImage(qrData, "PNG", 10, vY + 2, 16, 16);
      } catch {
        /* ignore */
      }
    }
    const textX = qrData ? 30 : 12;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...NAVY);
    doc.text("GATE VERIFICATION CODE", textX, vY + 5);
    doc.setFontSize(13);
    doc.setTextColor(...ORANGE);
    doc.text(leave.verifyCode, textX, vY + 10.5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.6);
    doc.setTextColor(...MUTED);
    doc.text(
      doc.splitTextToSize(
        qrData
          ? "Gate staff: scan this QR with the OLMS Gate portal's camera scanner, or type the code above, to view the student's photo on file and confirm identity. Do not allow exit/entry without a photo match."
          : "Gate staff: enter this code in the OLMS Gate portal to view the student's photo on file and confirm identity. Do not allow exit/entry on this pass without a photo match.",
        pageW - 12 - (textX - 6) - 4
      ),
      textX,
      vY + 14.5
    );
  }

  let y = leave.verifyCode ? (qrData ? 84 : 73) : 66;
  function sectionHeader(title: string, color: [number, number, number]) {
    doc.setFillColor(...color);
    doc.rect(6, y, pageW - 12, 7, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(title, 10, y + 4.8);
    y += 7 + 7;
  }
  function fieldRow(x: number, label: string, value?: string) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(label.toUpperCase(), x, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.setTextColor(...DARK);
    doc.text(String(value || "—"), x, y + 5.2);
  }

  sectionHeader("STUDENT INFORMATION", NAVY);
  fieldRow(10, "Student Name", leave.studentName);
  fieldRow(110, "Index Number", leave.indexNumber);
  y += 12;
  fieldRow(10, "Department", leave.department);
  fieldRow(110, "Student Type", isCadet ? "Cadet" : "Day Scholar");
  y += 14;

  sectionHeader("LEAVE DETAILS", ORANGE);
  fieldRow(10, "Leave Type", leave.type);
  fieldRow(110, "Applied On", leave.appliedDate);
  y += 12;
  fieldRow(10, "From (Exit)", `${leave.startDate}  ${leave.startTime}`);
  fieldRow(110, "To (Entry)", `${leave.endDate}  ${leave.endTime}`);
  y += 12;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.text("REASON", 10, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...DARK);
  const reasonLines = doc.splitTextToSize(String(leave.reason || "—"), 190);
  doc.text(reasonLines, 10, y + 5.2);
  y += 5.2 + reasonLines.length * 4.6 + 8;

  sectionHeader("APPROVAL RECORD", NAVY);
  // Cadet Academic Leave routes HOD -> Squadron Commander only (no Troop
  // Commander, no SDD) — identified by troopStatus permanently "N/A", same
  // marker used everywhere else in the app for this special routing.
  const isCadetAcademicOnly = isCadet && leave.troopStatus === "N/A";
  const rows = isCadetAcademicOnly
    ? [
        ["Head of Department", leave.hodStatus, leave.hodApprovedAt],
        ["Squadron Commander", leave.sqnStatus, leave.sqnApprovedAt],
      ]
    : isCadet
    ? [
        ["Troop Commander", leave.troopStatus, leave.troopApprovedAt],
        ["Squadron Commander", leave.sqnStatus, leave.sqnApprovedAt],
        ["Senior Deputy Dean", leave.sddStatus, leave.sddApprovedAt],
      ]
    : [
        ["Head of Department", leave.hodStatus, leave.hodApprovedAt],
        ["Troop Commander", leave.troopStatus, leave.troopApprovedAt],
      ];
  const tblX = 10,
    tblW = 190,
    col1 = 80,
    col2 = 45;
  doc.setFillColor(...NAVY);
  doc.rect(tblX, y, tblW, 7, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("APPROVAL STAGE", tblX + 3, y + 4.8);
  doc.text("STATUS", tblX + col1 + 3, y + 4.8);
  doc.text("DATE / TIME", tblX + col1 + col2 + 3, y + 4.8);
  y += 7;
  rows.forEach((r, i) => {
    const rh = 8.5;
    doc.setFillColor(...(i % 2 === 0 ? ([255, 255, 255] as [number, number, number]) : LIGHT));
    doc.rect(tblX, y, tblW, rh, "F");
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.15);
    doc.rect(tblX, y, tblW, rh);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...DARK);
    doc.text(r[0] as string, tblX + 3, y + 5.6);
    const pc = pillColor((r[1] as string) || "Pending");
    const pillW = 26;
    doc.setFillColor(...pc.bg);
    doc.setDrawColor(...pc.border);
    doc.setLineWidth(0.25);
    doc.roundedRect(tblX + col1 + 3, y + 1.6, pillW, 5.4, 1.2, 1.2, "FD");
    doc.setTextColor(...pc.text);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text(((r[1] as string) || "Pending").toUpperCase(), tblX + col1 + 3 + pillW / 2, y + 5.2, {
      align: "center",
    });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text((r[2] as string) || "—", tblX + col1 + col2 + 3, y + 5.6);
    y += rh;
  });
  y += 10;

  // Digital signature panels are pulled live from the Movement log and only
  // appear once Exit has actually been verified at the gate — before that,
  // this whole section is blank (no placeholder/instructional text), since
  // there is nothing genuine to show yet. The pass a student re-downloads
  // after Exit is the one they present at the gate again for Re-Entry, and
  // downloading once more afterward adds the Entry signature too.
  const hasExit = !!verification?.exit;
  const hasEntry = !!verification?.entry;

  if (hasExit) {
    const panelY = y;
    const panelW = 90;
    const panelH = 32;
    const leftX = 10;
    const rightX = 110;
    const sigLineY = panelY + panelH - 4.5;
    const sigLabelY = panelY + panelH - 1.4;

    doc.setFillColor(220, 252, 231);
    doc.setDrawColor(34, 197, 94);
    doc.setLineWidth(0.4);
    doc.roundedRect(leftX, panelY, panelW, panelH, 2, 2, "FD");
    checkBadge(doc, leftX + 6, panelY + 6, 3);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(21, 128, 61);
    doc.text("STUDENT DIGITAL APPROVAL", leftX + 11, panelY + 7.3);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.3);
    doc.setTextColor(...DARK);
    doc.text(`Certified by: ${leave.studentName}`, leftX + 4, panelY + 12.5);
    doc.setFontSize(6.8);
    doc.setTextColor(...MUTED);
    doc.text(`${leave.indexNumber}  |  Downloaded ${new Date().toLocaleString()}`, leftX + 4, panelY + 16.5);
    doc.setDrawColor(...MUTED);
    doc.setLineWidth(0.2);
    doc.line(leftX + 4, sigLineY, leftX + panelW - 4, sigLineY);
    doc.setFontSize(6.2);
    doc.text("Physical signature (if additionally required)", leftX + panelW / 2, sigLabelY, { align: "center" });

    doc.setFillColor(220, 252, 231);
    doc.setDrawColor(34, 197, 94);
    doc.setLineWidth(0.4);
    doc.roundedRect(rightX, panelY, panelW, panelH, 2, 2, "FD");
    checkBadge(doc, rightX + 6, panelY + 6, 3);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(21, 128, 61);
    doc.text("GATE DIGITALLY VERIFIED", rightX + 11, panelY + 7.3);
    let ly = panelY + 12.5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.8);
    doc.setTextColor(...DARK);
    doc.text(`Exit verified by: ${verification!.exit!.by}`, rightX + 4, ly);
    doc.setFontSize(6.2);
    doc.setTextColor(...MUTED);
    doc.text(new Date(verification!.exit!.at).toLocaleString(), rightX + 4, ly + 3.6);
    ly += 8;
    if (hasEntry) {
      doc.setFontSize(6.8);
      doc.setTextColor(...DARK);
      doc.text(`Entry verified by: ${verification!.entry!.by}`, rightX + 4, ly);
      doc.setFontSize(6.2);
      doc.setTextColor(...MUTED);
      doc.text(new Date(verification!.entry!.at).toLocaleString(), rightX + 4, ly + 3.6);
    } else {
      doc.setFontSize(6.5);
      doc.setTextColor(...MUTED);
      doc.text("Re-entry verification pending at the gate.", rightX + 4, ly);
    }
    doc.setDrawColor(...MUTED);
    doc.setLineWidth(0.2);
    doc.line(rightX + 4, sigLineY, rightX + panelW - 4, sigLineY);
    doc.setFontSize(6);
    doc.setTextColor(...MUTED);
    doc.text("Re-download after each gate scan to refresh this record", rightX + panelW / 2, sigLabelY, {
      align: "center",
    });

    y += panelH + 8;
  }

  try {
    doc.saveGraphicsState();
    doc.setGState(new (doc as unknown as { GState: new (opts: object) => unknown }).GState({ opacity: 0.08 }) as never);
    doc.setTextColor(34, 197, 94);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(58);
    doc.text("APPROVED", 105, 180, { align: "center", angle: 32 });
    doc.restoreGraphicsState();
  } catch {
    /* ignore */
  }

  const footY = pageH - 24;
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.2);
  doc.line(10, footY, 200, footY);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  const note =
    "This is a computer-generated official document issued via the Online Leave Management System (OLMS), KDU Southern Campus. It must be presented to Gate Staff for verification before exit and upon re-entry, and is valid strictly within the stated leave period.";
  doc.text(doc.splitTextToSize(note, 190), 10, footY + 5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(
    `Generated ${new Date().toLocaleString()}   |   Ref: LV-${leave.id}   |   OLMS © KDU Southern Campus`,
    105,
    pageH - 9,
    { align: "center" }
  );

  doc.save(`LeavePass_${leave.indexNumber}_${leave.startDate}.pdf`);
}
