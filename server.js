const app = require('./app')


app.get('/',(req,res)=>{
    res.send('hellow')
})

const server = app.listen(process.env.PORT,()=>{
    console.log(`Server is running at http://localhost:${process.env.PORT}`);
})


// unhandled rejection 
process.on('unhandledRejection',(error)=>{
    console.log(`CLOSING DONW THE SERVER due to ${error.message}`);
    server.close(()=>{
        process.exit(1);
    })
})

// closing server in exceptions cases. 
process.on('uncaughtException',(error)=>{
    console.log(`CLOSING DOWN THE SERVER DUE To : ${error.message}`);
    server.close(()=>{
        process.exit(1);
    })
})