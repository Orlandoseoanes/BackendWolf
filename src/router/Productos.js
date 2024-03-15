const { db } = require("../firebase");
const { Router } = require("express");
const router = Router();
const multer = require("multer");
const { storage } = require("../firebase"); // Importa el almacenamiento desde tu archivo firebase.js

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

router.post(
  "/Producto/cargarFotoYProductoNuevo",
  upload.array("fotos"), // Acepta múltiples archivos con el nombre "fotos"
  async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res
          .status(400)
          .json({ error: "No se proporcionaron fotos" });
      }

      const bucket = storage.bucket();
      const urls = [];

      req.files.forEach(file => {
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
          const publicUrl = `${fileUpload.name}`;
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
        });

        blobStream.end(file.buffer); // Finaliza la carga del archivo con el contenido del buffer del archivo
      });
    } catch (error) {
      console.error("Error al cargar la foto o agregar el producto:", error);
      res
        .status(500)
        .json({ error: "Error al cargar la foto o agregar el producto" });
    }
  }
);

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

    // Redirige al enlace temporal para descargar la imagen
    res.redirect(url);
  } catch (error) {
    console.error("Error al obtener la imagen:", error);
    res.status(500).json({ error: "Error al obtener la imagen" });
  }
});

module.exports = router;
