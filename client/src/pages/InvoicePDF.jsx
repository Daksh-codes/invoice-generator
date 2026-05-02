// src/pages/InvoicePDF.jsx
// React-PDF invoice renderer. Keep this separate from the HTML/Tailwind preview.

import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import { imageUrl } from "../api";

export function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;

  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatAmount(value) {
  const amount = Number(value ?? 0);

  return amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function getImageSrc(path) {
  const src = imageUrl(path);
  if (!src) return null;
  if (/^(https?:|data:|blob:)/i.test(src)) return src;

  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}${src.startsWith("/") ? "" : "/"}${src}`;
  }

  return src;
}

function getDocumentLabel(docType) {
  return docType === "QUOTATION" ? "Quotation" : "Invoice";
}

function Header({ data, template }) {
  const {
    firm_name,
    sub_heading,
    logo,
    phone,
    email,
    gstin,
    is_gst_enabled,
    pan,
    firm_address,
    doc_type,
  } = data;
  const showLogo = template === "with_logo" && logo;
  const isPlain = template === "plain";

  if (isPlain) {
    return (
      <View style={[styles.header, styles.plainHeader]}>
        <Text style={styles.documentTitle}>{getDocumentLabel(doc_type)}</Text>
      </View>
    );
  }

  return (
    <View style={styles.header}>
      <View style={styles.headerMain}>
        {showLogo && <Image src={getImageSrc(logo)} style={styles.logo} />}
        <View style={styles.firmBlock}>
          <Text style={styles.firmName}>{firm_name}</Text>
          {sub_heading && <Text style={styles.subHeading}>{sub_heading}</Text>}
          {firm_address && <Text style={styles.muted}>{firm_address}</Text>}
          <View style={styles.inlineMeta}>
            {phone && <Text style={styles.muted}>Phone: {phone}</Text>}
            {email && <Text style={styles.muted}>Email: {email}</Text>}
          </View>
          <View style={styles.inlineMeta}>
            {is_gst_enabled === 1 && gstin && (
              <Text style={styles.muted}>GSTIN: {gstin}</Text>
            )}
            {pan && <Text style={styles.muted}>PAN: {pan}</Text>}
          </View>
        </View>
      </View>
      <Text style={styles.documentTitle}>{getDocumentLabel(doc_type)}</Text>
    </View>
  );
}

function BillMeta({ data }) {
  const {
    bill_number,
    bill_date,
    doc_type,
    client_name,
    client_address,
    payment_terms,
    due_date,
    client_gstin,
    is_gst_enabled,
  } = data;

  return (
    <View style={styles.billMeta}>
      <View style={styles.billTo}>
        <Text style={styles.sectionLabel}>Billed To</Text>
        <Text style={styles.clientName}>{client_name}</Text>
        {client_address && <Text style={styles.bodyText}>{client_address}</Text>}
        {client_gstin && is_gst_enabled === 1 && (
          <Text style={styles.bodyText}>GSTIN: {client_gstin}</Text>
        )}
      </View>

      <View style={styles.billNumbers}>
        <Text style={styles.sectionLabel}>
          {doc_type === "QUOTATION" ? "Quotation No." : "Invoice No."}
        </Text>
        <Text style={styles.billNumber}>{bill_number}</Text>
        <Text style={styles.bodyText}>{formatDate(bill_date)}</Text>
        {payment_terms && (
          <Text style={styles.smallText}>Terms: {payment_terms}</Text>
        )}
        {due_date && <Text style={styles.smallText}>Due: {formatDate(due_date)}</Text>}
      </View>
    </View>
  );
}

function TableCell({ children, style, textStyle, header = false }) {
  return (
    <View style={[styles.tableCell, style]}>
      <Text style={[header ? styles.tableHeaderText : styles.tableText, textStyle]}>
        {children}
      </Text>
    </View>
  );
}

function AmountRow({ label, value, plain, danger = false, strong = false }) {
  return (
    <View style={[styles.tableRow, strong && styles.totalRow]} wrap={false}>
      <TableCell
        style={[
          plain ? styles.plainSummaryLabel : styles.summaryLabel,
          strong && styles.totalCell,
        ]}
        textStyle={[danger && styles.dangerText, strong && styles.totalText]}
      >
        {label}
      </TableCell>
      <TableCell
        style={[
          plain ? styles.amountCol : styles.serviceAmountCol,
          strong && styles.totalCell,
        ]}
        textStyle={[danger && styles.dangerText, strong && styles.totalText]}
      >
        {value}
      </TableCell>
    </View>
  );
}

function ItemsTable({ data, plain }) {
  const {
    items = [],
    subtotal,
    discount,
    total,
    total_in_words,
    tax_total,
    cgst,
    sgst,
    igst,
    is_igst,
    is_gst_enabled,
    spacer_rows = 0,
  } = data;
  const showDiscount = Number(discount) > 0;
  const showTax = is_gst_enabled === 1 && Number(tax_total) > 0;
  const showSubtotal = showDiscount || showTax;

  return (
    <View style={styles.table}>
      <View style={[styles.tableRow, styles.tableHead]} fixed>
        {plain ? (
          <>
            <TableCell header style={styles.descriptionCol}>
              Description
            </TableCell>
            <TableCell header style={styles.amountCol}>
              Amount (INR)
            </TableCell>
          </>
        ) : (
          <>
            <TableCell header style={styles.serviceDescriptionCol}>
              Professional Fees for the services rendered as below:
            </TableCell>
            <TableCell header style={styles.serviceAmountCol}>
              Amount (INR)
            </TableCell>
          </>
        )}
      </View>

      {items.map((item, index) => (
        <View
          key={`${item.description}-${index}`}
          style={[styles.tableRow, index % 2 === 1 && styles.altRow]}
          wrap={false}
        >
          {plain ? (
            <>
              <TableCell style={styles.descriptionCol}>{item.description}</TableCell>
              <TableCell style={styles.amountCol}>
                {formatAmount(item.amount)}
              </TableCell>
            </>
          ) : (
            <>
              <TableCell style={styles.serviceDescriptionCol}>
                {item.description}
              </TableCell>
              <TableCell style={styles.serviceAmountCol}>
                {formatAmount(item.amount)}
              </TableCell>
            </>
          )}
        </View>
      ))}

      {Array.from({ length: spacer_rows }).map((_, index) => (
        <View key={`spacer-${index}`} style={styles.tableRow} wrap={false}>
          {plain ? (
            <>
              <TableCell style={styles.descriptionCol}> </TableCell>
              <TableCell style={styles.amountCol}> </TableCell>
            </>
          ) : (
            <>
              <TableCell style={styles.serviceDescriptionCol}> </TableCell>
              <TableCell style={styles.serviceAmountCol}> </TableCell>
            </>
          )}
        </View>
      ))}

      {showSubtotal && (
        <AmountRow label="Subtotal" value={formatAmount(subtotal)} plain={plain} />
      )}
      {showDiscount && (
        <AmountRow
          label="Discount"
          value={`- ${formatAmount(discount)}`}
          plain={plain}
          danger
        />
      )}
      {showTax && is_igst === 1 && (
        <AmountRow label="IGST" value={formatAmount(igst)} plain={plain} />
      )}
      {showTax && is_igst === 0 && (
        <>
          <AmountRow label="CGST" value={formatAmount(cgst)} plain={plain} />
          <AmountRow label="SGST" value={formatAmount(sgst)} plain={plain} />
        </>
      )}
      <AmountRow label="Total" value={formatAmount(total)} plain={plain} strong />

      {total_in_words && (
        <View style={styles.wordsRow} wrap={false}>
          <Text style={styles.wordsText}>
            <Text style={styles.bold}>In Words: </Text>
            {total_in_words}
          </Text>
        </View>
      )}
    </View>
  );
}

function Notes({ notes }) {
  if (!notes) return null;

  return (
    <View style={styles.notes} wrap={false}>
      <Text style={styles.bodyText}>
        <Text style={styles.bold}>Notes: </Text>
        {notes}
      </Text>
    </View>
  );
}

function BankDetails({ data }) {
  const rows = [
    ["Name", data.account_holder_name],
    ["Bank", data.bank_name],
    ["IFSC", data.ifsc_code],
    ["Branch", data.branch],
    ["Type", data.account_type],
    ["A/c No.", data.account_number],
  ].filter(([, value]) => value);

  if (!rows.length) return null;

  return (
    <View style={styles.bankTable}>
      <View style={styles.bankTitleRow}>
        <Text style={styles.bankTitle}>Bank Details (NEFT / RTGS)</Text>
      </View>
      {rows.map(([label, value]) => (
        <View key={label} style={styles.bankRow}>
          <Text style={styles.bankLabel}>{label}</Text>
          <Text style={styles.bankValue}>{value}</Text>
        </View>
      ))}
    </View>
  );
}

function Footer({ data, firmName }) {
  const qrSrc = getImageSrc(data.upi_qr);
  const hasBank = [
    data.account_holder_name,
    data.bank_name,
    data.ifsc_code,
    data.branch,
    data.account_type,
    data.account_number,
  ].some(Boolean);

  return (
    <View style={styles.footer} wrap={false}>
      {hasBank ? <BankDetails data={data} /> : <View style={styles.footerSpacer} />}

      <View style={styles.footerRight}>
        {qrSrc && (
          <View style={styles.qrBlock}>
            <Image src={qrSrc} style={styles.qrImage} />
            <Text style={styles.qrLabel}>Scan to Pay</Text>
          </View>
        )}

        <View style={styles.signatureBlock}>
          {firmName && <Text style={styles.signatureFirm}>For {firmName}</Text>}
          <View style={styles.signatureLine} />
          <Text style={styles.signatureText}>Authorised Signatory</Text>
        </View>
      </View>
    </View>
  );
}

export default function InvoicePDF({ data }) {
  if (!data) return null;

  const template = data.template ?? "with_logo";
  const plain = template === "plain";

  return (
    <Document title={`${getDocumentLabel(data.doc_type)} ${data.bill_number ?? ""}`}>
      <Page size="A4" style={styles.page}>
        <Header data={data} template={template} />
        <BillMeta data={data} />
        <ItemsTable data={data} plain={plain} />
        <Notes notes={data.notes} />
        <Footer data={data} firmName={plain ? null : data.firm_name} />
      </Page>
    </Document>
  );
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 34,
    paddingRight: 40,
    paddingBottom: 34,
    paddingLeft: 40,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#334155",
    backgroundColor: "#ffffff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingBottom: 14,
    borderBottomWidth: 2,
    borderBottomColor: "#1e293b",
  },
  plainHeader: {
    justifyContent: "center",
    alignItems: "center",
  },
  headerMain: {
    flexDirection: "row",
    alignItems: "center",
    flexGrow: 1,
    flexBasis: 0,
    paddingRight: 18,
  },
  logo: {
    width: 54,
    height: 54,
    objectFit: "contain",
    marginRight: 14,
  },
  firmBlock: {
    flexGrow: 1,
    flexBasis: 0,
  },
  firmName: {
    fontSize: 20,
    lineHeight: 1.2,
    color: "#1e293b",
    fontFamily: "Helvetica-Bold",
  },
  subHeading: {
    marginTop: 3,
    color: "#64748b",
    fontFamily: "Helvetica-Bold",
  },
  muted: {
    marginTop: 3,
    color: "#64748b",
    fontSize: 9,
  },
  inlineMeta: {
    flexDirection: "row",
    gap: 12,
    flexWrap: "wrap",
  },
  documentTitle: {
    fontSize: 20,
    color: "#334155",
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  billMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 16,
    paddingBottom: 16,
  },
  billTo: {
    width: "60%",
    paddingRight: 24,
  },
  billNumbers: {
    width: "40%",
    alignItems: "flex-end",
  },
  sectionLabel: {
    marginBottom: 4,
    color: "#94a3b8",
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  clientName: {
    marginBottom: 3,
    color: "#1e293b",
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
  },
  billNumber: {
    marginBottom: 3,
    color: "#1e293b",
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
  },
  bodyText: {
    color: "#475569",
    fontSize: 9,
    lineHeight: 1.35,
  },
  smallText: {
    marginTop: 3,
    color: "#64748b",
    fontSize: 8,
  },
  table: {
    marginTop: 12,
    borderLeftWidth: 1,
    borderLeftColor: "#cbd5e1",
    borderTopWidth: 1,
    borderTopColor: "#cbd5e1",
  },
  tableRow: {
    flexDirection: "row",
    minHeight: 24,
  },
  tableHead: {
    backgroundColor: "#ffffff", 
  },
  tableCell: {
    justifyContent: "center",
    paddingVertical: 6,
    paddingHorizontal: 7,
    borderRightWidth: 1,
    borderRightColor: "#cbd5e1",
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
  },
  tableHeaderText: {
    color: "#000000", 
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
  },
  tableText: {
    color: "#334155",
    fontSize: 9,
    lineHeight: 1.35,
  },
  altRow: {
    backgroundColor: "#f8fafc",
  },
  descriptionCol: {
    width: "82%", // Expanded to take up the space previously used by Qty and Rate
  },
  amountCol: {
    width: "18%",
    alignItems: "flex-end",
  },
  serviceDescriptionCol: {
    width: "78%",
  },
  serviceAmountCol: {
    width: "22%",
    alignItems: "flex-end",
  },
  summaryLabel: {
    width: "78%",
    alignItems: "flex-end",
    backgroundColor: "#ffffff",
  },
  plainSummaryLabel: {
    width: "82%",
    alignItems: "flex-end",
    backgroundColor: "#ffffff",
  },
  dangerText: {
    color: "#dc2626",
  },
  totalRow: {
    backgroundColor: "#ffffff", 
  },
  totalCell: {
    backgroundColor: "#ffffff", 
  },
  totalText: {
    color: "#000000", 
    fontFamily: "Helvetica-Bold",
  },
  wordsRow: {
    paddingVertical: 7,
    paddingHorizontal: 7,
    borderRightWidth: 1,
    borderRightColor: "#cbd5e1",
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
  },
  wordsText: {
    color: "#334155",
    fontSize: 9,
    lineHeight: 1.35,
  },
  bold: {
    fontFamily: "Helvetica-Bold",
  },
  notes: {
    marginTop: 10,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: "auto", 
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#cbd5e1",
  },
  bankTable: {
    width: 255,
    borderTopWidth: 1,
    borderTopColor: "#cbd5e1",
    borderLeftWidth: 1,
    borderLeftColor: "#cbd5e1",
  },
  bankTitleRow: {
    paddingVertical: 5,
    backgroundColor: "#f1f5f9",
    borderRightWidth: 1,
    borderRightColor: "#cbd5e1",
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
  },
  bankTitle: {
    color: "#334155",
    textAlign: "center",
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
  },
  bankRow: {
    flexDirection: "row",
    minHeight: 18,
  },
  bankLabel: {
    width: 58,
    paddingVertical: 4,
    paddingHorizontal: 6,
    color: "#64748b",
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    borderRightWidth: 1,
    borderRightColor: "#cbd5e1",
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
  },
  bankValue: {
    flexGrow: 1,
    paddingVertical: 4,
    paddingHorizontal: 6,
    color: "#334155",
    fontSize: 8,
    borderRightWidth: 1,
    borderRightColor: "#cbd5e1",
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
  },
  footerRight: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 28,
  },
  footerSpacer: {
    flexGrow: 1,
  },
  qrBlock: {
    alignItems: "center",
  },
  qrImage: {
    width: 74,
    height: 74,
    objectFit: "contain",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  qrLabel: {
    marginTop: 4,
    color: "#94a3b8",
    fontSize: 8,
  },
  signatureBlock: {
    width: 132,
    alignItems: "center",
  },
  signatureFirm: {
    marginBottom: 54,
    color: "#475569",
    fontSize: 9,
  },
  signatureLine: {
    width: 120,
    borderTopWidth: 1,
    borderTopColor: "#64748b",
  },
  signatureText: {
    marginTop: 4,
    color: "#94a3b8",
    fontSize: 8,
  },
});