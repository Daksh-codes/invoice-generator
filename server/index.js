const cors = require('cors')
const express = require('express')


const app = express();

app.use(express.json());
app.use(cors({}))


app.get('/health', (req , res) => {
    res.send("OK");
});

app.listen(3000, ()=> {
    console.log("Server running on port 3000");
});