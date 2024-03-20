const express= require("express");
const morgan =require("morgan");
const app=express();
const cors = require("cors"); // Agregar CORS

app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({extended:false}));


// Agregar middleware de CORS
app.use(cors());

app.use(require("./router/Productos"));
app.use(require('./router/Usuario'));
app.use(require('./router/Cliente'));
app.use(require("./router/Factura"));
//Middleware de errores
    app.use((err,req,res,
        next)=>{
            console.log(`Error ${err}`);
            res.status(500).
            json({
                message:"Algo salio mal",
                error: err
                });
                }
             );

let server;
module.exports={
    start:(port)=> {
        server=app.listen(port||3001,()=>{console.log(`Servidor corriendo en el puerto 3001`)});
            },
stop: () =>{
    server.close(()=>{
        console.log("Server Stoped")
    })
    }
    }




module.exports=app;