import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * Upload image to Cloudinary
 * @param {Buffer} fileBuffer - The file buffer
 * @param {string} folder - Cloudinary folder name (e.g., 'products', 'slider', 'logos')
 * @param {string} filename - Original filename (optional)
 * @returns {Promise<string>} - Returns the secure URL of the uploaded image
 */
export async function uploadToCloudinary(fileBuffer, folder = 'prestige', filename = null) {
  return new Promise((resolve, reject) => {
    const uploadOptions = {
      folder: `prestige_designs/${folder}`,
      resource_type: 'auto',
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'],
      transformation: [
        { quality: 'auto', fetch_format: 'auto' }
      ],
    };

    // Add public_id if filename is provided
    if (filename) {
      const cleanFilename = filename.replace(/\.[^/.]+$/, ''); // Remove extension
      uploadOptions.public_id = cleanFilename;
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
          reject(error);
        } else {
          resolve(result.secure_url);
        }
      }
    );

    uploadStream.end(fileBuffer);
  });
}

/**
 * Delete image from Cloudinary
 * @param {string} publicId - The public ID of the image to delete
 */
export async function deleteFromCloudinary(publicId) {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw error;
  }
}

export default cloudinary;
