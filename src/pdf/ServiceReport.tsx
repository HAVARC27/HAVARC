import { Check } from "lucide-react";
import type { StatusColor } from "../components/StatusBanner";
import {
  CONDITION_ITEMS,
  FINDINGS_ITEMS,
  READINGS_GROUPS,
  RECOMMENDATION_ITEMS,
  REPAIRS_ITEMS,
  SERVICE_TYPE_ITEMS,
} from "./checklists";
import type { PdfDoc, PdfGroup } from "./layout";
import {
  PdfChecklist,
  PdfHeroBig,
  PdfSection,
  PdfThankYou,
  PdfUnitCard,
} from "./primitives";
import type { PdfSignature, ReportData } from "./types";

/** Figma: PDF · Service Report · Page 1–4 (233:100, 233:582, 233:223, 233:487).
 *  Returns the document as groups of blocks, one group per designed page; `PdfDocument`
 *  lays them out and adds continuation sheets when a group does not fit (several units,
 *  long notes, many photos). The photos group is omitted when the job has no photos; the
 *  READINGS block renders only when at least one reading was entered (client decision:
 *  readings optional). */

const statusBg: Record<StatusColor, string> = {
  green: "bg-status-green border-status-green-line",
  yellow: "bg-status-yellow border-status-yellow-line",
  orange: "bg-status-orange border-status-orange-line",
  red: "bg-status-red border-status-red-line",
};

// Plain render helpers (not components) so this file stays a non-component module for fast refresh.
const statusBand = (status: NonNullable<ReportData["status"]>) => (
  <div
    className={`relative flex h-[72px] w-full flex-col justify-center rounded-sm border-[length:var(--stroke-regular)] px-md py-xs ${statusBg[status.color]}`}
  >
    <p className="text-status text-inverse">{status.label.toUpperCase()}</p>
    <div className="flex w-full items-start justify-between gap-md text-status-sm text-inverse opacity-80">
      <p>{status.description}</p>
      <p>Final System Status</p>
    </div>
    <Check
      size={18}
      strokeWidth={2}
      className="absolute right-[8.5px] top-[8.5px] text-inverse"
    />
  </div>
);

const signature = (label: string, sig: PdfSignature | null) => (
  <div className="flex min-w-0 flex-1 flex-col gap-2xs">
    <div
      className={`relative h-[50px] w-full overflow-hidden rounded-2xs ${sig?.image ? "" : "border-b border-line-strong"}`}
    >
      {sig?.image && (
        <img
          src={sig.image}
          alt=""
          className="absolute left-0 top-1/2 h-[40px] w-[128px] -translate-y-1/2 object-contain object-left"
        />
      )}
    </div>
    <p className="text-pdf-small text-icon">{label}</p>
    <p className="text-pdf-body text-ink">
      {sig ? `${sig.name} · ${sig.signedAt}` : "—"}
    </p>
  </div>
);

