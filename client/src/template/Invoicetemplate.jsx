const SERVER = "http://localhost:3000";

const fmtAmount = (n) => Number(n || 0).toLocaleString("en-IN");

// variant: "full" | "logo-only" | "name-only"
export default function InvoiceTemplate({ data, variant = "full" }) {
  if (!data) return null;

  const {
    doc_type = "INVOICE",
    firm_name,
    sub_heading,
    logo,
    phone,
    email,
    pan,
    gstin,
    is_gst_enabled,
    signature_image,
    client_name,
    client_gstin,
    bill_number,
    bill_date,
    due_date,
    payment_terms,
    notes,
    items = [],
    subtotal,
    discount,
    cgst,
    sgst,
    igst,
    is_igst,
    total,
    total_in_words,
    account_holder_name,
    bank_name,
    account_number,
    account_type,
    ifsc_code,
    branch,
    upi_qr,
  } = data;

  const isQuotation  = doc_type === "QUOTATION";
  const showDiscount = Number(discount) > 0;
  const showGst      = Boolean(is_gst_enabled);
  const showLogo     = (variant === "full" || variant === "logo-only") && logo;
  const showName     = variant === "full" || variant === "name-only";
  const extraCols    = showGst ? 2 : 0; // HSN + Tax%
  const spanAll      = 1 + extraCols + 1; // desc + gst cols + amount

  return (
    <div className="min-h-screen flex justify-center bg-gray-200 pt-4">
      <div className="w-[210mm] min-h-[297mm] bg-white shadow scale-[0.9] origin-top p-12 flex flex-col print:shadow-none print:scale-100 print:origin-top">

        <div className="grow">

          {/* ── Header ── */}
          <div className="flex gap-8 pb-2 items-center border-b justify-between">
            <div className="flex gap-4 items-center">
              {showLogo && (
                <img
                  src={`${SERVER}/uploads/${logo}`}
                  alt="Logo"
                  className="w-[15%] object-contain"
                />
              )}
              <div>
                {showName && (
                  <h1 className="text-2xl font-bold text-blue-950">{firm_name}</h1>
                )}
                {sub_heading && (
                  <h3 className="text-xl font-semibold">{sub_heading}</h3>
                )}
                <div className="flex gap-4 text-sm flex-wrap">
                  {phone && <p>{phone}</p>}
                  {email && <p>{email}</p>}
                  {pan && <p>PAN: {pan}</p>}
                  {showGst && gstin && <p>GSTIN: {gstin}</p>}
                </div>
              </div>
            </div>

            {/* CA India logo — top right */}
            <div className="flex flex-col items-center shrink-0">
              <img
                src="https://upload.wikimedia.org/wikipedia/en/1/15/ICAI_Logo.png"
                alt="CA India"
                className="w-12 h-12 object-contain"
                onError={(e) => { e.target.style.display = "none"; }}
              />
              <p className="text-[9px] font-bold text-blue-950 mt-0.5">CA INDIA</p>
            </div>
          </div>

          {/* ── Bill Info ── */}
          <div className="flex justify-between py-4">
            <div>
              <p className="font-medium">To,</p>
              <p className="font-bold text-lg">{client_name}</p>
              {showGst && client_gstin && (
                <p className="text-sm text-gray-500">GSTIN: {client_gstin}</p>
              )}
            </div>
            <div className="font-medium text-right">
              <p>{isQuotation ? "Quotation No." : "Bill No :"} {bill_number}</p>
              <p>Date : {bill_date}</p>
              {due_date && <p>Due : {due_date}</p>}
              {payment_terms && <p>Terms : {payment_terms}</p>}
            </div>
          </div>

          {/* ── Items Table ── */}
          <table className="w-full border-collapse mt-4">
            <thead>
              <tr className="bg-blue-100">
                <th className="border p-2 text-left">
                  Professional Fees for the services rendered as below :
                </th>
                {showGst && (
                  <th className="border p-2 text-center w-[18mm]">HSN</th>
                )}
                {showGst && (
                  <th className="border p-2 text-center w-[14mm]">Tax%</th>
                )}
                <th className="border p-2 text-right w-[40mm]">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i}>
                  <td className="border p-2">- {item.description}</td>
                  {showGst && (
                    <td className="border p-2 text-center text-gray-500">
                      {item.hsn_code || ""}
                    </td>
                  )}
                  {showGst && (
                    <td className="border p-2 text-center">
                      {item.tax_rate ? `${item.tax_rate}%` : ""}
                    </td>
                  )}
                  <td className="border p-2 text-right">
                    {item.amount ? fmtAmount(item.amount) : ""}
                  </td>
                </tr>
              ))}

              {/* Filler rows */}
              {Array.from({ length: Math.max(0, 4 - items.length) }).map((_, i) => (
                <tr key={`f${i}`} style={{ height: 28 }}>
                  <td className="border p-2"></td>
                  {showGst && <td className="border"></td>}
                  {showGst && <td className="border"></td>}
                  <td className="border"></td>
                </tr>
              ))}

              {/* Subtotal + Discount */}
              {showDiscount && (
                <>
                  <tr>
                    <td className="border p-2 text-right font-semibold" colSpan={1 + extraCols}>
                      Subtotal
                    </td>
                    <td className="border p-2 text-right">{fmtAmount(subtotal)}</td>
                  </tr>
                  <tr>
                    <td className="border p-2 text-right font-semibold" colSpan={1 + extraCols}>
                      Discount
                    </td>
                    <td className="border p-2 text-right text-red-600">
                      − {fmtAmount(discount)}
                    </td>
                  </tr>
                </>
              )}

              {/* GST rows */}
              {showGst && (
                is_igst ? (
                  <tr>
                    <td className="border p-2 text-right font-semibold" colSpan={1 + extraCols}>IGST</td>
                    <td className="border p-2 text-right">{fmtAmount(igst)}</td>
                  </tr>
                ) : (
                  <>
                    <tr>
                      <td className="border p-2 text-right font-semibold" colSpan={1 + extraCols}>CGST</td>
                      <td className="border p-2 text-right">{fmtAmount(cgst)}</td>
                    </tr>
                    <tr>
                      <td className="border p-2 text-right font-semibold" colSpan={1 + extraCols}>SGST</td>
                      <td className="border p-2 text-right">{fmtAmount(sgst)}</td>
                    </tr>
                  </>
                )
              )}

              {/* Total */}
              <tr>
                <td className="border p-2 text-right font-semibold" colSpan={1 + extraCols}>
                  Total
                </td>
                <td className="border p-2 text-right font-bold">{fmtAmount(total)}</td>
              </tr>

              {/* In Words */}
              <tr>
                <td colSpan={spanAll} className="border p-2">
                  <b>In Words :</b> {total_in_words}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Notes */}
          {notes && (
            <p className="text-sm text-gray-500 italic mt-2 border-l-2 border-gray-300 pl-2">
              {notes}
            </p>
          )}

          {/* Signature */}
          <div className="flex flex-col items-end mt-8">
            <p>For {firm_name}</p>
            {signature_image ? (
              <img
                src={`${SERVER}/uploads/${signature_image}`}
                alt="Signature"
                className="h-12 mt-2 object-contain"
              />
            ) : (
              <div className="mt-12" />
            )}
            <p>Authorised Signatory</p>
          </div>
        </div>

        {/* ── Bank + QR ── */}
        <div className="mt-auto flex justify-between items-end pt-4 border-t">
          {account_holder_name && (
            <table className="border border-collapse w-[85mm] text-[11px]">
              <tbody>
                <tr>
                  <td colSpan={2} className="border p-1 text-center font-bold">NEFT</td>
                </tr>
                {[
                  ["Name",   account_holder_name],
                  ["Bank",   bank_name],
                  ["IFSC",   ifsc_code],
                  ["Branch", branch],
                  ["Type",   account_type],
                  ["A/c No.",account_number],
                ].map(([l, v]) => v ? (
                  <tr key={l}>
                    <td className="border px-2 py-1">{l}</td>
                    <td className="border px-2 py-1">{v}</td>
                  </tr>
                ) : null)}
              </tbody>
            </table>
          )}

          {upi_qr && (
            <div className="flex flex-col items-center">
              <img
                src={`${SERVER}/uploads/${upi_qr}`}
                alt="QR"
                className="border w-[28mm] h-[28mm] object-contain"
              />
              <p className="text-[11px] mt-1">Scan to Pay</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}