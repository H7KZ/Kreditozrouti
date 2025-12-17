import Config from '@api/Config/Config'
import multer from 'multer'

/**
 * Middleware configured for handling `multipart/form-data` file uploads.
 * Sets the local storage destination and enforces a maximum file size limit of 100 MB.
 */
const FileMiddleware = multer({
    dest: Config.fileDestination,
    limits: {
        fileSize: 100 * 1024 * 1024 // 100 MB
    }
})

export default FileMiddleware
