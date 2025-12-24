const axios = require('axios');
const URL = "https://aman-ai.onrender.com"; // Yahan apna render link dalna

setInterval(() => {
    axios.get(URL).then(() => console.log("Ping Success!"))
    .catch(err => console.log("Ping Failed!"));
}, 300000); // 5 minutes
