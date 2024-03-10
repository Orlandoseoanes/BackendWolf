const { db, } = require('../firebase');
const { Router } = require("express");
const router = Router();
const multer = require('multer');
const { storage } = require('../firebase'); // Importa el almacenamiento desde tu archivo firebase.js

router.get("/Productos/todos", async (req, res) => {
  try {
      const querySnapshot = await db.collection("Producto").get();

      const Productos = querySnapshot.docs.map(doc => ({
          id: doc.id,
          Descripcion: doc.data().Descripcion,
          Imagen: obtenerNombreArchivo(doc.data().Imagen), // Aplicando la lógica para obtener solo el nombre del archivo
          Material: doc.data().Material,
          NombreProducto: doc.data().NombreProducto,
          Precio: doc.data().Precio,
          TallasColores: doc.data().TallasColores,
          Tipo: doc.data().Tipo,
          Descuento: doc.data().Descuento
      }));

      res.status(200).json(Productos);


  } catch (error) {
      console.error("Error al obtener productos:", error);
      res.status(500).send("Error al obtener productos");
  }
});

function obtenerNombreArchivo(url) {
  return url.substring(url.lastIndexOf('/') + 1);
}


router.get("/ProductoIndividual/:id", async (req, res) => {
    try {
        const productId = req.params.id;
        const productRef = db.collection("Producto").doc(productId);
        const doc = await productRef.get();

        if (!doc.exists) {
            return res.status(404).send("Producto no encontrado");
        }

        const producto = {
            id: doc.id,
            Descripcion: doc.data().Descripcion,
            Imagen: obtenerNombreArchivo(doc.data().Imagen), // Aplicando la lógica para obtener solo el nombre del archivo
            Material: doc.data().Material,
            NombreProducto: doc.data().NombreProducto,
            Precio: doc.data().Precio,
            TallasColores: doc.data().TallasColores.map(tc => ({
                Talla: tc.Talla,
                Stock: tc.Stock,
                Color: tc.Color
            })),
            Tipo: doc.data().Tipo,
        };

        res.status(200).json({producto});
    } catch (error) {
        console.error("Error al obtener el producto:", error);
        res.status(500).send("Error al obtener el producto");
    }
});

const upload = multer({
    storage: multer.memoryStorage(), // Almacenamiento en memoria para manejar archivos temporales
    limits: {
      fileSize: 5 * 1024 * 1024, // Límite de tamaño del archivo (5MB)
    },
  });


  router.post('/Producto/cargarFotoYProductoNuevo', upload.single('foto'), async (req, res) => {
    try {
      // Verifica si se proporcionó un archivo en la solicitud
      if (!req.file) {
        return res.status(400).json({ error: 'No se proporcionó ninguna foto' });
      }
  
      // Accede al almacenamiento de Firebase
      const bucket = storage.bucket();
  
      // Crea un nombre único para el archivo basado en la hora actual y el nombre original del archivo
      const nombreArchivo =  req.file.originalname;
  
      // Sube el archivo al bucket de Firebase
      const fileUpload = bucket.file(nombreArchivo);
      const blobStream = fileUpload.createWriteStream({
        metadata: {
          contentType: req.file.mimetype, // Tipo de contenido del archivo
        },
      });
  
      blobStream.on('error', (error) => {
        console.error('Error al cargar el archivo:', error);
        res.status(500).json({ error: 'Error al cargar el archivo' });
      });
  
      blobStream.on('finish', async () => {
        // URL pública para acceder al archivo cargado
        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileUpload.name}`;
  
        // Guardar la URL de la imagen y crear un nuevo documento de producto en Firestore
        const { Descripcion, Material, NombreProducto, Precio, TallasColores, Tipo } = req.body;
  
        // Validar que se proporcionen todos los campos necesarios
        if (!Descripcion || !Material || !NombreProducto || !Precio || !TallasColores || !Tipo) {
          return res.status(400).send("Se requieren todos los campos para crear un nuevo producto.");
        }
   // Decodificar la cadena JSON de TallasColores en un array de objetos
   const tallasColoresArray = JSON.parse(TallasColores);
        // Crear un nuevo documento de producto en Firestore
        const newProductRef = await db.collection("Producto").add({
          Descripcion,
          Material,
          NombreProducto,
          Precio,
          TallasColores:tallasColoresArray,
          Tipo,
          Imagen: publicUrl, // Guardar la URL de la imagen
        });
  
        // Responder con el ID del nuevo producto creado
        res.status(201).json({ id: newProductRef.id });
      });
  
      blobStream.end(req.file.buffer); // Finaliza la carga del archivo con el contenido del buffer del archivo
    } catch (error) {
      console.error('Error al cargar la foto o agregar el producto:', error);
      res.status(500).json({ error: 'Error al cargar la foto o agregar el producto' });
    }
  });


  router.get('/imagen/:id', async (req, res) => {
    try {
        const bucket = storage.bucket();
        const nombreImagen = req.params.id;
        const file = bucket.file(nombreImagen);

        // Verifica si el archivo existe
        const existe = await file.exists();

        if (!existe[0]) {
            return res.status(404).json({ error: 'La imagen no existe' });
        }

        // Obtiene un enlace temporal para descargar el archivo
        const [url] = await file.getSignedUrl({
            action: 'read',
            expires: '12-12-2024' // Fecha de expiración del enlace
        });

        // Redirige al enlace temporal para descargar la imagen
        res.redirect(url);
    } catch (error) {
        console.error("Error al obtener la imagen:", error);
        res.status(500).json({ error: 'Error al obtener la imagen' });
    }
});
  




module.exports = router;
