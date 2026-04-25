const cloudinary = require("cloudinary").v2;
// configure cloudinary
const cloudinaryConfig = () => {
    return cloudinary.config({ 
    cloud_name: process.env.CLOUDNAME, 
    api_key: process.env.CLOUDAPIKEY, 
    api_secret: process.env.CLOUDAPISECRET 
})
}


module.exports = cloudinaryConfig