export function serviceReportDoc(r: ReportData): PdfDoc {
  const hasReadings =
    !!r.readings && Object.values(r.readings).some((v) => v.trim() !== "");
  const conditionChecked = CONDITION_ITEMS.flatMap(({ key, good, issue }) =>
    r.conditions[key] === "good"
      ? [good]
      : r.conditions[key] === "issue"
        ? [issue]
        : [],
  );

  const unitRows = (u: ReportData["equipment"][number]): [string, string][] => [
    ["Type / Mfr", [u.type, u.manufacturer].filter(Boolean).join(" · ")],
    ["Model / Serial", [u.model, u.serial].filter(Boolean).join(" · ")],
    ["Tonnage / Refrig.", [u.tonnage, u.refrigerant].filter(Boolean).join(" · ")],
    ["Voltage / Filter", [u.voltage, u.filterSize].filter(Boolean).join(" · ")],
  ];
  // Unit fields sit in two columns so two or three units share page 2 with the readings.
  // A value of this length would wrap to three lines in a half-width column and make the
  // card taller than the one-column form, so such a report keeps full-width rows.
  const compactUnits = r.equipment.every((u) =>
    unitRows(u).every(([, value]) => value.length <= 44),
  );

  const page1: PdfGroup = {
    bodyClassName: "pb-3xl pt-md",
    blocks: [
      ...(r.status ? [{ key: "status", node: statusBand(r.status) }] : []),
      {
        key: "service-type",
        node: (
          <PdfSection title="SERVICE TYPE">
            <PdfChecklist items={SERVICE_TYPE_ITEMS} checked={r.serviceType} />
          </PdfSection>
        ),
      },
      {
        key: "complaint",
        // At least the designed 150px; longer text grows the row instead of being cut.
        node: (
          <div className="flex min-h-[150px] w-full items-stretch gap-md">
            <PdfSection title="CUSTOMER COMPLAINT" className="flex-1">
              <p className="text-pdf-body text-ink">
                {r.complaintDetails || "—"}
              </p>
            </PdfSection>
            <PdfSection title="CUSTOMER NOTES" className="flex-1">
              <p className="text-pdf-body text-ink">{r.customerNotes || "—"}</p>
            </PdfSection>
          </div>
        ),
      },
    ],
  };

  const page2: PdfGroup = {
    bodyClassName: "py-md",
    blocks: [
      {
        key: "notes",
        node: (
          <div className="flex w-full items-stretch gap-md">
            <PdfSection title="TECHNICIAN NOTES" className="flex-1">
              <p className="text-pdf-body text-ink">{r.serviceNotes || "—"}</p>
              {r.parts && (
                <p className="text-pdf-body text-icon">Parts: {r.parts}</p>
              )}
            </PdfSection>
            <PdfSection title="RECOMMENDATIONS" className="flex-1">
              <PdfChecklist
                items={RECOMMENDATION_ITEMS}
                checked={r.recommendations}
              />
              {r.recommendedWork && (
                <p className="text-pdf-body text-ink">{r.recommendedWork}</p>
              )}
            </PdfSection>
          </div>
        ),
      },
      {
        key: "equipment",
        items: r.equipment.map((u, i) => (
          <PdfUnitCard
            key={i}
            title={["UNIT " + (i + 1), u.unitId, u.location]
              .filter(Boolean)
              .join(" · ")}
            columns={compactUnits ? 2 : 1}
            labelWidth={compactUnits ? [90, 76] : 110}
            rows={unitRows(u)}
          />
        )),
        wrap: (items, continued) => (
          <PdfSection title={continued ? "EQUIPMENT (CONTINUED)" : "EQUIPMENT"}>
            {items}
          </PdfSection>
        ),
      },
      ...(hasReadings && r.readings
        ? [
            {
              key: "readings",
              node: (
                <PdfSection title="READINGS">
                  <div className="flex w-full items-start gap-sm">
                    {READINGS_GROUPS.map((group) => (
                      <div
                        key={group.title}
                        className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xs border border-line"
                      >
                        <div className="bg-brand px-sm py-2xs">
                          <p className="text-pdf-table whitespace-nowrap text-inverse">
                            {group.title}
                          </p>
                        </div>
                        {group.rows.map((row) => (
                          <div
                            key={row.key}
                            className="flex items-start gap-xs border-t border-line px-sm py-[3px] text-pdf-body text-ink"
                          >
                            <p className="min-w-0 flex-1">{row.label}</p>
                            <p className="shrink-0 text-right">
                              {r.readings?.[row.key] || "—"}
                            </p>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </PdfSection>
              ),
            },
          ]
        : []),
    ],
  };

  const page3: PdfGroup = {
    bodyClassName: "py-lg",
    blocks: [
      {
        key: "checks",
        node: (
          <div className="flex w-full items-stretch gap-md">
            <PdfSection title="CONDITION CHECKS" className="flex-1">
              <PdfChecklist
                items={CONDITION_ITEMS.flatMap(({ good, issue }) => [
                  good,
                  issue,
                ])}
                checked={conditionChecked}
                columns={1}
              />
            </PdfSection>
            <PdfSection title="FINDINGS" className="flex-1">
              <PdfChecklist
                items={FINDINGS_ITEMS}
                checked={r.findings}
                columns={1}
              />
            </PdfSection>
            <PdfSection title="REPAIRS PERFORMED" className="flex-1">
              <PdfChecklist
                items={REPAIRS_ITEMS}
                checked={r.repairs}
                columns={1}
              />
            </PdfSection>
          </div>
        ),
      },
      {
        key: "signatures",
        pinBottom: true,
        node: (
          <PdfSection title="SIGNATURES" bodyClassName="gap-lg">
            <div className="flex w-full items-start gap-md">
              {signature("CUSTOMER SIGNATURE", r.customerSignature)}
              {signature("TECHNICIAN SIGNATURE", r.technicianSignature)}
            </div>
            <PdfThankYou />
          </PdfSection>
        ),
      },
    ],
  };

  const photos: PdfGroup | null =
    r.photos.length > 0
      ? {
          bodyClassName: "py-lg",
          blocks: [
            {
              key: "photos",
              items: r.photos.map((photo, i) => (
                <div key={i} className="flex min-w-0 flex-col gap-[3px]">
                  <div className="h-[160px] w-full overflow-hidden rounded-2xs border border-line">
                    <img
                      src={photo.src}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <p className="text-pdf-small text-icon">
                    {i + 1}. {photo.caption ?? "Photo"}
                  </p>
                </div>
              )),
              wrap: (items, continued) => (
                <PdfSection
                  title={`PHOTOS · ${r.photos.length}${continued ? " (CONTINUED)" : ""}`}
                >
                  <div className="grid w-full grid-cols-2 gap-sm">{items}</div>
                </PdfSection>
              ),
            },
          ],
        }
      : null;

  return {
    hero: (
      <PdfHeroBig
        title={`SERVICE REPORT #${r.workOrder}`}
        rows={[
          ["CUSTOMER", r.customer],
          ["ADDRESS", r.addressLines],
          ["DATE", r.date],
          ["PHONE", r.phone ?? "—"],
          ["WORK ORDER", r.workOrder],
        ]}
      />
    ),
    pill: `Service Report · ${r.workOrder} · ${r.customer} · ${r.date}`,
    groups: [page1, page2, page3, ...(photos ? [photos] : [])],
  };
}
