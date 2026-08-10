// scripts/testRoutes.js
const BASE = "http://localhost:3000/api";

let passed = 0;
let failed = 0;

const ISSUER_ID = 1;
const CLIENT_ID = 1;
let INVOICE_ID, QUOTATION_ID, DRAFT_ID;

async function test(label, fn) {
  try {
    await fn();
    console.log(`  ✅ ${label}`);
    passed++;
  } catch (err) {
    console.log(`  ❌ ${label}`);
    console.log(`     ${err.message}`);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || "Assertion failed");
}

async function req(method, path, body) {
  const opts = { method, headers: { "Content-Type": "application/json" } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(`${res.status} — ${JSON.stringify(data)}`);
  return data;
}

const get  = (path)       => req("GET",  path);
const post = (path, body) => req("POST", path, body);
const put  = (path, body) => req("PUT",  path, body);

const sampleBill = {
  issuer_id: ISSUER_ID,
  client_id: CLIENT_ID,
  bill_date: "2024-02-01",
  payment_terms: "Net 30",
  due_date: "2024-03-01",
  subtotal: 10000,
  discount: 500,
  tax_total: 1710,
  cgst: 855,
  sgst: 855,
  igst: 0,
  is_igst: 0,
  total: 11210,
  total_in_words: "Eleven Thousand Two Hundred Ten",
  notes: "Thank you for your business",
  items: [
    {
      description: "Web Development",
      quantity: 2,
      rate: 5000,
      amount: 10000,
      hsn_code: "998314",
      tax_rate: 18,
      tax_amount: 1710,
    },
  ],
};

async function run() {
  console.log("\n🧪 Testing all routes...\n");

  // ── INVOICES ──────────────────────────────────────────────────────────────
  console.log("📄 INVOICES");

  await test("GET next number (invoice)", async () => {
    const data = await get(`/bills/next-number/${ISSUER_ID}?doc_type=INVOICE`);
    assert(data.nextNumber, "No nextNumber");
    console.log(`     → ${data.nextNumber}`);
  });

  await test("POST create invoice (active)", async () => {
    const data = await post("/bills/new/invoice", sampleBill);
    assert(data.bill_id, "No bill_id");
    INVOICE_ID = data.bill_id;
    console.log(`     → id: ${INVOICE_ID}, number: ${data.bill_number}`);
  });

  await test("GET all invoices", async () => {
    const data = await get("/bills?doc_type=INVOICE");
    assert(Array.isArray(data) && data.length > 0, "Empty or invalid");
  });

  await test("GET invoice by id", async () => {
    const data = await get(`/bills/${INVOICE_ID}`);
    assert(data.bill_number, "No bill_number");
    assert(data.firm_name, "No firm_name");
    assert(data.client_name, "No client_name");
    assert(Array.isArray(data.items) && data.items.length > 0, "No items");
    assert(data.status === "active", "Wrong status");
  });

  await test("GET invoices by payment status", async () => {
    const data = await get("/bills/status/unpaid?doc_type=INVOICE");
    assert(Array.isArray(data), "Not an array");
  });

  await test("PUT update payment status → paid", async () => {
    const data = await put(`/bills/${INVOICE_ID}/status`, { payment_status: "paid" });
    assert(data.success, "Failed");
  });

  await test("PUT update payment status → invalid value (should 400)", async () => {
    try {
      await put(`/bills/${INVOICE_ID}/status`, { payment_status: "WRONG" });
      throw new Error("Should have rejected invalid status");
    } catch (err) {
      assert(err.message.includes("400"), `Expected 400, got: ${err.message}`);
    }
  });

  // ── VOID ──────────────────────────────────────────────────────────────────
  console.log("\n🚫 VOID");

  await test("POST void an invoice", async () => {
    const data = await post(`/bills/${INVOICE_ID}/void`, {});
    assert(data.success, "Failed to void");
  });

  await test("POST void same invoice again (should 400)", async () => {
    try {
      await post(`/bills/${INVOICE_ID}/void`, {});
      throw new Error("Should have rejected double void");
    } catch (err) {
      assert(err.message.includes("400"), `Expected 400, got: ${err.message}`);
    }
  });

  await test("PUT update status on voided bill (should 400)", async () => {
    try {
      await put(`/bills/${INVOICE_ID}/status`, { payment_status: "paid" });
      throw new Error("Should have rejected");
    } catch (err) {
      assert(err.message.includes("400"), `Expected 400, got: ${err.message}`);
    }
  });

  await test("GET all invoices excludes void by default", async () => {
    const data = await get("/bills?doc_type=INVOICE");
    const hasVoid = data.some((b) => b.status === "void");
    assert(!hasVoid, "Void bill should not appear in default list");
  });

  await test("GET all invoices includes void when requested", async () => {
    const data = await get("/bills?doc_type=INVOICE&include_void=true");
    const hasVoid = data.some((b) => b.status === "void");
    assert(hasVoid, "Void bill should appear when include_void=true");
  });

  // ── DRAFT ─────────────────────────────────────────────────────────────────
  console.log("\n📝 DRAFT");

  await test("POST create draft invoice (number reserved, no items)", async () => {
    const data = await post("/bills/new/invoice", { ...sampleBill, status: "draft", items: [] });
    assert(data.bill_id, "No bill_id");
    DRAFT_ID = data.bill_id;
    console.log(`     → draft id: ${DRAFT_ID}, number: ${data.bill_number}`);
  });

  await test("GET draft excluded from default list", async () => {
    const data = await get("/bills?doc_type=INVOICE");
    const hasDraft = data.some((b) => b.id === DRAFT_ID);
    assert(!hasDraft, "Draft should not appear in default list");
  });

  await test("GET draft visible with include_drafts=true", async () => {
    const data = await get("/bills?doc_type=INVOICE&include_drafts=true");
    const hasDraft = data.some((b) => b.id === DRAFT_ID);
    assert(hasDraft, "Draft should appear when include_drafts=true");
  });

  await test("POST finalize draft with items", async () => {
    const data = await post(`/bills/${DRAFT_ID}/finalize`, { items: sampleBill.items });
    assert(data.success, "Failed to finalize");
  });

  await test("GET finalized bill is now active", async () => {
    const data = await get(`/bills/${DRAFT_ID}`);
    assert(data.status === "active", `Expected active, got: ${data.status}`);
    assert(data.items.length > 0, "Items missing after finalize");
  });

  await test("POST finalize already active bill (should 400)", async () => {
    try {
      await post(`/bills/${DRAFT_ID}/finalize`, { items: sampleBill.items });
      throw new Error("Should have rejected");
    } catch (err) {
      assert(err.message.includes("400"), `Expected 400, got: ${err.message}`);
    }
  });

  // ── QUOTATIONS ────────────────────────────────────────────────────────────
  console.log("\n📋 QUOTATIONS");

  await test("GET next number (quotation)", async () => {
    const data = await get(`/bills/next-number/${ISSUER_ID}?doc_type=QUOTATION`);
    assert(data.nextNumber, "No nextNumber");
    console.log(`     → ${data.nextNumber}`);
  });

  await test("POST create quotation", async () => {
    const data = await post("/bills/new/quotation", sampleBill);
    assert(data.bill_id, "No bill_id");
    QUOTATION_ID = data.bill_id;
    console.log(`     → id: ${QUOTATION_ID}, number: ${data.bill_number}`);
  });

  await test("GET all quotations", async () => {
    const data = await get("/bills?doc_type=QUOTATION");
    assert(Array.isArray(data) && data.length > 0, "Empty");
  });

  await test("GET quotation by id", async () => {
    const data = await get(`/bills/${QUOTATION_ID}`);
    assert(data.doc_type === "QUOTATION", "Wrong doc_type");
    assert(Array.isArray(data.items), "No items");
  });

  await test("POST convert quotation to invoice", async () => {
    const data = await post(`/bills/${QUOTATION_ID}/convert`, {});
    assert(data.new_invoice_id, "No new_invoice_id");
    assert(data.invoice_number, "No invoice_number");
    console.log(`     → new invoice id: ${data.new_invoice_id}, number: ${data.invoice_number}`);
  });

  // ── PREFIX CHANGES ────────────────────────────────────────────────────────
console.log("\n🔤 PREFIX CHANGES");

await test("GET prefix history (initial)", async () => {
  const data = await get(`/issuers/${ISSUER_ID}/prefix-history`);
  assert(Array.isArray(data), "Not an array");
  assert(data.length === 2, `Expected 2 entries (INV + QUO), got ${data.length}`);
  console.log(`     → ${data.map(d => `${d.doc_type}: ${d.prefix}`).join(", ")}`);
});

await test("POST change invoice prefix", async () => {
  const data = await post(`/issuers/${ISSUER_ID}/change-prefix`, {
    doc_type: "INVOICE",
    new_prefix: "BILL-"
  });
  assert(data.success, "Failed");
  assert(data.previous_prefix === "INV-", `Expected previous INV-, got ${data.previous_prefix}`);
  assert(data.new_prefix === "BILL-", `Expected new BILL-, got ${data.new_prefix}`);
  assert(data.counter_reset_to === 1, "Counter should reset to 1");
  console.log(`     → changed from ${data.previous_prefix} to ${data.new_prefix}`);
});

await test("GET next number after prefix change starts from 2 (counter is 1, next is 2)", async () => {
  const data = await get(`/bills/next-number/${ISSUER_ID}?doc_type=INVOICE`);
  assert(data.nextNumber === "BILL-2", `Expected BILL-2, got ${data.nextNumber}`);
  console.log(`     → ${data.nextNumber}`);
});

await test("POST create invoice with new prefix", async () => {
  const data = await post("/bills/new/invoice", sampleBill);
  assert(data.bill_number.startsWith("BILL-"), `Expected BILL- prefix, got ${data.bill_number}`);
  console.log(`     → ${data.bill_number}`);
});

await test("GET old invoice still has original INV- number", async () => {
  const data = await get(`/bills/${INVOICE_ID}`);
  // INVOICE_ID was created before prefix change, should still be INV-
  assert(data.bill_number.startsWith("INV-"), `Old bill should still have INV-, got ${data.bill_number}`);
  console.log(`     → ${data.bill_number} ✓ unchanged`);
});

await test("POST change to same prefix (should 400)", async () => {
  try {
    await post(`/issuers/${ISSUER_ID}/change-prefix`, {
      doc_type: "INVOICE",
      new_prefix: "BILL-"
    });
    throw new Error("Should have rejected same prefix");
  } catch (err) {
    assert(err.message.includes("400"), `Expected 400, got: ${err.message}`);
  }
});

await test("POST change prefix with invalid doc_type (should 400)", async () => {
  try {
    await post(`/issuers/${ISSUER_ID}/change-prefix`, {
      doc_type: "RANDOM",
      new_prefix: "X-"
    });
    throw new Error("Should have rejected invalid doc_type");
  } catch (err) {
    assert(err.message.includes("400"), `Expected 400, got: ${err.message}`);
  }
});

await test("POST change prefix with empty prefix (should 400)", async () => {
  try {
    await post(`/issuers/${ISSUER_ID}/change-prefix`, {
      doc_type: "INVOICE",
      new_prefix: "   "
    });
    throw new Error("Should have rejected empty prefix");
  } catch (err) {
    assert(err.message.includes("400"), `Expected 400, got: ${err.message}`);
  }
});

await test("GET prefix history after change shows both entries", async () => {
  const data = await get(`/issuers/${ISSUER_ID}/prefix-history`);
  const invoiceHistory = data.filter(d => d.doc_type === "INVOICE");
  assert(invoiceHistory.length === 2, `Expected 2 invoice prefix entries, got ${invoiceHistory.length}`);
  const old = invoiceHistory.find(d => d.prefix === "INV-");
  const current = invoiceHistory.find(d => d.prefix === "BILL-");
  assert(old, "Old INV- prefix not in history");
  assert(current, "New BILL- prefix not in history");
  assert(old.counter_end !== null, "Old prefix should have counter_end set");
  assert(current.counter_end === null, "Current prefix should have counter_end as NULL");
  console.log(`     → INV- closed at ${old.counter_end}, BILL- active`);
});

await test("POST change quotation prefix", async () => {
  const data = await post(`/issuers/${ISSUER_ID}/change-prefix`, {
    doc_type: "QUOTATION",
    new_prefix: "QUOT-"
  });
  assert(data.success, "Failed");
  console.log(`     → changed from ${data.previous_prefix} to ${data.new_prefix}`);
});

await test("GET prefix history has 4 entries total (2 invoice + 2 quotation)", async () => {
  const data = await get(`/issuers/${ISSUER_ID}/prefix-history`);
  assert(data.length === 4, `Expected 4 total entries, got ${data.length}`);
});

  // ── SUMMARY ───────────────────────────────────────────────────────────────
  console.log(`\n${"─".repeat(45)}`);
  console.log(`✅ Passed: ${passed}   ❌ Failed: ${failed}`);

  if (failed === 0) {
    console.log("🎉 All routes working!\n");
  } else {
    console.log("⚠️  Fix failing routes before moving to frontend\n");
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("💥 Test runner crashed:", err.message);
  process.exit(1);
});