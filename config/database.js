const mongoose = require('mongoose')

exports.connnectDatabase=()=>{
    mongoose.connect(process.env.MONGO_URI)
    .then((data)=>console.log(`Databse conected : ${data.connection.host}`))
    .catch(e=>console.log('error while connecting to database',e));
}    