const cors = require("cors");
const express = require("express");
const db = require("./db.js");
const runMigrations = require("./scripts/migrate.js");
const path = require("path");
const config = require("./config.js");

// Run migrations FIRST before any controller is required
runMigrations(db);

const issuerRoute = require("./routes/issuerRoutes.js");
const clientRoute = require("./routes/clientRoutes.js");
const bankRoute = require("./routes/bankRoutes.js");
const billRoutes = require("./routes/billRoute.js");
const appRoutes = require("./routes/appRoutes.js");
const paymentModeRoutes = require("./routes/paymentModeRoutes.js");
const paymentRoutes = require("./routes/paymentRoutes.js");

const app = express();

app.use(express.json());
app.use(cors({}));

app.use("/images", express.static(path.join(__dirname, "images")));

app.use("/api/issuers", issuerRoute);
app.use("/api/clients", clientRoute);
app.use("/api/bank", bankRoute);
app.use("/api/bills", billRoutes);
app.use("/api/app", appRoutes);
app.use("/api/payment-modes", paymentModeRoutes);
app.use("/api/payments", paymentRoutes);


app.get("/health", (req, res) => {
  res.send("OK");
});


console.log("Static path:", path.join(__dirname, "../client/dist"));
app.use(express.static(path.join(__dirname, "../client/dist")));
//app.use(express.static(path.join(__dirname, "../client/dist")));
// app.get(/^(?!\/api|\/images).*$/, (req, res) => {
//   res.sendFile(path.join(__dirname, "../client/dist/index.html"));
// });

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/dist/index.html"));
});

app.get(/^\/(?!api\/|images\/).*/, (req, res) => {
  res.sendFile(path.join(__dirname, "../client/dist/index.html"));
});

app.listen(config.port, "0.0.0.0", () => {
  console.log(`Server running on port ${config.port}`);
});
