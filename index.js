/**
 * @typedef {object} FileData
 * @property {string} ext Extension
 * @property {string} mime MIME
 * @property {number} size File size
 * @property {string} path File path
 * @property {function(string):void} copyTo Copy file to path
 */

const debug = require('debug')('temp-file');
const fs = require('fs');
const path = require('path');
const os = require('os');
const bytes = require('bytes');
const ContentType = require('content-type');
const FileType = require('file-type');
const randomString = require('crypto-random-string');

/**
 * @param {string} src Source file
 * @param {string} dest Destination file
 */
function copy(src, dest) {
    debug(`Copy file "${src}" to "${dest}"`);
    fs.copyFileSync(src, dest);
}

/**
 * @param {object} options Options
 * @param {(number|string)=} options.maxSize File max size. Default is 512kb bytes.
 * {@link https://www.npmjs.com/package/bytes|Details}
 * @param {Array.<string>=} options.type Accepted types of files. By default is ["application/octet-stream"].
 * @param {string=} options.folder Folder to save the temporary file. By default, the system temporary file is used.
 * @param {{
 *  type?:("hex"|"numeric"|"distinguishable"|"alphanumeric"),
 *  length:string
 * }=} options.fileName File name options.
 * Default type is "alphanumeric" with 64 length.
 * {@link https://www.npmjs.com/package/crypto-random-string|Details}
 * @returns {Function} Express framework callback.
 * {@link Details https://expressjs.com/|Details}
 */
function init(options) {
    const maxSize = bytes.parse(options.maxSize || '512kb');
    const types = new Set(options.type || ['application/octet-stream']);
    const folder = options.folder || os.tmpdir();
    const nameOptions = {
        type: options.fileName && options.fileName.type || 'alphanumeric',
        length: options.fileName && options.fileName.length || 64,
    };

    debug('New file saver.');
    debug(`Max size: ${bytes(maxSize)}.`);
    debug(`Types: [${Array.from(types.values()).join(', ')}].`);
    debug(`Folder: "${folder}".`);
    debug(`Name: { type: "${nameOptions.type}", length: ${nameOptions.length} }`);

    return function(req, res) {
        debug('Loading new file.');

        let contentType = req.get('content-type');

        if ( !contentType ) {
            debug('Request has no "Content-Type" header');
            res.status(415);
            res.send();
            return;
        }

        let contentLength = req.get('content-length');

        if ( !contentLength ) {
            debug('Request has no "Content-Length" header.');
            res.status(411);
            res.send();
            return;
        }

        contentType = ContentType.parse(contentType).type;

        debug(`Request "Content-Type": "${contentType}".`);
        debug(`Request "Content-Length": "${bytes(contentLength)}".`);

        if ( !types.has(contentType) ) {
            debug('Content type is not supported.');
            res.status(415);
            res.send();
            return;
        }
        if ( contentLength > maxSize ) {
            debug(`Content length ${bytes(contentLength)} is too bid. Max ${bytes(maxSize)}.`);
            res.status(413);
            res.send();
            return;
        }

        let fileName = randomString(nameOptions);
        let filePath = path.resolve(folder, fileName);
        let fileDesc = fs.openSync(filePath, 'a+');
        let fileLen = 0;

        debug(`Created new file "${filePath}".`);

        req.on('data', function(chunk) {
            debug(`Income data ${chunk.length} bytes.`);

            fs.appendFileSync(fileDesc, chunk);

            fileLen += chunk.length;

            debug(`Append data. Chunk: ${chunk.length} bytes. Total: ${fileLen} bytes.`);

            if ( fileLen > maxSize ) {
                debug(`File size error. Max: ${bytes(maxSize)} bytes. Already loaded: ${bytes(fileLen)}.`);

                res.status(413);
                res.send();
                req.destroy();

                debug('Close descriptor.');
                fs.closeSync(fileDesc);

                debug(`Unlink file "${filePath}".`);
                fs.unlinkSync(filePath);
            }
        });
        req.on('end', function() {
            debug('File loaded successfully.');
            debug(`File size ${bytes(fileLen)}.`);
            debug('Close descriptor.');
            fs.closeSync(fileDesc);
            debug('Checking file type.');
            FileType.fromFile(filePath)
                .then(function(fileTypeData) {
                    debug(`File type is "${fileTypeData.mime}".`);

                    if ( !types.has(fileTypeData.mime) ) {
                        debug('File type is not supported.');
                        res.status(415);
                        res.send();
                        return;
                    }

                    debug(`Return file id "${fileName}".`);

                    res.status(200);
                    res.send(fileName);
                })
                .catch(function(error) {
                    debug('Something wrong.');
                    debug(error);
                    res.status(500);
                    res.send();
                });
        });
    };
}

