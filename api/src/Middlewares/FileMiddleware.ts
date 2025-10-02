import Config from '$api/Config/Config'
import multer from 'multer'

const FileMiddleware = multer({
    dest: Config.fileDestination,
    limits: {
        fileSize: 100 * 1024 * 1024 // 100 MB
    }
})

export default FileMiddleware
