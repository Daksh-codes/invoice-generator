const cors = require('cors')
const express = require('express')
const issuerRoute = require('./routes/issuerRoutes.js')
const clientRoute = require("./routes/clientRoutes");
const bankRoute = require("./routes/bankRoutes");
const invoiceRoute = require("./routes/invoiceRoutes");

const app = express();

app.use(express.json());
app.use(cors({}))


app.use("/issuer/" , issuerRoute )
app.use("/client", clientRoute);
app.use("/bank", bankRoute);
app.use("/invoice", invoiceRoute);


app.get('/health', (req , res) => {
    res.send("OK");
});

app.listen(3000, ()=> {
    console.log("Server running on port 3000");
});