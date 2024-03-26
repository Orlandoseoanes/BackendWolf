const { db } = require("../firebase");
const { Router } = require("express");
const router = Router();
const multer = require("multer");
const { storage } = require("../firebase"); // Importa el almacenamiento desde tu archivo firebase.js
const sharp = require('sharp');
const axios=require('axios')


router.get("/Productos/todos", async (req, res) => {
  try {
    const querySnapshot = await db.collection("Producto").get();

    const Productos = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      Descripcion: doc.data().Descripcion,
      Imagen: doc.data().Imagen, // Aplicando la lógica para obtener solo el nombre del archivo
      Material: doc.data().Material,
      NombreProducto: doc.data().NombreProducto,
      Precio: doc.data().Precio,
      TallasColores: doc.data().TallasColores,
      Tipo: doc.data().Tipo,
      Tematica: doc.data().Tematica,
      Stock: doc.data().Stock,
      Categoria: doc.data().Categoria,
    }));

    res.status(200).json(Productos);
  } catch (error) {
    console.error("Error al obtener productos:", error);
    res.status(500).send("Error al obtener productos");
  }
});


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
      Imagen: doc.data().Imagen, // Aplicando la lógica para obtener solo el nombre del archivo
      Material: doc.data().Material,
      NombreProducto: doc.data().NombreProducto,
      Precio: doc.data().Precio,
      TallasColores: doc.data().TallasColores.map((tc) => ({
        Talla: tc.Talla,
        Color: tc.Color,
      })),
      Tipo: doc.data().Tipo,
      Tematica: doc.data().Tematica,
      Stock: doc.data().Stock,
      Categoria: doc.data().Categoria,
    };

    res.status(200).json({ producto });
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

router.post("/Producto/cargarFotoYProductoNuevo", upload.array("fotos"), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No se proporcionaron fotos" });
    }

    const bucket = storage.bucket();
    const urls = [];

    for (const file of req.files) {
      const nombreArchivo = file.originalname;
      const fileUpload = bucket.file(nombreArchivo);
      const blobStream = fileUpload.createWriteStream({
        metadata: {
          contentType: file.mimetype,
        }
      });

      blobStream.on("error", (error) => {
        console.error("Error al cargar el archivo:", error);
        res.status(500).json({ error: "Error al cargar el archivo" });
      });

      blobStream.on("finish", async () => {
        try {
          const publicUrl = `${fileUpload.name}`;
          const optimizedImageBuffer = await optimizeImage(file.buffer); // Optimizar la imagen con Sharp
          await uploadToStorage(optimizedImageBuffer, fileUpload); // Subir la imagen optimizada al almacenamiento

          urls.push(publicUrl);

          if (urls.length === req.files.length) {
            // Guardar las URLs de las imágenes y crear un nuevo documento de producto en Firestore
            const {
              Descripcion,
              Material,
              NombreProducto,
              Precio,
              TallasColores,
              Tipo,
              Stock,
              Categoria,
              Tematica,
            } = req.body;

            // Validar que se proporcionen todos los campos necesarios
            if (
              !Descripcion ||
              !Material ||
              !NombreProducto ||
              !Precio ||
              !TallasColores ||
              !Tipo ||
              !Stock
            ) {
              return res
                .status(400)
                .send("Se requieren todos los campos para crear un nuevo producto.");
            }

            // Decodificar la cadena JSON de TallasColores en un array de objetos
            const tallasColoresArray = JSON.parse(TallasColores);

            // Crear un nuevo documento de producto en Firestore
            const newProductRef = await db.collection("Producto").add({
              Descripcion,
              Material,
              NombreProducto,
              Precio: parseInt(Precio),
              TallasColores: tallasColoresArray,
              Tipo,
              Imagen: urls, // Guardar las URLs de las imágenes
              Stock: parseInt(Stock),
              Categoria,
              Tematica,
            });

            // Responder con el ID del nuevo producto creado
            res.status(201).json({ id: newProductRef.id });
          }
        } catch (error) {
          console.error("Error al cargar la foto o agregar el producto:", error);
          res.status(500).json({ error: "Error al cargar la foto o agregar el producto" });
        }
      });

      blobStream.end(file.buffer); // Finaliza la carga del archivo con el contenido del buffer del archivo
    }
  } catch (error) {
    console.error("Error al cargar la foto o agregar el producto:", error);
    res.status(500).json({ error: "Error al cargar la foto o agregar el producto" });
  }
});

// Función para optimizar la imagen con Sharp y convertirla a formato WebP
async function optimizeImage(buffer) {
  return await sharp(buffer)
    .webp() // Convertir la imagen a formato WebP
    // Puedes agregar más opciones de optimización aquí, como cambiar el tamaño o aplicar filtros
    .toBuffer();
}

