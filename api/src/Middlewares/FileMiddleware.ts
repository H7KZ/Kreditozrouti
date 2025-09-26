import multer from 'multer'
import Config from '@/Config/Config'

const FileMiddleware = multer({
    dest: Config.fileDestination,
    limits: {
        fileSize: 100 * 1024 * 1024 // 100 MB
    }
})

export default FileMiddleware
