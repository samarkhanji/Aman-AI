const axios = require('axios');
const URL = "https://your-render-link.onrender.com"; // Yahan apna render link dalna

setInterval(() => {
    axios.get(URL).then(() => console.log("Ping Success!"))
    .catch(err => console.log("Ping Failed!"));
}, 300000); // 5 minutes
