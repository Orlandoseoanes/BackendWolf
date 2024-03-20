const { Router } = require("express");
const router = Router();
const https = require('https');
const { db } = require("../firebase");

router.post("/Creacion/factura", async (req, res) => {
  try {
      const { Total, Productos } = req.body;


        const NewfacturaId = await db.collection("Facturas").add({
            Productos,
            Total
        });

      // Generar el mensaje para WhatsApp
      let whatsappMessage = "*Bienvenido a BLACKWOLF*\n\n";
      whatsappMessage += "*Factura*:\n\n";
      whatsappMessage += "*Productos*:\n";


      // Construir la lista de productos
      Productos.forEach((producto, index) => {
          whatsappMessage += `${index + 1}. *Nombre*: ${producto.NombreProducto}\n`;
          whatsappMessage += `   *Cantidad*: ${producto.Cantidad}\n`;
          whatsappMessage += `   *Color*: ${producto.Color}\n`;
          whatsappMessage += `   *Talla*: ${producto.Talla}\n`;
          whatsappMessage += `   *Subtotal $*: ${producto.Subtotal}\n\n`;
      });

      whatsappMessage += `*Total $*: ${Total}\n\n`;

      // Agregar mensaje final
      whatsappMessage += "En unos momentos su solicitud será atendida por uno de nuestros trabajadores.";

      // Número de teléfono al que quieres enviar el mensaje
      const phoneNumber = "+573004327856"; // Reemplaza esto con el número de teléfono deseado

      // Generar el enlace de WhatsApp con el número de teléfono y el mensaje predefinido
      const whatsappLink = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(whatsappMessage)}`;

      // Responder con el enlace del mensaje de WhatsApp en la respuesta HTTP
      res.status(201).json({NewfacturaId, whatsappLink });
      console.log("Factura creada con éxito");

  } catch (error) {
      // Manejar errores
      console.error("Error al crear una nueva factura:", error);
      res.status(500).send("Error al crear una nueva factura. Por favor, inténtalo de nuevo más tarde.");
  }
});

module.exports = router;
