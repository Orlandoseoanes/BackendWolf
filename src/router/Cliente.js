const { db, } = require('../firebase');
const { Router } = require("express");
const router = Router();


router.post("/Registro/Clientes",async (req,res)=>{
    const{Correo,Nombre,Telefono }=req.body
    try{
        if (!Correo || !Telefono ||  !Nombre) {
            return res.status(400).send("Se requieren todos los campos para crear un nuevo Usuario.");
          }
          const NewClientId = await db.collection("Cliente").add({
            Correo,
            Telefono,
            Nombre,
          });
            // Responder con el ID del nuevo usuario creado
            res.status(201).json({ id: NewClientId.id });
    }catch (error) {
        // Manejar errores
        console.error("Error al crear un nuevo cliente:", error);
        res.status(500).send("Error al crear un nuevo cliente. Por favor, inténtalo de nuevo más tarde.");
      }
    
});


router.get("/Clientes",async(req,res)=>{
    try {
        const querySnapshot = await db.collection("Cliente").get();
  
        const Productos = querySnapshot.docs.map(doc => ({
            id: doc.id,
            Correo: doc.data().Correo,
            Nombre: doc.data().Nombre, // Aplicando la lógica para obtener solo el nombre del archivo
            Telefono: doc.data().Telefono,
           
        }));
  
        res.status(200).json(Productos);
  
  
    } catch (error) {
        console.error("Error al obtener productos:", error);
        res.status(500).send("Error al obtener productos");
    }
});

module.exports=router