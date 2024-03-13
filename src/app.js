const express= require("express");
const morgan =require("morgan");
const app=express();

app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({extended:false}));

app.use(require("./router/Productos"));
app.use(require('./router/Usuario'));
app.use(require('./router/Cliente'));



module.exports=app;