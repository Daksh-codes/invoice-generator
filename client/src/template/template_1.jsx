import logo from "../assets/ca-india-logo-png_seeklogo-513934.png";

export default function InvoiceTemplate() {
  const items = [
    { desc: "Income Tax Audit of Shri Gautam Saha", amount: 10000 },
    { desc: "Consultancy related to accounts", amount: 10000 },
  ];

  return (
    <div className="min-h-screen flex justify-center bg-gray-200 pt-4">
      <div className="w-[210mm] h-[297mm] bg-white shadow scale-[0.9] p-12 flex flex-col">
        {/* TOP CONTENT */}
        <div className="grow">
          {/* Header */}
          <div className="flex gap-8 pb-2 items-center border-b">
            <img src={logo} alt="LOGO" className="w-[15%]" />
            <div>
              <h1 className="text-2xl font-bold text-blue-950">
                Hitesh Thawani & Associates
              </h1>
              <h3 className="text-xl font-semibold">Chartered Accountant</h3>
              <div className="flex gap-4 text-sm">
                <p>Mob: 9876543210</p>
                <p>Email: cahiteshthawani@gmail.com</p>
              </div>
            </div>
          </div>

          {/* Bill Info */}
          <div className="flex justify-between py-4">
            <div>
              <p className="font-medium">Billed To:</p>
              <p className="font-bold text-lg">ABC company, Thane</p>
            </div>
            <div className="font-medium text-right">
              <p>Invoice No. FQ012/26</p>
              <p>12 June 2026</p>
            </div>
          </div>

          {/* Services Table */}
          {/* <table className="w-full border-collapse">
            <thead>
              <tr className="bg-blue-100">
                <th className="border p-2 text-left">
                  Professional Fees for the services rendered as below :
                </th>
                <th className="border p-2 text-right w-1/4">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border p-2">GST Filing for Jan 2026</td>
                <td className="border p-2 text-right">2,500</td>
              </tr>
              <tr>
                <td className="border p-2">Income Tax Return</td>
                <td className="border p-2 text-right">3,000</td>
              </tr>
              <tr>
                <td className="border p-2">&nbsp;</td>
                <td className="border p-2">&nbsp;</td>
              </tr>
              <tr>
                <td className="border p-2">Discount</td>
                <td className="border p-2 text-right">500</td>
              </tr>
              <tr>
                <td className="border p-2 font-bold">Total</td>
                <td className="border p-2 text-right font-bold">5,000</td>
              </tr>
              <tr>
                <td colSpan={2} className="border p-2">
                  <span className="font-medium">Amount in Words: </span>
                  <span className="font-bold">Rupees Five Thousand Only</span>
                </td>
              </tr>
            </tbody>
          </table> */}
          <table className="w-full border-collapse mt-4">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2 text-left">Particulars</th>
                <th className="border p-2 text-right w-[40mm]">Amount (₹)</th>
              </tr>
            </thead>

            <tbody>
              {items.map((item, i) => (
                <tr key={i}>
                  <td className="border p-2 align-top">{item.desc}</td>
                  <td className="border p-2 text-right align-top">
                    {item.amount.toLocaleString()}
                  </td>
                </tr>
              ))}

              <tr>
                <td className="border p-2 text-right font-semibold">Total</td>
                <td className="border p-2 text-right font-bold">5000</td>
              </tr>

              <tr>
                <td colSpan={2} className="border p-2">
                  <b>In Words:</b> Five Thousand
                </td>
              </tr>
            </tbody>
          </table>

          {/* Signature */}
          <div className="flex flex-col items-end mt-8">
            <p>For Hitesh Thawani & Associates</p>
            <p>&nbsp;</p>
             <p>&nbsp;</p>
            <p className="mt-8">Proprietor</p>
          </div>
        </div>

        {/* BOTTOM FIXED BANK + QR */}
        <div className="mt-auto flex justify-between items-end pt-4 border-t">
          <table className="border border-collapse w-[85mm] text-[11px]">
            <tbody>
              <tr>
                <td colSpan={2} className="border p-1 text-center font-bold">
                  NEFT
                </td>
              </tr>
              <tr>
                <td className="border px-2 py-1">Name</td>
                <td className="border px-2 py-1">Hitesh Thawani</td>
              </tr>
              <tr>
                <td className="border px-2 py-1">Bank</td>
                <td className="border px-2 py-1">State Bank of India</td>
              </tr>
              <tr>
                <td className="border px-2 py-1">IFSC</td>
                <td className="border px-2 py-1">SBIN0001234</td>
              </tr>
              <tr>
                <td className="border px-2 py-1">Branch</td>
                <td className="border px-2 py-1">Ulhasnagar</td>
              </tr>
              <tr>
                <td className="border px-2 py-1">Type</td>
                <td className="border px-2 py-1">Current</td>
              </tr>
              <tr>
                <td className="border px-2 py-1">A/c No.</td>
                <td className="border px-2 py-1">123456789012</td>
              </tr>
            </tbody>
          </table>

          <div className="flex flex-col items-center">
            <img src="" alt="QR" className="border w-[28mm] h-[28mm]" />
            <p className="text-[11px] mt-1">Scan to Pay</p>
          </div>
        </div>
      </div>
    </div>
  );
}
