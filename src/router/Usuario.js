const { db, } = require('../firebase');
const { Router } = require("express");
const router = Router();
const bcrypt = require('bcrypt');


router.post("/Usuario/crear",async (req,res)=>{
const{Apellido,Contraseña,Correo,Nombre,Usuario}=req.body;
try{
    if (!Apellido || !Contraseña || !Correo || !Nombre || !Usuario) {
        return res.status(400).send("Se requieren todos los campos para crear un nuevo Usuario.");
      }
// Hash the password before storing it in the database
const saltRounds = 10;
const hashedPassword = await bcrypt.hash(Contraseña, saltRounds);

      const newUserRef = await db.collection("Usuarios").add({
        Apellido,
        Contraseña:hashedPassword,
        Correo,
        Nombre,
        Usuario
      });
        // Responder con el ID del nuevo usuario creado
        res.status(201).json({ id: newUserRef.id });
}catch (error) {
    // Manejar errores
    console.error("Error al crear un nuevo usuario:", error);
    res.status(500).send("Error al crear un nuevo usuario. Por favor, inténtalo de nuevo más tarde.");
  }


})

module.exports = router;
