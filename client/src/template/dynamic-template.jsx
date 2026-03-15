export default function InvoiceTemplate({ data }) {
  if (!data) return null;

  const {
    firm_name,
    sub_heading,
    logo,
    phone,
    email,
    client_name,
    bill_number,
    bill_date,
    items,
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

  return (
    <div className="min-h-screen flex justify-center bg-gray-200 pt-4">
      <div className="w-[210mm] h-[297mm] bg-white shadow scale-[0.9] p-12 flex flex-col">

        <div className="grow">

          {/* Header */}
          <div className="flex gap-8 pb-2 items-center border-b">
            {logo && <img src={logo} alt="LOGO" className="w-[15%]" />}
            <div>
              <h1 className="text-2xl font-bold text-blue-950">
                {firm_name}
              </h1>
              <h3 className="text-xl font-semibold">
                {sub_heading}
              </h3>
              <div className="flex gap-4 text-sm">
                <p>{phone}</p>
                <p>{email}</p>
              </div>
            </div>
          </div>

          {/* Bill Info */}
          <div className="flex justify-between py-4">
            <div>
              <p className="font-medium">Billed To:</p>
              <p className="font-bold text-lg">{client_name}</p>
            </div>
            <div className="font-medium text-right">
              <p>Invoice No. {bill_number}</p>
              <p>{bill_date}</p>
            </div>
          </div>

          {/* Items */}
          <table className="w-full border-collapse mt-4">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2 text-left">Professional Fees for the services rendered as below : </th>
                <th className="border p-2 text-right w-[40mm]">
                  Amount (₹)
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i}>
                  <td className="border p-2">{item.description}</td>
                  <td className="border p-2 text-right">
                    {item.amount.toLocaleString()}
                  </td>
                </tr>
              ))}

              <tr>
                <td className="border p-2 text-right font-semibold">
                  Total
                </td>
                <td className="border p-2 text-right font-bold">
                  {total.toLocaleString()}
                </td>
              </tr>

              <tr>
                <td colSpan={2} className="border p-2">
                  <b>In Words:</b> {total_in_words}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Signature */}
          <div className="flex flex-col items-end mt-8">
            <p>For {firm_name}</p>
            <p className="mt-12">Authorised Signatory</p>
          </div>
        </div>

        {/* Bank Section */}
        <div className="mt-auto flex justify-between items-end pt-4 border-t">
          <table className="border border-collapse w-[85mm] text-[11px]">
            <tbody>
              <tr>
                <td colSpan={2} className="border p-1 text-center font-bold">
                  NEFT
                </td>
              </tr>
              <tr><td className="border px-2 py-1">Name</td><td className="border px-2 py-1">{account_holder_name}</td></tr>
              <tr><td className="border px-2 py-1">Bank</td><td className="border px-2 py-1">{bank_name}</td></tr>
              <tr><td className="border px-2 py-1">IFSC</td><td className="border px-2 py-1">{ifsc_code}</td></tr>
              <tr><td className="border px-2 py-1">Branch</td><td className="border px-2 py-1">{branch}</td></tr>
              <tr><td className="border px-2 py-1">Type</td><td className="border px-2 py-1">{account_type}</td></tr>
              <tr><td className="border px-2 py-1">A/c No.</td><td className="border px-2 py-1">{account_number}</td></tr>
            </tbody>
          </table>

          {upi_qr && (
            <div className="flex flex-col items-center">
              <img src={upi_qr} alt="QR" className="border w-[28mm] h-[28mm]" />
              <p className="text-[11px] mt-1">Scan to Pay</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

// working on this  