// Función para subir la imagen optimizada al almacenamiento
async function uploadToStorage(buffer, fileUpload) {
  return new Promise((resolve, reject) => {
    const blobStream = fileUpload.createWriteStream({
      metadata: {
        contentType: 'image/webp', // Establecer el tipo de contenido de la imagen como WebP
      }
    });

    blobStream.on('error', (error) => {
      console.error('Error al cargar el archivo optimizado:', error);
      reject(error);
    });

    blobStream.on('finish', () => {
      resolve();
    });

    blobStream.end(buffer);
  });
}

router.get("/imagen/:id", async (req, res) => {
  try {
    const bucket = storage.bucket();
    const nombreImagen = req.params.id;
    const file = bucket.file(nombreImagen);

    // Verifica si el archivo existe
    const existe = await file.exists();

    if (!existe[0]) {
      return res.status(404).json({ error: "La imagen no existe" });
    }

    // Obtiene un enlace temporal para descargar el archivo
    const [url] = await file.getSignedUrl({
      action: "read",
      expires: "12-12-2024", // Fecha de expiración del enlace
    });

    // Descarga la imagen desde la URL
    const response = await axios.get(url, {
      responseType: 'arraybuffer' // Establece el tipo de respuesta como un array de bytes
    });

    // Optimiza y convierte la imagen a formato WebP utilizando sharp
    const imagenOptimizada = await sharp(response.data)
    .resize({ width: 400 }) // Redimensionar la imagen a 400 píxeles de ancho
    .webp({ quality: 70 } /* Calidad de la imagen */)
    .toBuffer();
    
      

    // Establece el tipo de contenido de la respuesta como imagen WebP
    res.set('Content-Type', 'image/webp');

    // Envia la imagen optimizada en formato WebP al cliente
    res.send(imagenOptimizada);
  } catch (error) {
    console.error("Error al obtener la imagen:", error);
    res.status(500).json({ error: "Error al obtener la imagen" });
  }
});



router.get("/productos/:Categoria", async (req, res) => {
  try {
    const { Categoria } = req.params; // Utiliza req.query para acceder a los parámetros de consulta

    const querySnapshot = await db.collection("Producto").where("Categoria", "==", Categoria).get();
    
    const productos = [];
    querySnapshot.forEach((doc) => {
      // Accede a los datos de cada documento que cumple con el filtro y agrégalo al array de productos
      productos.push({ id: doc.id, data: doc.data() });
    });

    // Envía la lista de productos como respuesta al cliente
    res.status(200).json(productos);
  } catch (error) {
    console.error('Error al obtener documentos: ', error);
    res.status(500).json({ error: 'Hubo un error al obtener los documentos.' });
  }
});

router.get("/Productos/:Preciomin/:Preciomax",async(req,res)=>{
  try{
    const {Preciomin,Preciomax } = req.params; // Utiliza req.query para acceder a los parámetros de consulta


    const precioMin = parseFloat(Preciomin);
    const precioMax = parseFloat(Preciomax);

    const querySnapshot = await db.collection("Producto")
    .where("Precio", ">=", precioMin)
    .where("Precio", "<=", precioMax)
    .get();

    const productos = [];
    querySnapshot.forEach((doc) => {
      // Accede a los datos de cada documento que cumple con el filtro y agrégalo al array de productos
      productos.push({ id: doc.id, data: doc.data() });
    });

    // Envía la lista de productos como respuesta al cliente
    res.status(200).json(productos);
  }catch (error) {
    console.error('Error al obtener documentos: ', error);
    res.status(500).json({ error: 'Hubo un error al obtener los documentos.' });
  }
})

router.get("/producto/:Tematica", async (req, res) => {
  try {
    const { Tematica } = req.params; // Utiliza req.query para acceder a los parámetros de consulta

    const querySnapshot = await db.collection("Producto").where("Tematica", "==", Tematica).get();
    
    const productos = [];
    querySnapshot.forEach((doc) => {
      // Accede a los datos de cada documento que cumple con el filtro y agrégalo al array de productos
      productos.push({ id: doc.id, data: doc.data() });
    });

    // Envía la lista de productos como respuesta al cliente
    res.status(200).json(productos);
  } catch (error) {
    console.error('Error al obtener documentos: ', error);
    res.status(500).json({ error: 'Hubo un error al obtener los documentos.' });
  }
});


router.get("/Product/:Tipo",async(req,res)=>{
  try{
    const { Tipo } = req.params; // Utiliza req.query para acceder a los parámetros de consulta
    const querySnapshot = await db.collection("Producto").where("Tipo", "==", Tipo).get();
    
    const productos = [];
    querySnapshot.forEach((doc) => {
      // Accede a los datos de cada documento que cumple con el filtro y agrégalo al array de productos
      productos.push({ id: doc.id, data: doc.data() });
    });

    // Envía la lista de productos como respuesta al cliente
    res.status(200).json(productos);

  }catch(error){
    console.error('Error al obtener documentos: ', error);
    res.status(500).json({ error: 'Hubo un error al obtener los documentos.' });
  }
})





module.exports = router;
