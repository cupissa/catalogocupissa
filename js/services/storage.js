import { supabase } from '../config/supabase.js';

/**
 * Sube la imagen seleccionada del producto a Supabase Storage y retorna la URL pública
 * @param {File} file - Archivo capturado desde el input type="file"
 * @param {string} bucket - Nombre del bucket en Supabase Storage (por defecto 'productos')
 * @returns {Promise<string>} URL pública de la imagen
 */
export async function uploadProductImage(file, bucket = 'productos') {
  if (!file) {
    throw new Error('No se seleccionó ningún archivo de imagen.');
  }

  const client = window.supabaseClient || window.supabase || supabase;
  if (!client) {
    throw new Error('Cliente Supabase no disponible.');
  }

  // Generar nombre de archivo único para evitar sobrescribir existentes
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
  const filePath = `catalog/${fileName}`;

  // Subir archivo al bucket
  const { data, error } = await client.storage
    .from(bucket)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true
    });

  if (error) {
    console.error('Error al subir imagen a Supabase Storage:', error.message);
    throw new Error(`Error en el servidor de imágenes: ${error.message}`);
  }

  // Obtener URL pública
  const { data: publicUrlData } = client.storage
    .from(bucket)
    .getPublicUrl(filePath);

  return publicUrlData.publicUrl;
}