/**
 * File name validation
 * @param {string} fileName File name
 * @returns {boolean}
 */
function fileNameError(fileName) {
    return /[^a-zA-Z0-9]/.test(fileName);
}

/**
 * @param {string} fileName Name of file.
 * @param {object=} options Options
 * @param {string=} options.folder The folder with files. By default, the system temporary file is used.
 * @returns {Promise.<FileData>}
 */
async function file(fileName, options) {
    debug(`Get file "${fileName}".`);

    if ( fileNameError(fileName) ) {
        debug('File name error.');
        return null;
    }

    let folder = options && options.folder || os.tmpdir();
    let filePath = path.resolve(folder, fileName);
    let fileStats = null;

    debug(`Test file "${filePath}".`);

    try {
        fileStats = fs.statSync(filePath);
    } catch (error) {
        debug(`File "${filePath}" not found.`);
        debug(error);
        return null;
    }

    if ( !fileStats.isFile ) {
        debug(`File "${filePath}" is not a "file".`);
        return null;
    }

    let fileType = await FileType.fromFile(filePath);
    let fileData = {
        ext: fileType.ext,
        mime: fileType.mime,
        size: fileStats.size,
        path: filePath,
        copyTo: copy.bind(copy, filePath),
    };

    debug(`File "${filePath}" found successfully.`);

    return fileData;
}

/**
 * @param {string} fileName Name of file.
 * @param {object=} options Options
 * @param {string=} options.folder The folder with files. By default, the system temporary file is used.
 * @returns {boolean}
 */
function exists(fileName, options) {
    debug(`Check is file "${fileName}" exists.`);

    if ( fileNameError(fileName) ) {
        debug('File name error.');
        return false;
    }

    let folder = options && options.folder || os.tmpdir();
    let filePath = path.resolve(folder, fileName);

    debug(`Test "${filePath}" file.`);

    try {
        fileStats = fs.statSync(filePath);
    } catch (error) {
        debug(`File "${filePath}" not found.`);
        debug(error);
        return false;
    }

    if ( !fileStats.isFile ) {
        debug(`File "${filePath}" is not a "file".`);
        return false;
    }

    debug(`File "${filePath}" exists.`);

    return true;
}

/**
 * Return file by id.
 * Use param name :fid or :id or query param fid or id.
 * Find file name order :fid || ?fid || :id || ?id
 * @param {object} options Options
 * @param {string=} options.folder The folder with files. By default, the system temporary file is used.
 * @returns {Function} Express framework callback.
 * {@link https://expressjs.com/|Details}
 */
function returner(options) {
    return function(req, res) {
        Promise.resolve(true)
            .then(async function() {
                let fileName = req.params.fid || req.query.fid || req.params.id || req.query.id;

                if ( !fileName ) {
                    debug('File name not defined.');
                    res.status(400);
                    res.send();
                    return;
                }

                debug(`Retrieving "${fileName}" file data.`);

                let data = await file(fileName, options);

                if ( !data ) {
                    debug('File data not found.');
                    res.status(404);
                    res.send();
                    return;
                }

                let stream = fs.createReadStream(data.path);

                debug(`Return "${data.path}" file.`);
                debug(`"Content-Type": "${data.mime}"`);
                debug(`"Content-Length": "${data.size}"`);

                res.set('Content-Type', data.mime);
                res.set('Content-Length', data.size);

                stream.pipe(res);
            }).catch(function(error) {
                debug('Something wrong.');
                debug(error);
                res.status(500);
                res.send();
            });
    };
}

module.exports.saver = init;
module.exports.file = file;
module.exports.exists = exists;
module.exports.returner = returner;
