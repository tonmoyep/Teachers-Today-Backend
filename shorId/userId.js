const crypto = require('crypto');

function generateShortId() { 
    const objectId = new Date().getTime().toString(16) + 
                     Math.floor(Math.random() * 16777215).toString(16);

    const hashedId = crypto.createHash('sha256').update(objectId).digest('hex');

    const truncatedHash = hashedId.substring(0, 6);

    const shortId = Buffer.from(truncatedHash, 'hex').toString('base64').substring(0, 6);

    return shortId;
}


const userId = generateShortId();
console.log(userId);
