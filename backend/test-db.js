const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://IT_INTERN:ITINTERN123@cluster1.0pycd.mongodb.net/chargezoneprod')
    .then(() => { console.log('Connected'); process.exit(0); })
    .catch(err => { console.error(err); process.exit(1); });
