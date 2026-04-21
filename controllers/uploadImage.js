const cloudinary = require("./cloudinary")

exports.uploadImage = (image, type, folder) => {
    return new Promise((resolve, reject) => {
        if(image) {
            try {
                cloudinary.uploader.upload_stream({
                    resource_type: type,
                    folder: folder
                }, (err, result) => {
                    if(err) reject(err)
                    else {
                        resolve({
                            public_id: result.public_id,
                            url: result.url
                        })
                    }
                }).end(Buffer.from(image.data))
            } catch (error) {
                reject(error)
            }
        } else {
            resolve(null)
        }
    })
}