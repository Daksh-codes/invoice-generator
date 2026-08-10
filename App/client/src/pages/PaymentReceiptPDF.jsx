import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import { imageUrl } from "../api";
import { formatAmount, formatDate } from "./InvoicePDF";

function getImageSrc(path) {
  const src = imageUrl(path);
  if (!src) return null;
  if (/^(https?:|data:|blob:)/i.test(src)) return src;

  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}${src.startsWith("/") ? "" : "/"}${src}`;
  }

  return src;
}

function DetailRow({ label, value, strong = false }) {
  if (!value && value !== 0) return null;

  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, strong && styles.strong]}>{value}</Text>
    </View>
  );
}

export default function PaymentReceiptPDF({ data }) {
  if (!data) return null;

  const paidAmount = Number(data.paid_amount ?? 0);
  const total = Number(data.total ?? 0);
  const balance = Math.max(total - paidAmount, 0);
  const logoSrc = getImageSrc(data.logo);
  const receiptNumber = `RCPT-${data.bill_number ?? data.id ?? ""}`;

  return (
    <Document title={`Payment Receipt ${data.bill_number ?? ""}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.headerMain}>
            {logoSrc && <Image src={logoSrc} style={styles.logo} />}
            <View style={styles.firmBlock}>
              <Text style={styles.firmName}>{data.firm_name}</Text>
              {data.sub_heading && (
                <Text style={styles.subHeading}>{data.sub_heading}</Text>
              )}
              {data.firm_address && (
                <Text style={styles.muted}>{data.firm_address}</Text>
              )}
              {data.phone && <Text style={styles.muted}>Phone: {data.phone}</Text>}
              {data.email && <Text style={styles.muted}>Email: {data.email}</Text>}
              {data.gstin && data.is_gst_enabled === 1 && (
                <Text style={styles.muted}>GSTIN: {data.gstin}</Text>
              )}
            </View>
          </View>
          <View style={styles.titleBlock}>
            <Text style={styles.title}>Payment Receipt</Text>
            <Text style={styles.receiptNo}>{receiptNumber}</Text>
          </View>
        </View>

        <View style={styles.ackBox}>
          <Text style={styles.ackTitle}>Payment Acknowledgement</Text>
          <Text style={styles.ackText}>
            Received with thanks from {data.client_name ?? "the client"} an amount
            of INR {formatAmount(paidAmount)} against invoice {data.bill_number}.
          </Text>
        </View>

        <View style={styles.columns}>
          <View style={styles.panel}>
            <Text style={styles.sectionTitle}>Received From</Text>
            <Text style={styles.clientName}>{data.client_name}</Text>
            {data.client_address && (
              <Text style={styles.bodyText}>{data.client_address}</Text>
            )}
            {data.client_gstin && data.is_gst_enabled === 1 && (
              <Text style={styles.bodyText}>GSTIN: {data.client_gstin}</Text>
            )}
          </View>

          <View style={styles.panel}>
            <Text style={styles.sectionTitle}>Payment Details</Text>
            <DetailRow label="Receipt No." value={receiptNumber} />
            <DetailRow label="Invoice No." value={data.bill_number} />
            <DetailRow label="Invoice Date" value={formatDate(data.bill_date)} />
            <DetailRow label="Payment Date" value={formatDate(data.paid_date)} />
          </View>
        </View>

        <View style={styles.amountTable}>
          <DetailRow
            label="Invoice Amount"
            value={`INR ${formatAmount(total)}`}
          />
          <DetailRow
            label="Amount Received"
            value={`INR ${formatAmount(paidAmount)}`}
            strong
          />
          <DetailRow
            label="Balance Amount"
            value={`INR ${formatAmount(balance)}`}
          />
        </View>

        <View style={styles.statusBox}>
          <Text style={styles.statusText}>
            Status: {balance > 0 ? "Part payment received" : "Paid in full"}
          </Text>
        </View>

        <View style={styles.footer}>
          <View>
            <Text style={styles.smallText}>
              This is a computer generated receipt for payment acknowledgement.
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingRight: 42,
    paddingBottom: 40,
    paddingLeft: 42,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#334155",
    backgroundColor: "#ffffff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: "#1e293b",
  },
  headerMain: {
    flexDirection: "row",
    flexGrow: 1,
    flexBasis: 0,
    paddingRight: 18,
  },
  logo: {
    width: 52,
    height: 52,
    objectFit: "contain",
    marginRight: 12,
  },
  firmBlock: {
    flexGrow: 1,
    flexBasis: 0,
  },
  firmName: {
    fontSize: 18,
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
  titleBlock: {
    alignItems: "flex-end",
  },
  title: {
    fontSize: 18,
    color: "#1e293b",
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  receiptNo: {
    marginTop: 6,
    color: "#64748b",
    fontSize: 9,
  },
  ackBox: {
    marginTop: 24,
    padding: 14,
    borderWidth: 1,
    borderColor: "#bbf7d0",
    borderRadius: 8,
    backgroundColor: "#f0fdf4",
  },
  ackTitle: {
    color: "#166534",
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
  },
  ackText: {
    marginTop: 7,
    color: "#334155",
    fontSize: 10,
    lineHeight: 1.45,
  },
  columns: {
    marginTop: 20,
    flexDirection: "row",
    gap: 14,
  },
  panel: {
    flexGrow: 1,
    flexBasis: 0,
    padding: 12,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
  },
  sectionTitle: {
    marginBottom: 8,
    color: "#64748b",
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  clientName: {
    marginBottom: 4,
    color: "#1e293b",
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
  },
  bodyText: {
    color: "#475569",
    fontSize: 9,
    lineHeight: 1.35,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 14,
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  detailLabel: {
    color: "#64748b",
    fontSize: 9,
  },
  detailValue: {
    color: "#1e293b",
    fontSize: 9,
    textAlign: "right",
  },
  strong: {
    fontFamily: "Helvetica-Bold",
  },
  amountTable: {
    marginTop: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
  },
  statusBox: {
    marginTop: 14,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 7,
    backgroundColor: "#f8fafc",
  },
  statusText: {
    color: "#1e293b",
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
  },
  footer: {
    marginTop: "auto",
    paddingTop: 24,
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "flex-end",
  },
  smallText: {
    color: "#64748b",
    fontSize: 8,
  },
});
