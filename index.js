/**
 * @typedef {Object} FileData
 * @property {String} ext Extension
 * @property {String} mime MIME
 * @property {Number} size
 * @property {String} path
 */

const debug = require("debug")("temp-file");
const crypto = require("crypto");
const fs = require("fs")
const path = require("path")
const os = require("os")
const FileType = require('file-type');

const CRYPTO_ALGORITH = 'aes-256-ctr';
const CRYPTO_KEY = Buffer.from(process.env.EXPRESS_TEMP_FILE_KEY || '94ef5e103f5d250bb6486864800fd757a00bbff6aa680573f7c18ffe04f3ab45', 'hex');
const CRYPTO_NONCE = Buffer.from(process.env.EXPRESS_TEMP_FILE_NONCE || '959128c1f9de8230471a4939a4a84650', 'hex');

function encrypt(text) {
    let cipher = crypto.createCipheriv(CRYPTO_ALGORITH, CRYPTO_KEY, CRYPTO_NONCE);
    let encrypted = cipher.update(text, 'utf8', 'hex');

    encrypted += cipher.final('hex');

    return encrypted;
}

function decrypt(text) {
    let decipher = crypto.createDecipheriv(CRYPTO_ALGORITH, CRYPTO_KEY, CRYPTO_NONCE);
    let decrypted = decipher.update(text, 'hex', 'utf8');

    decrypted += decipher.final('utf8');

    return decrypted;
}

/**
 * @param {Object} options Options
 * @param {Number=} options.maxSize File max size. Default is 524288 bytes.
 * @param {String[]=} options.type Accepted types of files. By default is ["application/octet-stream"].
 * @param {String=} options.folder Folder to save the temporary file. By default, the system temporary file is used.
 * @returns {Function} Express framework callback. Details https://expressjs.com/.
 */
function init(options) {
    const maxSize = options.maxSize || 524288;
    const types = options.type || ["application/octet-stream"];
    const folder = options.folder || os.tmpdir();

    return function(req, res) {
        let contentType = req.get("content-type");
        let contentLength = req.get("content-length");

        if ( types.indexOf(contentType) === -1 ) {
            res.status(400);
            res.send("Unsupported content type");
            return;
        }
        if ( contentLength > maxSize ) {
            res.status(400);
            res.send("Content is too large");
            return;
        }

        let buffer = Buffer.alloc(0);

        req.on("data", function(chunk) {
            buffer = Buffer.concat([buffer, chunk]);

            if ( buffer.length > maxSize ) {
                isError = true;

                res.status(400);
                res.send("Content is too large");
            }
        });
        req.on("end", function() {
            FileType.fromBuffer(buffer)
                .then(function(fileTypeData) {
                    if ( types.indexOf(fileTypeData.mime) === -1 ) {
                        res.status(400);
                        res.send("Unsupported content type");
                        return;
                    }

                    let fileData = JSON.stringify({
                        t: Date.now(),
                        r: Math.random(),
                        e: fileTypeData.ext,
                        m: fileTypeData.mime,
                    });
                    let fileName = encrypt(fileData);

                    try {
                        fs.writeFileSync(path.resolve(folder, fileName), buffer);
                        res.status(200);
                        res.send(fileName);
                    }
                    catch (error) {
                        res.status(500);
                        res.send();
                        debug(error);
                    }
                })
                .catch(function(error) {
                    res.status(500);
                    res.send();
                    debug(error);
                });
        });
    };
}

/**
 * 
 * @param {String} fileName Name of file.
 * @param {Object=} options
 * @param {String=} options.folder The folder with files. By default, the system temporary file is used.
 * @returns {FileData}
 */
function file(fileName, options) {
    let folder = os.tmpdir();

    if ( options ) {
        if ( options.folder ) {
            folder = options.folder;
        }
    }

    debug(`file: find "${fileName}"`);

    let filePath = path.resolve(folder, fileName);
    let fileStats = null;

    try {
        fileStats = fs.statSync(filePath);
    }
    catch (error) {
        return null;
    }

    debug("file: found");

    let fileJSON = null;

    try {
        fileJSON = decrypt(fileName);
    }
    catch (error) {
        return null;
    }

    let fileData = null;

    try {
        fileData = JSON.parse(fileJSON);
    }
    catch (error) {
        return null;
    }

    debug(`file: extension: ${fileData.e}; mime: ${fileData.m}`);

    return {
        ext: fileData.e,
        mime: fileData.m,
        size: fileStats.size,
        path: filePath,
    };
}

/**
 * @param {Object} options 
 * @param {String=} options.folder The folder with files. By default, the system temporary file is used.
 * @returns {Function} Express framework callback. Details https://expressjs.com/.
 */
function returner(options) {
    debug("returner: initialization");

    options = options || {};

    return function (req, res) {
        let fileName = req.params.file_id || req.query.id;

        debug(`returner: find "${fileName}"`);

        if ( !fileName ) {
            res.status(400);
            res.send("Bad request");
            return;
        }

        try {
            let data = file(fileName, options);

            if ( !data ) {
                res.status(404);
                res.send("Not found");
                return;
            }

            let stream = null;

            try {
                stream = fs.createReadStream(data.path);
            }
            catch (error) {
                res.status(500);
                res.send();
                debug(error);
                return;
            }

            res.set("Content-Type", data.mime);
            res.set("Content-Length", data.size);

            stream.pipe(res);
        }
        catch (error) {
            res.status(500);
            res.send();
            debug(error);
        }
    };
}

module.exports.saver = init;
module.exports.file = file;
module.exports.returner = returner;